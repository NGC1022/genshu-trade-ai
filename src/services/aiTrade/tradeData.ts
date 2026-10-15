import {supabase} from '@/client/supabase'

export type TradeDataStatus = 'official' | 'classroom_snapshot' | 'ai_inference'
export type TradeDataDomain = 'cross_border_ecommerce' | 'digital_services' | 'service_trade'
export type TradeFlow = 'imports_exports' | 'exports'

export interface TradeDataSnapshot {
  id: string
  domain: TradeDataDomain
  indicator: string
  geography: string
  year: number
  value: number
  unit: string
  currency?: string
  flow?: TradeFlow
  /** 来源发布方公布的同比，不由当前快照自行推算。 */
  reportedGrowthPct?: number
  sourceName: string
  sourceUrl: string
  publisher: string
  definition: string
  status: TradeDataStatus
  /** 来源发布日期或该快照最后核验日期。 */
  updatedAt: string
}

export interface TradeDataSource {
  id: string
  name: string
  publisher: string
  url: string
  scope: string
  note: string
  refreshMode: string
}

export const TRADE_DATA_SOURCES: TradeDataSource[] = [
  {
    id: 'wto-digital-services',
    name: 'Digitally Delivered Services Trade Dataset',
    publisher: 'World Trade Organization',
    url: 'https://data.wto.org/en/dataset/dideliveredservices',
    scope: '全球经济体 · 8个子行业 · 2005年至下载文件实际最新年度',
    note: 'WTO估算的数字化交付服务贸易。出口是报告方供给，不代表进口需求，也不等同跨境电商货物贸易。以下载文件实际年份为准。',
    refreshMode: '自动下载官方批量CSV；服务端缓存24小时'
  },
  {
    id: 'customs-cross-border-ecommerce',
    name: '2025年中国跨境电商进出口情况',
    publisher: '中华人民共和国海关总署',
    url: 'https://www.customs.gov.cn/customs/2026-06/16/article_2026061616113889190.html',
    scope: '中国 · 2025年 · 跨境电商货物贸易',
    note: '包含进出口总额、出口和进口。官方同比与两个年度快照直接相减可能因历史修订或统计口径不同而有差异。',
    refreshMode: '官方发布快照；人工核对来源后更新，不冒称实时接口'
  },
  {
    id: 'mofcom-service-trade',
    name: '商务部服贸司负责人介绍2025年服务贸易发展情况',
    publisher: '中华人民共和国商务部',
    url: 'https://www.mofcom.gov.cn/syxwfb/art/2026/art_7d8d9f93478046b59c08b1639900849d.html',
    scope: '中国 · 2025年 · 服务贸易',
    note: '包含服务贸易总额、知识密集型服务和电信计算机信息服务；细分指标是总额的组成部分，不能相加为新总额。',
    refreshMode: '官方发布快照；人工核对来源后更新'
  },
  {
    id: 'mofcom-digital-trade',
    name: '一组数据带你看我国数字贸易发展成绩单',
    publisher: '商务部服务贸易网',
    url: 'https://tradeinservices.mofcom.gov.cn/article/hyly/szmy/202609/201057.html',
    scope: '中国 · 2020–2025年 · 数字贸易相关指标',
    note: '官方网页提示禁止自动化采集，因此页面保留经人工核对的发布值与出处，不抓取网页正文。',
    refreshMode: '官方发布快照；人工核对来源后更新'
  }
]

const WTO_DATASET_URL = 'https://data.wto.org/en/dataset/dideliveredservices'
const WTO_PUBLISHER = 'World Trade Organization'
const WTO_MARKETS = ['中国', '美国', '日本', '新加坡', '韩国'] as const

