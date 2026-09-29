// 用户角色
export type UserRole = 'user' | 'admin' | 'merchant' | 'reviewer'

// 订单状态：13 态统一状态机
// pending → paid → preparing → shipped → in_transit → customs → customs_cleared → last_mile → delivered → completed
// 旁路：after_sales / cancelling / refunding / refunded
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'in_transit'
  | 'customs'
  | 'customs_cleared'
  | 'last_mile'
  | 'delivered'
  | 'after_sales'
  | 'completed'
  | 'cancelled'
  | 'refunding'
  | 'refunded'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待付款',
  paid: '已付款',
  preparing: '备货中',
  shipped: '已发货',
  in_transit: '国际运输中',
  customs: '目的国清关',
  customs_cleared: '清关完成',
  last_mile: '末端配送',
  delivered: '已签收',
  after_sales: '售后中',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款'
}

// 支付状态：与订单状态分离
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunding' | 'refunded'

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: '待支付',
  processing: '支付处理中',
  paid: '已支付',
  failed: '支付失败',
  refunding: '退款中',
  refunded: '已退款'
}

// 订单类型：B2C 个人购买 / B2B 批量采购
export type OrderType = 'b2c' | 'b2b'

// 贸易条款
export type TradeTerm = 'EXW' | 'FOB' | 'CIF' | 'CFR' | 'DAP' | 'DDP' | 'FCA' | 'CPT'

// 退款状态
export type RefundStatus = 'pending_review' | 'processing' | 'completed' | 'closed' | 'abnormal'

// 配送方式
export type DeliveryMethod = 'pickup' | 'express'

// 定制类型
export type CustomizationType = '3d_print' | 'premium'

// 定制状态
export type CustomizationStatus =
  | 'pending'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

// 门票状态
export type TicketStatus = 'unused' | 'used' | 'expired' | 'refunded'

// 用户资料
export interface Profile {
  id: string
  email?: string
  phone?: string
  username?: string
  openid?: string
  role: UserRole
  avatar_url?: string
  bio?: string
  followers_count?: number
  following_count?: number
  total_likes?: number
  notes_count?: number
  show_following_list?: boolean
  show_likes_list?: boolean
  show_customization_status?: boolean
  is_member: boolean
  member_level: string
  member_points: number
  member_since?: string
  created_at: string
  updated_at: string
}

// 数字IP
export interface DigitalIP {
  id: string
  name: string
  concept?: string
  highlights?: string
  background_story?: string
  role_setting?: string
  image_url?: string
  comic_strip?: string[]
  is_active: boolean
  created_at: string
}

// 优惠券
export interface Coupon {
  id: string
  title: string
  description?: string
  discount_amount: number
  min_order_amount: number
  valid_from: string
  valid_until: string
  is_active: boolean
  created_at: string
}

// 用户持有的优惠券
export interface UserCoupon {
  id: string
  user_id: string
  coupon_id: string
  is_used: boolean
  used_at?: string
  acquired_at: string
  coupon?: Coupon
}

// 会员专属内容
export interface ExclusiveContent {
  id: string
  title: string
  content: string
  category?: string
  cover_image?: string
  is_active: boolean
  created_at: string
}

// 3D 打印模板
export interface ThreeDTemplate {
  id: string
  name: string
  description?: string
  image_url?: string
  price: number
  is_active: boolean
  created_at: string
}

// 商品SKU
export interface SKU {
  id: string
  sku_code: string
  name: string
  description?: string
  category: 'regular' | 'premium'
  price: number
  image_url?: string
  stock_available: number
  stock_reserved: number
  stock_sold: number
  is_active: boolean
  // 国际化与跨境贸易扩展字段（商品国际化资料完整度检查依据）
  name_en?: string | null
  description_en?: string | null
  material?: string | null
  dimensions?: string | null
  weight_grams?: number | null
  packaging?: string | null
  origin?: string | null
  lead_time?: string | null
  after_sales_policy?: string | null
  sellable_countries?: string[] | null
  stock_warning_threshold?: number | null
  cost?: number | null
  // B2B 与运营扩展
  is_on_sale?: boolean
  moq?: number | null
  price_tiers?: PriceTier[] | null
  b2b_unit_price?: number | null
  sample_price?: number | null
  created_at: string
  updated_at: string
}

// B2B 阶梯价格
export interface PriceTier {
  min_qty: number
  price: number
  note?: string
}

