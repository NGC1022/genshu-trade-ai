// AI业务记录导出：JWT/RLS 只允许用户导出本人记录，文件写入私有 exports 桶。
import {createClient} from 'npm:@supabase/supabase-js@2'
import * as XLSX from 'npm:xlsx'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {status, headers: {...CORS_HEADERS, 'Content-Type': 'application/json'}})
}

const TYPE_LABEL: Record<string, string> = {
  product_translate: '商品国际化',
  market_analysis: '市场分析',
  inquiry: '跨境询盘',
  quote: '智能报价',
  trade_compliance: '贸易合规',
  trade_document: '贸易单证',
  marketing_content: '营销素材',
  customer_intent: '客户意向识别',
  export_plan: '出海方案',
  support_chat: 'AI客服',
  exception_suggestion: '异常订单建议'
}

function formatTime(iso?: string): string {
  if (!iso) return '待确认'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '待确认'
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function safeSpreadsheetText(value: unknown, maxLength = 1000): string {
  let text = value === null || value === undefined ? '' : String(value)
  text = text.slice(0, maxLength)
  // Prefix formula-like text so spreadsheet software treats customer content as text.
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return text
}

/** 提取客户需求文本（询盘取原文，其余取商品名/关键词） */
function extractDemand(record: Record<string, unknown>): string {
  const input = asObject(record.input_data)
  if (typeof input.inquiry_text === 'string' && input.inquiry_text.trim()) return safeSpreadsheetText(input.inquiry_text, 200)
  if (typeof input.name === 'string' && input.name.trim()) return safeSpreadsheetText(`商品：${input.name}`, 200)
  return '详见AI结果'
}

function summarizeResult(value: unknown): string {
  if (value === null || value === undefined) return '待确认'
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    return safeSpreadsheetText(text.length > 1000 ? `${text.slice(0, 1000)}…` : text)
  } catch {
    return '待确认'
  }
}

function evidenceRows(inputData: Record<string, unknown>) {
  const evidence = asObject(inputData.verified_data_evidence)
  const market = Array.isArray(evidence.market_digital_service_exports) ? evidence.market_digital_service_exports : []
  const domestic = Array.isArray(evidence.domestic_official_context) ? evidence.domestic_official_context : []
  return [...market, ...domestic].map(asObject).slice(0, 12)
}

function summarizeEvidence(inputData: Record<string, unknown>) {
  const rows = evidenceRows(inputData)
  if (!rows.length) return '旧记录未保存结构化来源证据'
  return safeSpreadsheetText(
    rows
      .map((row) => `${row.geography || ''} ${row.year || ''} ${row.indicator || ''}: ${row.value || ''} ${row.unit || ''}（${row.publisher || ''}）`)
      .join('；'),
    4000
  )
}

function evidenceSources(inputData: Record<string, unknown>) {
  const sources = [...new Set(evidenceRows(inputData).map((row) => row.sourceUrl).filter((value) => typeof value === 'string'))]
  return safeSpreadsheetText(sources.join('\n'), 2000)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS_HEADERS})
  if (req.method !== 'POST') return json({success: false, error: 'Method Not Allowed'}, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({success: false, error: '请先登录后再导出'}, 401)

    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!url || !anonKey) return json({success: false, error: '导出服务尚未配置'}, 503)

    // 使用调用方 JWT 创建客户端：RLS 生效，只能读取本人记录。
    const supabase = createClient(url, anonKey, {global: {headers: {Authorization: authHeader}}})
    const {data: userData, error: userErr} = await supabase.auth.getUser()
    if (userErr || !userData?.user) return json({success: false, error: '登录状态失效，请重新登录'}, 401)

    const {data: records, error: queryErr} = await supabase
      .from('ai_trade_records')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', {ascending: false})
      .limit(5000)
    if (queryErr) return json({success: false, error: '记录查询失败，请重试'}, 500)

    const rows = (records ?? []).map((record: Record<string, unknown>) => {
      const input = asObject(record.input_data)
      const result = asObject(record.ai_result)
      const businessStatus = record.status === 'confirmed' ? '已人工确认' : '待人工审核'
      return {
        时间: formatTime(record.created_at as string),
        业务类型: TYPE_LABEL[String(record.type)] ?? safeSpreadsheetText(record.type || '待确认'),
        商品: safeSpreadsheetText(record.product_name || '未关联商品', 200),
        目标市场: safeSpreadsheetText(record.market || '无', 200),
        客户需求: extractDemand(record),
        'AI结果（摘要）': summarizeResult(record.ai_result),
        业务状态: businessStatus,
        人工审核状态: businessStatus,
        数据标记: record.is_demo ? '课堂演示数据' : '真实业务数据',
        AI提供方: safeSpreadsheetText(result.analysis_provider || record.source || '未记录', 120),
        '依据数据摘要': summarizeEvidence(input),
        '原始数据来源': evidenceSources(input)
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{提示: '暂无业务记录'}])
    worksheet['!cols'] = [
      {wch: 18}, {wch: 16}, {wch: 24}, {wch: 14}, {wch: 36}, {wch: 50},
      {wch: 16}, {wch: 16}, {wch: 16}, {wch: 26}, {wch: 62}, {wch: 60}
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AI业务记录')
    const buffer = XLSX.write(workbook, {type: 'array', bookType: 'xlsx'}) as ArrayBuffer

    const fileName = `ai-trade-records-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.xlsx`
    const filePath = `${userData.user.id}/${fileName}`
    const {error: uploadError} = await supabase.storage.from('exports').upload(filePath, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: false
    })
    if (uploadError) return json({success: false, error: '文件上传失败，请重试'}, 500)

    const {data: signedUrl, error: signError} = await supabase.storage.from('exports').createSignedUrl(filePath, 300, {download: fileName})
    if (signError || !signedUrl?.signedUrl) return json({success: false, error: '无法生成安全下载链接'}, 500)
    return json({success: true, url: signedUrl.signedUrl, file_name: fileName, row_count: rows.length, expires_in_seconds: 300})
  } catch {
    return json({success: false, error: '导出失败，请检查登录状态后重试'}, 500)
  }
})