// 固定发布值均附原始来源；没有公开数值的年度不插值、不补造。
export const TRADE_DATA_SNAPSHOT: TradeDataSnapshot[] = [
  {
    id: 'cn-cbe-2024',
    domain: 'cross_border_ecommerce',
    indicator: '跨境电商进出口规模',
    geography: '中国',
    year: 2024,
    value: 2.63,
    unit: '万亿元',
    currency: 'CNY',
    flow: 'imports_exports',
    sourceName: '2.63万亿元跨境电商聚新成势',
    sourceUrl: 'https://www.news.cn/tech/20250205/a2c50031a6a843e08b400fd61212bfcb/c.html',
    publisher: '新华社',
    definition: '中国跨境电商进出口总额；来源为2025年发布的2024年度快照。',
    status: 'classroom_snapshot',
    updatedAt: '2025-02-05'
  },
  {
    id: 'cn-cbe-2025',
    domain: 'cross_border_ecommerce',
    indicator: '跨境电商进出口规模',
    geography: '中国',
    year: 2025,
    value: 2.84,
    unit: '万亿元',
    currency: 'CNY',
    flow: 'imports_exports',
    reportedGrowthPct: 4.8,
    sourceName: '2025年中国跨境电商进出口情况',
    sourceUrl: 'https://www.customs.gov.cn/customs/2026-06/16/article_2026061616113889190.html',
    publisher: '中华人民共和国海关总署',
    definition: '中国跨境电商进出口总额。2025年出口2.27万亿元、进口5702亿元；同比4.8%为海关总署原文公布值。',
    status: 'official',
    updatedAt: '2026-06-16'
  },
  {
    id: 'cn-digital-delivered-2025',
    domain: 'digital_services',
    indicator: '可数字化交付服务进出口',
    geography: '中国',
    year: 2025,
    value: 4323.1,
    unit: '亿美元',
    currency: 'USD',
    flow: 'imports_exports',
    reportedGrowthPct: 6.3,
    sourceName: '一组数据带你看我国数字贸易发展成绩单',
    sourceUrl: 'https://tradeinservices.mofcom.gov.cn/article/hyly/szmy/202609/201057.html',
    publisher: '商务部服务贸易网',
    definition: '中国可数字化交付服务进出口总额，双向贸易口径；同比6.3%为官方公布值。',
    status: 'official',
    updatedAt: '2026-09-08'
  },
  {
    id: 'cn-telecom-computer-info-2020',
    domain: 'digital_services',
    indicator: '电信、计算机和信息服务进出口',
    geography: '中国',
    year: 2020,
    value: 937.3,
    unit: '亿美元',
    currency: 'USD',
    flow: 'imports_exports',
    sourceName: '一组数据带你看我国数字贸易发展成绩单',
    sourceUrl: 'https://tradeinservices.mofcom.gov.cn/article/hyly/szmy/202609/201057.html',
    publisher: '商务部服务贸易网',
    definition: '中国电信、计算机和信息服务进出口总额；与同指标2025年值比较。',
    status: 'official',
    updatedAt: '2026-09-08'
  },
  {
    id: 'cn-telecom-computer-info-2025',
    domain: 'digital_services',
    indicator: '电信、计算机和信息服务进出口',
    geography: '中国',
    year: 2025,
    value: 1545.3,
    unit: '亿美元',
    currency: 'USD',
    flow: 'imports_exports',
    sourceName: '一组数据带你看我国数字贸易发展成绩单',
    sourceUrl: 'https://tradeinservices.mofcom.gov.cn/article/hyly/szmy/202609/201057.html',
    publisher: '商务部服务贸易网',
    definition: '中国电信、计算机和信息服务进出口总额；与同指标2020年值比较。',
    status: 'official',
    updatedAt: '2026-09-08'
  },
  {
    id: 'cn-service-trade-2025',
    domain: 'service_trade',
    indicator: '服务贸易进出口总额',
    geography: '中国',
    year: 2025,
    value: 80823.1,
    unit: '亿元',
    currency: 'CNY',
    flow: 'imports_exports',
    reportedGrowthPct: 7.4,
    sourceName: '商务部服贸司负责人介绍2025年服务贸易发展情况',
    sourceUrl: 'https://www.mofcom.gov.cn/syxwfb/art/2026/art_7d8d9f93478046b59c08b1639900849d.html',
    publisher: '中华人民共和国商务部',
    definition: '中国服务贸易进出口总额。',
    status: 'official',
    updatedAt: '2026-02-05'
  },
  {
    id: 'cn-knowledge-intensive-2025',
    domain: 'service_trade',
    indicator: '知识密集型服务进出口',
    geography: '中国',
    year: 2025,
    value: 30879.5,
    unit: '亿元',
    currency: 'CNY',
    flow: 'imports_exports',
    reportedGrowthPct: 6.6,
    sourceName: '商务部服贸司负责人介绍2025年服务贸易发展情况',
    sourceUrl: 'https://www.mofcom.gov.cn/syxwfb/art/2026/art_7d8d9f93478046b59c08b1639900849d.html',
    publisher: '中华人民共和国商务部',
    definition: '中国知识密集型服务贸易进出口总额；属于服务贸易总额的组成部分。',
    status: 'official',
    updatedAt: '2026-02-05'
  },
  {
    id: 'cn-telecom-info-mofcom-2025',
    domain: 'service_trade',
    indicator: '电信计算机和信息服务进出口',
    geography: '中国',
    year: 2025,
    value: 11038.1,
    unit: '亿元',
    currency: 'CNY',
    flow: 'imports_exports',
    reportedGrowthPct: 10.4,
    sourceName: '商务部服贸司负责人介绍2025年服务贸易发展情况',
    sourceUrl: 'https://www.mofcom.gov.cn/syxwfb/art/2026/art_7d8d9f93478046b59c08b1639900849d.html',
    publisher: '中华人民共和国商务部',
    definition: '商务部服务贸易统计中的电信、计算机和信息服务；与数字化交付服务总额不是同一统计指标。',
    status: 'official',
    updatedAt: '2026-02-05'
  },
  ...[
    {code: 'CN', geography: '中国', value: 243113.0527},
    {code: 'US', geography: '美国', value: 821355.35},
    {code: 'JP', geography: '日本', value: 128207.5337},
    {code: 'SG', geography: '新加坡', value: 234204.9945},
    {code: 'KR', geography: '韩国', value: 75086.8275}
  ].map(({code, geography, value}) => ({
    id: `wto-dds-${code.toLowerCase()}-2025`,
    domain: 'digital_services' as const,
    indicator: '数字化交付服务出口',
    geography,
    year: 2025,
    value,
    unit: 'million USD',
    currency: 'USD',
    flow: 'exports' as const,
    sourceName: 'WTO Digitally Delivered Services Trade Dataset',
    sourceUrl: WTO_DATASET_URL,
    publisher: WTO_PUBLISHER,
    definition:
      'WTO对数字化交付服务出口的官方估算；报告方对世界的 Mode 1 出口总额，不能作为该市场商品进口需求或跨境电商货物贸易规模。',
    status: 'classroom_snapshot' as const,
    updatedAt: '2026-10-14'
  }))
]

