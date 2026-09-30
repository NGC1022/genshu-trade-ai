import {Input, Picker, Text, Textarea, View} from '@tarojs/components'
import Taro, {useLoad} from '@tarojs/taro'
import {useMemo, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createQuote} from '@/db/api'
import {AI_DISCLAIMER, AiServiceError, calculateQuote, generateQuoteDescription, getProviderInfo, type QuoteCalculation, type QuoteDescriptionResult, type QuoteInput} from '@/services/aiTrade'

const MARKETS = ['美国', '日本', '新加坡', '韩国', '英国', '德国']
const CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'CNY']

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export default function AiTradeQuoteWorkbench() {
  const {user} = useAuth()
  const provider = getProviderInfo()
  const [productName, setProductName] = useState('根书木质书签')
  const [quantity, setQuantity] = useState('100')
  const [destination, setDestination] = useState('美国')
  const [currency, setCurrency] = useState('USD')
  const [unitPrice, setUnitPrice] = useState('8.5')
  const [shippingCost, setShippingCost] = useState('120')
  const [otherCost, setOtherCost] = useState('0')
  const [exchangeRate, setExchangeRate] = useState('0.1394')
  const [remark, setRemark] = useState('文化活动采购，预计需要独立礼盒包装。')
  const [description, setDescription] = useState<QuoteDescriptionResult | null>(null)
  const [calculation, setCalculation] = useState<QuoteCalculation | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useLoad((params) => {
    if (params.product) setProductName(decodeURIComponent(params.product))
    if (params.quantity) setQuantity(params.quantity)
    if (params.market) setDestination(decodeURIComponent(params.market))
  })

  const input = useMemo<QuoteInput>(() => ({
    productName: productName.trim(),
    quantity: toNumber(quantity),
    destination,
    currency,
    unitPrice: toNumber(unitPrice),
    shippingCost: toNumber(shippingCost),
    otherCost: toNumber(otherCost),
    exchangeRate: toNumber(exchangeRate, 1),
    remark: remark.trim()
  }), [productName, quantity, destination, currency, unitPrice, shippingCost, otherCost, exchangeRate, remark])

  const displayTotal = calculation ? calculation.totalCost * input.exchangeRate : 0

  const handleGenerate = async () => {
    if (!input.productName || input.quantity <= 0 || input.unitPrice <= 0) {
      Taro.showToast({title: '请填写商品、数量和单价', icon: 'none'})
      return
    }
    setSaved(false)
    const calc = calculateQuote(input)
    setCalculation(calc)
    try {
      const result = await generateQuoteDescription(input, calc)
      setDescription(result)
    } catch (error) {
      const message = error instanceof AiServiceError ? error.message : 'AI报价说明生成失败，请重试'
      Taro.showToast({title: message, icon: 'none'})
    }
  }

  const handleSave = async () => {
    if (!user || !calculation || !description) {
      Taro.showToast({title: user ? '请先生成报价说明' : '请先登录后保存', icon: 'none'})
      return
    }
    setSaving(true)
    const quoteNo = `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`
    const {error} = await createQuote({
      user_id: user.id,
      quote_no: quoteNo,
      product_name: input.productName,
      quantity: input.quantity,
      unit_price: input.unitPrice,
      currency: input.currency,
      market: input.destination,
      shipping_cost: input.shippingCost,
      other_cost: input.otherCost,
      exchange_rate: input.exchangeRate,
      exchange_rate_source: 'user_input_classroom_demo',
      product_amount: calculation.productAmount,
      total_cost: calculation.totalCost,
      total_display: displayTotal,
      status: 'pending_review',
      ai_description: {description: description.description, items_to_confirm: description.items_to_confirm, input, provider: provider.name},
      is_b2b: input.quantity >= 50,
      is_demo: input.productName.includes('根书')
    })
    setSaving(false)
    if (error) {
      Taro.showToast({title: '保存报价失败，请检查数据库配置', icon: 'none'})
      return
    }
    setSaved(true)
    Taro.showToast({title: '报价已保存，等待人工审核'})
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      <View className="mb-5"><Text className="text-xs text-primary font-black tracking-[2px]">AI TRADE / QUOTE</Text><Text className="text-2xl text-foreground font-black block mt-1">报价工作台</Text><Text className="text-sm text-muted-foreground leading-relaxed mt-2">程序负责金额计算，AI只负责整理商务说明；正式发送前必须人工核对。</Text></View>

      <View className="bg-card rounded-[28px] p-5 border border-border border-opacity-10 mb-4"><Text className="text-lg text-foreground font-bold block mb-4">报价输入</Text><View className="flex flex-col gap-3"><View><Text className="text-xs text-muted-foreground block mb-1">商品名称</Text><Input className="bg-muted rounded-xl px-3 py-2.5 text-sm" value={productName} onInput={(e) => setProductName(e.detail.value)} /></View><View className="flex flex-row gap-3"><View className="flex-1"><Text className="text-xs text-muted-foreground block mb-1">采购数量</Text><Input type="number" className="bg-muted rounded-xl px-3 py-2.5 text-sm" value={quantity} onInput={(e) => setQuantity(e.detail.value)} /></View><View className="flex-1"><Text className="text-xs text-muted-foreground block mb-1">目的市场</Text><Picker mode="selector" range={MARKETS} value={MARKETS.indexOf(destination)} onChange={(e) => setDestination(MARKETS[Number(e.detail.value)])}><View className="bg-muted rounded-xl px-3 py-2.5"><Text className="text-sm text-foreground">{destination}</Text></View></Picker></View></View><View className="flex flex-row gap-3"><View className="flex-1"><Text className="text-xs text-muted-foreground block mb-1">单价（CNY）</Text><Input type="digit" className="bg-muted rounded-xl px-3 py-2.5 text-sm" value={unitPrice} onInput={(e) => setUnitPrice(e.detail.value)} /></View><View className="flex-1"><Text className="text-xs text-muted-foreground block mb-1">输出币种</Text><Picker mode="selector" range={CURRENCIES} value={CURRENCIES.indexOf(currency)} onChange={(e) => setCurrency(CURRENCIES[Number(e.detail.value)])}><View className="bg-muted rounded-xl px-3 py-2.5"><Text className="text-sm text-foreground">{currency}</Text></View></Picker></View></View><View className="flex flex-row gap-3"><View className="flex-1"><Text className="text-xs text-muted-foreground block mb-1">物流成本（CNY）</Text><Input type="digit" className="bg-muted rounded-xl px-3 py-2.5 text-sm" value={shippingCost} onInput={(e) => setShippingCost(e.detail.value)} /></View><View className="flex-1"><Text className="text-xs text-muted-foreground block mb-1">其他成本（CNY）</Text><Input type="digit" className="bg-muted rounded-xl px-3 py-2.5 text-sm" value={otherCost} onInput={(e) => setOtherCost(e.detail.value)} /></View></View><View><Text className="text-xs text-muted-foreground block mb-1">汇率（1 CNY = {currency}，课堂手动输入）</Text><Input type="digit" className="bg-muted rounded-xl px-3 py-2.5 text-sm" value={exchangeRate} onInput={(e) => setExchangeRate(e.detail.value)} /></View><View><Text className="text-xs text-muted-foreground block mb-1">业务备注</Text><Textarea className="bg-muted rounded-xl p-3 text-sm w-full" value={remark} maxlength={300} style={{height: '80px'}} onInput={(e) => setRemark(e.detail.value)} /></View></View><View className="rounded-xl bg-primary flex items-center justify-center py-3 mt-4" onClick={handleGenerate}><Text className="text-sm text-primary-foreground font-bold">计算金额并生成 AI 报价说明</Text></View></View>

      {calculation && <View className="bg-slate-900 rounded-[28px] p-5 mb-4"><Text className="text-sm text-slate-300 block">程序计算结果</Text><View className="flex flex-row items-end justify-between mt-2"><View><Text className="text-xs text-slate-400 block">商品金额</Text><Text className="text-xl text-white font-black">¥{calculation.productAmount.toFixed(2)}</Text></View><View><Text className="text-xs text-slate-400 block">总成本</Text><Text className="text-2xl text-emerald-300 font-black">¥{calculation.totalCost.toFixed(2)}</Text></View><View><Text className="text-xs text-slate-400 block">换算展示</Text><Text className="text-xl text-white font-black">{currency} {displayTotal.toFixed(2)}</Text></View></View><Text className="text-[10px] text-slate-400 mt-3">基础数学由程序完成，汇率为用户手动输入，非实时汇率。</Text></View>}

      {description && <View className="bg-card rounded-[28px] p-5 border border-border border-opacity-10 mb-4"><View className="flex flex-row items-center justify-between mb-3"><Text className="text-lg text-foreground font-bold">AI商务说明</Text><View className="bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1"><Text className="text-[10px] text-amber-700 font-bold">待人工审核</Text></View></View><Text className="text-sm text-foreground leading-relaxed">{description.description}</Text><View className="bg-amber-50 rounded-2xl p-3 mt-4"><Text className="text-xs text-amber-800 font-bold block mb-1">发送前必须确认</Text>{description.items_to_confirm.map((item) => <Text key={item} className="text-xs text-amber-800 leading-relaxed block">• {item}</Text>)}</View><Text className="text-xs text-muted-foreground leading-relaxed mt-4">{AI_DISCLAIMER.quote}</Text><View className="rounded-xl bg-primary flex items-center justify-center py-3 mt-4" onClick={handleSave}><Text className="text-sm text-primary-foreground font-bold">{saving ? '保存中…' : saved ? '已保存，等待审核' : '保存报价草稿'}</Text></View></View>}

      <View className="bg-muted rounded-2xl p-3 mb-6"><Text className="text-xs text-muted-foreground leading-relaxed">真实商业流程：询盘识别 → 客户档案 → 程序算价 → AI生成说明 → 人工审核 → 发送报价 → 跟进订单。当前 Provider：{provider.name}。</Text></View>
    </View>
  )
}
