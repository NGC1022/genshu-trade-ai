// @title 异常订单中心
// 异常订单中心：8类异常自动归类 + AI处理建议 + 英文客户通知草稿 + 人工确认执行
// 流程：异常识别→AI建议→人工确认→执行→记录结果；AI不自动修改订单状态/金额

import {Picker, Text, Textarea, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createOrderException, getOrderExceptions, updateOrderException} from '@/db/api'
import type {OrderExceptionRecord, OrderExceptionType} from '@/db/types'
import {ORDER_EXCEPTION_STATUS_LABELS, ORDER_EXCEPTION_TYPE_LABELS} from '@/db/types'
import {AiServiceError, type ExceptionSuggestionResult, generateExceptionSuggestion} from '@/services/aiTrade'
import {isBusinessRole} from '@/utils/roles'

const TYPE_KEYS: OrderExceptionType[] = [
  'logistics_delay',
  'customs_issue',
  'address_error',
  'delivery_failed',
  'package_damaged',
  'payment_issue',
  'refunding',
  'customer_cancelled'
]

export default function OrderExceptions() {
  const {user} = useAuth()
  const [records, setRecords] = useState<OrderExceptionRecord[]>([])
  const [loading, setLoading] = useState(true)

  // 登记表单
  const [orderNo, setOrderNo] = useState('')
  const [typeIdx, setTypeIdx] = useState(0)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // AI建议详情
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<Record<string, ExceptionSuggestionResult>>({})

  const canView = isBusinessRole((user as any)?.role)

  const loadRecords = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    const {data, error} = await getOrderExceptions(user.id)
    if (!error) setRecords(data)
    setLoading(false)
  }, [user])

  useDidShow(() => {
    if (canView) loadRecords()
    else setLoading(false)
  })

  const handleSubmit = async () => {
    if (submitting) return
    if (!user) return
    if (!orderNo.trim()) {
      Taro.showToast({title: '请输入异常订单号', icon: 'none'})
      return
    }
    setSubmitting(true)
    Taro.showLoading({title: '提交中...'})
    const {error} = await createOrderException({
      user_id: user.id,
      order_no: orderNo.trim(),
      type: TYPE_KEYS[typeIdx],
      description: description.trim() || null,
      status: 'identified',
      is_demo: orderNo.includes('DEMO')
    })
    Taro.hideLoading()
    setSubmitting(false)
    if (error) {
      Taro.showToast({title: '提交失败，请重试', icon: 'none'})
      return
    }
    Taro.showToast({title: '异常已登记'})
    setOrderNo('')
    setDescription('')
    setShowForm(false)
    loadRecords()
  }

  const handleAiSuggest = async (record: OrderExceptionRecord) => {
    if (aiLoadingId) return
    setAiLoadingId(record.id)
    try {
      const res = await generateExceptionSuggestion(record.type, record.description || '')
      setAiResult((prev) => ({...prev, [record.id]: res}))
      // 保存AI建议到记录（状态：AI建议）
      await updateOrderException(record.id, {
        ai_suggestion: {suggestions: res.suggestions, to_confirm: res.to_confirm},
        notify_draft: res.notify_draft,
        status: 'ai_suggested'
      })
      loadRecords()
    } catch (err) {
      const msg = err instanceof AiServiceError ? err.message : 'AI建议生成失败，请重试'
      Taro.showToast({title: msg, icon: 'none'})
    } finally {
      setAiLoadingId(null)
    }
  }

  const handleConfirmFlow = (record: OrderExceptionRecord) => {
    const nextStatuses: Record<string, string[]> = {
      identified: ['ai_suggested'],
      ai_suggested: ['confirmed'],
      confirmed: ['executed'],
      executed: ['recorded'],
      recorded: []
    }
    const nexts = nextStatuses[record.status] || []
    if (nexts.length === 0) return
    const next = nexts[0]
    const actionLabel = ORDER_EXCEPTION_STATUS_LABELS[next as OrderExceptionRecord['status']]
    Taro.showModal({
      title: '异常处理流转',
      content: `确认执行「${actionLabel}」？${next === 'confirmed' ? 'AI建议须经人工确认后才可执行。' : ''}`,
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({title: '更新中...'})
        const {error} = await updateOrderException(record.id, {status: next as OrderExceptionRecord['status']})
        Taro.hideLoading()
        if (error) {
          Taro.showToast({title: '操作失败', icon: 'none'})
          return
        }
        Taro.showToast({title: `已${actionLabel}`})
        loadRecords()
      }
    })
  }

  const copyText = async (text: string, label: string) => {
    try {
      await Taro.setClipboardData({data: text})
      Taro.showToast({title: `已复制${label}`})
    } catch {
      Taro.showToast({title: '复制失败', icon: 'none'})
    }
  }

  if (!canView) {
    return (
      <View className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <View className="i-mdi-lock-outline text-5xl text-muted-foreground/40 mb-3" />
        <Text className="text-lg font-bold text-foreground mb-2">无访问权限</Text>
        <Text className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
          异常订单中心仅面向商家/运营人员、审核人员与管理员开放。
        </Text>
        <View className="rounded-full bg-primary px-6 py-2.5" onClick={() => Taro.navigateBack()}>
          <Text className="text-base text-primary-foreground font-bold">返回</Text>
        </View>
      </View>
    )
  }

  const typeColor = (t: OrderExceptionType) => {
    if (t === 'customs_issue') return 'bg-red-50 text-red-500 border border-red-200'
    if (t === 'package_damaged') return 'bg-amber-50 text-amber-700 border border-amber-200'
    if (t === 'customer_cancelled') return 'bg-muted text-muted-foreground'
    return 'bg-accent/10 text-accent'
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 顶部 */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-2">
          <View className="w-1 h-5 bg-primary rounded-full mr-2" />
          <Text className="text-xl font-bold text-foreground">异常订单中心</Text>
        </View>
        <Text className="text-sm text-muted-foreground leading-relaxed">
          自动归类物流延迟、清关异常、地址错误、配送失败、包裹破损、支付异常、退款处理中、客户取消8类异常。AI生成处理建议与英文客户通知草稿，人工确认后执行。
        </Text>
        <View
          className="mt-3 bg-primary rounded-xl flex items-center justify-center"
          onClick={() => setShowForm(!showForm)}>
          <Text className="text-base text-primary-foreground font-bold py-3">{showForm ? '收起' : '登记异常订单'}</Text>
        </View>
      </View>

      {/* 登记表单 */}
      {showForm && (
        <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
          <View className="flex flex-col gap-3">
            <View>
              <Text className="text-sm text-muted-foreground mb-1.5 block">订单号</Text>
              <View className="bg-muted rounded-xl px-3 py-2.5">
                <input
                  className="w-full text-base text-foreground"
                  value={orderNo}
                  placeholder="输入异常订单号"
                  onInput={(e) => setOrderNo(((e as any).detail?.value ?? (e as any).target?.value ?? '') as string)}
                />
              </View>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground mb-1.5 block">异常类型</Text>
              <Picker
                mode="selector"
                range={TYPE_KEYS.map((t) => ORDER_EXCEPTION_TYPE_LABELS[t])}
                value={typeIdx}
                onChange={(e) => setTypeIdx(Number(e.detail.value))}>
                <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                  <Text className="text-base text-foreground">{ORDER_EXCEPTION_TYPE_LABELS[TYPE_KEYS[typeIdx]]}</Text>
                  <View className="i-mdi-chevron-down text-muted-foreground" />
                </View>
              </Picker>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground mb-1.5 block">异常描述（可选）</Text>
              <View className="bg-muted rounded-xl p-3">
                <Textarea
                  className="w-full text-base text-foreground"
                  value={description}
                  maxlength={300}
                  placeholder="描述异常情况（如清关被扣原因、破损程度等）"
                  onInput={(e) =>
                    setDescription(((e as any).detail?.value ?? (e as any).target?.value ?? '') as string)
                  }
                  style={{height: '100rpx'}}
                />
              </View>
            </View>
            <View
              className={`rounded-xl flex items-center justify-center ${submitting ? 'bg-primary/50' : 'bg-primary'}`}
              onClick={handleSubmit}>
              <Text className="text-base text-primary-foreground font-bold py-3">
                {submitting ? '提交中...' : '登记异常'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 异常列表 */}
      {loading ? (
        <View className="py-12 items-center">
          <Text className="text-sm text-muted-foreground">加载异常订单中...</Text>
        </View>
      ) : records.length === 0 ? (
        <View className="bg-muted/60 rounded-3xl p-8 items-center mb-8">
          <View className="i-mdi-check-circle-outline text-4xl text-emerald-400 mb-2" />
          <Text className="text-sm text-muted-foreground text-center leading-relaxed">
            暂无异常订单{'\n'}所有订单运行正常
          </Text>
        </View>
      ) : (
        <View className="flex flex-col gap-3 mb-8">
          {records.map((r) => {
            const ai = aiResult[r.id] || (r.ai_suggestion as any)
            const notify = r.notify_draft || aiResult[r.id]?.notify_draft
            return (
              <View key={r.id} className="bg-card rounded-3xl p-4 shadow-card border border-border border-opacity-10">
                <View className="flex flex-row items-center justify-between mb-2">
                  <View className={`rounded-full px-2.5 py-1 ${typeColor(r.type)}`}>
                    <Text className="text-xs font-bold">{ORDER_EXCEPTION_TYPE_LABELS[r.type]}</Text>
                  </View>
                  <Text className="text-xs text-muted-foreground">{ORDER_EXCEPTION_STATUS_LABELS[r.status]}</Text>
                </View>
                <Text className="text-sm text-foreground mb-1">订单号：{r.order_no}</Text>
                {r.description && (
                  <Text className="text-xs text-muted-foreground mb-2" numberOfLines={2}>
                    {r.description}
                  </Text>
                )}

                {/* AI建议 */}
                {!ai && r.status === 'identified' && (
                  <View
                    className={`rounded-xl flex items-center justify-center ${aiLoadingId === r.id ? 'bg-secondary/50' : 'bg-secondary'}`}
                    onClick={() => handleAiSuggest(r)}>
                    <Text className="text-sm text-primary-foreground font-bold py-2.5">
                      {aiLoadingId === r.id ? 'AI生成建议中...' : '生成AI处理建议'}
                    </Text>
                  </View>
                )}

                {ai && (
                  <View className="bg-muted/60 rounded-xl p-3 mt-2">
                    <View className="flex flex-row items-center mb-2">
                      <View className="i-mdi-robot-outline text-sm text-secondary mr-1.5" />
                      <Text className="text-xs font-bold text-foreground">AI处理建议（需人工确认）</Text>
                    </View>
                    <View className="flex flex-col gap-1.5 mb-2">
                      {(ai as any).suggestions?.map((s: string, i: number) => (
                        <View key={i} className="flex flex-row items-start">
                          <View className="w-1 h-1 rounded-full bg-secondary mt-1.5 mr-1.5 flex-shrink-0" />
                          <Text className="text-xs text-muted-foreground leading-relaxed flex-1">{s}</Text>
                        </View>
                      ))}
                    </View>
                    {notify && (
                      <View className="bg-card border border-border border-opacity-10 rounded-lg p-2.5">
                        <View className="flex flex-row items-center justify-between mb-1">
                          <Text className="text-xs font-bold text-muted-foreground">英文客户通知草稿</Text>
                          <View
                            className="bg-muted rounded-full px-2 py-0.5"
                            onClick={() => copyText(notify, '通知草稿')}>
                            <Text className="text-xs text-primary font-bold">复制</Text>
                          </View>
                        </View>
                        <Text className="text-xs text-foreground leading-relaxed">{notify}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* 流转按钮 */}
                {r.status !== 'recorded' && r.status !== 'identified' && (
                  <View
                    className="mt-2 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center"
                    onClick={() => handleConfirmFlow(r)}>
                    <Text className="text-sm text-primary font-bold py-2.5">人工确认流转</Text>
                  </View>
                )}
              </View>
            )
          })}
        </View>
      )}

      <View className="bg-muted/60 rounded-2xl p-4 mb-8">
        <View className="flex flex-row items-center mb-1.5">
          <View className="i-mdi-shield-alert-outline text-muted-foreground text-lg mr-2" />
          <Text className="text-sm font-bold text-muted-foreground">AI边界说明</Text>
        </View>
        <Text className="text-xs text-muted-foreground leading-relaxed">
          AI不能自动修改订单关键状态、退款金额或赔偿金额；所有处理建议须经人工确认后执行。
        </Text>
      </View>
    </View>
  )
}
