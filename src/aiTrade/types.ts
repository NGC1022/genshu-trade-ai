// AI跨境贸易助手：类型定义
// 说明：本模块所有输出均由 Provider 产生；真实数据缺失时统一以「待确认」兜底

// 商品信息输入（来自SKU，仅真实字段）
export interface ProductIntlInput {
  productId: string
  name: string // 中文商品名
  description?: string
  category?: string
  price?: number
  material?: string
  specification?: string
  culturalBackground?: string
  imageUrl?: string
}

// 功能1输出：AI商品国际化（英文商品信息）
export interface ProductIntlResult {
  title: string
  description: string
  features: string[]
  keywords: string[]
  cultural_background: string
  material: string
  specification: string
  notice: string
}

// 功能2输出：AI海外市场分析（单市场）
export interface MarketAnalysisResult {
  market: string
  consumer_profile: string
  consumption_scenario: string
  cultural_fit: string
  price_fit: string
  marketing_focus: string[]
  potential_risks: string[]
  data_to_verify: string[]
  analysis_summary: string
}

// 功能3输出：AI询盘识别
export interface InquiryAnalysisResult {
  product: string
  quantity: string
  destination: string
  customer_type: string
  purchase_scenario: string
  requirements: string[]
  missing_information: string[]
}

// 功能3输出：AI英文回复
export interface InquiryReplyResult {
  reply: string
  to_confirm: string[]
}

// 功能4输入：报价参数
export interface QuoteInput {
  productName: string
  quantity: number
  destination: string
  currency: string
  unitPrice: number
  shippingCost: number
  otherCost: number
  exchangeRate?: number // 用户输入汇率，仅用于课堂演示
  remark?: string
}

// 功能4：程序计算的报价结果（基础数学由程序完成，AI不参与计算）
export interface QuoteCalculation {
  productAmount: number // 商品金额 = 单价 × 数量
  totalCost: number // 预估总成本 = 商品金额 + 物流成本 + 其他费用
}

// 功能4输出：AI英文报价说明
export interface QuoteDescriptionResult {
  description: string
  items_to_confirm: string[]
}

// AI跨境客服：聊天消息（多轮对话）
export interface SupportMessage {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string // 用户发送的文创商品图片（公网URL）
}

// AI客服回复输出
export interface SupportReplyResult {
  reply: string
  suggestions: string[] // 建议的后续问题
}

// AI图片识别输出（MiniMax-M3 多模态识别文创商品图片）
export interface ImageAnalysisResult {
  name: string // 识别出的商品名称
  category: string // 商品类别
  material: string // 材质
  features: string[] // 外观特征
  cultural_elements: string[] // 文化元素
  description: string // 综合描述
  suggestions: string[] // 建议的后续问题
}

// AI服务统一错误
export type AiErrorCode = 'EMPTY_INPUT' | 'TIMEOUT' | 'INVALID_RESULT' | 'SERVICE_ERROR'

export class AiServiceError extends Error {
  code: AiErrorCode

  constructor(code: AiErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'AiServiceError'
  }
}

// ==================== 贸易合规助手 ====================

export interface ComplianceInput {
  productName: string
  market: string
  material?: string
  usage?: string
  tradeMode?: string
  additionalInfo?: string
}

export interface ComplianceResult {
  completeness_score: number // 0-100 商品信息完整度
  missing_fields: string[]
  hs_code_suggestion: string
  hs_code_note: string
  import_requirements: string[]
  packaging_label_checks: string[]
  origin_checks: string[]
  trade_risks: string[]
  manual_confirmation: string[]
}

// ==================== 贸易单证助手 ====================

export type TradeDocumentType =
  | 'proforma_invoice'
  | 'commercial_invoice'
  | 'packing_list'
  | 'order_confirmation'
  | 'shipping_instruction'

export interface TradeDocumentInput {
  docType: TradeDocumentType
  orderNo?: string
  quoteNo?: string
  customerName?: string
  customerCountry?: string
  customerAddress?: string
  productName?: string
  quantity?: number
  unitPrice?: number
  currency?: string
  totalAmount?: number
  shippingMethod?: string
  incoterms?: string
  weightKg?: number
  packagingInfo?: string
  bankInfo?: string
  sellerName?: string
  sellerAddress?: string
}

export interface TradeDocField {
  key: string
  label: string
  value: string
  filled: boolean
}

export interface TradeDocumentResult {
  doc_type: TradeDocumentType
  title: string
  fields: TradeDocField[]
  missing_fields: string[]
  notes: string[]
}

// ==================== 客户意向识别 ====================

export interface CustomerIntentResult {
  intent_type: string
  intent_tags: string[]
  product: string
  quantity: string
  destination: string
  purchase_scenario: string
  key_requirements: string[]
  price_need: string
  delivery_need: string
  logistics_need: string
  missing_information: string[]
}

// ==================== 海外营销素材 ====================

export interface MarketingInput {
  productName: string
  market: string
  material?: string
  features?: string[]
  price?: number
  culturalBackground?: string
}

export interface MarketingContentResult {
  overseas_title: string
  selling_points: string[]
  seo_keywords: string[]
  instagram_copy: string
  facebook_copy: string
  tiktok_script: string[]
  email_subject: string
  risk_notice: string
}

// ==================== 异常订单AI建议 ====================

export interface ExceptionSuggestionResult {
  suggestions: string[]
  notify_draft: string
  to_confirm: string[]
}
