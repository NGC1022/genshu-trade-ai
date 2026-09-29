import {supabase} from '@/client/supabase'
import type {
  Address,
  AfterSaleInput,
  AfterSaleRecord,
  AiOperationLog,
  AiOperationLogInput,
  AiTradeRecord,
  AiTradeRecordInput,
  AppConfig,
  CommentReport,
  Coupon,
  CustomerCommunication,
  CustomerCommunicationInput,
  CustomizationOrder,
  DigitalIP,
  ExclusiveContent,
  FollowUpTask,
  FollowUpTaskInput,
  LogisticsPlanConfig,
  Message,
  MessageType,
  Note,
  NoteComment,
  NoteDraft,
  NoteReport,
  NotificationTemplate,
  OperationLog,
  OperationLogInput,
  Order,
  OrderExceptionInput,
  OrderExceptionRecord,
  OrderStatusLog,
  OverseasCustomer,
  OverseasCustomerInput,
  PaymentTransaction,
  ProductReview,
  Profile,
  QuizQuestion,
  QuoteRecord,
  QuoteRecordInput,
  Refund,
  RfqInput,
  RfqRecord,
  SampleOrderInput,
  SampleOrderRecord,
  SKU,
  SystemReport,
  ThreeDTemplate,
  Ticket,
  TicketOrder,
  TicketType,
  TradeDocumentRecord,
  TradeDocumentRecordInput,
  UploadFileInput,
  UploadResult,
  UserCoupon,
  UserDailyQuizStats
} from './types'

const BUCKET_NAME = 'app-9dlnarhqk45d_images'

// ==================== 用户相关 ====================

export async function getProfile(userId: string) {
  const {data, error} = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return {data: data as Profile | null, error}
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const {data, error} = await supabase.from('profiles').update(updates).eq('id', userId).select().maybeSingle()
  return {data: data as Profile | null, error}
}

export async function updateOpenid(userId: string, openid: string) {
  const {data, error} = await supabase.rpc('update_openid', {userid: userId, openid: openid})
  return {data, error}
}

// ==================== 公告相关 ====================

export async function getParkAnnouncements() {
  const {data, error} = await supabase
    .from('park_announcements')
    .select('*')
    .eq('is_active', true)
    .order('priority', {ascending: false})
    .order('created_at', {ascending: false})

  return {data: (Array.isArray(data) ? data : []) as any[], error}
}

// ==================== 商品相关 ====================

export async function getSKUList(category?: string) {
  let query = supabase.from('sku').select('*').eq('is_active', true).order('created_at', {ascending: false})
  if (category) {
    query = query.eq('category', category)
  }
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as SKU[], error}
}

export async function getSKUDetail(skuCode: string) {
  const {data, error} = await supabase
    .from('sku')
    .select('*')
    .eq('sku_code', skuCode)
    .eq('is_active', true)
    .maybeSingle()
  return {data: data as SKU | null, error}
}

// 更新SKU资料（国际化字段/库存等，仅商家角色可调用，RLS限制）
export async function updateSKU(id: string, updates: Partial<SKU>) {
  const {data, error} = await supabase.from('sku').update(updates).eq('id', id).select().maybeSingle()
  return {data: data as SKU | null, error}
}

// ==================== 自提相关 ====================

export async function getPickupLocations() {
  const {data, error} = await supabase
    .from('pickup_locations')
    .select('*')
    .eq('is_active', true)
    .order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as any[], error}
}

// ==================== 门票相关 ====================

export async function getTicketTypeList() {
  const {data, error} = await supabase
    .from('ticket_types')
    .select('*')
    .eq('is_active', true)
    .order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as TicketType[], error}
}

export async function getTicketTypeDetail(id: string) {
  const {data, error} = await supabase.from('ticket_types').select('*').eq('id', id).eq('is_active', true).maybeSingle()
  return {data: data as TicketType | null, error}
}

// ==================== 地址相关 ====================

export async function getAddressList(userId: string) {
  const {data, error} = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', {ascending: false})
    .order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as Address[], error}
}

export async function getDefaultAddress(userId: string) {
  const {data, error} = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()
  return {data: data as Address | null, error}
}

export async function getAddressDetail(id: string) {
  const {data, error} = await supabase.from('addresses').select('*').eq('id', id).maybeSingle()
  return {data: data as Address | null, error}
}

export async function createAddress(address: Omit<Address, 'id' | 'created_at' | 'updated_at'>) {
  if (address.is_default) {
    await supabase.from('addresses').update({is_default: false}).eq('user_id', address.user_id)
  }
  const {data, error} = await supabase.from('addresses').insert(address).select().maybeSingle()
  return {data: data as Address | null, error}
}

export async function updateAddress(id: string, updates: Partial<Address>) {
  if (updates.is_default && updates.user_id) {
    await supabase.from('addresses').update({is_default: false}).eq('user_id', updates.user_id)
  }
  const {data, error} = await supabase.from('addresses').update(updates).eq('id', id).select().maybeSingle()
  return {data: data as Address | null, error}
}

export async function deleteAddress(id: string) {
  const {error} = await supabase.from('addresses').delete().eq('id', id)
  return {error}
}

export async function setDefaultAddress(id: string, userId: string) {
  await supabase.from('addresses').update({is_default: false}).eq('user_id', userId)
  const {data, error} = await supabase.from('addresses').update({is_default: true}).eq('id', id).select().maybeSingle()
  return {data: data as Address | null, error}
}

// ==================== 订单相关 ====================

export async function createOrder(orderData: any) {
  const {data, error} = await supabase.rpc('create_goods_order', {
    p_user_id: orderData.user_id,
    p_openid: orderData.openid,
    p_items: orderData.items,
    p_delivery_method: orderData.delivery_method,
    p_address_id: orderData.address_id,
    p_pickup_location: orderData.pickup_location,
    p_pickup_date: orderData.pickup_date,
    p_pickup_time: orderData.pickup_time,
    p_total_amount: orderData.total_amount,
    p_remark: orderData.remark,
    p_payment_status: orderData.payment_status ?? 'pending',
    p_order_type: orderData.order_type ?? 'b2c',
    p_trade_term: orderData.trade_term ?? null,
    p_logistics_plan: orderData.logistics_plan ?? null,
    p_cost_breakdown: orderData.cost_breakdown ?? null,
    p_address_snapshot: orderData.address_snapshot ?? null,
    p_product_snapshot: orderData.product_snapshot ?? null
  })
  return {data: data as Order, error}
}

export async function getOrderList(userId: string, status?: string) {
  let query = supabase.from('orders').select('*').eq('user_id', userId).order('created_at', {ascending: false})
  if (status) {
    query = query.eq('status', status)
  }
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as Order[], error}
}

export async function getOrderDetail(orderNo: string) {
  const {data, error} = await supabase.from('orders').select('*').eq('order_no', orderNo).maybeSingle()
  return {data: data as Order | null, error}
}

export async function getAllOrders(status?: string) {
  let query = supabase.from('orders').select('*').order('created_at', {ascending: false})
  if (status) {
    query = query.eq('status', status)
  }
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as Order[], error}
}

// ==================== 数字IP相关 ====================

export async function getDigitalIPList() {
  const {data, error} = await supabase
    .from('digital_ips')
    .select('*')
    .eq('is_active', true)
    .order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as DigitalIP[], error}
}

export async function getDigitalIPDetail(id: string) {
  const {data, error} = await supabase.from('digital_ips').select('*').eq('id', id).eq('is_active', true).maybeSingle()
  return {data: data as DigitalIP | null, error}
}

// ==================== 会员与优惠券相关 ====================

