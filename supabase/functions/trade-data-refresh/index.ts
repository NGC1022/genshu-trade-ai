import JSZip from 'npm:jszip'
import * as XLSX from 'npm:xlsx'
import {createClient} from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}
const WTO_ZIP = 'https://www.wto.org/english/res_e/statis_e/gstdh_digital_services_e.zip'
const SOURCES = [
  {
    sourceKey: 'wto-digitally-delivered-services',
    sourceName: 'WTO Digitally Delivered Services Trade Dataset',
    publisher: 'World Trade Organization',
    sourceUrl: 'https://data.wto.org/en/dataset/dideliveredservices',
    documentType: 'statistics'
  },
  {
    sourceKey: 'wto-global-trade-statistics',
    sourceName: 'WTO Global Trade Statistics',
    publisher: 'World Trade Organization',
    sourceUrl: 'https://wto.org/statistics',
    documentType: 'statistics'
  },
  {
    sourceKey: 'unctad-digital-services',
    sourceName: 'UNCTAD International trade in digitally deliverable services',
    publisher: 'UNCTAD',
    sourceUrl: 'https://unctadstat.unctad.org/datacentre/reportInfo/US.DigitallyDeliverableServices',
    documentType: 'statistics'
  },
  {
    sourceKey: 'mofcom-digital-trade',
    sourceName: '商务部服务贸易网数字贸易数据',
    publisher: '中华人民共和国商务部',
    sourceUrl: 'https://tradeinservices.mofcom.gov.cn/article/hyly/szmy/202609/201057.html',
    documentType: 'policy'
  },
  {
    sourceKey: 'wto-ecommerce-policy',
    sourceName: 'WTO Electronic Commerce policy and negotiations',
    publisher: 'World Trade Organization',
    sourceUrl: 'https://www.wto.org/english/tratop_e/ecom_e/ecom_e.htm',
    documentType: 'policy'
  }
] as const

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {...CORS_HEADERS, 'Content-Type': 'application/json'}})
}
async function sha256(value: string | ArrayBuffer) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
function parseWtoRows(rows: Record<string, unknown>[], fetchedAt: string) {
  const output: Record<string, unknown>[] = []
  for (const row of rows) {
    const keys = Object.keys(row)
    const get = (parts: string[]) => {
      const key = keys.find((candidate) => parts.some((part) => candidate.toLowerCase().includes(part)))
      return key ? row[key] : undefined
    }
    const economy = String(get(['economy', 'reporter', 'country']) ?? '').trim()
    const year = Number(get(['year', 'period']))
    const flow = String(get(['flow', 'trade flow']) ?? '')
    const value = Number(String(get(['value', 'current us', 'million']) ?? '').replace(/,/g, ''))
    if (!['China', 'United States', 'Japan', 'Singapore', 'Korea, Republic of', 'South Korea'].includes(economy)) continue
    if (!Number.isFinite(year) || !Number.isFinite(value) || (flow && !/export/i.test(flow))) continue
    output.push({economy, year, value, unit: 'million USD', flow: 'exports', source: 'WTO Digitally Delivered Services', fetched_at: fetchedAt})
  }
  return Array.from(new Map(output.map((row) => [`${row.economy}-${row.year}`, row])).values())
}
async function fetchWtoDataset(fetchedAt: string) {
  const response = await fetch(WTO_ZIP, {headers: {'User-Agent': 'genshu-trade-ai/1.0'}})
  if (!response.ok) throw new Error(`WTO download failed: ${response.status}`)
  const archive = await JSZip.loadAsync(await response.arrayBuffer())
  const workbookFile = Object.values(archive.files).find((file) => /\.xlsx?$/i.test(file.name))
  if (!workbookFile) throw new Error('WTO workbook not found')
  const workbook = XLSX.read(await workbookFile.async('arraybuffer'), {type: 'array', cellDates: false})
  const rows: Record<string, unknown>[] = []
  for (const sheetName of workbook.SheetNames) {
    rows.push(...XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {defval: null}))
  }
  return parseWtoRows(rows, fetchedAt)
}
async function upsertDocument(source: typeof SOURCES[number], body: string, fetchedAt: string) {
  const contentHash = await sha256(body)
  const {data: existing} = await supabase.from('trade_source_documents').select('id,content_hash').eq('source_key', source.sourceKey).eq('is_current', true).maybeSingle()
  if (existing?.content_hash === contentHash) return {changed: false, id: existing.id, contentHash}
  if (existing?.id) await supabase.from('trade_source_documents').update({is_current: false}).eq('id', existing.id)
  const {data, error} = await supabase.from('trade_source_documents').insert({
    source_key: source.sourceKey,
    source_name: source.sourceName,
    publisher: source.publisher,
    source_url: source.sourceUrl,
    document_type: source.documentType,
    content_hash: contentHash,
    fetched_at: fetchedAt,
    title: source.sourceName,
    summary: stripHtml(body).slice(0, 1200),
    raw_excerpt: stripHtml(body).slice(0, 6000),
    is_current: true
  }).select('id').single()
  if (error) throw error
  if (existing?.id) {
    await supabase.from('ai_trade_analysis_runs').update({freshness_status: 'stale', stale_reason: `${source.sourceName} 出现新版本`, refreshed_at: null}).contains('source_document_ids', [existing.id])
  }
  return {changed: true, id: data.id, contentHash}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS_HEADERS})
  try {
    const refreshSecret = Deno.env.get('TRADE_REFRESH_SECRET')
    if (refreshSecret && req.headers.get('x-refresh-secret') !== refreshSecret) return json({ok: false, error: 'refresh authorization failed'}, 401)
    const fetchedAt = new Date().toISOString()
    const results: Record<string, unknown>[] = []
    for (const source of SOURCES) {
      const response = await fetch(source.sourceUrl, {headers: {'User-Agent': 'genshu-trade-ai/1.0'}})
      if (!response.ok) throw new Error(`${source.sourceKey} fetch failed: ${response.status}`)
      const body = await response.text()
      results.push({...source, ...(await upsertDocument(source, body, fetchedAt))})
    }
    const rows = await fetchWtoDataset(fetchedAt)
    const wtoDoc = results.find((item) => item.sourceKey === 'wto-digitally-delivered-services')
    const {data: version, error: versionError} = await supabase.from('trade_data_versions').insert({
      source_document_id: wtoDoc?.id || null,
      dataset_key: 'wto-digitally-delivered-services',
      version_label: fetchedAt.slice(0, 10),
      fetched_at: fetchedAt,
      row_count: rows.length,
      data: rows,
      is_current: true
    }).select('id').single()
    if (versionError) throw versionError
    await supabase.from('trade_data_versions').update({is_current: false}).eq('dataset_key', 'wto-digitally-delivered-services').neq('id', version.id)
    return json({ok: true, fetched_at: fetchedAt, rows: rows.length, changed_sources: results.filter((item) => item.changed).map((item) => item.sourceKey), version_id: version.id})
  } catch (error) {
    return json({ok: false, error: error instanceof Error ? error.message : 'refresh failed'}, 502)
  }
})
