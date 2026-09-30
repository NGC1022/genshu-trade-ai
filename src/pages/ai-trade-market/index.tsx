import {Image, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useMemo, useState} from 'react'
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
  getProviderInfo,
  type MarketAnalysisResult,
  type ProductIntlInput
} from '@/services/aiTrade'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'
import {
  MARKET_OPTIONS,
  TRADE_DATA_SNAPSHOT,
  getSnapshotSummary,
  scoreMarkets,
  type MarketScoreBreakdown
} from '@/services/aiTrade/tradeData'

const SECTION_CLASS = 'bg-card rounded-[28px] p-5 shadow-card border border-border border-opacity-10 mb-4'

function SourceBadge({status}: {status: 'official' | 'classroom_snapshot' | 'ai_inference'}) {
  const labels = {
    official: '官方统计',
    classroom_snapshot: '课堂快照',
    ai_inference: 'AI辅助判断'
  }
  const styles = {
    official: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    classroom_snapshot: 'bg-amber-50 text-amber-700 border-amber-200',
    ai_inference: 'bg-violet-50 text-violet-700 border-violet-200'
  }
  return (
    <View className={`rounded-full border px-2.5 py-1 ${styles[status]}`}>
      <Text className="text-xs font-bold">{labels[status]}</Text>
    </View>
  )
}

function ScoreRow({label, value}: {label: string; value: number}) {
  return (
    <View className="mb-2">
      <View className="flex flex-row items-center justify-between mb-1">
        <Text className="text-xs text-muted-foreground">{label}</Text>
        <Text className="text-xs text-foreground font-bold">{value}</Text>
      </View>
      <View className="h-2 rounded-full bg-muted overflow-hidden">
        <View className="h-2 rounded-full bg-primary" style={{width: `${value}%`}} />
      </View>
    </View>
  )
}