export async function registerMember(userId: string) {
  const {data, error} = await supabase
    .from('profiles')
    .update({
      is_member: true,
      member_level: 'normal',
      member_since: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .maybeSingle()
  return {data: data as Profile | null, error}
}

export async function getExclusiveContentList(category?: string) {
  let query = supabase
    .from('exclusive_content')
    .select('*')
    .eq('is_active', true)
    .order('created_at', {ascending: false})
  if (category) {
    query = query.eq('category', category)
  }
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as ExclusiveContent[], error}
}

export async function getAvailableCoupons() {
  const {data, error} = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .gt('valid_until', new Date().toISOString())
    .order('discount_amount', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as Coupon[], error}
}

export async function getUserCoupons(userId: string) {
  const {data, error} = await supabase
    .from('user_coupons')
    .select('*, coupon:coupons(*)')
    .eq('user_id', userId)
    .order('acquired_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as UserCoupon[], error}
}

export async function claimCoupon(userId: string, couponId: string) {
  // 检查是否已领取
  const {data: existing} = await supabase
    .from('user_coupons')
    .select('*')
    .eq('user_id', userId)
    .eq('coupon_id', couponId)
    .maybeSingle()

  if (existing) {
    return {error: new Error('您已经领取过该优惠券了')}
  }

  const {data, error} = await supabase
    .from('user_coupons')
    .insert({user_id: userId, coupon_id: couponId})
    .select()
    .maybeSingle()
  return {data, error}
}

// ==================== 3D打印模板相关 ====================

export async function getThreeDTemplates() {
  const {data, error} = await supabase
    .from('three_d_templates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as ThreeDTemplate[], error}
}

// ==================== 知识问答相关 ====================

export async function getQuizQuestions(limit: number = 5) {
  const {data, error} = await supabase.from('quiz_questions').select('*')
  if (error) return {data: [], error}

  // 随机选择
  const shuffled = (data as QuizQuestion[]).sort(() => 0.5 - Math.random())
  const selected = shuffled.slice(0, limit)

  return {data: selected, error: null}
}

export async function submitQuizResult(userId: string, questions: {id: string; is_correct: boolean; points: number}[]) {
  const totalPoints = questions.reduce((sum, q) => (q.is_correct ? sum + q.points : sum), 0)
  const correctCount = questions.filter((q) => q.is_correct).length

  // 1. 记录每一题
  const records = questions.map((q) => ({
    user_id: userId,
    question_id: q.id,
    is_correct: q.is_correct,
    points_earned: q.is_correct ? q.points : 0
  }))

  const {error: recordError} = await supabase.from('user_quiz_records').insert(records)
  if (recordError) return {error: recordError}

  // 2. 更新/创建每日统计
  const today = new Date().toISOString().split('T')[0]
  const {data: stats, error: statsFetchError} = await supabase
    .from('user_daily_quiz_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('quiz_date', today)
    .maybeSingle()

  if (statsFetchError) return {error: statsFetchError}

  if (stats) {
    await supabase
      .from('user_daily_quiz_stats')
      .update({
        questions_answered: stats.questions_answered + questions.length,
        correct_answers: stats.correct_answers + correctCount,
        total_points_earned: stats.total_points_earned + totalPoints
      })
      .eq('id', stats.id)
  } else {
    await supabase.from('user_daily_quiz_stats').insert({
      user_id: userId,
      quiz_date: today,
      questions_answered: questions.length,
      correct_answers: correctCount,
      total_points_earned: totalPoints
    })
  }

  // 3. 增加用户总积分
  if (totalPoints > 0) {
    const {data: profile} = await getProfile(userId)
    if (profile) {
      await updateProfile(userId, {
        member_points: (profile.member_points || 0) + totalPoints
      })
    }
  }

  return {success: true, pointsEarned: totalPoints}
}

export async function getUserDailyQuizStats(userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const {data, error} = await supabase
    .from('user_daily_quiz_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('quiz_date', today)
    .maybeSingle()
  return {data: data as UserDailyQuizStats | null, error}
}

export async function updateOrderStatus(orderNo: string, status: string, updates?: any) {
  const {data, error} = await supabase
    .from('orders')
    .update({status, ...updates, updated_at: new Date().toISOString()})
    .eq('order_no', orderNo)
    .select()
    .maybeSingle()
  return {data: data as Order | null, error}
}

// ==================== 退款相关 ====================

export async function createRefund(
  refund: Omit<Refund, 'id' | 'refund_no' | 'version' | 'created_at' | 'updated_at' | 'completed_at'>
) {
  const {data, error} = await supabase.from('refunds').insert(refund).select().maybeSingle()
  return {data: data as Refund | null, error}
}

export async function getRefundList(userId: string) {
  const {data, error} = await supabase
    .from('refunds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as Refund[], error}
}

export async function getAllRefunds(status?: string) {
  let query = supabase.from('refunds').select('*').order('created_at', {ascending: false})
  if (status) {
    query = query.eq('status', status)
  }
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as Refund[], error}
}

export async function updateRefundStatus(id: string, status: string, adminNote?: string) {
  const {data, error} = await supabase
    .from('refunds')
    .update({
      status,
      admin_note: adminNote,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .maybeSingle()
  return {data: data as Refund | null, error}
}

export async function approveRefund(
  refundId: string,
  orderNo: string,
  itemIndex: number,
  amount: number,
  reason: string
) {
  const {data, error} = await supabase.functions.invoke('refund-order', {
    body: {
      refund_id: refundId,
      order_no: orderNo,
      item_index: itemIndex,
      refund_amount: amount,
      reason: reason
    }
  })
  return {data, error}
}

// ==================== 门票订单相关 ====================

export async function createTicketOrder(orderData: any) {
  const {data, error} = await supabase.rpc('create_ticket_order_v2', {
    p_user_id: orderData.user_id,
    p_openid: orderData.openid,
    p_ticket_type_id: orderData.ticket_type_id,
    p_quantity: orderData.quantity,
    p_unit_price: orderData.unit_price,
    p_total_amount: orderData.total_amount,
    p_visitor_name: orderData.visitor_name,
    p_visitor_phone: orderData.visitor_phone,
    p_visit_date: orderData.visit_date
  })
  return {data: data as TicketOrder, error}
}

export async function getTicketOrderList(userId: string) {
  const {data, error} = await supabase
    .from('ticket_orders')
    .select('*, ticket_types(*)')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as (TicketOrder & {ticket_types: TicketType})[], error}
}

export async function getTicketOrderDetail(orderNo: string) {
  const {data, error} = await supabase
    .from('ticket_orders')
    .select('*, ticket_types(*)')
    .eq('order_no', orderNo)
    .maybeSingle()
  return {data: data as (TicketOrder & {ticket_types: TicketType}) | null, error}
}

// ==================== 门票相关 ====================

export async function getTicketList(userId: string, status?: string) {
  let query = supabase
    .from('tickets')
    .select('*, ticket_types(*)')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  if (status) {
    query = query.eq('status', status)
  }
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as (Ticket & {ticket_type_snapshot: TicketType})[], error}
}

export async function getTicketDetail(ticketNo: string) {
  const {data, error} = await supabase
    .from('tickets')
    .select('*, ticket_types(*)')
    .eq('ticket_no', ticketNo)
    .maybeSingle()
  return {data: data as (Ticket & {ticket_type_snapshot: TicketType}) | null, error}
}

export async function verifyTicket(qrCode: string, userId: string) {
  const {data: ticket, error} = await supabase
    .from('tickets')
    .select('*, ticket_types(*)')
    .eq('qr_code', qrCode)
    .maybeSingle()
  if (error || !ticket) return {data: null, error: error || new Error('门票不存在')}
  if (ticket.status !== 'unused') return {data: null, error: new Error('门票已使用或已失效')}
  const now = new Date()
  if (now < new Date(ticket.valid_from) || now > new Date(ticket.valid_until))
    return {data: null, error: new Error('门票不在有效期内')}
  const {data: updatedTicket, error: updateError} = await supabase
    .from('tickets')
    .update({status: 'used', used_at: now.toISOString(), used_by: userId, updated_at: now.toISOString()})
    .eq('ticket_no', (ticket as any).ticket_no)
    .eq('status', 'unused')
    .select()
    .maybeSingle()
  return {data: updatedTicket as Ticket | null, error: updateError}
}

// ==================== 定制订单相关 ====================

export async function createCustomizationOrder(order: any) {
  const {data, error} = await supabase.from('customization_orders').insert(order).select().maybeSingle()
  return {data: data as CustomizationOrder | null, error}
}

export async function getCustomizationOrderList(userId: string, type?: string) {
  let query = supabase
    .from('customization_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  if (type) query = query.eq('type', type)
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as CustomizationOrder[], error}
}

export async function getCustomizationDetail(id: string) {
  const {data, error} = await supabase.from('customization_orders').select('*').eq('id', id).maybeSingle()
  return {data: data as CustomizationOrder | null, error}
}

export async function getAllCustomizationOrders(status?: string) {
  let query = supabase.from('customization_orders').select('*').order('created_at', {ascending: false})
  if (status) query = query.eq('status', status)
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as CustomizationOrder[], error}
}

export async function updateCustomizationOrder(orderNo: string, updates: Partial<CustomizationOrder>) {
  const {data, error} = await supabase
    .from('customization_orders')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('order_no', orderNo)
    .select()
    .maybeSingle()
  return {data: data as CustomizationOrder | null, error}
}

// ==================== 图片上传相关 ====================

export function getImageUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const {data} = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadImage(file: UploadFileInput): Promise<UploadResult> {
  try {
    const fileName = file.name || `image_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`
    const validFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileContent = file.originalFileObj || ({tempFilePath: file.path} as any)
    const {data, error} = await supabase.storage
      .from(BUCKET_NAME)
      .upload(validFileName, fileContent, {cacheControl: '3600', upsert: false})
    if (error) return {success: false, error: error.message}
    return {success: true, data, url: getImageUrl(data.path)}
  } catch (err) {
    return {success: false, error: err instanceof Error ? err.message : String(err)}
  }
}

export async function uploadImages(files: UploadFileInput[]): Promise<UploadResult[]> {
  return Promise.all(files.map((file) => uploadImage(file)))
}

// ==================== 辅助别名 ====================
export async function getUserOrders(userId: string, status?: string) {
  return getOrderList(userId, status)
}

export async function getUserAddresses(userId: string) {
  return getAddressList(userId)
}

export async function getUserTickets(userId: string, status?: string) {
  return getTicketList(userId, status)
}

export async function getUserCustomizations(userId: string, status?: string) {
  return getCustomizationOrderList(userId, status)
}

export async function getTicketsByOrderId(orderId: string) {
  const {data, error} = await supabase
    .from('tickets')
    .select('*, ticket_types(*)')
    .eq('order_no', orderId)
    .order('created_at', {ascending: true})
  return {data: (Array.isArray(data) ? data : []) as (Ticket & {ticket_type_snapshot: TicketType})[], error}
}

// ==================== 票根相关 ====================

// 创建电子票根
export async function createTicketStub(stub: {
  user_id: string
  ticket_id: string
  ticket_type: string
  visit_date: string
  venue_name: string
  venue_address: string
}) {
  return supabase.from('ticket_stubs').insert(stub).select().maybeSingle()
}

// 获取用户的票根列表
export async function getUserTicketStubs(userId: string) {
  const {data, error} = await supabase
    .from('ticket_stubs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  return {data: (data || []) as any[], error}
}

// 更新票根兑换状态
export async function redeemTicketStub(stubId: string) {
  return supabase
    .from('ticket_stubs')
    .update({is_redeemed: true, redeemed_at: new Date().toISOString()})
    .eq('id', stubId)
}

// ==================== 笔记相关 ====================

export async function getNotes(
  options: {
    userId?: string
    topic?: string
    keyword?: string
    limit?: number
    offset?: number
    sortBy?: 'latest' | 'hottest' | 'following'
    followerId?: string
  } = {}
) {
  let query = supabase.from('notes').select('*, author:profiles!user_id(username, avatar_url)').eq('is_deleted', false)

  if (options.sortBy === 'following' && options.followerId) {
    const {data: follows} = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', options.followerId)
    const followingIds = (follows || []).map((f) => f.following_id)
    if (followingIds.length > 0) {
      query = query.in('user_id', followingIds)
    } else {
      // 如果没有关注任何人，返回空结果
      return {data: [] as Note[], error: null}
    }
  }

  if (options.userId) {
    query = query.eq('user_id', options.userId)
  }
  if (options.topic) {
    query = query.contains('topics', [options.topic])
  }
  if (options.keyword) {
    query = query.or(`title.ilike.%${options.keyword}%,content.ilike.%${options.keyword}%`)
  }

  // 排序逻辑
  if (options.sortBy === 'hottest') {
    query = query.order('likes_count', {ascending: false}).order('created_at', {ascending: false})
  } else {
    // 默认按最新排序
    query = query.order('created_at', {ascending: false})
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const {data, error} = await query
  return {data: (data || []) as Note[], error}
}

export async function getNoteDetail(id: string) {
  const {data, error} = await supabase
    .from('notes')
    .select('*, author:profiles!user_id(username, avatar_url)')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  return {data: data as Note | null, error}
}

export async function createNote(note: Partial<Note>) {
  const result = await supabase.from('notes').insert(note).select().maybeSingle()

  // 如果创建成功，通知所有关注者
  if (result.data && note.user_id) {
    // 获取所有关注该用户的人
    const {data: followers} = await supabase.from('user_follows').select('follower_id').eq('following_id', note.user_id)

    if (followers && followers.length > 0) {
      // 获取作者信息
      const {data: author} = await supabase.from('profiles').select('username').eq('id', note.user_id).maybeSingle()

      // 批量创建通知
      const notifications = followers.map((f) => ({
        user_id: f.follower_id,
        type: 'new_note_from_following',
        title: '新笔记通知',
        content: `${author?.username || '用户'}发布了新笔记`,
        related_note_id: result.data.id,
        related_user_id: note.user_id
      }))

      await supabase.from('messages').insert(notifications)
    }
  }

  return result
}

export async function checkNoteLike(noteId: string, userId: string) {
  const {data, error} = await supabase
    .from('note_likes')
    .select('id')
    .eq('note_id', noteId)
    .eq('user_id', userId)
    .maybeSingle()
  return {data, error}
}

export async function toggleNoteLike(noteId: string, userId: string, isLiked: boolean) {
  if (isLiked) {
    // 取消点赞
    return supabase.from('note_likes').delete().eq('note_id', noteId).eq('user_id', userId)
  } else {
    // 点赞
    const result = await supabase.from('note_likes').insert({note_id: noteId, user_id: userId})

    // 发送通知给笔记作者
    if (!result.error) {
      const {data: note} = await supabase.from('notes').select('user_id, title').eq('id', noteId).maybeSingle()

      if (note && note.user_id !== userId) {
        // 不给自己发通知
        const {data: liker} = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle()

        await supabase.from('messages').insert({
          user_id: note.user_id,
          type: 'note_liked',
          title: '点赞通知',
          content: `${liker?.username || '用户'}赞了你的笔记`,
          related_note_id: noteId,
          related_user_id: userId
        })
      }
    }

    return result
  }
}

export async function getNoteComments(noteId: string) {
  const {data, error} = await supabase
    .from('note_comments')
    .select('*, author:profiles!user_id(username, avatar_url)')
    .eq('note_id', noteId)
    .order('created_at', {ascending: true})
  return {data: (data || []) as NoteComment[], error}
}

export async function createNoteComment(comment: Partial<NoteComment>) {
  const result = await supabase.from('note_comments').insert(comment).select().maybeSingle()

  // 发送通知
  if (result.data && comment.user_id) {
    const {data: commenter} = await supabase.from('profiles').select('username').eq('id', comment.user_id).maybeSingle()

    // 解析内容中的 @ 用户
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentionedUserIds = new Set<string>()
    let match: RegExpExecArray | null
    while (true) {
      match = mentionRegex.exec(comment.content || '')
      if (match === null) break
      mentionedUserIds.add(match[2])
    }

    // 发送 @ 通知
    for (const mentionedId of mentionedUserIds) {
      if (mentionedId !== comment.user_id) {
        await supabase.from('messages').insert({
          user_id: mentionedId,
          type: 'mentioned',
          title: '@ 通知',
          content: `${commenter?.username || '用户'} @ 了你`,
          related_note_id: comment.note_id,
          related_comment_id: result.data.id,
          related_user_id: comment.user_id
        })
      }
    }

    // 如果不是 @ 通知，则发送常规通知
    if (comment.parent_id) {
      // 这是回复评论
      const {data: parentComment} = await supabase
        .from('note_comments')
        .select('user_id')
        .eq('id', comment.parent_id)
        .maybeSingle()

      if (parentComment && parentComment.user_id !== comment.user_id && !mentionedUserIds.has(parentComment.user_id)) {
        // 通知被回复的评论作者
        await supabase.from('messages').insert({
          user_id: parentComment.user_id,
          type: 'comment_replied',
          title: '回复通知',
          content: `${commenter?.username || '用户'}回复了你的评论`,
          related_note_id: comment.note_id,
          related_comment_id: result.data.id,
          related_user_id: comment.user_id
        })
      }
    } else {
      // 这是评论笔记
      const {data: note} = await supabase.from('notes').select('user_id, title').eq('id', comment.note_id).maybeSingle()

      if (note && note.user_id !== comment.user_id && !mentionedUserIds.has(note.user_id)) {
        // 通知笔记作者
        await supabase.from('messages').insert({
          user_id: note.user_id,
          type: 'note_commented',
          title: '评论通知',
          content: `${commenter?.username || '用户'}评论了你的笔记`,
          related_note_id: comment.note_id,
          related_comment_id: result.data.id,
          related_user_id: comment.user_id
        })
      }
    }
  }

  return result
}

export async function deleteNote(noteId: string) {
  // 1. 标记笔记删除
  const result = await supabase
    .from('notes')
    .update({is_deleted: true, deleted_at: new Date().toISOString()})
    .eq('id', noteId)

  // 2. 找到所有该笔记下的评论
  const {data: comments} = await supabase.from('note_comments').select('id').eq('note_id', noteId)

  if (comments && comments.length > 0) {
    const commentIds = comments.map((c) => c.id)
    // 3. 删除这些评论相关的举报记录（满足需求：笔记删除后，对应评论举报记录自动清除）
    await supabase.from('comment_reports').delete().in('comment_id', commentIds)
  }

  return result
}

export async function restoreNote(noteId: string) {
  return supabase.from('notes').update({is_deleted: false, deleted_at: null}).eq('id', noteId)
}

export async function createNoteReport(report: Partial<NoteReport>) {
  // 确保举报记录仅保留最新一次操作记录
  if (report.note_id && report.reporter_id) {
    await supabase.from('note_reports').delete().eq('note_id', report.note_id).eq('reporter_id', report.reporter_id)
  }
  return supabase.from('note_reports').insert(report).select().maybeSingle()
}

export async function blockNote(noteId: string, userId: string) {
  return supabase.from('note_blocks').insert({note_id: noteId, user_id: userId})
}

export async function unblockNote(noteId: string, userId: string) {
  return supabase.from('note_blocks').delete().eq('note_id', noteId).eq('user_id', userId)
}

export async function checkNoteBlock(noteId: string, userId: string) {
  return supabase.from('note_blocks').select('id').eq('note_id', noteId).eq('user_id', userId).maybeSingle()
}

export async function getMyReceivedComments(userId: string) {
  const {data: myNotes} = await supabase.from('notes').select('id').eq('user_id', userId)
  const noteIds = (myNotes || []).map((n) => n.id)

  if (noteIds.length === 0) return {data: [], error: null}

  const {data, error} = await supabase
    .from('note_comments')
    .select('*, author:profiles!user_id(username, avatar_url), notes!note_id(title)')
    .in('note_id', noteIds)
    .neq('user_id', userId)
    .order('created_at', {ascending: false})
  return {data: (data || []) as any[], error}
}

// 删除评论
export async function deleteComment(commentId: string) {
  // 先获取评论所属的笔记ID，用于更新计数
  const {data: commentData} = await supabase.from('note_comments').select('note_id').eq('id', commentId).maybeSingle()

  // 先删除所有回复
  await supabase
    .from('note_comments')
    .update({is_deleted: true, deleted_at: new Date().toISOString()})
    .eq('parent_id', commentId)

  // 再删除评论本身
  const result = await supabase
    .from('note_comments')
    .update({is_deleted: true, deleted_at: new Date().toISOString()})
    .eq('id', commentId)

  // 更新评论总数统计（确保数据统计不包含已删除内容）
  if (commentData?.note_id) {
    const {count} = await supabase
      .from('note_comments')
      .select('*', {count: 'exact', head: true})
      .eq('note_id', commentData.note_id)
      .eq('is_deleted', false)

    await supabase
      .from('notes')
      .update({comments_count: count || 0})
      .eq('id', commentData.note_id)
  }

  return result
}

// 恢复评论
export async function restoreComment(commentId: string) {
  return supabase.from('note_comments').update({is_deleted: false, deleted_at: null}).eq('id', commentId)
}

// 点赞评论
export async function likeComment(commentId: string, userId: string) {
  return supabase.from('comment_likes').insert({comment_id: commentId, user_id: userId})
}

// 取消点赞评论
export async function unlikeComment(commentId: string, userId: string) {
  return supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId)
}

// 检查是否已点赞评论
export async function checkCommentLike(commentId: string, userId: string) {
  return supabase.from('comment_likes').select('id').eq('comment_id', commentId).eq('user_id', userId).maybeSingle()
}

// 创建评论举报
export async function createCommentReport(report: Partial<CommentReport>) {
  // 确保举报记录仅保留最新一次操作记录
  if (report.comment_id && report.reporter_id) {
    await supabase
      .from('comment_reports')
      .delete()
      .eq('comment_id', report.comment_id)
      .eq('reporter_id', report.reporter_id)
  }
  return supabase.from('comment_reports').insert(report).select().maybeSingle()
}

// 获取所有评论举报（管理员）
export async function getAllCommentReports(status?: string) {
  let query = supabase
    .from('comment_reports')
    .select('*, comment:note_comments!comment_id(*), reporter:profiles!reporter_id(username, avatar_url)')
    .order('created_at', {ascending: false})

  if (status) {
    query = query.eq('status', status)
  }

  const {data, error} = await query
  return {data: (data || []) as any[], error}
}

// 更新评论举报状态
export async function updateCommentReportStatus(reportId: string, status: string) {
  return supabase.from('comment_reports').update({status, updated_at: new Date().toISOString()}).eq('id', reportId)
}

// 隐藏评论
export async function hideComment(commentId: string, userId: string) {
  return supabase.from('comment_hidden').insert({comment_id: commentId, user_id: userId})
}

// 取消隐藏评论
export async function unhideComment(commentId: string, userId: string) {
  return supabase.from('comment_hidden').delete().eq('comment_id', commentId).eq('user_id', userId)
}

// 检查评论是否已隐藏
export async function checkCommentHidden(commentId: string, userId: string) {
  return supabase.from('comment_hidden').select('id').eq('comment_id', commentId).eq('user_id', userId).maybeSingle()
}

// 获取评论列表（支持排序）
export async function getComments(
  noteId: string,
  options: {sortBy?: 'latest' | 'hottest'; parentId?: string | null} = {}
) {
  let query = supabase
    .from('note_comments')
    .select('*, author:profiles!user_id(username, avatar_url)')
    .eq('note_id', noteId)
    .eq('is_deleted', false)

  // 过滤父评论或子评论
  if (options.parentId === null) {
    query = query.is('parent_id', null)
  } else if (options.parentId) {
    query = query.eq('parent_id', options.parentId)
  }

  // 排序
  if (options.sortBy === 'hottest') {
    query = query.order('likes_count', {ascending: false}).order('created_at', {ascending: false})
  } else {
    query = query.order('created_at', {ascending: false})
  }

  const {data, error} = await query
  return {data: (data || []) as NoteComment[], error}
}

export async function getCommentDetail(commentId: string) {
  const {data, error} = await supabase
    .from('note_comments')
    .select('*, author:profiles!user_id(username, avatar_url)')
    .eq('id', commentId)
    .maybeSingle()
  return {data: data as NoteComment | null, error}
}

// ==================== 消息相关 ====================

export async function getMessages(userId: string) {
  const {data, error} = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  return {data: (data || []) as any[], error}
}

export async function markMessageAsRead(messageId: string) {
  return supabase.from('messages').update({is_read: true, updated_at: new Date().toISOString()}).eq('id', messageId)
}

export async function deleteMessage(messageId: string) {
  return supabase.from('messages').delete().eq('id', messageId)
}

export async function deleteAllMessages(userId: string) {
  return supabase.from('messages').delete().eq('user_id', userId)
}

export async function getUnreadMessageCount(userId: string) {
  const {count, error} = await supabase
    .from('messages')
    .select('*', {count: 'exact', head: true})
    .eq('user_id', userId)
    .eq('is_read', false)
  return {count: count || 0, error}
}

// ==================== 点赞笔记相关 ====================

export async function getLikedNotes(userId: string) {
  const {data, error} = await supabase
    .from('note_likes')
    .select('*, note:notes!note_id(*, author:profiles!user_id(username, avatar_url))')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})

  // 提取并过滤掉已删除的笔记
  const notes = (data || []).filter((item) => item.note && !item.note.is_deleted).map((item) => item.note) as Note[]
  return {data: notes, error}
}

// ==================== 评论回复系统 ====================

export async function getCommentRepliesWithPagination(parentId: string, limit: number, offset: number) {
  const {data, error} = await supabase
    .from('note_comments')
    .select('*, author:profiles!user_id(username, avatar_url)')
    .eq('parent_id', parentId)
    .eq('is_deleted', false)
    .order('created_at', {ascending: true})
    .range(offset, offset + limit - 1)

  return {data: (data || []) as NoteComment[], error}
}

export async function getCommentRepliesCount(parentId: string) {
  const {count, error} = await supabase
    .from('note_comments')
    .select('*', {count: 'exact', head: true})
    .eq('parent_id', parentId)
    .eq('is_deleted', false)

  return {count: count || 0, error}
}

// ==================== 消息中心分类获取 ====================

export async function getMessagesByType(userId: string, categories: MessageType[]) {
  const {data, error} = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .in('type', categories)
    .order('created_at', {ascending: false})
  return {data: (data || []) as Message[], error}
}

// ==================== 评论互动功能 ====================

export async function toggleCommentLike(commentId: string, userId: string, isLiked: boolean) {
  if (isLiked) {
    // 取消点赞
    const {error} = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId)
    if (!error) {
      await supabase.rpc('decrement_comment_likes', {comment_id: commentId})
    }
    return {error}
  } else {
    // 点赞
    const {error} = await supabase.from('comment_likes').insert({comment_id: commentId, user_id: userId})
    if (!error) {
      await supabase.rpc('increment_comment_likes', {comment_id: commentId})
    }
    return {error}
  }
}

export async function reportComment(commentId: string, reporterId: string, reason: string[], description: string = '') {
  return supabase.from('comment_reports').insert({
    comment_id: commentId,
    reporter_id: reporterId,
    reason,
    description,
    status: 'pending'
  })
}

export async function createMessage(message: Partial<Message>) {
  return supabase.from('messages').insert(message).select().maybeSingle()
}

// ==================== 举报管理相关 ====================

export async function getAllReports(status?: string) {
  let query = supabase
    .from('note_reports')
    .select('*, reporter:profiles!reporter_id(username, avatar_url), note:notes(id, title, user_id)')

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const {data, error} = await query.order('created_at', {ascending: false})
  return {data: (data || []) as any[], error}
}

export async function updateReportStatus(reportId: string, status: string, contentType: 'note' | 'comment' = 'note') {
  if (contentType === 'note') {
    // 获取当前举报对应的笔记ID
    const {data: report} = await supabase.from('note_reports').select('note_id').eq('id', reportId).maybeSingle()

    if (report?.note_id && status === 'resolved') {
      // 将该笔记的所有待处理举报记录同步更新为已解决
      await supabase
        .from('note_reports')
        .update({status, updated_at: new Date().toISOString()})
        .eq('note_id', report.note_id)
        .eq('status', 'pending')
    }

    return supabase.from('note_reports').update({status, updated_at: new Date().toISOString()}).eq('id', reportId)
  } else {
    // 获取当前举报对应的评论ID
    const {data: report} = await supabase.from('comment_reports').select('comment_id').eq('id', reportId).maybeSingle()

    if (report?.comment_id && status === 'resolved') {
      // 将该评论的所有待处理举报记录同步更新为已解决
      await supabase
        .from('comment_reports')
        .update({status, updated_at: new Date().toISOString()})
        .eq('comment_id', report.comment_id)
        .eq('status', 'pending')
    }

    return supabase.from('comment_reports').update({status, updated_at: new Date().toISOString()}).eq('id', reportId)
  }
}

export async function deleteNoteReport(reportId: string) {
  return supabase.from('note_reports').delete().eq('id', reportId)
}

export async function deleteCommentReport(reportId: string) {
  return supabase.from('comment_reports').delete().eq('id', reportId)
}

// ==================== 草稿箱相关 ====================

export async function getDrafts(userId: string) {
  const {data, error} = await supabase
    .from('note_drafts')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', {ascending: false})
  return {data: (data || []) as NoteDraft[], error}
}

export async function getDraftDetail(id: string) {
  const {data, error} = await supabase.from('note_drafts').select('*').eq('id', id).maybeSingle()
  return {data: data as NoteDraft | null, error}
}

export async function createDraft(draft: Omit<NoteDraft, 'id' | 'created_at' | 'updated_at'>) {
  const {data, error} = await supabase.from('note_drafts').insert(draft).select().maybeSingle()
  return {data: data as NoteDraft | null, error}
}

export async function updateDraft(id: string, updates: Partial<NoteDraft>) {
  const {data, error} = await supabase
    .from('note_drafts')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select()
    .maybeSingle()
  return {data: data as NoteDraft | null, error}
}

export async function deleteDraft(id: string) {
  const {error} = await supabase.from('note_drafts').delete().eq('id', id)
  return {error}
}

// ==================== 用户追踪相关 ====================

export async function followUser(followerId: string, followingId: string) {
  const {data, error} = await supabase
    .from('user_follows')
    .insert({follower_id: followerId, following_id: followingId})
    .select()
    .maybeSingle()

  // 发送通知给被关注的用户
  if (!error) {
    const {data: follower} = await supabase.from('profiles').select('username').eq('id', followerId).maybeSingle()

    await supabase.from('messages').insert({
      user_id: followingId,
      type: 'new_follower',
      title: '新增关注',
      content: `${follower?.username || '用户'}关注了你`,
      related_user_id: followerId
    })
  }

  return {data, error}
}

export async function unfollowUser(followerId: string, followingId: string) {
  const {error} = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
  return {error}
}

export async function checkFollowing(followerId: string, followingId: string) {
  const {data, error} = await supabase
    .from('user_follows')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()
  return {data, error}
}

export async function getFollowers(userId: string) {
  const {data, error} = await supabase
    .from('user_follows')
    .select('follower_id, follower:profiles!follower_id(id, username, avatar_url)')
    .eq('following_id', userId)
    .order('created_at', {ascending: false})
  return {data: (data || []) as any[], error}
}

export async function getFollowing(userId: string) {
  const {data, error} = await supabase
    .from('user_follows')
    .select('following_id, created_at, following:profiles!following_id(id, username, avatar_url)')
    .eq('follower_id', userId)
    .order('created_at', {ascending: false})
  return {data: (data || []) as any[], error}
}

export async function getFollowerIds(userId: string) {
  const {data, error} = await supabase.from('user_follows').select('follower_id').eq('following_id', userId)
  return {data: (data || []).map((f) => f.follower_id) as string[], error}
}

export async function getUserProfile(userId: string) {
  const {data, error} = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return {data: data as Profile | null, error}
}

export async function searchUsers(keyword: string) {
  const {data, error} = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, followers_count, notes_count')
    .ilike('username', `%${keyword}%`)
    .limit(20)
  return {data: (data || []) as Profile[], error}
}

export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  const {data, error} = await supabase
    .from('profiles')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('id', userId)
    .select()
    .maybeSingle()
  return {data: data as Profile | null, error}
}

export async function updateUserPassword(_userId: string, newPassword: string) {
  const {data, error} = await supabase.auth.updateUser({
    password: newPassword
  })
  return {data, error}
}

// ==================== 访客记录相关 ====================

// ==================== 笔记观看量相关 ====================

export async function incrementNoteViewCount(noteId: string) {
  const {data, error} = await supabase.rpc('increment_note_view_count', {note_id: noteId})
  return {data, error}
}

export async function uploadNoteImage(file: UploadFileInput): Promise<UploadResult> {
  try {
    const fileName = `note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`
    const fileContent = file.originalFileObj || ({tempFilePath: file.path} as any)
    const {data, error} = await supabase.storage.from('notes_images').upload(fileName, fileContent)
    if (error) return {success: false, error: error.message}
    const {data: urlData} = supabase.storage.from('notes_images').getPublicUrl(data.path)
    return {success: true, data, url: urlData.publicUrl}
  } catch (err) {
    return {success: false, error: err instanceof Error ? err.message : String(err)}
  }
}

export async function uploadNoteVideo(file: UploadFileInput): Promise<UploadResult> {
  try {
    const fileName = `note_video_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp4`
    const fileContent = file.originalFileObj || ({tempFilePath: file.path} as any)
    const {data, error} = await supabase.storage.from('notes_videos').upload(fileName, fileContent)
    if (error) return {success: false, error: error.message}
    const {data: urlData} = supabase.storage.from('notes_videos').getPublicUrl(data.path)
    return {success: true, data, url: urlData.publicUrl}
  } catch (err) {
    return {success: false, error: err instanceof Error ? err.message : String(err)}
  }
}

// ==================== 商品评价相关 ====================

export async function getProductReviews(skuId: string) {
  const {data, error} = await supabase
    .from('product_reviews')
    .select('*, author:profiles!user_id(username, avatar_url)')
    .eq('sku_id', skuId)
    .order('created_at', {ascending: false})
  return {data: (data || []) as ProductReview[], error}
}

export async function getReviewSummary(skuId: string) {
  const {data, error} = await supabase.from('product_reviews').select('rating').eq('sku_id', skuId)

  if (error || !data) return {data: {average: 0, count: 0}, error}

  const count = data.length
  const average = count > 0 ? data.reduce((sum, r) => sum + r.rating, 0) / count : 0

  return {data: {average: Math.round(average * 10) / 10, count}, error: null}
}

export async function submitProductReview(review: Partial<ProductReview>) {
  const {data, error} = await supabase.from('product_reviews').insert(review).select().maybeSingle()
  return {data: data as ProductReview | null, error}
}

export async function updateProductReview(reviewId: string, updates: Partial<ProductReview>) {
  const {data, error} = await supabase.from('product_reviews').update(updates).eq('id', reviewId).select().maybeSingle()
  return {data: data as ProductReview | null, error}
}

export async function checkReviewLike(reviewId: string, userId: string) {
  const {data, error} = await supabase
    .from('product_review_likes')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .maybeSingle()
  return {data: !!data, error}
}

export async function toggleReviewLike(reviewId: string, userId: string, isLiked: boolean) {
  if (isLiked) {
    // 取消点赞
    const {error} = await supabase.from('product_review_likes').delete().eq('review_id', reviewId).eq('user_id', userId)
    if (!error) {
      await supabase.rpc('decrement_review_likes', {reviewid: reviewId})
    }
    return {error}
  } else {
    // 点赞
    const {error} = await supabase.from('product_review_likes').insert({review_id: reviewId, user_id: userId})
    if (!error) {
      await supabase.rpc('increment_review_likes', {reviewid: reviewId})
    }
    return {error}
  }
}

export async function checkUserPurchased(userId: string, skuId: string) {
  // 检查是否有包含该SKU且状态为 'completed' 的订单
  const {data, error} = await supabase
    .from('orders')
    .select('id, items')
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (error) return {data: false, error}

  const purchased = (data || []).some((order) => (order.items as any[]).some((item) => item.sku_snapshot?.id === skuId))

  return {data: purchased, error: null}
}

// ==================== 系统报错相关 ====================

export async function submitSystemReport(report: Partial<SystemReport>) {
  const {data, error} = await supabase.from('system_reports').insert(report).select().maybeSingle()
  return {data: data as SystemReport | null, error}
}

export async function getUserSystemReports(userId: string) {
  const {data, error} = await supabase
    .from('system_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  return {data: (data || []) as SystemReport[], error}
}

export async function getAllSystemReports(status?: string) {
  let query = supabase
    .from('system_reports')
    .select('*, author:profiles!user_id(username, avatar_url)')
    .order('created_at', {ascending: false})

  if (status) {
    query = query.eq('status', status)
  }

  const {data, error} = await query
  return {data: (data || []) as SystemReport[], error}
}

export async function updateSystemReport(reportId: string, updates: Partial<SystemReport>) {
  const {data, error} = await supabase.from('system_reports').update(updates).eq('id', reportId).select().maybeSingle()
  return {data: data as SystemReport | null, error}
}

// ==================== AI跨境贸易助手：业务记录 ====================

// 查询当前用户的AI业务记录（可按类型筛选）
export async function getAiTradeRecords(userId: string, type?: string) {
  let query = supabase
    .from('ai_trade_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  if (type) {
    query = query.eq('type', type)
  }
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as AiTradeRecord[], error}
}

// 查询单条AI业务记录详情
export async function getAiTradeRecordById(id: string) {
  const {data, error} = await supabase.from('ai_trade_records').select('*').eq('id', id).maybeSingle()
  return {data: data as AiTradeRecord | null, error}
}

// 保存AI业务记录
export async function createAiTradeRecord(record: AiTradeRecordInput) {
  const {data, error} = await supabase.from('ai_trade_records').insert(record).select().single()
  return {data: data as AiTradeRecord | null, error}
}

// 更新AI业务记录（人工确认/审核状态等）
export async function updateAiTradeRecord(
  id: string,
  updates: Partial<Pick<AiTradeRecord, 'status' | 'review_status'>>
) {
  const {data, error} = await supabase
    .from('ai_trade_records')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select()
    .single()
  return {data: data as AiTradeRecord | null, error}
}

// ==================== 海外客户CRM ====================

// 查询当前用户的海外客户列表（可按状态筛选，含关键词搜索）
export async function getOverseasCustomers(userId: string, status?: string) {
  let query = supabase
    .from('overseas_customers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  if (status) {
    query = query.eq('status', status)
  }
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as OverseasCustomer[], error}
}

