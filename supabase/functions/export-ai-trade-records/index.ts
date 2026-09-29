// AI业务记录导出Excel：仅导出当前登录用户自己的记录（JWT鉴权 + RLS）
// 生成 .xlsx 上传至公开 exports 桶，返回下载链接
import {createClient} from 'npm:@supabase/supabase-js@2'
import * as XLSX from 'npm:xlsx'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...CORS_HEADERS, 'Content-Type': 'application/json'}
  })
}

const TYPE_LABEL: Record<string, string> = {
  product_translate: '商品国际化',
  market_analysis: '市场分析',
  inquiry: '跨境询盘',
  quote: '智能报价',
  export_plan: '出海方案'
}

function formatTime(iso?: string): string {
  if (!iso) return '待确认'
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return '待确认'
  }
}

/** 提取客户需求文本（询盘取原文，其余取商品名/关键词） */
function extractDemand(r: Record<string, unknown>): string {
  const input = (r.input_data ?? {}) as Record<string, unknown>
  if (typeof input.inquiry_text === 'string' && input.inquiry_text.trim()) {
    return input.inquiry_text.slice(0, 200)
  }
  if (typeof input.name === 'string' && input.name.trim()) return `商品：${input.name}`
  return '详见AI结果'
}

/** AI结果摘要（JSON序列化后截断，避免超长单元格） */
function summarizeResult(v: unknown): string {
  if (v === null || v === undefined) return '待确认'
  try {
    const text = typeof v === 'string' ? v : JSON.stringify(v)
    return text.length > 300 ? `${text.slice(0, 300)}...` : text
  } catch {
    return '待确认'
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: CORS_HEADERS})
  }
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({success: false, error: '请先登录后再导出'}, 401)
    }

    // 使用调用方 JWT 创建客户端：RLS 生效，只能读取本人记录
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {global: {headers: {Authorization: authHeader}}}
    )
    const {data: userData, error: userErr} = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return json({success: false, error: '登录状态失效，请重新登录'}, 401)
    }

    const {data: records, error: queryErr} = await supabase
      .from('ai_trade_records')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', {ascending: false})
      .limit(5000)
    if (queryErr) {
      return json({success: false, error: `记录查询失败：${queryErr.message}`}, 500)
    }

    const rows = (records ?? []).map((r: Record<string, unknown>) => ({
      时间: formatTime(r.created_at as string),
      业务类型: TYPE_LABEL[r.type as string] ?? String(r.type ?? '待确认'),
      商品: (r.product_name as string) || '未关联商品',
      目标市场: (r.market as string) || '无',
      客户需求: extractDemand(r),
      'AI结果（摘要）': summarizeResult(r.ai_result),
      业务状态: r.status === 'confirmed' ? '已确认' : '待人工审核',
      人工审核状态: r.status === 'confirmed' ? '已确认' : '未审核',
      数据标记: r.is_demo ? '课堂演示数据' : '真实业务数据'
    }))

    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{提示: '暂无业务记录'}])
    ws['!cols'] = [{wch: 18}, {wch: 12}, {wch: 24}, {wch: 12}, {wch: 40}, {wch: 50}, {wch: 14}, {wch: 14}, {wch: 16}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'AI业务记录')
    const buf = XLSX.write(wb, {type: 'array', bookType: 'xlsx'}) as ArrayBuffer

    const fileName = `ai-trade-records-${Date.now()}.xlsx`
    const {error: uploadErr} = await supabase.storage.from('exports').upload(fileName, buf, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    if (uploadErr) {
      return json({success: false, error: `文件上传失败：${uploadErr.message}`}, 500)
    }

    const {data: urlData} = supabase.storage.from('exports').getPublicUrl(fileName)
    return json({success: true, url: urlData.publicUrl, file_name: fileName, row_count: rows.length})
  } catch (e) {
    return json({success: false, error: e instanceof Error ? e.message : '导出失败，请重试'}, 500)
  }
})
