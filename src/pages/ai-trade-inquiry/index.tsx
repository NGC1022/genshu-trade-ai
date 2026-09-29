// AI跨境询盘：输入英文询盘 → AI识别需求 → AI生成英文回复（演示模式）

import {Text, Textarea, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createAiTradeRecord, createOverseasCustomer, updateAiTradeRecord} from '@/db/api'
import {
  AiServiceError,
  analyzeCustomerIntent,
  analyzeInquiry,
  type CustomerIntentResult,
  DEMO_BADGE_TEXT,
  DEMO_INQUIRY,
  generateInquiryReply,
  type InquiryAnalysisResult,
  type InquiryReplyResult
} from '@/services/aiTrade'

export default function AiTradeInquiry() {
  const {user} = useAuth()
  const [inquiryText, setInquiryText] = useState('')
  const [isDemo, setIsDemo] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [replying, setReplying] = useState(false)
  const [analysis, setAnalysis] = useState<InquiryAnalysisResult | null>(null)
  const [reply, setReply] = useState<InquiryReplyResult | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  // 客户意向识别（需求六：提取意图/商品/数量/目的国/场景/重点需求等）
  const [intent, setIntent] = useState<CustomerIntentResult | null>(null)
  const [intentLoading, setIntentLoading] = useState(false)
  const [savedCustomerId, setSavedCustomerId] = useState<string | null>(null)

  const handleInput = (e: any) => {
    const val = e.detail?.value ?? e.target?.value ?? ''
    setInquiryText(val)
    if (val) setIsDemo(false)
    setAnalysis(null)
    setReply(null)
    setSavedId(null)
  }

  const handleLoadDemo = () => {
    setInquiryText(DEMO_INQUIRY)
    setIsDemo(true)
    setAnalysis(null)
    setReply(null)
    setSavedId(null)
  }

  const handleAnalyze = async () => {
    if (analyzing) return
    if (!inquiryText.trim()) {
      Taro.showToast({title: '请输入英文询盘内容', icon: 'none'})
      return
    }
    setAnalyzing(true)
    try {
      const res = await analyzeInquiry(inquiryText)
      setAnalysis(res)
      setReply(null)
    } catch (err) {
      const msg = err instanceof AiServiceError ? err.message : 'AI分析失败，请重试'
      Taro.showToast({title: msg, icon: 'none'})
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReply = async () => {
    if (replying || !analysis) return
    setReplying(true)
    try {
      const res = await generateInquiryReply(inquiryText, analysis)
      setReply(res)
    } catch (err) {
      const msg = err instanceof AiServiceError ? err.message : 'AI回复生成失败，请重试'
      Taro.showToast({title: msg, icon: 'none'})
    } finally {
      setReplying(false)
    }
  }

  const handleCopy = async () => {
    if (!reply) return
    try {
      await Taro.setClipboardData({data: reply.reply})
      Taro.showToast({title: '已复制回复内容'})
    } catch {
      Taro.showToast({title: '复制失败', icon: 'none'})
    }
  }

  const handleSave = async () => {
    if (!analysis || !reply) return
    if (!user) {
      Taro.showToast({title: '请先登录后保存', icon: 'none'})
      return
    }
    Taro.showLoading({title: '保存中...'})
    const {data, error} = await createAiTradeRecord({
      user_id: user.id,
      type: 'inquiry',
      product_name: analysis.product,
      market: analysis.destination,
      input_data: {inquiry_text: inquiryText},
      ai_result: {analysis: {...analysis}, reply: {...reply}},
      status: 'draft',
      is_demo: isDemo
    })
    Taro.hideLoading()
    if (error || !data) {
      Taro.showToast({title: '保存失败，请重试', icon: 'none'})
      return
    }
    setSavedId(data.id)
    Taro.showToast({title: '已保存至业务记录'})
  }

  const handleConfirm = async () => {
    if (!savedId) return
    Taro.showModal({
      title: '人工确认',
      content: '确认已核对AI识别结果与英文回复，可作为正式业务信息使用？',
      success: async (res) => {
        if (!res.confirm) return
        const {error} = await updateAiTradeRecord(savedId, {status: 'confirmed'})
        if (error) {
          Taro.showToast({title: '确认失败，请重试', icon: 'none'})
          return
        }
        Taro.showToast({title: '已人工确认'})
      }
    })
  }

  // ===== 需求六：客户意向与需求识别 =====
  const handleAnalyzeIntent = async () => {
    if (!inquiryText.trim()) {
      Taro.showToast({title: '请先输入询盘内容', icon: 'none'})
      return
    }
    setIntentLoading(true)
    setIntent(null)
    try {
      const res = await analyzeCustomerIntent(inquiryText)
      setIntent(res)
    } catch (err) {
      const msg = err instanceof AiServiceError ? err.message : '意向识别失败，请重试'
      Taro.showToast({title: msg, icon: 'none'})
    } finally {
      setIntentLoading(false)
    }
  }

  // 加入客户档案：将询盘沉淀为CRM客户记录（状态：新询盘）
  const handleAddToCrm = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录后操作', icon: 'none'})
      return
    }
    const src = intent || analysis
    if (!src) {
      Taro.showToast({title: '请先进行AI识别', icon: 'none'})
      return
    }
    Taro.showModal({
      title: '加入客户档案',
      content: '将本询盘沉淀为海外客户记录（状态：新询盘），后续可关联报价与订单？',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({title: '保存中...'})
        const qtyMatch = (intent?.quantity || '').match(/\d+/)
        const {data, error} = await createOverseasCustomer({
          user_id: user.id,
          name: `询盘客户（${(src as any).destination || analysis?.destination || '未知地区'}）`,
          country: (src as any).destination || analysis?.destination || null,
          customer_type: 'event_organizer',
          status: 'new_inquiry',
          tags: ['询盘沉淀', ...(intent?.intent_tags || [])].slice(0, 5),
          intent_product: intent?.product || analysis?.product || null,
          intent_quantity: qtyMatch ? Number(qtyMatch[0]) : null,
          first_inquiry_at: new Date().toISOString(),
          notes: `询盘原文：${inquiryText.slice(0, 200)}`,
          is_demo: isDemo
        })
        Taro.hideLoading()
        if (error || !data) {
          Taro.showToast({title: '保存失败，请重试', icon: 'none'})
          return
        }
        setSavedCustomerId(data.id)
        Taro.showToast({title: '已加入客户档案'})
      }
    })
  }

  // 进入AI报价工作台（携带识别出的商品/数量/目的国）
  const handleGoQuote = () => {
    const src = intent || analysis
    const qtyMatch = (intent?.quantity || '').match(/\d+/)
    const params = [
      `product=${encodeURIComponent(intent?.product || analysis?.product || '')}`,
      `quantity=${qtyMatch ? qtyMatch[0] : ''}`,
      `market=${encodeURIComponent((src as any)?.destination || analysis?.destination || '')}`
    ].join('&')
    Taro.navigateTo({url: `/pages/ai-trade-quote-workbench/index?${params}`})
  }

  const InfoRow = ({label, value}: {label: string; value: string}) => (
    <View className="flex flex-col mb-3">
      <Text className="text-sm text-muted-foreground mb-1">{label}</Text>
      <Text className="text-base text-foreground leading-relaxed">{value}</Text>
    </View>
  )

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 询盘输入 */}
      <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-foreground">海外客户英文询盘</Text>
          <View
            className="bg-amber-50 border border-amber-200 rounded-full px-3 py-1 active:scale-95 transition-all"
            onClick={handleLoadDemo}>
            <Text className="text-sm text-amber-700 font-bold">
              {isDemo ? `已加载${DEMO_BADGE_TEXT}` : '加载演示案例'}
            </Text>
          </View>
        </View>
        <View className="border-2 border-border border-opacity-20 rounded-2xl bg-background overflow-hidden">
          <Textarea
            className="w-full p-4 text-base text-foreground bg-transparent"
            style={{height: '200px'}}
            placeholder="请粘贴海外客户的英文询盘内容..."
            value={inquiryText}
            onInput={handleInput}
            maxlength={2000}
          />
        </View>
      </View>

      {/* 分析按钮 */}
      <View
        className={`rounded-full flex items-center justify-center py-4 mb-4 shadow-elegant active:scale-[0.98] transition-all ${analyzing ? 'bg-primary/50' : 'bg-primary'}`}
        onClick={handleAnalyze}>
        <Text className="text-lg text-primary-foreground font-black">
          {analyzing ? 'AI分析询盘中...' : 'AI分析询盘'}
        </Text>
      </View>

      {/* 需求识别结果 */}
      {analysis && (
        <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">客户需求识别</Text>
            {isDemo && (
              <View className="bg-amber-100 rounded-full px-2 py-0.5">
                <Text className="text-xs text-amber-700 font-bold">{DEMO_BADGE_TEXT}</Text>
              </View>
            )}
          </View>
          <InfoRow label="商品" value={analysis.product} />
          <InfoRow label="数量" value={analysis.quantity} />
          <InfoRow label="目的国" value={analysis.destination} />
          <InfoRow label="客户类型" value={analysis.customer_type} />
          <InfoRow label="采购场景" value={analysis.purchase_scenario} />
          <View className="flex flex-col mb-3">
            <Text className="text-sm text-muted-foreground mb-1">明确需求</Text>
            {analysis.requirements.map((r, i) => (
              <View key={i} className="flex flex-row items-start mb-1">
                <View className="i-mdi-check text-primary text-base mr-1.5 mt-0.5" />
                <Text className="text-base text-foreground leading-relaxed flex-1">{r}</Text>
              </View>
            ))}
          </View>
          <View className="flex flex-col mb-3">
            <Text className="text-sm text-muted-foreground mb-1">缺失信息</Text>
            {analysis.missing_information.map((m, i) => (
              <View key={i} className="flex flex-row items-start mb-1">
                <View className="i-mdi-help-circle-outline text-amber-500 text-base mr-1.5 mt-0.5" />
                <Text className="text-base text-foreground leading-relaxed flex-1">{m}</Text>
              </View>
            ))}
          </View>

          {/* 生成回复按钮 */}
          <View
            className={`rounded-full flex items-center justify-center py-3.5 mt-2 active:scale-[0.98] transition-all ${replying ? 'bg-secondary/50' : 'bg-secondary'}`}
            onClick={handleReply}>
            <Text className="text-base text-white font-black">{replying ? 'AI生成回复中...' : 'AI生成英文回复'}</Text>
          </View>
        </View>
      )}

      {/* ===== 客户意向识别（需求六） ===== */}
      <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-foreground">客户意向识别</Text>
          {isDemo && (
            <View className="bg-amber-100 rounded-full px-2 py-0.5">
              <Text className="text-xs text-amber-700 font-bold">{DEMO_BADGE_TEXT}</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-muted-foreground leading-relaxed mb-4">
          AI提取客户意图、商品、数量、目的国、采购场景与价格/交期/物流需求，辅助业务决策（不预测成交概率）。
        </Text>
        <View
          className={`rounded-full flex items-center justify-center py-3 active:scale-[0.98] transition-all ${intentLoading ? 'bg-primary/50' : 'bg-primary'}`}
          onClick={handleAnalyzeIntent}>
          <Text className="text-base text-white font-black">
            {intentLoading ? 'AI识别中...' : intent ? '重新识别意向' : 'AI识别客户意向'}
          </Text>
        </View>

        {intent && (
          <View className="mt-4 bg-muted/60 rounded-2xl p-4">
            <View className="flex flex-row flex-wrap gap-2 mb-3">
              <View className="bg-primary/10 border border-primary/30 rounded-full px-3 py-1">
                <Text className="text-xs text-primary font-bold">{intent.intent_type}</Text>
              </View>
              {intent.intent_tags.map((tg, i) => (
                <View key={i} className="bg-muted rounded-full px-3 py-1">
                  <Text className="text-xs text-muted-foreground">{tg}</Text>
                </View>
              ))}
            </View>
            {[
              {label: '商品', value: intent.product},
              {label: '数量', value: intent.quantity},
              {label: '目的国', value: intent.destination},
              {label: '采购场景', value: intent.purchase_scenario},
              {label: '价格需求', value: intent.price_need},
              {label: '交期需求', value: intent.delivery_need},
              {label: '物流需求', value: intent.logistics_need}
            ]
              .filter((r) => r.value)
              .map((r) => (
                <View key={r.label} className="flex flex-row items-start mb-2">
                  <Text className="text-sm text-muted-foreground mr-2 mt-0.5" style={{width: '70px'}}>
                    {r.label}
                  </Text>
                  <Text className="text-base text-foreground leading-relaxed flex-1">{r.value}</Text>
                </View>
              ))}
            {intent.key_requirements.length > 0 && (
              <View className="mt-2">
                <Text className="text-sm text-muted-foreground mb-1">重点需求</Text>
                {intent.key_requirements.map((k, i) => (
                  <View key={i} className="flex flex-row items-start mb-1">
                    <View className="i-mdi-check-circle-outline text-primary text-base mr-1.5 mt-0.5" />
                    <Text className="text-base text-foreground leading-relaxed flex-1">{k}</Text>
                  </View>
                ))}
              </View>
            )}
            {intent.missing_information.length > 0 && (
              <View className="mt-2">
                <Text className="text-sm text-muted-foreground mb-1">待补充信息</Text>
                {intent.missing_information.map((m, i) => (
                  <View key={i} className="flex flex-row items-start mb-1">
                    <View className="i-mdi-help-circle-outline text-amber-500 text-base mr-1.5 mt-0.5" />
                    <Text className="text-base text-foreground leading-relaxed flex-1">{m}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 业务操作按钮：进入报价 / 加入客户档案 */}
        {(intent || analysis) && (
          <View className="flex flex-row gap-3 mt-4">
            <View
              className="flex-1 rounded-full bg-muted flex items-center justify-center py-3 active:scale-95 transition-all"
              onClick={handleGoQuote}>
              <Text className="text-base text-foreground font-bold">进入报价</Text>
            </View>
            <View
              className={`flex-1 rounded-full flex items-center justify-center py-3 active:scale-95 transition-all ${savedCustomerId ? 'bg-emerald-50 border border-emerald-200' : 'bg-secondary'}`}
              onClick={savedCustomerId ? undefined : handleAddToCrm}>
              <Text className={`text-base font-bold ${savedCustomerId ? 'text-emerald-600' : 'text-white'}`}>
                {savedCustomerId ? '已加入档案' : '加入客户档案'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* AI英文回复 */}
      {reply && (
        <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">AI建议英文回复</Text>
            {isDemo && (
              <View className="bg-amber-100 rounded-full px-2 py-0.5">
                <Text className="text-xs text-amber-700 font-bold">{DEMO_BADGE_TEXT}</Text>
              </View>
            )}
          </View>
          <View className="bg-muted/60 rounded-2xl p-4 mb-4">
            <Text className="text-base text-foreground leading-relaxed" style={{whiteSpace: 'pre-wrap'}}>
              {reply.reply}
            </Text>
          </View>
          <View className="flex flex-col mb-4">
            <Text className="text-sm text-muted-foreground mb-1">待确认信息（人工确认）</Text>
            {reply.to_confirm.map((c, i) => (
              <View key={i} className="flex flex-row items-start mb-1">
                <View className="i-mdi-alert-circle-outline text-amber-500 text-base mr-1.5 mt-0.5" />
                <Text className="text-base text-foreground leading-relaxed flex-1">{c}</Text>
              </View>
            ))}
          </View>
          <View className="flex flex-row gap-3">
            <View
              className="flex-1 rounded-full bg-muted flex items-center justify-center py-3 active:scale-95 transition-all"
              onClick={() => handleReply()}>
              <Text className="text-base text-foreground font-bold">重新生成</Text>
            </View>
            <View
              className="flex-1 rounded-full bg-muted flex items-center justify-center py-3 active:scale-95 transition-all"
              onClick={handleCopy}>
              <Text className="text-base text-foreground font-bold">复制回复</Text>
            </View>
            <View
              className="flex-1 rounded-full bg-primary flex items-center justify-center py-3 active:scale-95 transition-all"
              onClick={handleSave}>
              <Text className="text-base text-primary-foreground font-bold">保存询盘</Text>
            </View>
          </View>
          {savedId && (
            <View
              className="rounded-full bg-secondary flex items-center justify-center py-3 mt-3 active:scale-95 transition-all"
              onClick={handleConfirm}>
              <Text className="text-base text-white font-bold">人工确认</Text>
            </View>
          )}
          <Text className="text-xs text-muted-foreground mt-3">
            AI回复不虚构价格、库存、物流时间等交易信息；缺失信息以"we will confirm this for
            you"表述，须经人工确认后发送客户。
          </Text>
        </View>
      )}
    </View>
  )
}