// 按名称查找客户（询盘沉淀时判重）
export async function findOverseasCustomerByName(userId: string, name: string) {
  const {data, error} = await supabase
    .from('overseas_customers')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', name)
    .maybeSingle()
  return {data: data as OverseasCustomer | null, error}
}

// 查询客户详情
export async function getOverseasCustomerById(id: string) {
  const {data, error} = await supabase.from('overseas_customers').select('*').eq('id', id).maybeSingle()
  return {data: data as OverseasCustomer | null, error}
}

// 新增客户
export async function createOverseasCustomer(customer: OverseasCustomerInput) {
  const {data, error} = await supabase.from('overseas_customers').insert(customer).select().single()
  return {data: data as OverseasCustomer | null, error}
}

// 更新客户（状态流转/资料编辑）
export async function updateOverseasCustomer(id: string, updates: Partial<OverseasCustomerInput>) {
  const {data, error} = await supabase
    .from('overseas_customers')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select()
    .single()
  return {data: data as OverseasCustomer | null, error}
}

// 查询客户的沟通记录
export async function getCustomerCommunications(userId: string, customerId: string) {
  const {data, error} = await supabase
    .from('customer_communications')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('created_at', {ascending: true})
  return {data: (Array.isArray(data) ? data : []) as CustomerCommunication[], error}
}

