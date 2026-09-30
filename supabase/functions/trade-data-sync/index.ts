// 真实贸易数据同步：WTO Digitally Delivered Services Trade Dataset
// 只读取公开官方数据，不接收用户凭据；解析失败时由前端回退到课堂快照。
import JSZip from 'npm:jszip'
import * as XLSX from 'npm:xlsx'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}
const WTO_ZIP = 'https://www.wto.org/english/res_e/statis_e/gstdh_digital_services_e.zip'
const SOURCE_URL = 'https://data.wto.org/en/dataset/dideliveredservices'
const TARGETS = ['China', 'United States', 'Japan', 'Singapore', 'Korea, Republic of', 'South Korea']

type Snapshot = {
  id: string
  domain: 'digital_services'
  indicator: string
  geography: string
  year: number
  value: number
  unit: string
  currency: string
  sourceName: string
  sourceUrl: string
  publisher: string
  definition: string
  status: 'official'
  updatedAt: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {...CORS_HEADERS, 'Content-Type': 'application/json'}})
}
function asText(value: unknown) { return typeof value === 'string' ? value.trim() : '' }
function findKey(row: Record<string, unknown>, names: string[]) {
  const key = Object.keys(row).find((candidate) => names.some((name) => candidate.toLowerCase().includes(name.toLowerCase())))
  return key ? row[key] : undefined
}
function normalizeGeography(value: string) {
  if (value === 'Korea, Republic of') return '韩国'
  if (value === 'South Korea') return '韩国'
  if (value === 'United States') return '美国'
  if (value === 'China') return '中国'
  if (value === 'Japan') return '日本'
  if (value === 'Singapore') return '新加坡'
  return value
}
function parseRows(rows: Record<string, unknown>[], updatedAt: string): Snapshot[] {
  const result: Snapshot[] = []
  for (const row of rows) {
    const rawGeo = asText(findKey(row, ['economy', 'reporter', 'country', 'economies']))
    const geography = normalizeGeography(rawGeo)
    if (!TARGETS.includes(rawGeo)) continue
    const rawYear = findKey(row, ['year', 'period'])
    const year = Number(rawYear)
    const rawFlow = asText(findKey(row, ['flow', 'trade flow']))
    const rawValue = findKey(row, ['value', 'current us', 'million'])
    const value = Number(String(rawValue ?? '').replace(/,/g, ''))
    if (!Number.isFinite(year) || year < 2005 || !Number.isFinite(value)) continue
    if (rawFlow && !/export/i.test(rawFlow)) continue
    result.push({
      id: `wto-dds-${rawGeo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}`,
      domain: 'digital_services',
      indicator: '数字化交付服务出口',
      geography,
      year,
      value,
      unit: 'million USD',
      currency: 'USD',
      sourceName: 'WTO Digitally Delivered Services Trade Dataset',
      sourceUrl: SOURCE_URL,
      publisher: 'World Trade Organization',
      definition: '通过计算机网络交付的跨境服务出口；不等同于跨境电商货物贸易，也不等同于所有可数字化交付服务。',
      status: 'official',
      updatedAt
    })
  }
  return result.sort((a, b) => a.geography.localeCompare(b.geography) || a.year - b.year)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS_HEADERS})
  if (req.method !== 'POST' && req.method !== 'GET') return json({error: 'Method Not Allowed'}, 405)
  try {
    const response = await fetch(WTO_ZIP, {headers: {'User-Agent': 'genshu-trade-ai/1.0'}})
    if (!response.ok) throw new Error(`WTO download failed: ${response.status}`)
    const archive = await JSZip.loadAsync(await response.arrayBuffer())
    const workbookFile = Object.values(archive.files).find((file) => /\.xlsx?$/i.test(file.name))
    if (!workbookFile) throw new Error('WTO workbook not found in archive')
    const workbook = XLSX.read(await workbookFile.async('arraybuffer'), {type: 'array', cellDates: false})
    const updatedAt = new Date().toISOString().slice(0, 10)
    const snapshots: Snapshot[] = []
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {defval: null})
      snapshots.push(...parseRows(rows, updatedAt))
    }
    const deduped = Array.from(new Map(snapshots.map((item) => [`${item.geography}-${item.year}`, item])).values())
    if (!deduped.length) throw new Error('WTO workbook fields could not be mapped')
    return json({source: SOURCE_URL, publisher: 'World Trade Organization', fetched_at: updatedAt, data: deduped})
  } catch (error) {
    return json({error: error instanceof Error ? error.message : 'trade data sync failed', source: SOURCE_URL}, 502)
  }
})
