import {supabase} from '@/client/supabase'

export type TradeDataStatus = 'official' | 'classroom_snapshot' | 'ai_inference'

export interface TradeDataSnapshot {
  id: string
  domain: 'cross_border_ecommerce' | 'digital_services' | 'service_trade'
  indicator: string
  geography: string
  year: number
  value: number
  unit: string
  currency?: string
  sourceName: string
  sourceUrl: string
  publisher: string
  definition: string
  status: TradeDataStatus
  updatedAt: string
}

export interface MarketScoreBreakdown {
  market: string
  total: number
  scale: number
  growth: number
  digitalRelevance: number
  culturalFit: number
  feasibility: number
  rationale: string
  status: 'ai_inference'
}

export const TRADE_DATA_SOURCES = [
  {
    id: 'wto-digital-services',
    name: 'WTO Digitally Delivered Services Trade Dataset',
    publisher: 'World Trade Organization',
    url: 'https://www.wto.org/english/res_e/statis_e/gstdh_digital_services_e.htm',
    scope: '200+ economies · 8 sub-sectors · 2005–2025',
    note: '数字化交付服务：通过互联网、应用、电子邮件、语音视频通话和数字中介平台交付的服务。'
  },
  {
    id: 'customs-cross-border-ecommerce',
    name: '2025年中国跨境电商进出口情况',
    publisher: '中华人民共和国海关总署',
    url: 'https://www.customs.gov.cn/customs/2026-06/16/article_2026061616113889190.html',
    scope: '中国 · 2025年 · 跨境电商货物贸易',
    note: '跨境电商进出口规模与货物贸易占比，不等同于数字化交付服务贸易。'
  },
  {
    id: 'mofcom-service-trade',
    name: '2025年服务贸易发展情况',
    publisher: '中华人民共和国商务部',
    url: 'http://www.mofcom.gov.cn/syxwfb/art/2026/art_7d8d9f93478046b59c08b1639900849d.html',
    scope: '中国 · 2025年 · 服务贸易',
    note: '包含知识密集型服务、电信计算机和信息服务等指标。'
  },
  {
    id: 'mofcom-digital-trade',
    name: '一组数据带你看我国数字贸易发展成绩单',
    publisher: '商务部服务贸易网',
    url: 'https://tradeinservices.mofcom.gov.cn/article/hyly/szmy/202609/201057.html',
    scope: '中国 · 2020–2025年 · 数字贸易相关指标',
    note: '可数字化交付服务进出口及电信、计算机和信息服务进出口数据。'
  }
] as const

// 仅放入已核对的公开指标；没有来源数字时不补造连续年度数值。
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
    sourceName: '2.63万亿元跨境电商聚新成势',
    sourceUrl: 'https://www.news.cn/tech/20250205/a2c50031a6a843e08b400fd61212bfcb/c.html',
    publisher: '新华社',
    definition: '中国跨境电商进出口总额。',
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
    sourceName: '2025年中国跨境电商进出口情况',
    sourceUrl: 'https://www.customs.gov.cn/customs/2026-06/16/article_2026061616113889190.html',
    publisher: '中华人民共和国海关总署',
    definition: '中国跨境电商进出口总额。2025年出口2.27万亿元、进口5702亿元。',
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
    sourceName: '一组数据带你看我国数字贸易发展成绩单',
    sourceUrl: 'https://tradeinservices.mofcom.gov.cn/article/hyly/szmy/202609/201057.html',
    publisher: '商务部服务贸易网',
    definition: '以数字化方式交付的服务贸易规模。不能与跨境电商货物规模直接相加。',
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
    sourceName: '一组数据带你看我国数字贸易发展成绩单',
    sourceUrl: 'https://tradeinservices.mofcom.gov.cn/article/hyly/szmy/202609/201057.html',
    publisher: '商务部服务贸易网',
    definition: '电信、计算机和信息服务进出口。',
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
    sourceName: '一组数据带你看我国数字贸易发展成绩单',
    sourceUrl: 'https://tradeinservices.mofcom.gov.cn/article/hyly/szmy/202609/201057.html',
    publisher: '商务部服务贸易网',
    definition: '电信、计算机和信息服务进出口。',
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
    sourceName: '2025年服务贸易发展情况',
    sourceUrl: 'http://www.mofcom.gov.cn/syxwfb/art/2026/art_7d8d9f93478046b59c08b1639900849d.html',
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
    sourceName: '2025年服务贸易发展情况',
    sourceUrl: 'http://www.mofcom.gov.cn/syxwfb/art/2026/art_7d8d9f93478046b59c08b1639900849d.html',
    publisher: '中华人民共和国商务部',
    definition: '知识密集型服务贸易进出口总额。',
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
    sourceName: '2025年服务贸易发展情况',
    sourceUrl: 'http://www.mofcom.gov.cn/syxwfb/art/2026/art_7d8d9f93478046b59c08b1639900849d.html',
    publisher: '中华人民共和国商务部',
    definition: '服务贸易统计中的电信、计算机和信息服务。',
    status: 'official',
    updatedAt: '2026-02-05'
  }
]