// 新增沟通记录
export async function createCustomerCommunication(record: CustomerCommunicationInput) {
  const {data, error} = await supabase.from('customer_communications').insert(record).select().single()
  return {data: data as CustomerCommunication | null, error}
}

// ==================== AI报价工作台 ====================

// 查询报价列表（可按客户/状态筛选）
export async function getQuotes(userId: string, filters?: {customerId?: string; status?: string}) {
  let query = supabase.from('quotes').select('*').eq('user_id', userId).order('created_at', {ascending: false})
  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as QuoteRecord[], error}
}

// 查询报价详情
export async function getQuoteById(id: string) {
  const {data, error} = await supabase.from('quotes').select('*').eq('id', id).maybeSingle()
  return {data: data as QuoteRecord | null, error}
}

// 查询某客户的最新已确认报价版本号
export async function getLatestQuoteVersion(userId: string, quoteNo: string) {
  const {data, error} = await supabase
    .from('quotes')
    .select('version')
    .eq('user_id', userId)
    .eq('quote_no', quoteNo)
    .order('version', {ascending: false})
    .limit(1)
  const list = Array.isArray(data) ? data : []
  return {data: list.length > 0 ? (list[0].version as number) : 0, error}
}

// 新增报价（版本V1/V2/V3）
export async function createQuote(quote: QuoteRecordInput) {
  const {data, error} = await supabase.from('quotes').insert(quote).select().single()
  return {data: data as QuoteRecord | null, error}
}

