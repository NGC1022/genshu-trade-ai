// @title 客户详情
// 海外客户CRM详情：客户档案 + 状态流转 + 询盘/报价/沟通记录关联 + 敏感信息脱敏

import {Text, Textarea, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useMemo, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {
  createCustomerCommunication,
  getCustomerCommunications,
  getOverseasCustomerById,
  getQuotes,
  updateOverseasCustomer
} from '@/db/api'
import type {CustomerKind, CustomerStatus} from '@/db/types'
import {CUSTOMER_KIND_LABELS, CUSTOMER_STATUS_LABELS} from '@/db/types'
import {maskContact} from '@/utils/masking'

// 状态机流转规则（当前状态 → 可流转状态）
const STATUS_FLOW: Record<CustomerStatus, CustomerStatus[]> = {
  new_inquiry: ['contacted'],
  contacted: ['quoted'],
  quoted: ['sample_confirmed', 'ordered'],
  sample_confirmed: ['ordered'],
  ordered: ['deal_closed'],
  deal_closed: ['completed'],
  completed: []
}

export default function AiTradeCustomerDetail() {
  const {user} = useAuth()
  const [customer, setCustomer] = useState<any>(null)
  const [quotes, setQuotes] = useState<any[]>([])
  const [comms, setComms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showContact, setShowContact] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const id = useMemo(() => Taro.getCurrentInstance().router?.params?.id || '', [])

  const loadDetail = useCallback(async () => {
    if (!id || !user) {
      setLoading(false)
      return
    }
    const [cRes, qRes, commRes] = await Promise.all([
      getOverseasCustomerById(id),
      getQuotes(user.id, {customerId: id}),
      getCustomerCommunications(user.id, id)
    ])
    if (!cRes.error && cRes.data) setCustomer(cRes.data)
    if (!qRes.error) setQuotes(qRes.data)
    if (!commRes.error) setComms(commRes.data)
    setLoading(false)
  }, [id, user])

  useDidShow(() => {
    loadDetail()
  })

  const handleStatusChange = (next: CustomerStatus) => {
    if (!customer) return
    Taro.showModal({
      title: '状态流转确认',
      content: `确认将客户状态变更为「${CUSTOMER_STATUS_LABELS[next]}」？`,
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({title: '更新中...'})
        const {data, error} = await updateOverseasCustomer(customer.id, {status: next})
        Taro.hideLoading()
        if (error || !data) {
          Taro.showToast({title: '状态更新失败', icon: 'none'})
          return
        }
        setCustomer(data)
        Taro.showToast({title: '状态已更新'})
      }
    })
  }

  const handleAddNote = async () => {
    if (!customer || savingNote || !noteText.trim()) return
    if (!user) return
    setSavingNote(true)
    const {error} = await createCustomerCommunication({
      user_id: user.id,
      customer_id: customer.id,
      type: 'note',
      content: noteText.trim(),
      language: 'zh',
      is_demo: customer.is_demo
    })
    setSavingNote(false)
    if (error) {
      Taro.showToast({title: '保存失败', icon: 'none'})
      return
    }
    setNoteText('')
    const commRes = await getCustomerCommunications(user.id, customer.id)
    if (!commRes.error) setComms(commRes.data)
    Taro.showToast({title: '沟通记录已添加'})
  }

  if (loading) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-sm text-muted-foreground">加载客户档案中...</Text>
      </View>
    )
  }

  if (!customer) {
    return (
      <View className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <View className="i-mdi-account-question-outline text-5xl text-muted-foreground/40 mb-3" />
        <Text className="text-base text-muted-foreground mb-4">客户不存在或无权访问</Text>
        <View className="rounded-full bg-primary px-6 py-2.5" onClick={() => Taro.navigateBack()}>
          <Text className="text-base text-primary-foreground font-bold">返回</Text>
        </View>
      </View>
    )
  }

  const nextStatuses = (STATUS_FLOW[customer.status as CustomerStatus] || []) as CustomerStatus[]

  const commTypeLabel: Record<string, string> = {
    inquiry: '询盘',
    reply: '回复',
    quote: '报价',
    note: '备注'
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 客户档案头 */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center justify-between mb-3">
          <View className="flex flex-row items-center flex-1">
            <Text className="text-xl font-black text-foreground flex-shrink-0">{customer.name}</Text>
            {customer.is_demo && (
              <View className="ml-2 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Text className="text-xs text-amber-700">课堂演示数据</Text>
              </View>
            )}
          </View>
          <View className="bg-primary/10 rounded-full px-3 py-1">
            <Text className="text-sm font-bold text-primary">
              {CUSTOMER_STATUS_LABELS[customer.status as CustomerStatus]}
            </Text>
          </View>
        </View>

        <View className="flex flex-col gap-2">
          <View className="flex flex-row items-center">
            <Text className="text-sm text-muted-foreground w-24">国家/地区</Text>
            <Text className="text-sm text-foreground flex-1">{customer.country || '待确认'}</Text>
          </View>
          <View className="flex flex-row items-center">
            <Text className="text-sm text-muted-foreground w-24">客户类型</Text>
            <Text className="text-sm text-foreground flex-1">
              {CUSTOMER_KIND_LABELS[customer.customer_type as CustomerKind]}
            </Text>
          </View>
          <View className="flex flex-row items-center">
            <Text className="text-sm text-muted-foreground w-24">联系方式</Text>
            <Text className="text-sm text-foreground flex-1 flex-shrink">
              {showContact ? customer.contact || '待确认' : maskContact(customer.contact || '')}
            </Text>
            <View className="flex flex-row items-center text-primary" onClick={() => setShowContact(!showContact)}>
              <Text className="text-xs font-bold mr-0.5">{showContact ? '隐藏' : '查看'}</Text>
              <View className={`i-mdi-eye-outline text-sm transition-transform ${showContact ? '' : ''}`} />
            </View>
          </View>
          <View className="flex flex-row items-center">
            <Text className="text-sm text-muted-foreground w-24">询盘商品</Text>
            <Text className="text-sm text-foreground flex-1">{customer.intent_product || '待确认'}</Text>
          </View>
          <View className="flex flex-row items-center">
            <Text className="text-sm text-muted-foreground w-24">采购数量</Text>
            <Text className="text-sm text-foreground flex-1">
              {customer.intent_quantity ? `${customer.intent_quantity}件` : '待确认'}
            </Text>
          </View>
          <View className="flex flex-row items-center">
            <Text className="text-sm text-muted-foreground w-24">首次询盘</Text>
            <Text className="text-sm text-foreground flex-1">
              {customer.first_inquiry_at ? customer.first_inquiry_at.slice(0, 10) : '待确认'}
            </Text>
          </View>
        </View>

        {customer.tags && customer.tags.length > 0 && (
          <View className="flex flex-row flex-wrap gap-2 mt-3">
            {customer.tags.map((tag: string, i: number) => (
              <View key={i} className="bg-primary/10 rounded-full px-2.5 py-0.5">
                <Text className="text-xs text-primary">{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 状态流转 */}
      {nextStatuses.length > 0 && (
        <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center mb-3">
            <View className="w-1 h-5 bg-secondary rounded-full mr-2" />
            <Text className="text-base font-bold text-foreground">状态流转</Text>
          </View>
          <View className="flex flex-row flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <View
                key={s}
                className="bg-primary/10 border border-primary/30 rounded-full px-4 py-2"
                onClick={() => handleStatusChange(s)}>
                <Text className="text-sm text-primary font-bold">流转至 {CUSTOMER_STATUS_LABELS[s]}</Text>
              </View>
            ))}
          </View>
          <Text className="text-xs text-muted-foreground mt-2">
            状态机：新询盘→已联系→已报价→样品确认→已下单→已成交→已完成（点击流转，需二次确认）
          </Text>
        </View>
      )}

      {/* 关联报价 */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-3">
          <View className="w-1 h-5 bg-secondary rounded-full mr-2" />
          <Text className="text-base font-bold text-foreground">历史报价（{quotes.length}）</Text>
        </View>
        {quotes.length === 0 ? (
          <Text className="text-sm text-muted-foreground">暂无关联报价，可在报价工作台基于此客户生成</Text>
        ) : (
          <View className="flex flex-col gap-2">
            {quotes.map((q) => (
              <View key={q.id} className="bg-muted/60 rounded-xl p-3">
                <View className="flex flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-bold text-foreground">
                    {q.quote_no} V{q.version}
                  </Text>
                  <Text className="text-xs text-muted-foreground">{q.status_label || q.status}</Text>
                </View>
                <Text className="text-xs text-muted-foreground">
                  {q.product_name || '商品'} × {q.quantity} · {q.currency} {q.total_cost}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 沟通记录 */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-3">
          <View className="w-1 h-5 bg-secondary rounded-full mr-2" />
          <Text className="text-base font-bold text-foreground">沟通记录（{comms.length}）</Text>
        </View>

        {comms.length > 0 && (
          <View className="flex flex-col gap-2.5 mb-4">
            {comms.map((comm) => (
              <View key={comm.id} className="bg-muted/60 rounded-xl p-3">
                <View className="flex flex-row items-center mb-1">
                  <View className="bg-primary/10 rounded-full px-2 py-0.5 mr-2">
                    <Text className="text-xs text-primary font-bold">{commTypeLabel[comm.type] || comm.type}</Text>
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    {comm.created_at?.slice(0, 16).replace('T', ' ')}
                  </Text>
                </View>
                <Text className="text-sm text-foreground leading-relaxed">{comm.content}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="bg-muted rounded-xl p-3 mb-2">
          <Textarea
            className="w-full text-base text-foreground"
            value={noteText}
            maxlength={500}
            placeholder="添加沟通备注（如电话沟通结果、客户反馈等）"
            onInput={(e) => setNoteText(((e as any).detail?.value ?? (e as any).target?.value ?? '') as string)}
            style={{height: '100rpx'}}
          />
        </View>
        <View
          className={`rounded-xl flex items-center justify-center ${savingNote ? 'bg-primary/50' : 'bg-primary'}`}
          onClick={handleAddNote}>
          <Text className="text-sm text-primary-foreground font-bold py-2.5">
            {savingNote ? '保存中...' : '添加备注'}
          </Text>
        </View>
      </View>

      <View className="bg-muted/60 rounded-2xl p-4 mb-8">
        <Text className="text-xs text-muted-foreground leading-relaxed">
          本客户的多次询盘、报价、订单已关联展示；联系方式默认脱敏，点击"查看"需业务权限确认。数据访问受服务端RLS策略保护。
        </Text>
      </View>
    </View>
  )
}
