// AI智能报价：程序完成基础数学计算，AI生成英文报价说明（演示模式）

import {Image, Input, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createAiTradeRecord, getSKUList, updateAiTradeRecord} from '@/db/api'
import type {SKU} from '@/db/types'
import {
  AI_DISCLAIMER,
  AiServiceError,
  calculateQuote,
  DEMO_BADGE_TEXT,
  DEMO_QUOTE_INPUT,
  generateQuoteDescription,
  type QuoteCalculation,
  type QuoteDescriptionResult
} from '@/services/aiTrade'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

const CURRENCIES = ['CNY', 'USD', 'JPY', 'SGD', 'KRW']
const DESTINATIONS = ['美国', '日本', '新加坡', '韩国', '其他']

export default function AiTradeQuote() {
  const {user} = useAuth()
  const [products, setProducts] = useState<SKU[]>([])
  const [selected, setSelected] = useState<SKU | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [quantity, setQuantity] = useState('100')
  const [destination, setDestination] = useState('美国')
  const [currency, setCurrency] = useState('CNY')
  const [unitPrice, setUnitPrice] = useState('')
  const [shippingCost, setShippingCost] = useState('200')
  const [otherCost, setOtherCost] = useState('0')
  const [exchangeRate, setExchangeRate] = useState('')
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState<QuoteDescriptionResult | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    getSKUList().then(({data}) => setProducts(data))
  }, [])

  const buildQuoteInput = useCallback(() => {
    return {
      productName: isDemo ? DEMO_QUOTE_INPUT.productName : selected?.name || '',
      quantity: Number(quantity) || 0,
      destination,
      currency,
      unitPrice: Number(unitPrice) || 0,
      shippingCost: Number(shippingCost) || 0,
      otherCost: Number(otherCost) || 0,
      exchangeRate: Number(exchangeRate) || undefined,
      remark: remark.trim() || undefined
    }
  }, [isDemo, selected, quantity, destination, currency, unitPrice, shippingCost, otherCost, exchangeRate, remark])

  // 程序实时计算（AI不参与基础数学）
  const liveCalc: QuoteCalculation = useMemo(
    () =>
      calculateQuote({
        quantity: Number(quantity) || 0,
        unitPrice: Number(unitPrice) || 0,
        shippingCost: Number(shippingCost) || 0,
        otherCost: Number(otherCost) || 0
      }),
    [quantity, unitPrice, shippingCost, otherCost]
  )

  const handleSelect = (sku: SKU) => {
    setSelected(sku)
    setIsDemo(false)
    setDescription(null)
    setSavedId(null)
    setUnitPrice(String(sku.price ?? ''))
  }

  const handleLoadDemo = () => {
    setSelected(null)
    setIsDemo(true)
    setDescription(null)
    setSavedId(null)
    setQuantity(String(DEMO_QUOTE_INPUT.quantity))
    setDestination(DEMO_QUOTE_INPUT.destination)
    setCurrency(DEMO_QUOTE_INPUT.currency)
    setUnitPrice(String(DEMO_QUOTE_INPUT.unitPrice))
    setShippingCost(String(DEMO_QUOTE_INPUT.shippingCost))
    setOtherCost(String(DEMO_QUOTE_INPUT.otherCost))
    setRemark(DEMO_QUOTE_INPUT.remark)
  }

  const validate = (): string | null => {
    const q = Number(quantity)
    const u = Number(unitPrice)
    if (!isDemo && !selected) return '请先选择商品'
    if (!Number.isFinite(q) || q <= 0) return '请输入有效数量'
    if (!Number.isFinite(u) || u <= 0) return '请输入有效单价'
    return null
  }

  const handleGenerate = async () => {
    if (loading) return
    const err = validate()
    if (err) {
      Taro.showToast({title: err, icon: 'none'})
      return
    }
    setLoading(true)
    try {
      const input = buildQuoteInput()
      const c = calculateQuote(input)
      const res = await generateQuoteDescription(input, c)
      setDescription(res)
    } catch (e) {
      const msg = e instanceof AiServiceError ? e.message : 'AI报价生成失败，请重试'
      Taro.showToast({title: msg, icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!description) return
    const input = buildQuoteInput()
    const text = [
      `Product: ${input.productName}`,
      `Quantity: ${input.quantity}`,
      `Destination: ${input.destination}`,
      `Currency: ${input.currency}`,
      `Unit Price: ${input.currency} ${input.unitPrice.toFixed(2)}`,
      `Product Amount: ${input.currency} ${liveCalc.productAmount.toFixed(2)}`,
      `Shipping Cost: ${input.currency} ${input.shippingCost.toFixed(2)}`,
      `Other Costs: ${input.currency} ${input.otherCost.toFixed(2)}`,
      `Estimated Total Cost: ${input.currency} ${liveCalc.totalCost.toFixed(2)}`,
      `Remark: ${input.remark || '-'}`,
      '',
      description.description
    ].join('\n')
    try {
      await Taro.setClipboardData({data: text})
      Taro.showToast({title: '已复制报价内容'})
    } catch {
      Taro.showToast({title: '复制失败', icon: 'none'})
    }
  }

  const handleSave = async () => {
    if (!description) return
    if (!user) {
      Taro.showToast({title: '请先登录后保存', icon: 'none'})
      return
    }
    Taro.showLoading({title: '保存中...'})
    const input = buildQuoteInput()
    const {data, error} = await createAiTradeRecord({
      user_id: user.id,
      type: 'quote',
      product_id: isDemo ? null : selected?.sku_code || null,
      product_name: input.productName,
      market: destination,
      input_data: {...input},
      ai_result: {calculation: {...liveCalc}, description: {...description}},
      status: 'draft',
      is_demo: isDemo
    })
    Taro.hideLoading()
    if (error || !data) {
      setSavedId(null)
      Taro.showToast({title: '保存失败，请重试', icon: 'none'})
      return
    }
    setSavedId(data.id)
    Taro.showToast({title: '已保存至业务记录'})
  }

  const handleConfirm = () => {
    if (!savedId) return
    Taro.showModal({
      title: '人工确认',
      content: '确认已核对报价金额与AI说明，可作为正式业务信息使用？',
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

  const NumberInput = ({
    label,
    value,
    onChange,
    placeholder,
    extra
  }: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    extra?: string
  }) => (
    <View className="flex flex-col mb-4">
      <Text className="text-sm text-muted-foreground mb-1.5">{label}</Text>
      <View className="border-2 border-border border-opacity-20 rounded-2xl bg-background overflow-hidden flex flex-row items-center">
        <Input
          className="flex-1 px-4 py-3 text-base text-foreground bg-transparent"
          type="digit"
          placeholder={placeholder || '0'}
          value={value}
          onInput={(e: any) => onChange(e.detail?.value ?? e.target?.value ?? '')}
        />
        {extra ? <Text className="text-sm text-muted-foreground pr-4">{extra}</Text> : null}
      </View>
    </View>
  )

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 商品选择 */}
      <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-foreground">选择商品</Text>
          <View
            className="bg-amber-50 border border-amber-200 rounded-full px-3 py-1 active:scale-95 transition-all"
            onClick={handleLoadDemo}>
            <Text className="text-sm text-amber-700 font-bold">
              {isDemo ? `已加载${DEMO_BADGE_TEXT}` : '加载演示案例'}
            </Text>
          </View>
        </View>
        <View className="flex flex-col gap-3 max-h-96 overflow-y-auto">
          {products.map((p) => {
            const active = !isDemo && selected?.id === p.id
            return (
              <View
                key={p.id}
                className={`flex flex-row items-center rounded-2xl border-2 p-3 active:scale-[0.98] transition-all ${active ? 'border-selected-bg bg-selected-bg' : 'border-border border-opacity-20'}`}
                onClick={() => handleSelect(p)}>
                <Image
                  src={p.image_url || DEFAULT_PRODUCT_IMAGE}
                  mode="aspectFill"
                  className="w-14 h-14 rounded-xl mr-3"
                />
                <View className="flex-1 min-w-0">
                  <Text className="text-base text-foreground font-bold truncate block">{p.name}</Text>
                  <Text className="text-sm text-muted-foreground">¥{p.price?.toFixed(2)}</Text>
                </View>
                {active ? <View className="i-mdi-check-circle text-primary text-xl ml-2" /> : null}
              </View>
            )
          })}
          {isDemo ? (
            <View className="flex flex-row items-center rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
              <View className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mr-3">
                <View className="i-mdi-bookmark-outline text-2xl text-amber-500" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base text-foreground font-bold truncate block">
                  {DEMO_QUOTE_INPUT.productName}（{DEMO_BADGE_TEXT}）
                </Text>
                <Text className="text-sm text-muted-foreground">100件 · 美国 · USD</Text>
              </View>
              <View className="i-mdi-check-circle text-amber-500 text-xl ml-2" />
            </View>
          ) : null}
        </View>
      </View>

      {/* 报价输入 */}
      <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
        <Text className="text-xl font-bold text-foreground mb-4">报价参数</Text>
        <NumberInput label="数量" value={quantity} onChange={setQuantity} placeholder="100" extra="件" />
        <View className="flex flex-col mb-4">
          <Text className="text-sm text-muted-foreground mb-1.5">目标国家</Text>
          <View className="flex flex-row flex-wrap gap-2">
            {DESTINATIONS.map((d) => (
              <View
                key={d}
                className={`rounded-full border-2 px-3.5 py-1.5 active:scale-95 transition-all ${destination === d ? 'border-selected-bg bg-selected-bg' : 'border-border border-opacity-30'}`}
                onClick={() => setDestination(d)}>
                <Text className={`text-sm font-bold ${destination === d ? 'text-primary' : 'text-foreground'}`}>
                  {d}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View className="flex flex-col mb-4">
          <Text className="text-sm text-muted-foreground mb-1.5">币种</Text>
          <View className="flex flex-row flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <View
                key={c}
                className={`rounded-full border-2 px-3.5 py-1.5 active:scale-95 transition-all ${currency === c ? 'border-selected-bg bg-selected-bg' : 'border-border border-opacity-30'}`}
                onClick={() => setCurrency(c)}>
                <Text className={`text-sm font-bold ${currency === c ? 'text-primary' : 'text-foreground'}`}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
        <NumberInput label="商品单价" value={unitPrice} onChange={setUnitPrice} placeholder="39.9" extra={currency} />
        <NumberInput
          label="物流成本"
          value={shippingCost}
          onChange={setShippingCost}
          placeholder="200"
          extra={currency}
        />
        <NumberInput label="其他费用" value={otherCost} onChange={setOtherCost} placeholder="0" extra={currency} />
        <NumberInput
          label="汇率参考（选填）"
          value={exchangeRate}
          onChange={setExchangeRate}
          placeholder="7.2"
          extra="课堂演示用"
        />
        <View className="flex flex-col">
          <Text className="text-sm text-muted-foreground mb-1.5">备注</Text>
          <View className="border-2 border-border border-opacity-20 rounded-2xl bg-background overflow-hidden">
            <Input
              className="w-full px-4 py-3 text-base text-foreground bg-transparent"
              placeholder="选填，如：文化活动现场采购"
              value={remark}
              onInput={(e: any) => setRemark(e.detail?.value ?? e.target?.value ?? '')}
            />
          </View>
        </View>
      </View>

      {/* 程序计算结果 */}
      <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-foreground">报价明细（程序计算）</Text>
          <View className="bg-muted rounded-full px-2.5 py-0.5">
            <Text className="text-xs text-muted-foreground font-bold">AI不参与计算</Text>
          </View>
        </View>
        <View className="flex flex-row justify-between items-center py-2.5 border-b border-border border-opacity-10">
          <Text className="text-base text-muted-foreground">商品金额（单价×数量）</Text>
          <Text className="text-base text-foreground font-bold">
            {currency} {liveCalc.productAmount.toFixed(2)}
          </Text>
        </View>
        <View className="flex flex-row justify-between items-center py-2.5 border-b border-border border-opacity-10">
          <Text className="text-base text-muted-foreground">汇率参考</Text>
          <Text className="text-base text-foreground font-bold">
            {exchangeRate ? `1 ${currency} = ${exchangeRate} CNY（课堂演示）` : '未填写'}
          </Text>
        </View>
        <View className="flex flex-row justify-between items-center py-2.5 border-b border-border border-opacity-10">
          <Text className="text-base text-muted-foreground">物流费用</Text>
          <Text className="text-base text-foreground font-bold">
            {currency} {(Number(shippingCost) || 0).toFixed(2)}
          </Text>
        </View>
        <View className="flex flex-row justify-between items-center py-2.5 border-b border-border border-opacity-10">
          <Text className="text-base text-muted-foreground">其他费用</Text>
          <Text className="text-base text-foreground font-bold">
            {currency} {(Number(otherCost) || 0).toFixed(2)}
          </Text>
        </View>
        <View className="flex flex-row justify-between items-center pt-3">
          <Text className="text-base text-foreground font-black">预估总成本</Text>
          <Text className="text-xl text-primary font-black">
            {currency} {liveCalc.totalCost.toFixed(2)}
          </Text>
        </View>
        {exchangeRate ? (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mt-3">
            <Text className="text-xs text-amber-700 leading-relaxed">{AI_DISCLAIMER.exchangeRate}</Text>
          </View>
        ) : null}
      </View>

      {/* 生成按钮 */}
      <View
        className={`rounded-full flex items-center justify-center py-4 mb-4 shadow-elegant active:scale-[0.98] transition-all ${loading ? 'bg-primary/50' : 'bg-primary'}`}
        onClick={handleGenerate}>
        <Text className="text-lg text-primary-foreground font-black">
          {loading ? 'AI整理报价中...' : 'AI生成报价说明'}
        </Text>
      </View>

      {/* AI报价说明 */}
      {description ? (
        <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">英文报价说明（English）</Text>
            {isDemo ? (
              <View className="bg-amber-100 rounded-full px-2 py-0.5">
                <Text className="text-xs text-amber-700 font-bold">{DEMO_BADGE_TEXT}</Text>
              </View>
            ) : null}
          </View>
          <View className="bg-muted/60 rounded-2xl p-4 mb-4">
            <Text className="text-base text-foreground leading-relaxed" style={{whiteSpace: 'pre-wrap'}}>
              {description.description}
            </Text>
          </View>
          <View className="flex flex-col mb-4">
            <Text className="text-sm text-muted-foreground mb-1">需人工确认的内容</Text>
            {description.items_to_confirm.map((c, i) => (
              <View key={i} className="flex flex-row items-start mb-1">
                <View className="i-mdi-alert-circle-outline text-amber-500 text-base mr-1.5 mt-0.5" />
                <Text className="text-base text-foreground leading-relaxed flex-1">{c}</Text>
              </View>
            ))}
          </View>
          <View className="flex flex-row gap-3">
            <View
              className="flex-1 rounded-full bg-muted flex items-center justify-center py-3 active:scale-95 transition-all"
              onClick={handleCopy}>
              <Text className="text-base text-foreground font-bold">复制报价</Text>
            </View>
            <View
              className="flex-1 rounded-full bg-primary flex items-center justify-center py-3 active:scale-95 transition-all"
              onClick={handleSave}>
              <Text className="text-base text-primary-foreground font-bold">保存报价</Text>
            </View>
          </View>
          {savedId ? (
            <View
              className="rounded-full bg-secondary flex items-center justify-center py-3 mt-3 active:scale-95 transition-all"
              onClick={handleConfirm}>
              <Text className="text-base text-white font-bold">人工确认</Text>
            </View>
          ) : null}
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mt-4">
            <Text className="text-xs text-amber-700 leading-relaxed">{AI_DISCLAIMER.quote}</Text>
          </View>
          <Text className="text-xs text-muted-foreground mt-3">
            基础数学计算由程序完成；AI仅负责整理报价说明、检查缺失信息与提示确认事项。
          </Text>
        </View>
      ) : null}
    </View>
  )
}