// 更新报价（人工修改/确认/发送等状态流转）
export async function updateQuote(id: string, updates: Partial<QuoteRecordInput>) {
  const {data, error} = await supabase
    .from('quotes')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select()
    .single()
  return {data: data as QuoteRecord | null, error}
}

// ==================== AI贸易单证 ====================

// 查询贸易单证列表（可按类型筛选）
export async function getTradeDocuments(userId: string, docType?: string) {
  let query = supabase.from('trade_documents').select('*').eq('user_id', userId).order('created_at', {ascending: false})
  if (docType) {
    query = query.eq('doc_type', docType)
  }
  const {data, error} = await query
  return {data: (Array.isArray(data) ? data : []) as TradeDocumentRecord[], error}
}

// 查询单证详情
export async function getTradeDocumentById(id: string) {
  const {data, error} = await supabase.from('trade_documents').select('*').eq('id', id).maybeSingle()
  return {data: data as TradeDocumentRecord | null, error}
}

// 保存单证草稿
export async function createTradeDocumentRecord(doc: TradeDocumentRecordInput) {
  const {data, error} = await supabase.from('trade_documents').insert(doc).select().single()
  return {data: data as TradeDocumentRecord | null, error}
}

// 更新单证（人工编辑/确认）
export async function updateTradeDocumentRecord(id: string, updates: Partial<TradeDocumentRecordInput>) {
  const {data, error} = await supabase
    .from('trade_documents')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select()
    .single()
  return {data: data as TradeDocumentRecord | null, error}
}