// 商品评价
export interface ProductReview {
  id: string
  sku_id: string
  user_id: string
  order_id?: string
  rating: number
  content: string
  images: string[]
  is_anonymous: boolean
  likes_count: number
  follow_up_content?: string
  follow_up_images?: string[]
  follow_up_at?: string
  created_at: string
  updated_at: string
  author?: {
    username: string
    avatar_url?: string
  }
}

// 评价点赞
export interface ProductReviewLike {
  id: string
  review_id: string
  user_id: string
  created_at: string
}

// 系统报错
export interface SystemReport {
  id: string
  user_id: string
  type:
    | 'system_error'
    | 'ui_issue'
    | 'feature_request'
    | 'other'
    | 'product_quality'
    | 'logistics_damage'
    | 'return_exchange'
  description: string
  images: string[]
  status: 'pending' | 'resolved' | 'ignored'
  admin_reply?: string
  created_at: string
  updated_at: string
  author?: {
    username: string
    avatar_url?: string
  }
}

// 门票类型
export interface TicketType {
  id: string
  name: string
  description?: string
  price: number
  original_price?: number
  validity_days: number
  usage_notes?: string
  image_url?: string
  stock_available: number
  stock_reserved: number
  stock_sold: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  images: string[]
  videos?: string[]
  topics: string[]
  music?: string
  cover_image?: string
  location?: {
    latitude: number
    longitude: number
    address: string
  }
  recommended_products?: string[]
  likes_count: number
  comments_count: number
  view_count?: number
  is_deleted?: boolean
  deleted_at?: string
  created_at: string
  author?: {
    username: string
    avatar_url?: string
  }
}

export interface ProfileVisitor {
  id: string
  profile_id: string
  visitor_id: string
  visited_at: string
  visitor?: {
    username: string
    avatar_url?: string
  }
}

export type MessageType =
  // 社区消息
  | 'note_deleted'
  | 'report_rejected'
  | 'note_restored'
  | 'system'
  | 'new_note_from_following'
  | 'new_follower'
  | 'note_liked'
  | 'comment_liked'
  | 'note_commented'
  | 'comment_replied'
  | 'mentioned'
  // 业务通知（第二轮）
  | 'order_paid'
  | 'order_shipped'
  | 'order_customs'
  | 'order_delivered'
  | 'order_cancelled'
  | 'after_sales_update'
  | 'inquiry_received'
  | 'quote_generated'
  | 'logistics_delay'
  | 'customs_issue'
  | 'payment_failed'

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  note_deleted: '笔记删除',
  report_rejected: '举报驳回',
  note_restored: '笔记恢复',
  system: '系统通知',
  new_note_from_following: '关注更新',
  new_follower: '新增关注',
  note_liked: '笔记获赞',
  comment_liked: '评论获赞',
  note_commented: '笔记评论',
  comment_replied: '评论回复',
  mentioned: '提到你',
  order_paid: '订单付款',
  order_shipped: '订单发货',
  order_customs: '订单清关',
  order_delivered: '订单签收',
  order_cancelled: '订单取消',
  after_sales_update: '售后更新',
  inquiry_received: '收到询盘',
  quote_generated: '报价生成',
  logistics_delay: '物流延迟',
  customs_issue: '清关异常',
  payment_failed: '支付失败'
}

export interface Message {
  id: string
  user_id: string
  type: MessageType
  title: string
  content: string
  // 社区关联
  related_note_id?: string
  related_user_id?: string
  related_comment_id?: string
  // 业务关联（第二轮）
  related_order_no?: string
  related_customer_id?: string
  related_inquiry_id?: string
  related_quote_id?: string
  related_after_sale_id?: string
  action_type?: string
  is_read: boolean
  is_important?: boolean
  created_at: string
  updated_at: string
}

export interface NoteDraft {
  id: string
  user_id: string
  title?: string
  content?: string
  images?: string[]
  topics?: string[]
  location?: {
    latitude: number
    longitude: number
    address: string
  }
  recommended_products?: string[]
  created_at: string
  updated_at: string
}

