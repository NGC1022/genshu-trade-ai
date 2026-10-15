import JSZip from 'npm:jszip'
import * as XLSX from 'npm:xlsx'

export const WTO_DATASET_URL = 'https://data.wto.org/en/dataset/dideliveredservices'
const WTO_ARCHIVE_URL = 'https://www.wto.org/english/res_e/statis_e/gstdh_digital_services_e.zip'
const REPORTER_GEOGRAPHIES: Record<string, string> = {
  China: '中国',
  'United States of America': '美国',
  Japan: '日本',
  Singapore: '新加坡',
  'Korea, Republic of': '韩国',
  'South Korea': '韩国'
}
const GEOGRAPHY_CODES: Record<string, string> = {
  中国: 'cn',
  美国: 'us',
  日本: 'jp',
  新加坡: 'sg',
  韩国: 'kr'
}

export interface WtoTradeRow {
  id: string
  domain: 'digital_services'
  indicator: '数字化交付服务出口'
  geography: string
  year: number
  value: number
  unit: 'million USD'
  currency: 'USD'
  flow: 'exports'
  sourceName: 'WTO Digitally Delivered Services Trade Dataset'
  sourceUrl: string
  publisher: 'World Trade Organization'
  definition: string
  status: 'official'
  updatedAt: string
}

function asText(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function field(row: Record<string, unknown>, name: string) {
  const key = Object.keys(row).find((candidate) => candidate.trim().toUpperCase() === name)
  return key ? row[key] : undefined
}

function parseValue(value: unknown) {
  const normalized = asText(value).replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function isWorld(value: unknown) {
  return asText(value).toLowerCase() === 'world'
}

function isExport(value: unknown) {
  const normalized = asText(value).toUpperCase()
  return normalized === 'X' || normalized === 'EXPORT' || normalized === 'EXPORTS'
}

function parseRows(rows: Record<string, unknown>[], fetchedAt: string): WtoTradeRow[] {
  const byId = new Map<string, WtoTradeRow>()
  for (const row of rows) {
    // DDS is the all-sector total. Excluding sub-sector codes prevents double counting.
    if (asText(field(row, 'INDICATOR')).toUpperCase() !== 'DDS') continue
    if (!isWorld(field(row, 'PARTNER'))) continue
    if (!/^mode\s*1$/i.test(asText(field(row, 'MODE')))) continue
    if (!isExport(field(row, 'FLOW'))) continue

    const reporter = asText(field(row, 'REPORTER_NAME'))
    const geography = REPORTER_GEOGRAPHIES[reporter]
    if (!geography) continue

    const year = Number(field(row, 'YEAR'))
    const value = parseValue(field(row, 'VALUE'))
    if (!Number.isInteger(year) || year < 2005 || value === null || value < 0) continue

    const record: WtoTradeRow = {
      id: `wto-dds-${GEOGRAPHY_CODES[geography]}-${year}`,
      domain: 'digital_services',
      indicator: '数字化交付服务出口',
      geography,
      year,
      value,
      unit: 'million USD',
      currency: 'USD',
      flow: 'exports',
      sourceName: 'WTO Digitally Delivered Services Trade Dataset',
      sourceUrl: WTO_DATASET_URL,
      publisher: 'World Trade Organization',
      definition:
        'WTO对数字化交付服务出口的官方估算；报告方对世界的 Mode 1 出口总额，不能作为该市场商品进口需求或跨境电商货物贸易规模。',
      status: 'official',
      updatedAt: fetchedAt.slice(0, 10)
    }
    byId.set(`${geography}-${year}`, record)
  }
  return [...byId.values()].sort((a, b) => a.geography.localeCompare(b.geography) || a.year - b.year)
}

export async function fetchWtoTradeRows(fetchedAt: string): Promise<WtoTradeRow[]> {
  const response = await fetch(WTO_ARCHIVE_URL, {
    headers: {'User-Agent': 'genshu-trade-ai/1.0'},
    signal: AbortSignal.timeout(45_000)
  })
  if (!response.ok) throw new Error(`WTO dataset download failed (${response.status})`)

  const archive = await JSZip.loadAsync(await response.arrayBuffer())
  const files = Object.values(archive.files).filter((file) => !file.dir)
  const csvFile = files.find((file) => /\.csv$/i.test(file.name))
  const spreadsheetFile = files.find((file) => /\.xlsx?$/i.test(file.name))
  let workbook: XLSX.WorkBook
  if (csvFile) {
    workbook = XLSX.read(await csvFile.async('text'), {type: 'string', raw: true})
  } else if (spreadsheetFile) {
    workbook = XLSX.read(await spreadsheetFile.async('arraybuffer'), {type: 'array', cellDates: false})
  } else {
    throw new Error('WTO archive did not contain a CSV or Excel dataset')
  }

  const rows: Record<string, unknown>[] = []
  for (const sheetName of workbook.SheetNames) {
    rows.push(...XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {defval: null, raw: true}))
  }
  const result = parseRows(rows, fetchedAt)
  if (!result.length) throw new Error('WTO dataset schema or selected total rows could not be mapped')
  return result
}