let activeTradeDataSnapshot: TradeDataSnapshot[] = TRADE_DATA_SNAPSHOT

function mergeSnapshot(rows: TradeDataSnapshot[]) {
  const byId = new Map<string, TradeDataSnapshot>()
  for (const item of [...TRADE_DATA_SNAPSHOT, ...rows]) {
    const key =
      item.publisher === WTO_PUBLISHER && item.indicator === '数字化交付服务出口'
        ? `wto-dds-${item.geography}-${item.year}`
        : item.id
    byId.set(key, item)
  }
  return [...byId.values()].sort(
    (a, b) => a.domain.localeCompare(b.domain) || a.geography.localeCompare(b.geography) || a.year - b.year
  )
}

export function getTradeDataSnapshot() {
  return activeTradeDataSnapshot
}

export interface TradeDataFetchResult {
  data: TradeDataSnapshot[]
  live: boolean
  cacheHit?: boolean
  stale?: boolean
  fetchedAt?: string
}

export async function fetchLiveTradeData(): Promise<TradeDataFetchResult> {
  try {
    const {data, error} = await supabase.functions.invoke('trade-data-sync', {body: {}})
    const payload = data as {
      data?: TradeDataSnapshot[]
      fetched_at?: string
      cache_hit?: boolean
      stale?: boolean
    } | null
    const rows = Array.isArray(payload?.data) ? payload.data : []
    if (!rows.length) throw error || new Error('WTO dataset empty')
    activeTradeDataSnapshot = mergeSnapshot(rows)
    return {
      data: activeTradeDataSnapshot,
      live: !payload?.stale,
      cacheHit: Boolean(payload?.cache_hit),
      stale: Boolean(payload?.stale),
      fetchedAt: payload?.fetched_at
    }
  } catch {
    activeTradeDataSnapshot = TRADE_DATA_SNAPSHOT
    return {data: TRADE_DATA_SNAPSHOT, live: false}
  }
}