export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface NoteReport {
  id: string
  note_id: string
  reporter_id: string
  reason: string[]
  description?: string
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface NoteBlock {
  id: string
  note_id: string
  user_id: string
  created_at: string
}

export interface NoteLike {
  id: string
  user_id: string
  note_id: string
  created_at: string
}

export interface NoteComment {
  id: string
  user_id: string
  note_id: string
  parent_id?: string
  content: string
  images?: string[]
  likes_count: number
  is_deleted: boolean
  deleted_at?: string
  created_at: string
  author?: {
    username: string
    avatar_url?: string
  }
}

export interface CommentLike {
  id: string
  comment_id: string
  user_id: string
  created_at: string
}

export interface CommentReport {
  id: string
  comment_id: string
  reporter_id: string
  reason: string[]
  description?: string
  status: 'pending' | 'resolved' | 'rejected' | 'ignored'
  created_at: string
  updated_at: string
  comment?: NoteComment
}

export interface CommentHidden {
  id: string
  comment_id: string
  user_id: string
  created_at: string
}

export interface TicketStub {
  id: string
  user_id: string
  ticket_id: string
  ticket_type: string
  visit_date: string
  venue_name: string
  venue_address: string
  stub_image_url?: string
  is_redeemed: boolean
  redeemed_at?: string
  created_at: string
}

// 收货地址
export interface Address {
  id: string
  user_id: string
  receiver_name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default: boolean
  is_overseas: boolean
  country?: string | null
  overseas_detail?: string | null
  created_at: string
  updated_at: string
}

// 订单项
export interface OrderItem {
  sku_code: string
  sku_snapshot: SKU
  quantity: number
  unit_price: number
  subtotal: number
  refunded_quantity?: number
  refunded_amount?: number
}

// 商品订单
export interface Order {
  id: string
  order_no: string
  user_id: string
  openid: string
  status: OrderStatus
  payment_status: PaymentStatus
  order_type: OrderType
  items: OrderItem[]
  total_amount: number
  refunded_amount: number
  delivery_method: DeliveryMethod
  address_id?: string
  address_snapshot?: Address | null
  product_snapshot?: OrderProductSnapshot[] | null
  pickup_location?: string
  pickup_date?: string
  pickup_time?: string
  tracking_number?: string
  remark?: string
  wechat_transaction_id?: string
  version: number
  // 跨境贸易扩展
  trade_term?: TradeTerm | null
  logistics_plan?: LogisticsPlanSnapshot | null
  cost_breakdown?: CostBreakdown | null
  paid_at?: string
  shipped_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

// 订单创建时的商品快照
export interface OrderProductSnapshot {
  sku_id: string
  sku_code?: string
  name: string
  name_en?: string
  image_url?: string
  unit_price: number
  quantity: number
  currency: string
}

// 物流方案快照
export interface LogisticsPlanSnapshot {
  id: string
  name: string
  nameEn?: string
  cost: number
  minDays: number
  maxDays: number
  note?: string
}

// 跨境费用明细
export interface CostBreakdown {
  currency: string
  subtotal: number
  shipping_cost: number
  insurance_cost: number
  estimated_tariff: number
  tariff_rate?: number
  other_cost: number
  other_cost_note?: string
  total: number
  is_estimate: boolean
  data_source?: string
}

// 退款记录
export interface Refund {
  id: string
  refund_no?: string
  order_no: string
  item_index: number
  user_id: string
  initiated_by: string
  status: RefundStatus
  refund_quantity: number
  refund_amount: number
  reason?: string
  admin_note?: string
  wechat_refund_id?: string
  version: number
  completed_at?: string
  created_at: string
  updated_at: string
}

// 门票订单
export interface TicketOrder {
  id: string
  order_no: string
  user_id: string
  openid: string
  ticket_type_id: string
  quantity: number
  unit_price: number
  total_amount: number
  visitor_name: string
  visitor_phone: string
  visit_date: string
  status: OrderStatus
  wechat_transaction_id?: string
  paid_at?: string
  created_at: string
  updated_at: string
}

// 门票
export interface Ticket {
  id: string
  ticket_no: string
  order_id: string
  user_id: string
  ticket_type_id: string
  ticket_type_snapshot?: TicketType
  qr_code: string
  status: TicketStatus
  valid_from: string
  valid_until: string
  used_at?: string
  used_by?: string
  created_at: string
  updated_at: string
}

// 定制订单
export interface CustomizationOrder {
  id: string
  order_no: string
  user_id: string
  openid?: string
  type: CustomizationType
  status: CustomizationStatus
  template_id?: string
  custom_text?: string
  preview_image_url?: string
  theme?: string
  budget?: number
  delivery_date?: string
  special_requirements?: string
  requirements?: any
  estimated_price?: number
  deposit_amount?: number
  total_amount?: number
  final_amount?: number
  admin_note?: string
  admin_notes?: string
  progress_note?: string
  progress?: any[]
  wechat_transaction_id?: string
  paid_at?: string
  approved_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

// 上传文件输入
export interface UploadFileInput {
  path: string
  size: number
  name?: string
  originalFileObj?: File
}

// 上传结果
export interface UploadResult {
  success: boolean
  data?: any
  error?: string
  url?: string
}

// 知识问答相关类型
export interface QuizQuestion {
  id: string
  question: string
  options: Array<{text: string; is_correct: boolean}>
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  points: number
  created_at: string
}

export interface UserQuizRecord {
  id: string
  user_id: string
  question_id: string
  is_correct: boolean
  answered_at: string
  points_earned: number
}

export interface UserDailyQuizStats {
  id: string
  user_id: string
  quiz_date: string
  questions_answered: number
  correct_answers: number
  total_points_earned: number
}

// ==================== AI跨境贸易助手 ====================

// AI业务记录类型（跨境贸易全功能）
export type AiTradeRecordType =
  | 'product_translate'
  | 'market_analysis'
  | 'inquiry'
  | 'quote'
  | 'trade_compliance'
  | 'trade_document'
  | 'marketing_content'
  | 'customer_intent'
  | 'export_plan'
  | 'support_chat'

// AI业务记录类型中文标签
export const AI_RECORD_TYPE_LABELS: Record<AiTradeRecordType, string> = {
  product_translate: '商品国际化',
  market_analysis: '市场分析',
  inquiry: '询盘处理',
  quote: 'AI报价',
  trade_compliance: '贸易合规',
  trade_document: '贸易单证',
  marketing_content: '营销素材',
  customer_intent: '意向识别',
  export_plan: '出海方案',
  support_chat: 'AI客服'
}

// AI业务记录来源：mock=演示模式AI realtime=真实AI
export type AiRecordSource = 'mock' | 'realtime'

// AI审核状态：none=无需审核 pending=待人工审核 approved=已通过 rejected=已驳回
export type AiReviewStatus = 'none' | 'pending' | 'approved' | 'rejected'

// AI业务记录状态：draft=待人工确认 confirmed=已人工确认
export interface AiTradeRecord {
  id: string
  user_id: string
  type: AiTradeRecordType
  product_id?: string | null
  product_name?: string | null
  market?: string | null
  input_data: Record<string, unknown>
  ai_result: Record<string, unknown>
  status: 'draft' | 'confirmed'
  review_status: AiReviewStatus
  source: AiRecordSource
  // 第二轮扩展：AI操作记录与人工修改
  ai_operation_log_id?: string | null
  human_modified_content?: Record<string, unknown> | null
  final_result?: Record<string, unknown> | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

// 新增AI业务记录入参（主键与时间由数据库生成）
export interface AiTradeRecordInput {
  user_id?: string
  type: AiTradeRecordType
  product_id?: string | null
  product_name?: string | null
  market?: string | null
  input_data: Record<string, unknown>
  ai_result: Record<string, unknown>
  status?: 'draft' | 'confirmed'
  review_status?: AiReviewStatus
  source?: AiRecordSource
  ai_operation_log_id?: string | null
  human_modified_content?: Record<string, unknown> | null
  final_result?: Record<string, unknown> | null
  is_demo?: boolean
}

// ==================== 海外客户CRM ====================

// 客户状态：新询盘→已联系→已报价→样品确认→已下单→已成交→已完成
export type CustomerStatus =
  | 'new_inquiry'
  | 'contacted'
  | 'quoted'
  | 'sample_confirmed'
  | 'ordered'
  | 'deal_closed'
  | 'completed'

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  new_inquiry: '新询盘',
  contacted: '已联系',
  quoted: '已报价',
  sample_confirmed: '样品确认',
  ordered: '已下单',
  deal_closed: '已成交',
  completed: '已完成'
}

export type CustomerKind = 'potential' | 'existing' | 'distributor' | 'retailer' | 'event_organizer'

export const CUSTOMER_KIND_LABELS: Record<CustomerKind, string> = {
  potential: '潜客',
  existing: '老客户',
  distributor: '经销商',
  retailer: '零售商',
  event_organizer: '活动主办方'
}

export interface OverseasCustomer {
  id: string
  user_id: string
  name: string
  country?: string | null
  contact?: string | null
  customer_type: CustomerKind
  status: CustomerStatus
  level: CustomerLevel
  score: number
  tags: string[]
  source?: string | null
  intent_product?: string | null
  intent_quantity?: number | null
  first_inquiry_at?: string | null
  last_contact_at?: string | null
  next_follow_up_at?: string | null
  notes?: string | null
  // 业务统计
  inquiry_count: number
  quote_count: number
  order_count: number
  order_amount: number
  sample_order_count: number
  is_demo: boolean
  created_at: string
  updated_at: string
}

// 客户等级
export type CustomerLevel = 'normal' | 'bronze' | 'silver' | 'gold' | 'vip'

export interface OverseasCustomerInput {
  user_id?: string
  name: string
  country?: string | null
  contact?: string | null
  customer_type?: CustomerKind
  status?: CustomerStatus
  level?: CustomerLevel
  score?: number
  tags?: string[]
  source?: string | null
  intent_product?: string | null
  intent_quantity?: number | null
  first_inquiry_at?: string | null
  last_contact_at?: string | null
  next_follow_up_at?: string | null
  notes?: string | null
  is_demo?: boolean
}

export interface CustomerCommunication {
  id: string
  user_id: string
  customer_id: string
  type: 'inquiry' | 'reply' | 'quote' | 'note'
  content: string
  language: string
  is_demo: boolean
  created_at: string
}

export interface CustomerCommunicationInput {
  user_id?: string
  customer_id: string
  type: 'inquiry' | 'reply' | 'quote' | 'note'
  content: string
  language?: string
  is_demo?: boolean
}

// ==================== AI报价工作台 ====================

// 报价状态：AI生成→待人工审核→人工修改→人工确认→已发送
export type QuoteStatusType = 'ai_generated' | 'pending_review' | 'modified' | 'confirmed' | 'sent'

export const QUOTE_STATUS_LABELS: Record<QuoteStatusType, string> = {
  ai_generated: 'AI生成',
  pending_review: '待人工审核',
  modified: '人工修改',
  confirmed: '已确认',
  sent: '已发送'
}

export interface QuoteRecord {
  id: string
  user_id: string
  quote_no: string
  customer_id?: string | null
  customer_name?: string | null
  product_id?: string | null
  product_name?: string | null
  sku_code?: string | null
  quantity: number
  unit_price: number
  currency: string
  market?: string | null
  shipping_method?: string | null
  shipping_cost: number
  other_cost: number
  exchange_rate: number
  exchange_rate_source: string
  product_amount: number
  total_cost: number
  total_display: number
  version: number
  parent_id?: string | null
  status: QuoteStatusType
  ai_description?: Record<string, unknown> | null
  // 第二轮扩展
  rfq_id?: string | null
  trade_term?: TradeTerm | null
  price_tier?: PriceTier | null
  is_b2b: boolean
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface QuoteRecordInput {
  user_id?: string
  quote_no: string
  customer_id?: string | null
  customer_name?: string | null
  product_id?: string | null
  product_name?: string | null
  sku_code?: string | null
  quantity: number
  unit_price: number
  currency?: string
  market?: string | null
  shipping_method?: string | null
  shipping_cost?: number
  other_cost?: number
  exchange_rate?: number
  exchange_rate_source?: string
  product_amount?: number
  total_cost?: number
  total_display?: number
  version?: number
  parent_id?: string | null
  status?: QuoteStatusType
  ai_description?: Record<string, unknown> | null
  rfq_id?: string | null
  trade_term?: TradeTerm | null
  price_tier?: PriceTier | null
  is_b2b?: boolean
  is_demo?: boolean
}

// ==================== AI贸易单证 ====================

export type TradeDocType =
  | 'proforma_invoice'
  | 'commercial_invoice'
  | 'packing_list'
  | 'order_confirmation'
  | 'shipping_instruction'

export const TRADE_DOC_TYPE_LABELS: Record<TradeDocType, string> = {
  proforma_invoice: '形式发票 (Proforma Invoice)',
  commercial_invoice: '商业发票 (Commercial Invoice)',
  packing_list: '装箱单 (Packing List)',
  order_confirmation: '订单确认单 (Order Confirmation)',
  shipping_instruction: '装运指示 (Shipping Instruction)'
}

export type TradeDocStatus = 'draft' | 'pending_review' | 'confirmed'

export const TRADE_DOC_STATUS_LABELS: Record<TradeDocStatus, string> = {
  draft: '草稿',
  pending_review: '待人工审核',
  confirmed: '已确认'
}

export interface TradeDocumentRecord {
  id: string
  user_id: string
  doc_type: TradeDocType
  order_no?: string | null
  customer_name?: string | null
  content: Record<string, unknown>
  missing_fields: string[]
  status: TradeDocStatus
  version: number
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface TradeDocumentRecordInput {
  user_id?: string
  doc_type: TradeDocType
  order_no?: string | null
  customer_name?: string | null
  content: Record<string, unknown>
  missing_fields?: string[]
  status?: TradeDocStatus
  version?: number
  is_demo?: boolean
}

// ==================== 售后中心 ====================

export type AfterSaleType = 'return' | 'exchange' | 'refund' | 'damage'

export const AFTER_SALE_TYPE_LABELS: Record<AfterSaleType, string> = {
  return: '申请退货',
  exchange: '申请换货',
  refund: '申请退款',
  damage: '物流破损申报'
}

export type AfterSaleStatus = 'submitted' | 'reviewing' | 'processing' | 'logistics' | 'completed' | 'rejected'

export const AFTER_SALE_STATUS_LABELS: Record<AfterSaleStatus, string> = {
  submitted: '已提交申请',
  reviewing: '平台审核中',
  processing: '处理中',
  logistics: '物流处理中',
  completed: '已完成',
  rejected: '已驳回'
}

export const AFTER_SALE_FLOW_STEPS: Array<{key: AfterSaleStatus | 'rejected'; label: string}> = [
  {key: 'submitted', label: '提交申请'},
  {key: 'reviewing', label: '平台审核'},
  {key: 'processing', label: '处理中'},
  {key: 'logistics', label: '物流处理'},
  {key: 'completed', label: '完成'}
]

export interface AfterSaleRecord {
  id: string
  user_id: string
  order_no: string
  type: AfterSaleType
  reason?: string | null
  // 第二轮扩展：原因分类与材料
  reason_category?: string | null
  required_materials?: string[]
  evidence_urls?: string[]
  description: string
  images: string[]
  status: AfterSaleStatus
  admin_note?: string | null
  // 退款金额必须由订单真实金额和人工审核决定
  refund_amount?: number | null
  approved_refund_amount?: number | null
  refund_approved_by?: string | null
  refund_approved_at?: string | null
  created_at: string
  updated_at: string
}

export interface AfterSaleInput {
  user_id?: string
  order_no: string
  type: AfterSaleType
  reason?: string | null
  reason_category?: string | null
  required_materials?: string[]
  evidence_urls?: string[]
  description: string
  images?: string[]
  status?: AfterSaleStatus
  refund_amount?: number | null
  approved_refund_amount?: number | null
}

// ==================== 异常订单中心 ====================

export type OrderExceptionType =
  | 'logistics_delay'
  | 'customs_issue'
  | 'address_error'
  | 'delivery_failed'
  | 'package_damaged'
  | 'payment_issue'
  | 'refunding'
  | 'customer_cancelled'

export const ORDER_EXCEPTION_TYPE_LABELS: Record<OrderExceptionType, string> = {
  logistics_delay: '物流延迟',
  customs_issue: '清关异常',
  address_error: '地址错误',
  delivery_failed: '配送失败',
  package_damaged: '包裹破损',
  payment_issue: '支付异常',
  refunding: '退款处理中',
  customer_cancelled: '客户取消'
}

export type OrderExceptionStatus = 'identified' | 'ai_suggested' | 'confirmed' | 'executed' | 'recorded'

export const ORDER_EXCEPTION_STATUS_LABELS: Record<OrderExceptionStatus, string> = {
  identified: '异常识别',
  ai_suggested: 'AI建议',
  confirmed: '人工确认',
  executed: '已执行',
  recorded: '已记录结果'
}

export interface OrderExceptionRecord {
  id: string
  user_id: string
  order_no: string
  type: OrderExceptionType
  description?: string | null
  ai_suggestion?: Record<string, unknown> | null
  notify_draft?: string | null
  status: OrderExceptionStatus
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface OrderExceptionInput {
  user_id?: string
  order_no: string
  type: OrderExceptionType
  description?: string | null
  ai_suggestion?: Record<string, unknown> | null
  notify_draft?: string | null
  status?: OrderExceptionStatus
  is_demo?: boolean
}

// ==================== 第二轮新增类型 ====================

// RFQ 批量询价
export type RfqStatus = 'submitted' | 'extracted' | 'reviewed' | 'quoted' | 'closed'

export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  submitted: '已提交',
  extracted: 'AI已提取',
  reviewed: '已人工审核',
  quoted: '已报价',
  closed: '已关闭'
}

export interface RfqRecord {
  id: string
  user_id: string
  rfq_no: string
  customer_id?: string | null
  sku_id?: string | null
  product_name: string
  quantity: number
  target_market?: string | null
  expected_delivery_date?: string | null
  shipping_method?: string | null
  trade_term?: TradeTerm | null
  remark?: string | null
  ai_extracted?: Record<string, unknown> | null
  ai_extracted_at?: string | null
  status: RfqStatus
  quote_id?: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface RfqInput {
  user_id?: string
  rfq_no: string
  customer_id?: string | null
  sku_id?: string | null
  product_name: string
  quantity: number
  target_market?: string | null
  expected_delivery_date?: string | null
  shipping_method?: string | null
  trade_term?: TradeTerm | null
  remark?: string | null
  ai_extracted?: Record<string, unknown> | null
  ai_extracted_at?: string | null
  status?: RfqStatus
  quote_id?: string | null
  is_demo?: boolean
}

// 样品订单
export type SampleOrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export const SAMPLE_ORDER_STATUS_LABELS: Record<SampleOrderStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  paid: '已付款',
  shipped: '已发货',
  delivered: '已签收',
  cancelled: '已取消'
}

export interface SampleOrderRecord {
  id: string
  user_id: string
  sample_order_no: string
  customer_id?: string | null
  sku_id?: string | null
  product_name: string
  quantity: number
  unit_price: number
  shipping_cost: number
  total_amount: number
  shipping_method?: string | null
  address_snapshot?: Record<string, unknown> | null
  status: SampleOrderStatus
  rfq_id?: string | null
  order_no?: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface SampleOrderInput {
  user_id?: string
  sample_order_no: string
  customer_id?: string | null
  sku_id?: string | null
  product_name: string
  quantity: number
  unit_price: number
  shipping_cost?: number
  total_amount?: number
  shipping_method?: string | null
  address_snapshot?: Record<string, unknown> | null
  status?: SampleOrderStatus
  rfq_id?: string | null
  order_no?: string | null
  is_demo?: boolean
}

// 客户跟进任务
export type FollowUpTaskType =
  | 'reply_inquiry'
  | 'confirm_quote'
  | 'confirm_sample'
  | 'follow_logistics'
  | 'follow_payment'
  | 'custom'
export type FollowUpTaskStatus = 'pending' | 'completed' | 'cancelled'

export const FOLLOW_UP_TASK_TYPE_LABELS: Record<FollowUpTaskType, string> = {
  reply_inquiry: '回复询盘',
  confirm_quote: '确认报价',
  confirm_sample: '确认样品',
  follow_logistics: '跟进物流',
  follow_payment: '跟进付款',
  custom: '自定义'
}

export interface FollowUpTask {
  id: string
  user_id: string
  customer_id: string
  title: string
  task_type: FollowUpTaskType
  status: FollowUpTaskStatus
  due_at?: string | null
  completed_at?: string | null
  ai_suggestion?: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface FollowUpTaskInput {
  user_id?: string
  customer_id: string
  title: string
  task_type: FollowUpTaskType
  status?: FollowUpTaskStatus
  due_at?: string | null
  ai_suggestion?: string | null
  is_demo?: boolean
}

// AI 操作记录（统一记录所有AI生成、版本化、人工修改）
export type AiOperationBusinessType =
  | 'product_translate'
  | 'market_analysis'
  | 'inquiry'
  | 'quote'
  | 'support_chat'
  | 'trade_compliance'
  | 'trade_document'
  | 'marketing_content'
  | 'customer_intent'
  | 'export_plan'

export interface AiOperationLog {
  id: string
  user_id: string
  ai_function_name: string
  business_type: AiOperationBusinessType
  ai_trade_record_id?: string | null
  rfq_id?: string | null
  quote_id?: string | null
  customer_id?: string | null
  order_no?: string | null
  input_summary: string
  input_data?: Record<string, unknown> | null
  output_result?: Record<string, unknown> | null
  model_name?: string | null
  model_status?: 'success' | 'failed' | 'timeout' | null
  is_success: boolean
  version: number
  parent_id?: string | null
  human_modified: boolean
  human_modified_content?: Record<string, unknown> | null
  modification_note?: string | null
  human_confirmed: boolean
  confirmed_at?: string | null
  confirmed_by?: string | null
  final_result?: Record<string, unknown> | null
  risk_hints?: string[]
  is_demo: boolean
  created_at: string
}

export interface AiOperationLogInput {
  user_id?: string
  ai_function_name: string
  business_type: AiOperationBusinessType
  ai_trade_record_id?: string | null
  rfq_id?: string | null
  quote_id?: string | null
  customer_id?: string | null
  order_no?: string | null
  input_summary: string
  input_data?: Record<string, unknown> | null
  output_result?: Record<string, unknown> | null
  model_name?: string | null
  model_status?: 'success' | 'failed' | 'timeout' | null
  is_success?: boolean
  version?: number
  parent_id?: string | null
  human_modified?: boolean
  human_modified_content?: Record<string, unknown> | null
  modification_note?: string | null
  human_confirmed?: boolean
  confirmed_at?: string | null
  confirmed_by?: string | null
  final_result?: Record<string, unknown> | null
  risk_hints?: string[]
  is_demo?: boolean
}

// 通知模板
export type NotificationTemplateType =
  | 'order_paid'
  | 'order_shipped'
  | 'customs_cleared'
  | 'order_delivered'
  | 'after_sale_submitted'
  | 'quote_generated'
  | 'inquiry_received'
  | 'system'

export interface NotificationTemplate {
  id: string
  code: string
  name: string
  type: NotificationTemplateType
  title_zh: string
  content_zh: string
  title_en?: string | null
  content_en?: string | null
  variables: string[]
  is_enabled: boolean
  is_demo: boolean
  created_at: string
  updated_at: string
}

// 操作日志
export type OperationAction =
  | 'update_price'
  | 'update_stock'
  | 'confirm_quote'
  | 'confirm_trade_doc'
  | 'update_order_status'
  | 'process_after_sale'
  | 'refund'
  | 'update_config'
  | 'confirm_payment'
  | 'cancel_order'
  | 'update_customer'
  | 'create_rfq'
  | 'create_quote'
  | 'create_order'
  | 'ai_generate'

export type OperatorType = 'user' | 'admin' | 'merchant' | 'system' | 'ai'

export interface OperationLog {
  id: string
  operator_id?: string | null
  operator_type: OperatorType
  action: OperationAction
  target_type: string
  target_id: string
  before_data?: Record<string, unknown> | null
  after_data?: Record<string, unknown> | null
  note?: string | null
  ip_address?: string | null
  is_demo: boolean
  created_at: string
}

export interface OperationLogInput {
  operator_id?: string | null
  operator_type: OperatorType
  action: OperationAction
  target_type: string
  target_id: string
  before_data?: Record<string, unknown> | null
  after_data?: Record<string, unknown> | null
  note?: string | null
  ip_address?: string | null
  is_demo?: boolean
}

// 运营配置中心
export interface AppConfig {
  id: string
  config_key: string
  config_value: unknown
  config_type: 'json' | 'text' | 'number' | 'boolean'
  description?: string | null
  is_editable: boolean
  is_demo: boolean
  updated_by?: string | null
  created_at: string
  updated_at: string
}

// 支付流水
export interface PaymentTransaction {
  id: string
  order_no: string
  transaction_no: string
  amount: number
  currency: string
  channel: 'demo' | 'wechat_pay' | 'alipay' | 'bank_transfer'
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  paid_at?: string | null
  refunded_at?: string | null
  metadata?: Record<string, unknown> | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

// 订单状态日志
export interface OrderStatusLog {
  id: string
  order_no: string
  previous_status: OrderStatus
  new_status: OrderStatus
  operator_type: 'system' | 'user' | 'admin' | 'merchant'
  operator_id?: string | null
  note?: string | null
  created_at: string
}

// 物流方案（配置中心）
export interface LogisticsPlanConfig {
  id: string
  name: string
  nameEn?: string
  cost: number
  minDays: number
  maxDays: number
  scenario?: string
  note?: string
}

// 消息中心扩展
export interface MessageRecord {
  id: string
  user_id: string
  type: string
  title: string
  content: string
  is_read: boolean
  related_order_id?: string | null
  related_rfq_id?: string | null
  related_quote_id?: string | null
  related_after_sale_id?: string | null
  action_type?: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
}