// ==================== 售后中心 ====================

// 查询当前用户售后单列表
export async function getAfterSales(userId: string) {
  const {data, error} = await supabase
    .from('after_sales')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as AfterSaleRecord[], error}
}

// 查询售后单详情
export async function getAfterSaleById(id: string) {
  const {data, error} = await supabase.from('after_sales').select('*').eq('id', id).maybeSingle()
  return {data: data as AfterSaleRecord | null, error}
}

// 提交售后申请
export async function createAfterSale(record: AfterSaleInput) {
  const {data, error} = await supabase.from('after_sales').insert(record).select().single()
  return {data: data as AfterSaleRecord | null, error}
}

// 更新售后状态（平台审核/处理流转，业务端与用户端同步）
export async function updateAfterSale(id: string, updates: Partial<AfterSaleInput>) {
  const {data, error} = await supabase
    .from('after_sales')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select()
    .single()
  return {data: data as AfterSaleRecord | null, error}
}

// ==================== 异常订单中心 ====================

// 查询异常订单列表（业务角色可见全部自己的数据）
export async function getOrderExceptions(userId: string) {
  const {data, error} = await supabase
    .from('order_exceptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as OrderExceptionRecord[], error}
}

// 新增异常记录
export async function createOrderException(record: OrderExceptionInput) {
  const {data, error} = await supabase.from('order_exceptions').insert(record).select().single()
  return {data: data as OrderExceptionRecord | null, error}
}

// 更新异常记录（AI建议→人工确认→执行→记录结果）
export async function updateOrderException(id: string, updates: Partial<OrderExceptionInput>) {
  const {data, error} = await supabase
    .from('order_exceptions')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select()
    .single()
  return {data: data as OrderExceptionRecord | null, error}
}

// ==================== 演示数据管理 ====================

// 清除当前用户全部课堂演示数据（is_demo=true，不影响真实业务数据）
export async function resetDemoData(userId: string) {
  const tables = [
    'overseas_customers',
    'customer_communications',
    'quotes',
    'trade_documents',
    'order_exceptions',
    'ai_trade_records',
    'rfqs',
    'sample_orders',
    'follow_up_tasks',
    'ai_operation_logs',
    'operation_logs',
    'payment_transactions'
  ]
  const errors: string[] = []
  for (const table of tables) {
    const {error} = await supabase.from(table).delete().eq('user_id', userId).eq('is_demo', true)
    if (error) errors.push(`${table}: ${error.message}`)
  }
  return {errors}
}

// ==================== 订单状态机与支付（第二轮） ====================

// 调用 RPC 校验订单状态转换
export async function checkOrderStatusTransition(
  orderNo: string,
  newStatus: string,
  operatorType: 'system' | 'user' | 'admin' | 'merchant' = 'system'
) {
  const {data, error} = await supabase.rpc('check_order_status_transition', {
    p_order_no: orderNo,
    p_new_status: newStatus,
    p_operator_type: operatorType
  })
  return {data, error}
}

// 演示支付成功（幂等，防重）
export async function handleDemoPaymentSuccess(orderNo: string, transactionNo: string, amount: number) {
  const {data, error} = await supabase.rpc('handle_order_payment_success_v2', {
    p_order_no: orderNo,
    p_transaction_no: transactionNo,
    p_amount: amount,
    p_currency: 'CNY',
    p_channel: 'demo'
  })
  return {data, error}
}

// 取消订单并释放库存
export async function cancelOrderAndReleaseStock(orderNo: string, reason = '') {
  const {data, error} = await supabase.rpc('cancel_order_and_release_stock', {
    p_order_no: orderNo,
    p_reason: reason
  })
  return {data, error}
}

// 查询订单状态日志
export async function getOrderStatusLogs(orderNo: string) {
  const {data, error} = await supabase
    .from('order_status_logs')
    .select('*')
    .eq('order_no', orderNo)
    .order('created_at', {ascending: true})
  return {data: (Array.isArray(data) ? data : []) as OrderStatusLog[], error}
}

// 查询支付流水
export async function getPaymentTransactions(orderNo: string) {
  const {data, error} = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('order_no', orderNo)
    .order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as PaymentTransaction[], error}
}