export const MARKET_OPTIONS = [
  {name: '美国', en: 'United States', note: 'WTO报告方出口数据可作数字服务背景，不代表美国商品进口需求'},
  {name: '日本', en: 'Japan', note: '需补充当地品类进口、渠道和竞争数据后判断商品需求'},
  {name: '新加坡', en: 'Singapore', note: '数字服务出口规模不等于文创商品市场体量'},
  {name: '韩国', en: 'South Korea', note: '需验证当地文创品类竞争、履约和合规要求'}
] as const

export function calculateYoY(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1))
}

export function calculateCagr(start: number, end: number, years: number): number | null {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < 0 || years <= 0) return null
  return Number((((end / start) ** (1 / years) - 1) * 100).toFixed(1))
}

function byYear(rows: TradeDataSnapshot[]) {
  return [...rows].sort((a, b) => a.year - b.year)
}

export function getSnapshotSummary(snapshot: TradeDataSnapshot[] = activeTradeDataSnapshot) {
  const ecommerce = byYear(
    snapshot.filter((item) => item.indicator === '跨境电商进出口规模' && item.flow === 'imports_exports')
  )
  const digitalDelivered = byYear(
    snapshot.filter((item) => item.indicator === '可数字化交付服务进出口' && item.flow === 'imports_exports')
  )
  const telecomComputerInfo = byYear(
    snapshot.filter((item) => item.indicator === '电信、计算机和信息服务进出口' && item.flow === 'imports_exports')
  )
  const wtoDigitalExports = byYear(
    snapshot.filter(
      (item) => item.publisher === WTO_PUBLISHER && item.indicator === '数字化交付服务出口' && item.flow === 'exports'
    )
  )
  const serviceTrade = snapshot.filter((item) => item.domain === 'service_trade' && item.year === 2025)
  const latestEcommerce = ecommerce[ecommerce.length - 1]
  const latestDigitalDelivered = digitalDelivered[digitalDelivered.length - 1]
  const latestTelecomComputerInfo = telecomComputerInfo[telecomComputerInfo.length - 1]
  const latestWtoYear = wtoDigitalExports.length ? Math.max(...wtoDigitalExports.map((item) => item.year)) : null
  const wtoLatestByMarket = WTO_MARKETS.map((market) => getWtoMarketEvidence(snapshot, market)).filter(
    (item): item is TradeDataSnapshot => Boolean(item)
  )

  return {
    ecommerce,
    digitalDelivered,
    telecomComputerInfo,
    wtoDigitalExports,
    wtoLatestByMarket,
    serviceTrade,
    latestEcommerce,
    latestDigitalDelivered,
    latestTelecomComputerInfo,
    latestWtoYear,
    ecommerceReportedGrowthPct: latestEcommerce?.reportedGrowthPct ?? null,
    digitalReportedGrowthPct: latestDigitalDelivered?.reportedGrowthPct ?? null,
    telecomComputerInfoCagr:
      telecomComputerInfo.length >= 2
        ? calculateCagr(
            telecomComputerInfo[0].value,
            latestTelecomComputerInfo.value,
            latestTelecomComputerInfo.year - telecomComputerInfo[0].year
          )
        : null,
    officialCount: snapshot.filter((item) => item.status === 'official').length
  }
}

export function getWtoMarketEvidence(snapshot: TradeDataSnapshot[], market: string) {
  const rows = byYear(
    snapshot.filter(
      (item) =>
        item.publisher === WTO_PUBLISHER &&
        item.indicator === '数字化交付服务出口' &&
        item.flow === 'exports' &&
        item.geography === market
    )
  )
  return rows[rows.length - 1]
}