export default function AiTradeMarket() {
  const {user} = useAuth()
  const [products, setProducts] = useState<SKU[]>([])
  const [selected, setSelected] = useState<SKU | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [markets, setMarkets] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MarketAnalysisResult[] | null>(null)
  const [showSources, setShowSources] = useState(false)
  const provider = useMemo(() => getProviderInfo(), [])

  const summary = useMemo(() => getSnapshotSummary(), [])
  const scores = useMemo(() => scoreMarkets(), [])
  const selectedScore = useMemo<MarketScoreBreakdown | undefined>(() => {
    if (markets.length !== 1) return undefined
    return scores.find((item) => item.market === markets[0])
  }, [markets, scores])

  useEffect(() => {
    getSKUList().then(({data}) => setProducts(data))
  }, [])

  const buildInput = useCallback((sku: SKU): ProductIntlInput => ({
    productId: sku.sku_code,
    name: sku.name,
    description: sku.description || undefined,
    category: sku.category,
    price: sku.price,
    material: sku.material || undefined,
    specification: sku.dimensions || undefined,
    imageUrl: sku.image_url || undefined
  }), [])

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

  const toggleMarket = (market: string) => {
    setResults(null)
    setMarkets((current) => current.includes(market) ? current.filter((item) => item !== market) : [...current, market])
  }

  const handleAnalyze = async () => {
    if (loading) return
    const input = isDemo ? DEMO_PRODUCT : selected ? buildInput(selected) : null
    if (!input) {
      Taro.showToast({title: '请先选择商品', icon: 'none'})
      return
    }
    if (!markets.length) {
      Taro.showToast({title: '请选择目标市场', icon: 'none'})
      return
    }
    setLoading(true)
    try {
      setResults(await analyzeTargetMarket(input, markets))
    } catch (error) {
      const message = error instanceof AiServiceError ? error.message : 'AI分析失败，请重试'
      Taro.showToast({title: message, icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!results?.length) return
    if (!user) {
      Taro.showToast({title: '请先登录后保存', icon: 'none'})
      return
    }
    const input = isDemo ? DEMO_PRODUCT : selected ? buildInput(selected) : null
    if (!input) return
    Taro.showLoading({title: '保存中...'})
    let failed = 0
    for (const result of results) {
      const {error} = await createAiTradeRecord({
        user_id: user.id,
        type: 'market_analysis',
        product_id: input.productId,
        product_name: input.name,
        market: result.market,
        input_data: {
          ...input,
          markets,
          data_snapshot_ids: TRADE_DATA_SNAPSHOT.map((item) => item.id),
          score_model: 'scale30-growth25-digital20-cultural15-feasibility10'
        },
        ai_result: {...result, market_score: scores.find((item) => item.market === result.market)},
        status: 'draft',
        review_status: 'pending',
        source: provider.isMock ? 'mock' : 'realtime',
        is_demo: isDemo
      })
      if (error) failed += 1
    }
    Taro.hideLoading()
    Taro.showToast({title: failed ? `部分保存失败（${failed}条）` : '已保存，等待人工确认', icon: 'none'})
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      <View className="mb-5">
        <View className="flex flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-xs text-primary font-black tracking-[2px]">AI TRADE / 01</Text>
            <Text className="text-2xl text-foreground font-black block mt-1">海外市场分析</Text>
          </View>
          <View className="bg-primary/10 rounded-2xl px-3 py-2">
            <Text className="text-xs text-primary font-bold">证据驱动</Text>
          </View>
        </View>
        <Text className="text-sm text-muted-foreground leading-relaxed">用可追溯的贸易数据辅助判断根书文创的试点市场。统计事实、AI推断和人工判断分别呈现。</Text>
      </View>

      <View className={SECTION_CLASS}>
        <View className="flex flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-lg text-foreground font-bold block">选择分析对象</Text>
            <Text className="text-xs text-muted-foreground mt-1">课堂展示建议：根书木质书签 → 美国</Text>
          </View>
          <View className="bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5" onClick={handleLoadDemo}>
            <Text className="text-xs text-amber-700 font-bold">{isDemo ? `已加载${DEMO_BADGE_TEXT}` : '加载课堂案例'}</Text>
          </View>
        </View>
        <View className="flex flex-col gap-2">
          {products.slice(0, 6).map((product) => {
            const active = !isDemo && selected?.id === product.id
            return (
              <View key={product.id} className={`flex flex-row items-center rounded-2xl border p-3 ${active ? 'border-primary bg-primary/5' : 'border-border border-opacity-20'}`} onClick={() => handleSelect(product)}>
                <Image src={product.image_url || DEFAULT_PRODUCT_IMAGE} mode="aspectFill" className="w-12 h-12 rounded-xl mr-3" />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm text-foreground font-bold truncate block">{product.name}</Text>
                  <Text className="text-xs text-muted-foreground mt-1">¥{Number(product.price || 0).toFixed(2)} · {product.category === 'premium' ? '高端定制' : '标准文创'}</Text>
                </View>
                {active && <View className="i-mdi-check-circle text-primary text-xl" />}
              </View>
            )
          })}
          {isDemo && (
            <View className="flex flex-row items-center rounded-2xl border border-amber-300 bg-amber-50 p-3">
              <View className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mr-3"><View className="i-mdi-bookmark-outline text-2xl text-amber-600" /></View>
              <View className="flex-1"><Text className="text-sm text-foreground font-bold block">{DEMO_PRODUCT.name}</Text><Text className="text-xs text-amber-700 mt-1">{DEMO_BADGE_TEXT}</Text></View>
              <View className="i-mdi-check-circle text-amber-600 text-xl" />
            </View>
          )}
        </View>
      </View>

      <View className={SECTION_CLASS}>
        <View className="flex flex-row items-center justify-between mb-3">
          <View><Text className="text-lg text-foreground font-bold block">目标市场</Text><Text className="text-xs text-muted-foreground mt-1">可多选，评分仅为AI辅助判断</Text></View>
          <Text className="text-xs text-primary font-bold">{markets.length} 个已选</Text>
        </View>
        <View className="flex flex-row flex-wrap gap-2">
          {MARKET_OPTIONS.map((market) => {
            const active = markets.includes(market.name)
            return <View key={market.name} className={`rounded-2xl border px-3 py-2 ${active ? 'border-primary bg-primary/10' : 'border-border border-opacity-30'}`} onClick={() => toggleMarket(market.name)}><Text className={`text-sm font-bold ${active ? 'text-primary' : 'text-foreground'}`}>{market.name}</Text><Text className="text-[10px] text-muted-foreground block mt-0.5">{market.en}</Text></View>
          })}
        </View>
        {selectedScore && <View className="mt-4 border-t border-border border-opacity-20 pt-4"><View className="flex flex-row items-center justify-between mb-2"><Text className="text-sm text-foreground font-bold">{selectedScore.market} · 机会评分</Text><Text className="text-xl text-primary font-black">{selectedScore.total}<Text className="text-xs text-muted-foreground font-normal"> / 100</Text></Text></View><ScoreRow label="贸易规模" value={selectedScore.scale} /><ScoreRow label="近年增速" value={selectedScore.growth} /><ScoreRow label="数字服务相关度" value={selectedScore.digitalRelevance} /><ScoreRow label="文化内容适配" value={selectedScore.culturalFit} /><ScoreRow label="履约与合规可行性" value={selectedScore.feasibility} /><Text className="text-xs text-muted-foreground leading-relaxed mt-2">{selectedScore.rationale}</Text></View>}
      </View>

      <View className={SECTION_CLASS}>
        <View className="flex flex-row items-center justify-between mb-3"><View><Text className="text-lg text-foreground font-bold block">数据证据</Text><Text className="text-xs text-muted-foreground mt-1">已核对公开来源，不把不同口径直接相加</Text></View><SourceBadge status="official" /></View>
        <View className="grid grid-cols-2 gap-2">
          <View className="bg-muted/60 rounded-2xl p-3"><Text className="text-xl text-foreground font-black block">2.84</Text><Text className="text-xs text-muted-foreground">2025中国跨境电商（万亿元）</Text><Text className="text-xs text-emerald-700 font-bold mt-1">同比 +4.8%</Text></View>
          <View className="bg-muted/60 rounded-2xl p-3"><Text className="text-xl text-foreground font-black block">4323.1</Text><Text className="text-xs text-muted-foreground">2025可数字化交付服务（亿美元）</Text><Text className="text-xs text-emerald-700 font-bold mt-1">同比 +6.3%</Text></View>
          <View className="bg-muted/60 rounded-2xl p-3"><Text className="text-xl text-foreground font-black block">{summary.digitalCagr || '--'}%</Text><Text className="text-xs text-muted-foreground">2020—2025电信计算机信息服务年均增速</Text></View>
          <View className="bg-muted/60 rounded-2xl p-3"><Text className="text-xl text-foreground font-black block">{summary.officialCount}</Text><Text className="text-xs text-muted-foreground">已核对官方指标</Text></View>
        </View>
        <View className="flex flex-row items-center justify-between mt-3" onClick={() => setShowSources((value) => !value)}><Text className="text-sm text-primary font-bold">{showSources ? '收起来源与口径' : '查看来源与口径'}</Text><View className={`i-mdi-chevron-${showSources ? 'up' : 'down'} text-primary text-lg`} /></View>
        {showSources && <View className="mt-3 border-t border-border border-opacity-20 pt-3">{TRADE_DATA_SNAPSHOT.map((item) => <View key={item.id} className="mb-3"><View className="flex flex-row items-center justify-between"><Text className="text-xs text-foreground font-bold flex-1">{item.indicator} · {item.year}</Text><SourceBadge status={item.status} /></View><Text className="text-xs text-muted-foreground leading-relaxed mt-1">{item.value} {item.unit} · {item.definition}</Text><Text className="text-[10px] text-primary mt-1">{item.publisher} · {item.updatedAt}</Text></View>)}</View>}
      </View>

      <View className={`rounded-2xl flex items-center justify-center py-4 mb-4 ${loading ? 'bg-primary/50' : 'bg-primary'}`} onClick={handleAnalyze}><Text className="text-base text-primary-foreground font-black">{loading ? 'AI正在整理证据…' : '生成市场分析'}</Text></View>

      {results?.map((result) => {
        const score = scores.find((item) => item.market === result.market)
        return <View key={result.market} className={SECTION_CLASS}><View className="flex flex-row items-center justify-between mb-4"><View className="flex flex-row items-center"><View className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center mr-2"><View className="i-mdi-map-marker-outline text-secondary text-lg" /></View><Text className="text-lg text-foreground font-bold">{result.market}</Text></View><SourceBadge status={isDemo ? 'classroom_snapshot' : 'ai_inference'} /></View>{score && <View className="bg-violet-50 rounded-2xl p-3 mb-4"><View className="flex flex-row items-center justify-between"><Text className="text-sm text-violet-900 font-bold">机会评分（AI辅助）</Text><Text className="text-2xl text-violet-700 font-black">{score.total}</Text></View><Text className="text-xs text-violet-700 leading-relaxed mt-1">{score.rationale}</Text></View>}<View className="mb-3"><Text className="text-xs text-muted-foreground">消费者画像</Text><Text className="text-sm text-foreground leading-relaxed mt-1">{result.consumer_profile}</Text></View><View className="mb-3"><Text className="text-xs text-muted-foreground">消费场景</Text><Text className="text-sm text-foreground leading-relaxed mt-1">{result.consumption_scenario}</Text></View><View className="mb-3"><Text className="text-xs text-muted-foreground">文化与价格适配</Text><Text className="text-sm text-foreground leading-relaxed mt-1">{result.cultural_fit}；{result.price_fit}</Text></View><View className="mb-3"><Text className="text-xs text-muted-foreground">营销重点</Text><View className="flex flex-row flex-wrap gap-2 mt-1">{result.marketing_focus.map((item) => <View key={item} className="bg-muted rounded-full px-2.5 py-1"><Text className="text-xs text-foreground">{item}</Text></View>)}</View></View><View className="mb-3"><Text className="text-xs text-muted-foreground">风险与待核验数据</Text>{[...result.potential_risks, ...result.data_to_verify].map((item) => <View key={item} className="flex flex-row items-start mt-1"><View className="i-mdi-alert-outline text-amber-600 text-sm mr-1.5 mt-0.5" /><Text className="text-sm text-foreground flex-1 leading-relaxed">{item}</Text></View>)}</View><View className="bg-primary/5 rounded-2xl p-3 mb-4"><Text className="text-xs text-primary font-bold">AI分析结论</Text><Text className="text-sm text-foreground leading-relaxed mt-1">{result.analysis_summary}</Text></View><Text className="text-xs text-muted-foreground leading-relaxed">{AI_DISCLAIMER.market}</Text>{result === results[results.length - 1] && <View className="flex flex-row gap-2 mt-4"><View className="flex-1 rounded-xl bg-muted flex items-center justify-center py-3" onClick={handleAnalyze}><Text className="text-sm text-foreground font-bold">重新分析</Text></View><View className="flex-1 rounded-xl bg-primary flex items-center justify-center py-3" onClick={handleSave}><Text className="text-sm text-primary-foreground font-bold">保存并待审核</Text></View></View>}</View>
      })}

      <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-6"><View className="flex flex-row items-start"><View className="i-mdi-information-outline text-amber-600 text-base mr-2 mt-0.5" /><Text className="text-xs text-amber-800 leading-relaxed flex-1">跨境电商货物贸易、服务贸易和数字化交付服务不是同一统计口径。本页图表和AI结论用于课堂展示与决策辅助，不构成官方统计或正式贸易意见。</Text></View></View>
    </View>
  )
}