// ==================== RFQ 批量询价 ====================

export async function getRfqs(userId: string, filters?: {status?: string; customerId?: string}) {
  let q = supabase.from('rfqs').select('*').eq('user_id', userId)
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.customerId) q = q.eq('customer_id', filters.customerId)
  const {data, error} = await q.order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as RfqRecord[], error}
}

export async function getRfqById(id: string) {
  const {data, error} = await supabase.from('rfqs').select('*').eq('id', id).maybeSingle()
  return {data: data as RfqRecord | null, error}
}

export async function createRfq(record: RfqInput) {
  const {data, error} = await supabase.from('rfqs').insert(record).select().single()
  return {data: data as RfqRecord | null, error}
}

export async function updateRfq(id: string, updates: Partial<RfqInput>) {
  const {data, error} = await supabase.from('rfqs').update(updates).eq('id', id).select().single()
  return {data: data as RfqRecord | null, error}
}

// ==================== 样品订单 ====================

export async function getSampleOrders(userId: string, customerId?: string) {
  let q = supabase.from('sample_orders').select('*').eq('user_id', userId)
  if (customerId) q = q.eq('customer_id', customerId)
  const {data, error} = await q.order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as SampleOrderRecord[], error}
}

export async function createSampleOrder(record: SampleOrderInput) {
  const {data, error} = await supabase.from('sample_orders').insert(record).select().single()
  return {data: data as SampleOrderRecord | null, error}
}

