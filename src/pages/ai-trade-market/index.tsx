// AI海外市场分析：选择商品与目标市场 → AI输出市场分析（演示模式，不代表官方统计数据）

import {Image, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createAiTradeRecord, getSKUList} from '@/db/api'
import type {SKU} from '@/db/types'
import {
  AI_DISCLAIMER,
  AiServiceError,
  analyzeTargetMarket,
  DEMO_BADGE_TEXT,
  DEMO_MARKET,
  DEMO_PRODUCT,
  type MarketAnalysisResult,
  type ProductIntlInput
} from '@/services/aiTrade'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

const MARKET_OPTIONS = [
  {name: '美国', icon: 'i-mdi-flag-variant-outline', en: 'United States'},
  {name: '日本', icon: 'i-mdi-flag-variant-outline', en: 'Japan'},
  {name: '新加坡', icon: 'i-mdi-flag-variant-outline', en: 'Singapore'},
  {name: '韩国', icon: 'i-mdi-flag-variant-outline', en: 'South Korea'}
]

export default function AiTradeMarket() {
  const {user} = useAuth()
  const [products, setProducts] = useState<SKU[]>([])
  const [selected, setSelected] = useState<SKU | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [markets, setMarkets] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MarketAnalysisResult[] | null>(null)

  useEffect(() => {
    getSKUList().then(({data}) => setProducts(data))
  }, [])

  const buildInput = useCallback((sku: SKU): ProductIntlInput => {
    return {
      productId: sku.sku_code,
      name: sku.name,
      description: sku.description || undefined,
      category: sku.category,
      price: sku.price,
      imageUrl: sku.image_url || undefined
    }
  }, [])

  const handleSelect = (sku: SKU) => {
    setSelected(sku)
    setIsDemo(false)
    setResults(null)
  }

  const handleLoadDemo = () => {
    setSelected(null)
    setIsDemo(true)
    setMarkets([DEMO_MARKET])
    setResults(null)
  }

  const toggleMarket = (m: string) => {
    setResults(null)
    setMarkets((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  const handleAnalyze = async () => {
    if (loading) return
    const input = isDemo ? DEMO_PRODUCT : selected ? buildInput(selected) : null
    if (!input) {
      Taro.showToast({title: '请先选择商品', icon: 'none'})
      return
    }
    if (markets.length === 0) {
      Taro.showToast({title: '请选择目标市场', icon: 'none'})
      return
    }
    setLoading(true)
    try {
      const res = await analyzeTargetMarket(input, markets)
      setResults(res)
    } catch (err) {
      const msg = err instanceof AiServiceError ? err.message : 'AI分析失败，请重试'
      Taro.showToast({title: msg, icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!results || results.length === 0) return
    if (!user) {
      Taro.showToast({title: '请先登录后保存', icon: 'none'})
      return
    }
    Taro.showLoading({title: '保存中...'})
    let failed = 0
    for (const r of results) {
      const input = isDemo ? DEMO_PRODUCT : buildInput(selected!)
      const {error} = await createAiTradeRecord({
        user_id: user.id,
        type: 'market_analysis',
        product_id: input.productId,
        product_name: input.name,
        market: r.market,
        input_data: {...input, markets},
        ai_result: {...r},
        status: 'draft',
        is_demo: isDemo
      })
      if (error) failed++
    }
    Taro.hideLoading()
    if (failed > 0) {
      Taro.showToast({title: `部分保存失败（${failed}条），请重试`, icon: 'none'})
      return
    }
    Taro.showToast({title: '已保存至业务记录'})
  }

  const Section = ({label, value}: {label: string; value: string}) => (
    <View className="flex flex-col mb-3">
      <Text className="text-sm text-muted-foreground mb-1">{label}</Text>
      <Text className="text-base text-foreground leading-relaxed">{value}</Text>
    </View>
  )

  const ListSection = ({label, items, icon}: {label: string; items: string[]; icon: string}) => (
    <View className="flex flex-col mb-3">
      <Text className="text-sm text-muted-foreground mb-1">{label}</Text>
      {items.map((item, i) => (
        <View key={i} className="flex flex-row items-start mb-1">
          <View className={`${icon} text-primary text-base mr-1.5 mt-0.5`} />
          <Text className="text-base text-foreground leading-relaxed flex-1">{item}</Text>
        </View>
      ))}
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
        <View className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
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
                {active && <View className="i-mdi-check-circle text-primary text-xl ml-2" />}
              </View>
            )
          })}
          {isDemo && (
            <View className="flex flex-row items-center rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
              <View className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mr-3">
                <View className="i-mdi-bookmark-outline text-2xl text-amber-500" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base text-foreground font-bold truncate block">
                  {DEMO_PRODUCT.name}（{DEMO_BADGE_TEXT}）
                </Text>
                <Text className="text-sm text-muted-foreground">目标市场：{DEMO_MARKET}</Text>
              </View>
              <View className="i-mdi-check-circle text-amber-500 text-xl ml-2" />
            </View>
          )}
        </View>
      </View>

      {/* 目标市场多选 */}
      <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
        <Text className="text-xl font-bold text-foreground mb-1">目标市场（可多选）</Text>
        <Text className="text-sm text-muted-foreground mb-4">第一阶段支持：美国、日本、新加坡、韩国</Text>
        <View className="flex flex-row flex-wrap gap-3">
          {MARKET_OPTIONS.map((m) => {
            const active = markets.includes(m.name)
            return (
              <View
                key={m.name}
                className={`flex flex-row items-center rounded-full border-2 px-4 py-2 active:scale-95 transition-all ${active ? 'border-selected-bg bg-selected-bg' : 'border-border border-opacity-30'}`}
                onClick={() => toggleMarket(m.name)}>
                <View className={`${m.icon} text-base mr-1.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                <Text className={`text-base font-bold ${active ? 'text-primary' : 'text-foreground'}`}>{m.name}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* 分析按钮 */}
      <View
        className={`rounded-full flex items-center justify-center py-4 mb-4 shadow-elegant active:scale-[0.98] transition-all ${loading ? 'bg-primary/50' : 'bg-primary'}`}
        onClick={handleAnalyze}>
        <Text className="text-lg text-primary-foreground font-black">
          {loading ? 'AI分析中，请稍候...' : 'AI分析目标市场'}
        </Text>
      </View>

      {/* 分析结果 */}
      {results?.map((r, idx) => (
        <View key={idx} className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-4">
            <View className="flex flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center mr-3">
                <View className="i-mdi-map-marker text-xl text-secondary" />
              </View>
              <Text className="text-lg font-bold text-foreground">{r.market}</Text>
            </View>
            {isDemo && (
              <View className="bg-amber-100 rounded-full px-2 py-0.5">
                <Text className="text-xs text-amber-700 font-bold">{DEMO_BADGE_TEXT}</Text>
              </View>
            )}
          </View>

          <Section label="消费者画像" value={r.consumer_profile} />
          <Section label="消费场景" value={r.consumption_scenario} />
          <Section label="文化适配" value={r.cultural_fit} />
          <Section label="价格适配" value={r.price_fit} />
          <ListSection label="营销重点" items={r.marketing_focus} icon="i-mdi-bullhorn-outline" />
          <ListSection label="潜在风险" items={r.potential_risks} icon="i-mdi-alert-circle-outline" />
          <ListSection label="需要进一步核验的数据" items={r.data_to_verify} icon="i-mdi-database-search-outline" />
          <Section label="分析总结" value={r.analysis_summary} />

          <View className="bg-muted/60 rounded-2xl p-3 mt-2 mb-4">
            <Text className="text-xs text-muted-foreground leading-relaxed">{AI_DISCLAIMER.market}</Text>
          </View>

          {idx === results.length - 1 && (
            <View className="flex flex-row gap-3">
              <View
                className="flex-1 rounded-full bg-muted flex items-center justify-center py-3 active:scale-95 transition-all"
                onClick={handleAnalyze}>
                <Text className="text-base text-foreground font-bold">重新分析</Text>
              </View>
              <View
                className="flex-1 rounded-full bg-primary flex items-center justify-center py-3 active:scale-95 transition-all"
                onClick={handleSave}>
                <Text className="text-base text-primary-foreground font-bold">保存分析</Text>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  )
}
