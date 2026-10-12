// 多币种与汇率工具（课堂演示用）
// 规则：未接入实时汇率API，所有汇率均为「演示汇率」或「用户输入汇率」，
// 页面必须显示"非实时汇率，仅用于课堂演示"。
// 数据结构预留 source / updatedAt / rate 字段，后续接入真实API时直接替换数据来源。

export type CurrencyCode = 'CNY' | 'USD' | 'EUR' | 'JPY' | 'GBP' | 'SGD'

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  GBP: '£',
  SGD: 'S$'
}

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  CNY: '人民币',
  USD: '美元',
  EUR: '欧元',
  JPY: '日元',
  GBP: '英镑',
  SGD: '新加坡元'
}

// 汇率数据结构（预留真实API字段）
export interface ExchangeRateInfo {
  rate: number // 1 CNY = rate 目标币种
  source: string // 数据来源
  updatedAt: string // 更新时间
  isRealtime: boolean // 是否实时
}

// 演示汇率（1 CNY 兑换目标币种，2024年课堂演示参考值，非实时数据）
const DEMO_RATES: Record<CurrencyCode, number> = {
  CNY: 1,
  USD: 0.14,
  EUR: 0.13,
  JPY: 21.5,
  GBP: 0.11,
  SGD: 0.19
}

export const DEMO_RATE_UPDATED_AT = '2024-06-01'
export const DEMO_RATE_SOURCE = '课堂演示汇率（用户可修改）'
export const DEMO_RATE_BADGE = '非实时汇率，仅用于课堂演示'

/** 获取演示汇率信息（含来源与更新时间标注） */
export function getDemoRateInfo(currency: CurrencyCode): ExchangeRateInfo {
  return {
    rate: DEMO_RATES[currency],
    source: DEMO_RATE_SOURCE,
    updatedAt: DEMO_RATE_UPDATED_AT,
    isRealtime: false
  }
}

/** CNY → 目标币种金额换算（保留2位小数） */
export function convertFromCny(amountCny: number, rate: number): number {
  if (!Number.isFinite(amountCny) || !Number.isFinite(rate) || rate <= 0) return 0
  return Number((amountCny * rate).toFixed(2))
}

/** 币种格式化显示 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  if (!Number.isFinite(amount)) return `${symbol}0.00`
  return `${symbol}${amount.toFixed(2)}`
}

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'SGD']
