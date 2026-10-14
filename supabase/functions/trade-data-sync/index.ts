// 真实贸易数据同步：WTO Digitally Delivered Services Trade Dataset
// 只读取公开官方数据，不接收用户凭据；解析失败时由前端回退到课堂快照。
import JSZip from 'npm:jszip'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}
const WTO_ZIP = 'https://www.wto.org/english/res_e/statis_e/gstdh_digital_services_e.zip'
const SOURCE_URL = 'https://data.wto.org/en/dataset/dideliveredservices'
const TARGETS = ['China', 'United States', 'United States of America', 'Japan', 'Singapore', 'Korea, Republic of', 'South Korea']

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
  if (value === 'United States' || value === 'United States of America') return '美国'
  if (value === 'China') return '中国'
  if (value === 'Japan') return '日本'
  if (value === 'Singapore') return '新加坡'
  return value
}
function parseCsv(text: string): Record<string, unknown>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (char === ',' && !quoted) { row.push(cell); cell = ''; continue }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell); cell = ''
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      continue
    }
    cell += char
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const headers = rows.shift() || []
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header.trim(), values[index] ?? ''])))
}
function parseRows(rows: Record<string, unknown>[], updatedAt: string): Snapshot[] {
  const result: Snapshot[] = []
  for (const row of rows) {
    const rawGeo = asText(row.REPORTER_NAME ?? findKey(row, ['economy', 'country', 'economies', 'reporter']))
    const geography = normalizeGeography(rawGeo)
    if (!TARGETS.includes(rawGeo)) continue
    const rawYear = findKey(row, ['year', 'period'])
    const year = Number(rawYear)
    const rawFlow = asText(findKey(row, ['flow', 'trade flow']))
    const indicator = asText(findKey(row, ['indicator_name', 'indicator']))
    const partner = asText(findKey(row, ['partner']))
    const rawValue = findKey(row, ['value', 'current us', 'million'])
    const value = Number(String(rawValue ?? '').replace(/,/g, ''))
    if (!Number.isFinite(year) || year < 2005 || !Number.isFinite(value)) continue
    if (rawFlow && rawFlow !== 'X' && !/export/i.test(rawFlow)) continue
    if (indicator && !/^DDS$/i.test(indicator) && !/total digitally delivered services/i.test(indicator)) continue
    if (partner && partner !== 'World') continue
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
    const dataFile = Object.values(archive.files).find((file) => /\.(csv|xlsx?)$/i.test(file.name))
    if (!dataFile) throw new Error('WTO CSV/XLSX data file not found in archive')
    const updatedAt = new Date().toISOString().slice(0, 10)
    if (!/\.csv$/i.test(dataFile.name)) throw new Error('WTO source is expected to be CSV')
    const snapshots = parseRows(parseCsv(await dataFile.async('text')), updatedAt)
    const deduped = Array.from(new Map(snapshots.map((item) => [`${item.geography}-${item.year}`, item])).values())
    if (!deduped.length) throw new Error('WTO workbook fields could not be mapped')
    return json({source: SOURCE_URL, publisher: 'World Trade Organization', fetched_at: updatedAt, data: deduped})
  } catch (error) {
    return json({error: error instanceof Error ? error.message : 'trade data sync failed', source: SOURCE_URL}, 502)
  }
})
