import {Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {Component, createRef, useCallback, useMemo, useState} from 'react'
import {EChart} from '@/components/echarts'
import {useAuth} from '@/contexts/AuthContext'
import {getAiTradeRecords} from '@/db/api'
import type {AiTradeRecord} from '@/db/types'
import {AI_DISCLAIMER} from '@/services/aiTrade'
import {
  fetchLiveTradeData,
  getSnapshotSummary,
  getTradeDataSnapshot,
  scoreMarkets,
  TRADE_DATA_SNAPSHOT,
  TRADE_DATA_SOURCES
} from '@/services/aiTrade/tradeData'

class DashboardChart extends Component<{canvasId: string; option: Record<string, unknown>; height?: string}> {
  chartRef = createRef<any>()

  componentDidMount() {
    setTimeout(() => this.chartRef.current?.refresh(this.props.option), 250)
  }

  componentDidUpdate(previous: {option: Record<string, unknown>}) {
    if (previous.option !== this.props.option) setTimeout(() => this.chartRef.current?.refresh(this.props.option), 250)
  }

  render() {
    return (
      <View style={{width: '100%', height: this.props.height || '280px'}}>
        <EChart ref={this.chartRef} canvasId={this.props.canvasId} />
      </View>
    )
  }
}

function SourceBadge({children, tone = 'official'}: {children: string; tone?: 'official' | 'snapshot' | 'inference'}) {
  const styles = {
    official: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    snapshot: 'bg-amber-50 border-amber-200 text-amber-700',
    inference: 'bg-violet-50 border-violet-200 text-violet-700'
  }
  return (
    <View className={`rounded-full border px-2 py-1 ${styles[tone]}`}>
      <Text className="text-[10px] font-bold">{children}</Text>
    </View>
  )
}

export default function AiTradeDashboard() {
  const {user} = useAuth()
  const [records, setRecords] = useState<AiTradeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showSources, setShowSources] = useState(false)
  const [liveData, setLiveData] = useState(false)
  const [dataFetchedAt, setDataFetchedAt] = useState<string | null>(null)
  const [_dataVersion, setDataVersion] = useState(0)
  const summary = useMemo(() => getSnapshotSummary(), [])
  const marketScores = useMemo(() => scoreMarkets(), [])

  const loadRecords = useCallback(async () => {
    if (!user) {
      setRecords([])
      setLoading(false)
      return
    }
    const {data} = await getAiTradeRecords(user.id)
    setRecords(data)
    setLoading(false)
  }, [user])

  const loadLiveData = useCallback(async () => {
    const result = await fetchLiveTradeData()
    setLiveData(result.live)
    setDataFetchedAt(result.fetchedAt || null)
    setDataVersion((version) => version + 1)
  }, [])

  useDidShow(() => {
    loadRecords()
    loadLiveData()
  })

  const usageStats = useMemo(() => {
    const marketAnalyses = records.filter((record) => record.type === 'market_analysis').length
    const confirmed = records.filter(
      (record) => record.status === 'confirmed' || record.review_status === 'approved'
    ).length
    const demo = records.filter((record) => record.is_demo).length
    return {total: records.length, marketAnalyses, confirmed, demo}
  }, [records])

  const serviceStructure = useMemo(() => {
    const items = TRADE_DATA_SNAPSHOT.filter(
      (item) => item.year === 2025 && item.unit === '亿元' && item.domain === 'service_trade'
    )
    const total = items.find((item) => item.indicator === '服务贸易进出口总额')?.value || 0
    const knowledge = items.find((item) => item.indicator === '知识密集型服务进出口')?.value || 0
    const information = items.find((item) => item.indicator === '电信计算机和信息服务进出口')?.value || 0
    return {
      knowledgeShare: total ? ((knowledge / total) * 100).toFixed(1) : '--',
      informationShare: total ? ((information / total) * 100).toFixed(1) : '--'
    }
  }, [])

  const latestEcommerce = summary.ecommerce[summary.ecommerce.length - 1]
  const latestDigital = getTradeDataSnapshot().find((item) => item.indicator === '可数字化交付服务进出口')
  const ecommerceChange =
    summary.ecommerceYoY === null ? '待更新' : `同比 ${summary.ecommerceYoY > 0 ? '+' : ''}${summary.ecommerceYoY}%`

  const openSource = (url: string) => {
    const runtime = globalThis as any
    if (runtime.window?.open) runtime.window.open(url, '_blank', 'noopener,noreferrer')
    else Taro.setClipboardData({data: url, success: () => Taro.showToast({title: '来源链接已复制', icon: 'success'})})
  }

  const ecommerceOption = useMemo(
    () => ({
      color: ['#C92A2A'],
      grid: {left: 42, right: 16, top: 28, bottom: 34},
      tooltip: {trigger: 'axis'},
      xAxis: {type: 'category', data: summary.ecommerce.map((item) => String(item.year))},
      yAxis: {type: 'value', name: '万亿元'},
      series: [
        {
          name: '跨境电商进出口',
          type: 'line',
          smooth: true,
          data: summary.ecommerce.map((item) => item.value),
          areaStyle: {opacity: 0.12},
          symbolSize: 9
        }
      ]
    }),
    [summary]
  )

  const digitalOption = useMemo(
    () => ({
      color: ['#0F766E'],
      grid: {left: 42, right: 16, top: 28, bottom: 34},
      tooltip: {trigger: 'axis'},
      xAxis: {type: 'category', data: summary.digital.map((item) => String(item.year))},
      yAxis: {type: 'value', name: '亿美元'},
      series: [
        {
          name: '电信计算机信息服务',
          type: 'bar',
          data: summary.digital.map((item) => item.value),
          barWidth: '36%',
          itemStyle: {borderRadius: [8, 8, 0, 0]}
        }
      ]
    }),
    [summary]
  )

  const serviceOption = useMemo(() => {
    const items = TRADE_DATA_SNAPSHOT.filter(
      (item) => item.year === 2025 && item.unit === '亿元' && item.domain === 'service_trade'
    )
    return {
      color: ['#A16207'],
      grid: {left: 48, right: 16, top: 28, bottom: 60},
      tooltip: {trigger: 'axis'},
      xAxis: {
        type: 'category',
        axisLabel: {rotate: 18, fontSize: 10},
        data: items.map((item) => item.indicator.replace('进出口', ''))
      },
      yAxis: {type: 'value', name: '亿元'},
      series: [
        {
          name: '2025年规模',
          type: 'bar',
          data: items.map((item) => item.value),
          barWidth: '42%',
          itemStyle: {borderRadius: [8, 8, 0, 0]}
        }
      ]
    }
  }, [])

  if (loading)
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-sm text-muted-foreground">正在整理数据看板…</Text>
      </View>
    )

  return (
    <View className="min-h-screen bg-background px-4 py-4 md:px-8 md:py-8">
      <View className="mx-auto max-w-[1180px]">
        <View className="bg-slate-900 rounded-[30px] p-5 md:p-7 mb-5 relative overflow-hidden">
          <View className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-emerald-400/10" />
          <View className="relative">
            <View className="flex flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-emerald-300 font-black tracking-[2px]">AI TRADE / DASHBOARD</Text>
                <Text className="text-2xl md:text-3xl text-white font-black block mt-2">数字贸易数据看板</Text>
              </View>
              <View className="flex flex-row items-center gap-2">
                <SourceBadge tone={liveData ? 'official' : 'snapshot'}>
                  {liveData ? '实时官方快照' : '课堂快照'}
                </SourceBadge>
                <View
                  className="rounded-full bg-white/10 px-3 py-1.5"
                  onClick={() => Taro.navigateTo({url: '/pages/ai-trade-records/index'})}>
                  <Text className="text-xs text-white font-bold">导出记录</Text>
                </View>
              </View>
            </View>
            <Text className="text-sm text-slate-300 leading-relaxed mt-3 max-w-[720px]">
              将跨境电商货物贸易、服务贸易和数字化交付服务分口径展示，再由 AI 辅助解释，最后落到商品与市场行动。
            </Text>
            <View className="flex flex-row flex-wrap gap-2 mt-4">
              <View className="rounded-full bg-white/10 px-3 py-1.5">
                <Text className="text-xs text-slate-200">
                  数据覆盖 {TRADE_DATA_SNAPSHOT[0]?.year}—{Math.max(...TRADE_DATA_SNAPSHOT.map((item) => item.year))}
                </Text>
              </View>
              <View className="rounded-full bg-emerald-400/15 px-3 py-1.5">
                <Text className="text-xs text-emerald-200">已核对官方指标 {summary.officialCount} 项</Text>
              </View>
              <View className="rounded-full bg-amber-400/15 px-3 py-1.5">
                <Text className="text-xs text-amber-200">结论需人工复核</Text>
              </View>
              {liveData && dataFetchedAt ? (
                <View className="rounded-full bg-white/10 px-3 py-1.5">
                  <Text className="text-xs text-slate-200">更新于 {dataFetchedAt}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
            <Text className="text-2xl text-primary font-black block">{latestEcommerce?.value ?? '--'}</Text>
            <Text className="text-xs text-muted-foreground">2025中国跨境电商（万亿元）</Text>
            <Text className="text-xs text-emerald-700 font-bold mt-1">{ecommerceChange}</Text>
          </View>
          <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
            <Text className="text-2xl text-teal-700 font-black block">{latestDigital?.value ?? '--'}</Text>
            <Text className="text-xs text-muted-foreground">可数字化交付服务（亿美元）</Text>
            <Text className="text-xs text-emerald-700 font-bold mt-1">官方口径</Text>
          </View>
          <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
            <Text className="text-2xl text-amber-700 font-black block">{summary.digitalCagr || '--'}%</Text>
            <Text className="text-xs text-muted-foreground">2020—2025信息服务年均增速</Text>
          </View>
          <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
            <Text className="text-2xl text-foreground font-black block">{usageStats.marketAnalyses}</Text>
            <Text className="text-xs text-muted-foreground">本账号市场分析记录</Text>
          </View>
        </View>

        <View className="bg-card rounded-[28px] p-4 md:p-5 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-lg text-foreground font-bold block">本页先给出三个判断</Text>
              <Text className="text-xs text-muted-foreground mt-1">把统计事实转换成课堂展示可复述的观点</Text>
            </View>
            <View className="i-mdi-lightbulb-on-outline text-primary text-2xl" />
          </View>
          <View className="grid md:grid-cols-3 gap-2">
            <View className="rounded-2xl bg-primary/5 border border-primary/10 p-3">
              <Text className="text-xs text-primary font-black">01 / 规模</Text>
              <Text className="text-sm text-foreground font-bold block mt-1">跨境电商货物规模继续增长</Text>
              <Text className="text-xs text-muted-foreground leading-relaxed block mt-1">
                说明出海基础环境存在，但不能直接等同于根书商品销量。
              </Text>
            </View>
            <View className="rounded-2xl bg-teal-50 border border-teal-100 p-3">
              <Text className="text-xs text-teal-700 font-black">02 / 环境</Text>
              <Text className="text-sm text-foreground font-bold block mt-1">数字化交付服务环境增强</Text>
              <Text className="text-xs text-muted-foreground leading-relaxed block mt-1">
                适合用内容、社交媒体和数字化沟通降低跨境触达成本。
              </Text>
            </View>
            <View className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
              <Text className="text-xs text-amber-700 font-black">03 / 方法</Text>
              <Text className="text-sm text-foreground font-bold block mt-1">先小批量验证，再扩大投入</Text>
              <Text className="text-xs text-muted-foreground leading-relaxed block mt-1">
                用询盘、转化、履约和合规结果修正 AI 的机会评分。
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between">
            <View>
              <Text className="text-lg text-foreground font-bold block">跨境电商规模趋势</Text>
              <Text className="text-xs text-muted-foreground mt-1">中国 · 货物贸易口径 · 万亿元</Text>
            </View>
            <SourceBadge>海关/新华社</SourceBadge>
          </View>
          <DashboardChart canvasId="trade-ecommerce-trend" option={ecommerceOption} height="240px" />
          <Text className="text-xs text-muted-foreground leading-relaxed">
            AI解释：2024—2025规模继续增长，但这里只能说明跨境电商货物贸易规模，不能直接推导根书文创的销量。
          </Text>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between">
            <View>
              <Text className="text-lg text-foreground font-bold block">数字化交付服务趋势</Text>
              <Text className="text-xs text-muted-foreground mt-1">中国 · 电信计算机信息服务 · 亿美元</Text>
            </View>
            <SourceBadge>商务部</SourceBadge>
          </View>
          <DashboardChart canvasId="trade-digital-service" option={digitalOption} height="240px" />
          <Text className="text-xs text-muted-foreground leading-relaxed">
            AI解释：2020—2025该指标从937.3亿美元升至1545.3亿美元，数字化服务环境增强，但不等于文创商品的直接需求。
          </Text>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between">
            <View>
              <Text className="text-lg text-foreground font-bold block">2025年服务贸易结构</Text>
              <Text className="text-xs text-muted-foreground mt-1">中国 · 人民币亿元 · 同口径对比</Text>
            </View>
            <SourceBadge>商务部</SourceBadge>
          </View>
          <DashboardChart canvasId="trade-service-structure" option={serviceOption} height="270px" />
          <Text className="text-xs text-muted-foreground leading-relaxed">
            我的判断：根书文创应把数字服务环境作为内容传播和客户触达的背景变量，再用真实询盘与小规模投放验证商品转化。
          </Text>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-lg text-foreground font-bold block">结构化解读</Text>
              <Text className="text-xs text-muted-foreground mt-1">用比例而不是单一规模补充判断</Text>
            </View>
            <View className="i-mdi-chart-donut text-primary text-2xl" />
          </View>
          <View className="grid grid-cols-2 gap-2">
            <View className="rounded-2xl bg-primary/5 p-3">
              <Text className="text-2xl text-primary font-black block">{serviceStructure.knowledgeShare}%</Text>
              <Text className="text-xs text-muted-foreground leading-relaxed block mt-1">
                知识密集型服务占2025年服务贸易总额
              </Text>
            </View>
            <View className="rounded-2xl bg-teal-50 p-3">
              <Text className="text-2xl text-teal-700 font-black block">{serviceStructure.informationShare}%</Text>
              <Text className="text-xs text-muted-foreground leading-relaxed block mt-1">
                电信、计算机和信息服务占比
              </Text>
            </View>
          </View>
          <Text className="text-xs text-muted-foreground leading-relaxed block mt-3">
            这两个比例只能说明服务贸易结构背景，不能直接推导文创商品需求；下一步应使用商品页面行为、询盘和订单数据验证。
          </Text>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-lg text-foreground font-bold block">目标市场机会评分</Text>
              <Text className="text-xs text-muted-foreground mt-1">
                规则权重：规模30% · 增速25% · 数字相关度20% · 文化15% · 可行性10%
              </Text>
            </View>
            <SourceBadge tone="inference">AI辅助判断</SourceBadge>
          </View>
          {marketScores.map((item) => (
            <View key={item.market} className="flex flex-row items-center mb-3">
              <Text className="text-sm text-foreground font-bold w-14">{item.market}</Text>
              <View className="flex-1 h-2 rounded-full bg-muted overflow-hidden mx-2">
                <View className="h-2 rounded-full bg-primary" style={{width: `${item.total}%`}} />
              </View>
              <Text className="text-sm text-primary font-black w-8 text-right">{item.total}</Text>
            </View>
          ))}
          <Text className="text-xs text-muted-foreground leading-relaxed">
            评分是基于现有证据和业务规则的 AI
            辅助判断，不是官方市场排名。正式决策前需要补充平台流量、竞争、履约和合规数据。
          </Text>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <Text className="text-lg text-foreground font-bold">AI业务使用情况</Text>
            <Text className="text-xs text-muted-foreground">来自本账号记录</Text>
          </View>
          <View className="grid grid-cols-3 gap-2">
            <View className="bg-muted/60 rounded-xl p-3">
              <Text className="text-xl text-foreground font-black block">{usageStats.total}</Text>
              <Text className="text-xs text-muted-foreground">总记录</Text>
            </View>
            <View className="bg-muted/60 rounded-xl p-3">
              <Text className="text-xl text-emerald-700 font-black block">{usageStats.confirmed}</Text>
              <Text className="text-xs text-muted-foreground">已确认</Text>
            </View>
            <View className="bg-muted/60 rounded-xl p-3">
              <Text className="text-xl text-amber-700 font-black block">{usageStats.demo}</Text>
              <Text className="text-xs text-muted-foreground">演示记录</Text>
            </View>
          </View>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View
            className="flex flex-row items-center justify-between"
            onClick={() => setShowSources((value) => !value)}>
            <View>
              <Text className="text-lg text-foreground font-bold block">数据源与方法</Text>
              <Text className="text-xs text-muted-foreground mt-1">点击来源名称可直接打开官方页面</Text>
            </View>
            <View className={`i-mdi-chevron-${showSources ? 'up' : 'down'} text-primary text-xl`} />
          </View>
          {showSources && (
            <View className="mt-3">
              {TRADE_DATA_SOURCES.map((source) => (
                <View key={source.id} className="border-t border-border border-opacity-20 pt-3 mt-3">
                  <Text
                    className="text-sm text-primary font-bold underline block"
                    onClick={() => openSource(source.url)}>
                    {source.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground leading-relaxed mt-1 block">
                    {source.publisher} · {source.scope}
                  </Text>
                  <Text className="text-xs text-muted-foreground leading-relaxed mt-1 block">{source.note}</Text>
                  <Text
                    className="text-[10px] text-primary underline block mt-2"
                    onClick={() => openSource(source.url)}>
                    打开原始资料页面 ↗
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-6">
          <Text className="text-xs text-amber-800 leading-relaxed">
            {AI_DISCLAIMER.chart} 数据来源、单位、年份和口径必须与图表一起展示；当前页面使用已审核快照，未接入实时抓取。
          </Text>
        </View>
        <View
          className="rounded-xl bg-primary flex items-center justify-center py-3 mb-6"
          onClick={() => Taro.navigateTo({url: '/pages/ai-trade-market/index'})}>
          <Text className="text-sm text-primary-foreground font-bold">进入市场分析工作台</Text>
        </View>
      </View>
    </View>
  )
}
