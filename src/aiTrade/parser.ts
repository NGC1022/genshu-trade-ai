// AI跨境贸易助手：结果解析与格式校验
// 职责：对 Provider 返回的 unknown 数据做 JSON 解析、格式校验、字段兜底，
// 保证页面永远不会渲染出 undefined / null / [object Object]。

import {
  AiServiceError,
  type ComplianceResult,
  type CustomerIntentResult,
  type ExceptionSuggestionResult,
  type InquiryAnalysisResult,
  type MarketAnalysisResult,
  type MarketingContentResult,
  type ProductIntlResult,
  type QuoteDescriptionResult,
  type SupportReplyResult,
  type TradeDocField,
  type TradeDocumentResult
} from './types'

export const PENDING_CN = '待确认'

/** 安全JSON解析（真实AI返回文本时使用；Mock直接返回对象，但仍走统一校验入口） */
export function safeJsonParse<T>(raw: string): T | null {
  try {
    const obj = JSON.parse(raw)
    return typeof obj === 'object' && obj !== null ? (obj as T) : null
  } catch {
    return null
  }
}

/** 字符串兜底：空/非字符串 → 待确认 */
export function ensureStr(v: unknown, fallback: string = PENDING_CN): string {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return fallback
}

/** 字符串数组兜底：过滤空项；全空 → 单项"待确认" */
export function ensureStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [PENDING_CN]
  const list = v
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((s) => s.trim())
  return list.length > 0 ? list : [PENDING_CN]
}

/** 校验非空对象（防止 Provider 返回 null/数组/原始值） */
export function assertValidObject(v: unknown, scene: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new AiServiceError('INVALID_RESULT', `AI返回结果格式异常（${scene}），请重试`)
  }
  return v as Record<string, unknown>
}

/** 校验：AI商品国际化结果 */
export function validateProductIntl(v: unknown): ProductIntlResult {
  const o = assertValidObject(v, '商品国际化')
  return {
    title: ensureStr(o.title),
    description: ensureStr(o.description),
    features: ensureStrArray(o.features),
    keywords: ensureStrArray(o.keywords),
    cultural_background: ensureStr(o.cultural_background),
    material: ensureStr(o.material),
    specification: ensureStr(o.specification),
    notice: ensureStr(o.notice)
  }
}

/** 校验：AI市场分析结果 */
export function validateMarketAnalysis(v: unknown): MarketAnalysisResult {
  const o = assertValidObject(v, '市场分析')
  return {
    market: ensureStr(o.market),
    consumer_profile: ensureStr(o.consumer_profile),
    consumption_scenario: ensureStr(o.consumption_scenario),
    cultural_fit: ensureStr(o.cultural_fit),
    price_fit: ensureStr(o.price_fit),
    marketing_focus: ensureStrArray(o.marketing_focus),
    potential_risks: ensureStrArray(o.potential_risks),
    data_to_verify: ensureStrArray(o.data_to_verify),
    analysis_summary: ensureStr(o.analysis_summary)
  }
}

/** 校验：AI询盘识别结果 */
export function validateInquiryAnalysis(v: unknown): InquiryAnalysisResult {
  const o = assertValidObject(v, '询盘识别')
  return {
    product: ensureStr(o.product),
    quantity: ensureStr(o.quantity),
    destination: ensureStr(o.destination),
    customer_type: ensureStr(o.customer_type),
    purchase_scenario: ensureStr(o.purchase_scenario),
    requirements: ensureStrArray(o.requirements),
    missing_information: ensureStrArray(o.missing_information)
  }
}

/** 校验：AI报价说明结果 */
export function validateQuoteDescription(v: unknown): QuoteDescriptionResult {
  const o = assertValidObject(v, '报价说明')
  return {
    description: ensureStr(o.description),
    items_to_confirm: ensureStrArray(o.items_to_confirm)
  }
}

/** 校验：AI英文回复 */
export function validateInquiryReply(v: unknown): {reply: string; to_confirm: string[]} {
  const o = assertValidObject(v, '英文回复')
  return {
    reply: ensureStr(o.reply),
    to_confirm: ensureStrArray(o.to_confirm)
  }
}

/** 校验：AI客服回复 */
export function validateSupportReply(v: unknown): SupportReplyResult {
  const o = assertValidObject(v, '客服回复')
  return {
    reply: ensureStr(o.reply),
    suggestions: ensureStrArray(o.suggestions)
  }
}

