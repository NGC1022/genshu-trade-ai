import {Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {Component, createRef, useCallback, useMemo, useState} from 'react'
import EChart from '@/components/echarts/echart'
import {useAuth} from '@/contexts/AuthContext'
import {getAiTradeRecords} from '@/db/api'
import {AI_DISCLAIMER} from '@/services/aiTrade'
import {
  fetchLiveTradeData,
  getSnapshotSummary,
  TRADE_DATA_SNAPSHOT,
  TRADE_DATA_SOURCES,
  type TradeDataSnapshot
} from '@/services/aiTrade/tradeData'
import {exportTradeDataCsv} from '@/services/aiTrade/tradeDataExport'

interface DashboardChartProps {
  option: Record<string, unknown>
  height?: string
  canvasId: string
}

class DashboardChart extends Component<DashboardChartProps> {
  private chart = createRef<InstanceType<typeof EChart>>()

  private refreshChart = () => {
    const {option} = this.props
    setTimeout(() => this.chart.current?.refresh(option), 80)
  }

  componentDidMount() {
    this.refreshChart()
  }

  componentDidUpdate() {
    this.refreshChart()
  }

  render() {
    const {height = '240px', canvasId} = this.props
    return (
      <View style={{height, width: '100%'}}>
        <EChart ref={this.chart} canvasId={canvasId} />
      </View>
    )
  }
}

function SourceBadge({
  tone = 'snapshot',
  children
}: {
  tone?: 'official' | 'snapshot' | 'inference'
  children: React.ReactNode
}) {
  const styles = {
    official: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    snapshot: 'bg-amber-50 text-amber-700 border-amber-200',
    inference: 'bg-violet-50 text-violet-700 border-violet-200'
  }
  return (
    <View className={`rounded-full border px-2.5 py-1 ${styles[tone]}`}>
      <Text className="text-xs font-bold">{children}</Text>
    </View>
  )
}

function formatValue(value: number | null | undefined, fractionDigits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString('zh-CN', {maximumFractionDigits: fractionDigits})
}

function formatTime(value?: string) {
  if (!value) return '尚未连接实时数据源'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-CN', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})
}

function openSource(url: string) {
  if (process.env.TARO_ENV === 'h5') {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    Taro.setClipboardData({data: url, success: () => Taro.showToast({title: '来源链接已复制', icon: 'success'})})
  }
}

const WTO_MARKETS = ['中国', '美国', '日本', '新加坡', '韩国']

export default function AiTradeDashboard() {
  const {user} = useAuth()
  const [tradeData, setTradeData] = useState<TradeDataSnapshot[]>(TRADE_DATA_SNAPSHOT)
  const [liveData, setLiveData] = useState(false)
  const [staleData, setStaleData] = useState(false)
  const [fetchedAt, setFetchedAt] = useState<string>()
  const [refreshing, setRefreshing] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [showSources, setShowSources] = useState(false)
  const [usageStats, setUsageStats] = useState({total: 0, confirmed: 0, demo: 0, marketAnalyses: 0})
  const summary = useMemo(() => getSnapshotSummary(tradeData), [tradeData])

  const refreshData = useCallback(async (showFeedback = false) => {
    setRefreshing(true)
    const result = await fetchLiveTradeData()
    setTradeData(result.data)
    setLiveData(result.live)
    setStaleData(Boolean(result.stale))
    setFetchedAt(result.fetchedAt)
    setRefreshing(false)
    if (showFeedback) {
      const message = result.live
        ? 'WTO数据已更新'
        : result.stale
          ? 'WTO更新失败，正在显示缓存'
          : '未连接WTO后端，正在显示已核验快照'
      Taro.showToast({title: message, icon: result.live ? 'success' : 'none'})
    }
  }, [])

  const loadUsage = useCallback(async () => {
    if (!user) {
      setUsageStats({total: 0, confirmed: 0, demo: 0, marketAnalyses: 0})
      setRecordsLoading(false)
      return
    }
    setRecordsLoading(true)
    try {
      const {data, error} = await getAiTradeRecords(user.id, undefined, 200)
      if (error) throw error
      const rows = data || []
      setUsageStats({
        total: rows.length,
        confirmed: rows.filter((item) => item.status === 'confirmed').length,
        demo: rows.filter((item) => item.is_demo).length,
        marketAnalyses: rows.filter((item) => item.type === 'market_analysis').length
      })
    } catch {
      setUsageStats({total: 0, confirmed: 0, demo: 0, marketAnalyses: 0})
    } finally {
      setRecordsLoading(false)
    }
  }, [user])

  useDidShow(() => {
    void refreshData()
    void loadUsage()
  })

  const ecommerceOption = useMemo(
    () => ({
      color: ['#C92A2A'],
      grid: {left: 48, right: 20, top: 26, bottom: 38},
      tooltip: {trigger: 'axis'},
      xAxis: {type: 'category', data: summary.ecommerce.map((item) => String(item.year))},
      yAxis: {type: 'value', name: '万亿元', min: 0},
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
    [summary.ecommerce]
  )

  const telecomOption = useMemo(
    () => ({
      color: ['#0F766E'],
      grid: {left: 50, right: 20, top: 26, bottom: 38},
      tooltip: {trigger: 'axis'},
      xAxis: {type: 'category', data: summary.telecomComputerInfo.map((item) => String(item.year))},
      yAxis: {type: 'value', name: '亿美元', min: 0},
      series: [
        {
          name: '电信、计算机和信息服务进出口',
          type: 'line',
          data: summary.telecomComputerInfo.map((item) => item.value),
          symbolSize: 9
        }
      ]
    }),
    [summary.telecomComputerInfo]
  )

  const wtoOption = useMemo(() => {
    const years = [...new Set(summary.wtoDigitalExports.map((item) => item.year))].sort((a, b) => a - b)
    const hasTrend = years.length > 1
    return {
      color: ['#C92A2A', '#2563EB', '#059669', '#D97706', '#7C3AED'],
      grid: hasTrend
        ? {left: 64, right: 24, top: 28, bottom: 38, containLabel: true}
        : {left: 62, right: 42, top: 24, bottom: 24, containLabel: true},
      tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}},
      legend: hasTrend ? {bottom: 0, textStyle: {fontSize: 10}} : undefined,
      xAxis: hasTrend ? {type: 'category', data: years.map(String)} : {type: 'value', name: '百万美元', min: 0},
      yAxis: hasTrend
        ? {type: 'value', name: '百万美元', min: 0}
        : {type: 'category', data: WTO_MARKETS, inverse: true, axisLabel: {fontSize: 10}},
      series: hasTrend
        ? WTO_MARKETS.map((market) => ({
            name: market,
            type: 'line',
            connectNulls: false,
            showSymbol: false,
            data: years.map(
              (year) =>
                summary.wtoDigitalExports.find((item) => item.geography === market && item.year === year)?.value ?? null
            )
          }))
        : [
            {
              name: String(years[0] || 'WTO'),
              type: 'bar',
              barMaxWidth: 20,
              itemStyle: {borderRadius: [0, 6, 6, 0]},
              data: WTO_MARKETS.map(
                (market) => summary.wtoDigitalExports.find((item) => item.geography === market)?.value ?? null
              )
            }
          ]
    }
  }, [summary.wtoDigitalExports])

  const serviceOption = useMemo(() => {
    const items = summary.serviceTrade
    return {
      color: ['#A16207'],
      grid: {left: 56, right: 18, top: 28, bottom: 66},
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
  }, [summary.serviceTrade])

  const serviceTotal = summary.serviceTrade.find((item) => item.indicator === '服务贸易进出口总额')?.value || 0
  const knowledgeValue = summary.serviceTrade.find((item) => item.indicator === '知识密集型服务进出口')?.value || 0
  const informationValue =
    summary.serviceTrade.find((item) => item.indicator === '电信计算机和信息服务进出口')?.value || 0
  const knowledgeShare = serviceTotal ? ((knowledgeValue / serviceTotal) * 100).toFixed(1) : '—'
  const informationShare = serviceTotal ? ((informationValue / serviceTotal) * 100).toFixed(1) : '—'
  const latestEcommerce = summary.latestEcommerce
  const latestDigital = summary.latestDigitalDelivered
  const latestIct = summary.latestTelecomComputerInfo

  const handleExport = async () => {
    try {
      await exportTradeDataCsv(tradeData, fetchedAt || '无实时抓取；显示代码内已核验快照')
      if (process.env.TARO_ENV === 'h5') Taro.showToast({title: '数据CSV已下载', icon: 'success'})
    } catch (error) {
      Taro.showToast({title: error instanceof Error ? error.message : '导出失败，请重试', icon: 'none'})
    }
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4 md:px-8 md:py-8">
      <View className="mx-auto max-w-[1180px]">
        <View className="bg-slate-900 rounded-[30px] p-5 md:p-7 mb-5 relative overflow-hidden">
          <View className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-emerald-400/10" />
          <View className="relative">
            <View className="flex flex-row items-start justify-between gap-3">
              <View>
                <Text className="text-xs text-emerald-300 font-black tracking-[2px]">AI TRADE / DASHBOARD</Text>
                <Text className="text-2xl md:text-3xl text-white font-black block mt-2">数字贸易数据看板</Text>
              </View>
              <SourceBadge tone={liveData ? 'official' : 'snapshot'}>
                {liveData
                  ? `WTO已同步 · ${summary.latestWtoYear || '—'}`
                  : staleData
                    ? 'WTO缓存快照'
                    : '已核验数据快照'}
              </SourceBadge>
            </View>
            <Text className="text-sm text-slate-300 leading-relaxed mt-3 max-w-[720px]">
              将跨境电商货物、服务贸易与数字化交付服务分口径呈现。图表可追溯至官方来源；宏观出口规模不直接代表某个商品的市场需求。
            </Text>
            <Text className="text-xs text-slate-400 mt-2">
              WTO最新数据年：{summary.latestWtoYear || '待连接'} · 数据抓取：{formatTime(fetchedAt)}
            </Text>
            <View className="flex flex-row flex-wrap gap-2 mt-4">
              <View className="rounded-xl bg-white/10 px-3 py-2" onClick={() => void refreshData(true)}>
                <Text className="text-xs text-white font-bold">{refreshing ? '更新中…' : '刷新WTO数据'}</Text>
              </View>
              <View className="rounded-xl bg-emerald-400/20 px-3 py-2" onClick={handleExport}>
                <Text className="text-xs text-emerald-100 font-bold">导出全部数据 CSV</Text>
              </View>
              <View
                className="rounded-xl bg-white/10 px-3 py-2"
                onClick={() => Taro.navigateTo({url: '/pages/ai-trade-records/index'})}>
                <Text className="text-xs text-white font-bold">导出 AI 分析记录</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
            <Text className="text-2xl text-primary font-black block">
              {latestEcommerce ? formatValue(latestEcommerce.value, 2) : '—'}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {latestEcommerce?.year || '—'}中国跨境电商进出口（万亿元）
            </Text>
            <Text className="text-xs text-emerald-700 font-bold mt-1">
              官方同比{' '}
              {latestEcommerce?.reportedGrowthPct === undefined ? '待核验' : `+${latestEcommerce.reportedGrowthPct}%`}
            </Text>
          </View>
          <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
            <Text className="text-2xl text-teal-700 font-black block">
              {latestDigital ? formatValue(latestDigital.value, 1) : '—'}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {latestDigital?.year || '—'}可数字化交付服务（亿美元）
            </Text>
            <Text className="text-xs text-emerald-700 font-bold mt-1">
              官方同比{' '}
              {latestDigital?.reportedGrowthPct === undefined ? '待核验' : `+${latestDigital.reportedGrowthPct}%`}
            </Text>
          </View>
          <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
            <Text className="text-2xl text-amber-700 font-black block">
              {summary.telecomComputerInfoCagr === null ? '—' : `${summary.telecomComputerInfoCagr}%`}
            </Text>
            <Text className="text-xs text-muted-foreground">电信、计算机和信息服务年均增速</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {summary.telecomComputerInfo[0]?.year || '—'}—{latestIct?.year || '—'} · 按端点计算
            </Text>
          </View>
          <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
            <Text className="text-2xl text-foreground font-black block">
              {recordsLoading ? '…' : usageStats.marketAnalyses}
            </Text>
            <Text className="text-xs text-muted-foreground">本账号市场分析记录</Text>
            <Text className="text-xs text-muted-foreground mt-1">最近200条 · 已登录账号</Text>
          </View>
        </View>

        <View className="bg-card rounded-[28px] p-4 md:p-5 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-lg text-foreground font-bold block">数据要点</Text>
              <Text className="text-xs text-muted-foreground mt-1">规则化解读，数值和结论均回链来源</Text>
            </View>
            <View className="i-mdi-lightbulb-on-outline text-primary text-2xl" />
          </View>
          <View className="grid md:grid-cols-3 gap-2">
            <View className="rounded-2xl bg-primary/5 border border-primary/10 p-3">
              <Text className="text-xs text-primary font-black">01 / 货物贸易</Text>
              <Text className="text-sm text-foreground font-bold block mt-1">跨境电商规模有增长</Text>
              <Text className="text-xs text-muted-foreground leading-relaxed block mt-1">
                {latestEcommerce
                  ? `${latestEcommerce.year}年为${formatValue(latestEcommerce.value, 2)}万亿元；官方同比${latestEcommerce.reportedGrowthPct ?? '未提供'}%。这不是根书商品销量。`
                  : '等待可核验的跨境电商数据。'}
              </Text>
            </View>
            <View className="rounded-2xl bg-teal-50 border border-teal-100 p-3">
              <Text className="text-xs text-teal-700 font-black">02 / 数字服务</Text>
              <Text className="text-sm text-foreground font-bold block mt-1">必须把“可数字化交付”与“数字交付”分开</Text>
              <Text className="text-xs text-muted-foreground leading-relaxed block mt-1">
                {latestDigital
                  ? `${latestDigital.year}年中国可数字化交付服务进出口${formatValue(latestDigital.value, 1)}亿美元。`
                  : '等待可核验的数字服务数据。'}{' '}
                WTO出口序列属于另一口径。
              </Text>
            </View>
            <View className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
              <Text className="text-xs text-amber-700 font-black">03 / 市场选择</Text>
              <Text className="text-sm text-foreground font-bold block mt-1">先验证商品需求，再扩大投放</Text>
              <Text className="text-xs text-muted-foreground leading-relaxed block mt-1">
                WTO报告方出口是数字服务供给背景，不是目的地进口需求。补充品类进口、渠道、竞争、履约与合规证据后再排序。
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between">
            <View>
              <Text className="text-lg text-foreground font-bold block">跨境电商规模趋势</Text>
              <Text className="text-xs text-muted-foreground mt-1">中国 · 货物贸易进出口口径 · 万亿元</Text>
            </View>
            <SourceBadge>官方发布快照</SourceBadge>
          </View>
          <DashboardChart canvasId="trade-ecommerce-trend" option={ecommerceOption} height="240px" />
          <Text className="text-xs text-muted-foreground leading-relaxed">
            2024和2025值来自不同发布批次。同比增长以海关总署原文公布的4.8%为准；不要用两个快照直接相减替代官方同比。
          </Text>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between">
            <View>
              <Text className="text-lg text-foreground font-bold block">电信、计算机和信息服务</Text>
              <Text className="text-xs text-muted-foreground mt-1">中国 · 进出口 · 亿美元 · 仅展示已核验端点</Text>
            </View>
            <SourceBadge>商务部快照</SourceBadge>
          </View>
          <DashboardChart canvasId="trade-ict-service" option={telecomOption} height="240px" />
          <Text className="text-xs text-muted-foreground leading-relaxed">
            端点年均增速按相同指标和单位计算；它与WTO数字化交付服务出口、可数字化交付服务总额均非同一指标。
          </Text>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between">
            <View>
              <Text className="text-lg text-foreground font-bold block">重点经济体数字化交付服务出口</Text>
              <Text className="text-xs text-muted-foreground mt-1">WTO · 报告方对世界 · Mode 1 · 百万美元</Text>
            </View>
            <SourceBadge tone={liveData ? 'official' : 'snapshot'}>
              {liveData ? `实时同步 · ${summary.latestWtoYear || '—'}` : 'WTO 2025 快照'}
            </SourceBadge>
          </View>
          <DashboardChart canvasId="trade-wto-digital-exports" option={wtoOption} height="290px" />
          <Text className="text-xs text-muted-foreground leading-relaxed">
            该指标表示各经济体报告的数字化交付服务出口，不代表其进口需求、消费者规模或文创商品市场。最新年度以WTO文件中的实际最大年份为准。
          </Text>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between">
            <View>
              <Text className="text-lg text-foreground font-bold block">2025年中国服务贸易结构</Text>
              <Text className="text-xs text-muted-foreground mt-1">人民币亿元 · 总额与其组成项（非互斥）</Text>
            </View>
            <SourceBadge>商务部官方发布</SourceBadge>
          </View>
          <DashboardChart canvasId="trade-service-structure" option={serviceOption} height="270px" />
          <View className="grid grid-cols-2 gap-2 mt-2">
            <View className="rounded-xl bg-primary/5 p-3">
              <Text className="text-xl text-primary font-black block">{knowledgeShare}%</Text>
              <Text className="text-xs text-muted-foreground">知识密集型服务 / 服务贸易总额</Text>
            </View>
            <View className="rounded-xl bg-teal-50 p-3">
              <Text className="text-xl text-teal-700 font-black block">{informationShare}%</Text>
              <Text className="text-xs text-muted-foreground">电信计算机信息服务 / 服务贸易总额</Text>
            </View>
          </View>
          <Text className="text-xs text-muted-foreground leading-relaxed mt-2">
            两项是服务贸易总额的组成部分；本页只展示来源原值和占比，不将组成项重复加总。
          </Text>
        </View>

        <View className="bg-card rounded-[28px] p-4 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <Text className="text-lg text-foreground font-bold">AI业务使用情况</Text>
            <Text className="text-xs text-muted-foreground">来自本账号记录</Text>
          </View>
          <View className="grid grid-cols-3 gap-2">
            <View className="bg-muted/60 rounded-xl p-3">
              <Text className="text-xl text-foreground font-black">{recordsLoading ? '…' : usageStats.total}</Text>
              <Text className="text-xs text-muted-foreground">最近200条</Text>
            </View>
            <View className="bg-muted/60 rounded-xl p-3">
              <Text className="text-xl text-emerald-700 font-black">{recordsLoading ? '…' : usageStats.confirmed}</Text>
              <Text className="text-xs text-muted-foreground">已确认</Text>
            </View>
            <View className="bg-muted/60 rounded-xl p-3">
              <Text className="text-xl text-amber-700 font-black">{recordsLoading ? '…' : usageStats.demo}</Text>
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
              <Text className="text-xs text-muted-foreground mt-1">来源可打开；导出文件也包含口径与原始链接</Text>
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
                  <Text className="text-xs text-muted-foreground leading-relaxed mt-1 block">
                    更新方式：{source.refreshMode}
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

        <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-5">
          <Text className="text-xs text-amber-800 leading-relaxed">
            {AI_DISCLAIMER.chart}{' '}
            本页数据图表为指标直观呈现；统计来源、单位、年份和口径随图表及CSV一同展示。宏观贸易指标不能单独证明具体商品需求。
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