export async function updateSampleOrder(id: string, updates: Partial<SampleOrderInput>) {
  const {data, error} = await supabase.from('sample_orders').update(updates).eq('id', id).select().single()
  return {data: data as SampleOrderRecord | null, error}
}

// ==================== 客户跟进任务 ====================

export async function getFollowUpTasks(userId: string, customerId?: string) {
  let q = supabase.from('follow_up_tasks').select('*').eq('user_id', userId)
  if (customerId) q = q.eq('customer_id', customerId)
  const {data, error} = await q.order('due_at', {ascending: true})
  return {data: (Array.isArray(data) ? data : []) as FollowUpTask[], error}
}

export async function createFollowUpTask(record: FollowUpTaskInput) {
  const {data, error} = await supabase.from('follow_up_tasks').insert(record).select().single()
  return {data: data as FollowUpTask | null, error}
}

export async function updateFollowUpTask(id: string, updates: Partial<FollowUpTaskInput>) {
  const {data, error} = await supabase.from('follow_up_tasks').update(updates).eq('id', id).select().single()
  return {data: data as FollowUpTask | null, error}
}

// ==================== AI 操作记录 ====================

export async function getAiOperationLogs(userId: string, filters?: {businessType?: string; targetId?: string}) {
  let q = supabase.from('ai_operation_logs').select('*').eq('user_id', userId)
  if (filters?.businessType) q = q.eq('business_type', filters.businessType)
  if (filters?.targetId)
    q = q.or(`ai_trade_record_id.eq.${filters.targetId},rfq_id.eq.${filters.targetId},quote_id.eq.${filters.targetId}`)
  const {data, error} = await q.order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as AiOperationLog[], error}
}

export async function getAiOperationLogById(id: string) {
  const {data, error} = await supabase.from('ai_operation_logs').select('*').eq('id', id).maybeSingle()
  return {data: data as AiOperationLog | null, error}
}

export async function createAiOperationLog(record: AiOperationLogInput) {
  const {data, error} = await supabase.from('ai_operation_logs').insert(record).select().single()
  return {data: data as AiOperationLog | null, error}
}

export async function updateAiOperationLog(id: string, updates: Partial<AiOperationLogInput>) {
  const {data, error} = await supabase.from('ai_operation_logs').update(updates).eq('id', id).select().single()
  return {data: data as AiOperationLog | null, error}
}

// ==================== 通知模板 ====================

export async function getNotificationTemplates(type?: string) {
  let q = supabase.from('notification_templates').select('*')
  if (type) q = q.eq('type', type)
  const {data, error} = await q.order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as NotificationTemplate[], error}
}

export async function updateNotificationTemplate(id: string, updates: Partial<NotificationTemplate>) {
  const {data, error} = await supabase.from('notification_templates').update(updates).eq('id', id).select().single()
  return {data: data as NotificationTemplate | null, error}
}

// ==================== 操作日志 ====================

export async function getOperationLogs(targetType?: string, targetId?: string) {
  let q = supabase.from('operation_logs').select('*')
  if (targetType && targetId) q = q.eq('target_type', targetType).eq('target_id', targetId)
  const {data, error} = await q.order('created_at', {ascending: false})
  return {data: (Array.isArray(data) ? data : []) as OperationLog[], error}
}

export async function createOperationLog(record: OperationLogInput) {
  const {data, error} = await supabase.from('operation_logs').insert(record).select().single()
  return {data: data as OperationLog | null, error}
}

// ==================== 运营配置中心 ====================

export async function getAppConfig(key: string) {
  const {data, error} = await supabase.from('app_configs').select('*').eq('config_key', key).maybeSingle()
  return {data: data as AppConfig | null, error}
}

export async function getAppConfigs() {
  const {data, error} = await supabase.from('app_configs').select('*').order('config_key')
  return {data: (Array.isArray(data) ? data : []) as AppConfig[], error}
}

export async function updateAppConfig(key: string, value: unknown, updatedBy?: string) {
  const {data, error} = await supabase
    .from('app_configs')
    .update({config_value: value, updated_by: updatedBy})
    .eq('config_key', key)
    .select()
    .single()
  return {data: data as AppConfig | null, error}
}

// 查询物流方案配置
export async function getLogisticsPlans(): Promise<{data: LogisticsPlanConfig[]; error: Error | null}> {
  const {data, error} = await getAppConfig('logistics_plans')
  if (error || !data) return {data: [], error}
  try {
    const plans = (data.config_value as LogisticsPlanConfig[]) || []
    return {data: plans, error: null}
  } catch {
    return {data: [], error: null}
  }
}

// 查询演示模式开关
export async function getDemoModeConfig(): Promise<boolean> {
  const {data, error} = await getAppConfig('demo_mode_switch')
  if (error || !data) return true
  try {
    const cfg = data.config_value as {enabled?: boolean}
    return cfg.enabled !== false
  } catch {
    return true
  }
}

// 查询售后原因配置
export async function getAfterSaleReasons(): Promise<
  {key: string; name: string; need_photo: boolean; need_video: boolean}[]
> {
  const {data, error} = await getAppConfig('after_sale_reasons')
  if (error || !data) return []
  try {
    return ((data.config_value as any[]) || []).map((r) => ({
      key: String(r.key || ''),
      name: String(r.name || ''),
      need_photo: Boolean(r.need_photo),
      need_video: Boolean(r.need_video)
    }))
  } catch {
    return []
  }
}

// 查询贸易条款配置
export async function getTradeTermsInfo(): Promise<{code: string; name: string; responsibility: string}[]> {
  const {data, error} = await getAppConfig('trade_terms_info')
  if (error || !data) return []
  try {
    return ((data.config_value as any[]) || []).map((r) => ({
      code: String(r.code || ''),
      name: String(r.name || ''),
      responsibility: String(r.responsibility || '')
    }))
  } catch {
    return []
  }
}