/** 校验：贸易合规检查结果 */
export function validateCompliance(v: unknown): ComplianceResult {
  const o = assertValidObject(v, '贸易合规检查')
  const score =
    typeof o.completeness_score === 'number' && Number.isFinite(o.completeness_score)
      ? Math.max(0, Math.min(100, Math.round(o.completeness_score)))
      : 0
  return {
    completeness_score: score,
    missing_fields: ensureStrArray(o.missing_fields),
    hs_code_suggestion: ensureStr(o.hs_code_suggestion),
    hs_code_note: ensureStr(o.hs_code_note),
    import_requirements: ensureStrArray(o.import_requirements),
    packaging_label_checks: ensureStrArray(o.packaging_label_checks),
    origin_checks: ensureStrArray(o.origin_checks),
    trade_risks: ensureStrArray(o.trade_risks),
    manual_confirmation: ensureStrArray(o.manual_confirmation)
  }
}

/** 校验：贸易单证生成结果 */
export function validateTradeDocument(v: unknown): TradeDocumentResult {
  const o = assertValidObject(v, '贸易单证')
  const rawFields = Array.isArray(o.fields) ? o.fields : []
  const fields: TradeDocField[] = rawFields.map((f, i) => {
    const fo = (typeof f === 'object' && f !== null ? f : {}) as Record<string, unknown>
    return {
      key: ensureStr(fo.key, `field_${i}`),
      label: ensureStr(fo.label, `字段${i + 1}`),
      value: ensureStr(fo.value, PENDING_CN),
      filled: fo.filled !== false && ensureStr(fo.value, '') !== ''
    }
  })
  return {
    doc_type: ensureStr(o.doc_type, 'proforma_invoice') as TradeDocumentResult['doc_type'],
    title: ensureStr(o.title, '贸易单证草稿'),
    fields: fields.length > 0 ? fields : [{key: 'empty', label: '内容', value: PENDING_CN, filled: false}],
    missing_fields: ensureStrArray(o.missing_fields),
    notes: ensureStrArray(o.notes)
  }
}

/** 校验：客户意向识别结果 */
export function validateCustomerIntent(v: unknown): CustomerIntentResult {
  const o = assertValidObject(v, '意向识别')
  return {
    intent_type: ensureStr(o.intent_type),
    intent_tags: ensureStrArray(o.intent_tags),
    product: ensureStr(o.product),
    quantity: ensureStr(o.quantity),
    destination: ensureStr(o.destination),
    purchase_scenario: ensureStr(o.purchase_scenario),
    key_requirements: ensureStrArray(o.key_requirements),
    price_need: ensureStr(o.price_need),
    delivery_need: ensureStr(o.delivery_need),
    logistics_need: ensureStr(o.logistics_need),
    missing_information: ensureStrArray(o.missing_information)
  }
}

/** 校验：营销素材结果 */
export function validateMarketingContent(v: unknown): MarketingContentResult {
  const o = assertValidObject(v, '营销素材')
  return {
    overseas_title: ensureStr(o.overseas_title),
    selling_points: ensureStrArray(o.selling_points),
    seo_keywords: ensureStrArray(o.seo_keywords),
    instagram_copy: ensureStr(o.instagram_copy),
    facebook_copy: ensureStr(o.facebook_copy),
    tiktok_script: ensureStrArray(o.tiktok_script),
    email_subject: ensureStr(o.email_subject),
    risk_notice: ensureStr(
      o.risk_notice,
      'AI生成内容仅基于已有真实商品信息，不虚构功效、认证、销量、评价或市场数据，发布前须人工审核确认。'
    )
  }
}

/** 校验：异常订单建议结果 */
export function validateExceptionSuggestion(v: unknown): ExceptionSuggestionResult {
  const o = assertValidObject(v, '异常处理建议')
  return {
    suggestions: ensureStrArray(o.suggestions),
    notify_draft: ensureStr(o.notify_draft),
    to_confirm: ensureStrArray(o.to_confirm)
  }
}

/** 展示兜底：渲染层最终防线，任何值 → 可显示文本 */
export function displayText(v: unknown): string {
  if (v === null || v === undefined) return PENDING_CN
  if (typeof v === 'string') return v || PENDING_CN
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (Array.isArray(v)) {
    const list = v.filter((i) => typeof i === 'string' && i.trim())
    return list.length > 0 ? list.join('、') : PENDING_CN
  }
  return PENDING_CN
}