let activeTradeDataSnapshot: TradeDataSnapshot[] = TRADE_DATA_SNAPSHOT

export function getTradeDataSnapshot() {
  return activeTradeDataSnapshot
}

export async function fetchLiveTradeData(): Promise<{data: TradeDataSnapshot[]; live: boolean; fetchedAt?: string}> {
  try {
    const {data, error} = await supabase.functions.invoke('trade-data-sync', {body: {}})
    const list = data && Array.isArray(data.data) ? (data.data as TradeDataSnapshot[]) : []
    if (error || list.length === 0) throw error || new Error('实时贸易数据为空')
    activeTradeDataSnapshot = [...TRADE_DATA_SNAPSHOT, ...list]
    return {data: activeTradeDataSnapshot, live: true, fetchedAt: data.fetched_at}
  } catch {
    activeTradeDataSnapshot = TRADE_DATA_SNAPSHOT
    return {data: TRADE_DATA_SNAPSHOT, live: false}
  }
}

export const MARKET_OPTIONS = [
  {name: '美国', en: 'United States', note: '成熟消费市场，履约与合规信息需要进一步核验'},
  {name: '日本', en: 'Japan', note: '文化内容适配度较高，需验证价格和渠道'},
  {name: '新加坡', en: 'Singapore', note: '数字服务环境较强，市场体量需谨慎解读'},
  {name: '韩国', en: 'South Korea', note: '内容消费活跃，需验证文创品类竞争强度'}
] as const

export function calculateYoY(current: number, previous: number): number | null {
  if (!previous) return null
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

export function calculateCagr(start: number, end: number, years: number): number | null {
  if (!start || years <= 0) return null
  return Number(((Math.pow(end / start, 1 / years) - 1) * 100).toFixed(1))
}

export function getSnapshotSummary() {
  const snapshot = activeTradeDataSnapshot
  const ecommerce = snapshot.filter((item) => item.indicator === '跨境电商进出口规模').sort((a, b) => a.year - b.year)
  const digital = snapshot.filter((item) => item.indicator === '电信、计算机和信息服务进出口' || item.indicator === '数字化交付服务出口').sort((a, b) => a.year - b.year)
  const latestEcommerce = ecommerce[ecommerce.length - 1]
  const latestDigital = digital[digital.length - 1]
  return {
    ecommerce,
    digital,
    ecommerceYoY: ecommerce.length >= 2 ? calculateYoY(latestEcommerce.value, ecommerce[ecommerce.length - 2].value) : null,
    digitalCagr: digital.length >= 2 ? calculateCagr(digital[0].value, latestDigital.value, latestDigital.year - digital[0].year) : null,
    officialCount: snapshot.filter((item) => item.status === 'official').length
  }
}

export function scoreMarkets(): MarketScoreBreakdown[] {
  const base: Record<string, Omit<MarketScoreBreakdown, 'market' | 'total' | 'status'>> = {
    美国: {scale: 88, growth: 72, digitalRelevance: 82, culturalFit: 68, feasibility: 64, rationale: '规模与数字化环境较强，但合规、履约和竞争信息需要在商品层面继续核验。'},
    日本: {scale: 69, growth: 66, digitalRelevance: 76, culturalFit: 86, feasibility: 74, rationale: '文化内容适配度较好，适合先验证小批量文创和内容传播。'},
    新加坡: {scale: 46, growth: 78, digitalRelevance: 88, culturalFit: 70, feasibility: 80, rationale: '数字服务环境和履约条件较好，但不能仅用数字服务规模推断商品销量。'},
    韩国: {scale: 63, growth: 73, digitalRelevance: 79, culturalFit: 78, feasibility: 68, rationale: '内容消费活跃，仍需补充品类竞争、渠道成本和合规数据。'}
  }
  return Object.entries(base).map(([market, item]) => ({
    market,
    ...item,
    total: Math.round(item.scale * 0.3 + item.growth * 0.25 + item.digitalRelevance * 0.2 + item.culturalFit * 0.15 + item.feasibility * 0.1),
    status: 'ai_inference' as const
  })).sort((a, b) => b.total - a.total)
}
