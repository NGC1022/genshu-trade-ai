// AI业务数据看板：统计来自实际AI业务记录（可加载课堂演示数据，明确标记）

import {Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {Component, createRef, useCallback, useMemo, useState} from 'react'
import {EChart} from '@/components/echarts'
import {useAuth} from '@/contexts/AuthContext'
import {createAiTradeRecord, getAiTradeRecords, resetDemoData} from '@/db/api'
import type {AiTradeRecord, AiTradeRecordType} from '@/db/types'
import {
  AI_DISCLAIMER,
  DEMO_BADGE_TEXT,
  DEMO_INQUIRY,
  DEMO_MARKET,
  DEMO_PRODUCT,
  DEMO_QUOTE_INPUT
} from '@/services/aiTrade'

const TYPE_LABEL: Record<AiTradeRecordType, string> = {
  product_translate: '商品国际化',
  market_analysis: '市场分析',
  inquiry: '询盘处理',
  quote: '报价生成',
  trade_compliance: '贸易合规',
  trade_document: '贸易单证',
  marketing_content: '营销素材',
  customer_intent: '意向识别',
  export_plan: '出海方案',
  support_chat: 'AI客服'
}

// 图表组件（class 形式，ref 调用 refresh）
class DashboardChart extends Component<{canvasId: string; option: any; height?: string}> {
  chartRef: any = createRef()

  componentDidUpdate(prev: {option: any}) {
    if (prev.option !== (this.props as any).option && (this.props as any).option) {
      setTimeout(() => this.chartRef.current?.refresh((this.props as any).option), 300)
    }
  }

  componentDidMount() {
    if ((this.props as any).option) {
      setTimeout(() => this.chartRef.current?.refresh((this.props as any).option), 300)
    }
  }

  render() {
    const {canvasId, height} = this.props as any
    return (
      <View style={{width: '100%', height: height || '400px'}}>
        <EChart ref={this.chartRef} canvasId={canvasId} />
      </View>
    )
  }
}

export default function AiTradeDashboard() {
  const {user} = useAuth()
  const [records, setRecords] = useState<AiTradeRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadRecords = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const {data} = await getAiTradeRecords(user.id)
    setRecords(data)
    setLoading(false)
  }, [user])

  useDidShow(() => loadRecords())

  // 统计（全部来自实际业务记录，覆盖全部10类业务类型）
  const stats = useMemo(() => {
    const byType: Record<string, number> = {
      product_translate: 0,
      market_analysis: 0,
      inquiry: 0,
      quote: 0,
      trade_compliance: 0,
      trade_document: 0,
      marketing_content: 0,
      customer_intent: 0,
      export_plan: 0,
      support_chat: 0
    }
    const byMarket: Record<string, number> = {}
    const byProduct: Record<string, number> = {}
    const byStatus: Record<string, number> = {draft: 0, confirmed: 0}
    // 近14天按日×业务类型趋势
    const dayKeys: string[] = []
    const byDay: Record<string, Record<string, number>> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = `${d.getMonth() + 1}/${d.getDate()}`
      dayKeys.push(key)
      byDay[key] = {}
      for (const k of Object.keys(byType)) byDay[key][k] = 0
    }
    for (const r of records) {
      if (byType[r.type] !== undefined) byType[r.type]++
      if (r.market && r.market !== '待确认') byMarket[r.market] = (byMarket[r.market] || 0) + 1
      if (r.product_name) byProduct[r.product_name] = (byProduct[r.product_name] || 0) + 1
      if (byStatus[r.status] !== undefined) byStatus[r.status]++
      const d = new Date(r.created_at)
      const key = `${d.getMonth() + 1}/${d.getDate()}`
      if (byDay[key] && byDay[key][r.type] !== undefined) byDay[key][r.type]++
    }
    const topProducts = Object.entries(byProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    return {byType, byMarket, byProduct, byStatus, dayKeys, byDay, topProducts, total: records.length}
  }, [records])

  // 演示记录占比标记
  const hasDemo = records.some((r) => r.is_demo)

  const handleLoadDemo = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录后加载', icon: 'none'})
      return
    }
    Taro.showModal({
      title: '加载课堂演示数据',
      content:
        '将写入10条演示记录（商品国际化/市场分析/询盘/报价/合规/单证/营销/意向识别/出海方案/AI客服各1条），全部标记为"课堂演示数据"。是否继续？',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({title: '写入演示数据...'})
        const demoRecords = [
          {
            type: 'product_translate' as const,
            product_id: DEMO_PRODUCT.productId,
            product_name: DEMO_PRODUCT.name,
            market: 'English',
            input_data: {...DEMO_PRODUCT},
            ai_result: {title: 'Root Calligraphy Wooden Bookmarks (natural wood)', note: '演示数据'},
            is_demo: true
          },
          {
            type: 'market_analysis' as const,
            product_id: DEMO_PRODUCT.productId,
            product_name: DEMO_PRODUCT.name,
            market: DEMO_MARKET,
            input_data: {name: DEMO_PRODUCT.name, markets: [DEMO_MARKET]},
            ai_result: {summary: '美国市场AI辅助分析（演示数据）'},
            is_demo: true
          },
          {
            type: 'inquiry' as const,
            product_name: '木质书签',
            market: DEMO_MARKET,
            input_data: {inquiry_text: DEMO_INQUIRY},
            ai_result: {note: '询盘识别+英文回复（演示数据）'},
            is_demo: true
          },
          {
            type: 'quote' as const,
            product_id: null,
            product_name: DEMO_QUOTE_INPUT.productName,
            market: DEMO_QUOTE_INPUT.destination,
            input_data: {...DEMO_QUOTE_INPUT},
            ai_result: {calculation: {productAmount: 3990, totalCost: 4190}, note: '演示数据'},
            is_demo: true
          },
          {
            type: 'trade_compliance' as const,
            product_name: DEMO_PRODUCT.name,
            market: DEMO_MARKET,
            input_data: {material: '木质', purpose: '文化活动采购', tradeType: 'B2B出口'},
            ai_result: {note: '合规检查演示：HS编码初步建议（演示数据）'},
            is_demo: true
          },
          {
            type: 'trade_document' as const,
            product_name: DEMO_PRODUCT.name,
            market: DEMO_MARKET,
            input_data: {docType: 'proforma_invoice'},
            ai_result: {note: '形式发票草稿（演示数据）'},
            is_demo: true
          },
          {
            type: 'marketing_content' as const,
            product_name: DEMO_PRODUCT.name,
            market: DEMO_MARKET,
            input_data: {channels: ['instagram', 'facebook', 'tiktok']},
            ai_result: {note: '海外营销素材（演示数据）'},
            is_demo: true
          },
          {
            type: 'customer_intent' as const,
            product_name: '木质书签',
            market: DEMO_MARKET,
            input_data: {inquiry_text: DEMO_INQUIRY},
            ai_result: {intent_type: '批量采购+价格协商', quantity: '100件', note: '演示数据'},
            is_demo: true
          },
          {
            type: 'export_plan' as const,
            product_name: DEMO_PRODUCT.name,
            market: DEMO_MARKET,
            input_data: {name: DEMO_PRODUCT.name},
            ai_result: {note: '一键出海方案（演示数据）'},
            is_demo: true
          },
          {
            type: 'support_chat' as const,
            product_name: DEMO_PRODUCT.name,
            market: DEMO_MARKET,
            input_data: {question: 'Do you ship to the US?'},
            ai_result: {note: 'AI客服双语回复（演示数据）'},
            is_demo: true
          }
        ]
        for (const d of demoRecords) {
          await createAiTradeRecord({user_id: user.id, status: 'draft', ...d})
        }
        Taro.hideLoading()
        Taro.showToast({title: '演示数据已写入'})
        loadRecords()
      }
    })
  }

  // 重置演示数据：仅清除演示记录，不删除真实业务数据（需求二十五）
  const handleResetDemo = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录后操作', icon: 'none'})
      return
    }
    Taro.showModal({
      title: '重置演示数据',
      content:
        '仅清除标记为"课堂演示数据"的记录（AI业务记录/客户/报价/单证/售后/异常），不影响真实业务数据。确认重置？',
      confirmText: '确认重置',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({title: '重置中...'})
        const {errors} = await resetDemoData(user.id)
        Taro.hideLoading()
        if (errors.length > 0) {
          Taro.showToast({title: '重置失败，请重试', icon: 'none'})
          return
        }
        Taro.showToast({title: '演示数据已重置'})
        loadRecords()
      }
    })
  }

  // 柱状图 option：四大功能次数
  const barOption = useMemo(() => {
    return {
      grid: {left: 50, right: 20, top: 30, bottom: 40},
      xAxis: {type: 'category', data: Object.values(TYPE_LABEL), axisLabel: {fontSize: 10}},
      yAxis: {type: 'value', minInterval: 1},
      series: [
        {
          type: 'bar',
          data: Object.values(stats.byType),
          barWidth: '50%',
          itemStyle: {color: 'rgb(180, 83, 9)', borderRadius: [6, 6, 0, 0]}
        }
      ],
      tooltip: {trigger: 'axis'}
    }
  }, [stats])

  // 饼图 option：目标市场分布
  const pieOption = useMemo(() => {
    const marketData = Object.entries(stats.byMarket).map(([name, value]) => ({name, value}))
    return {
      tooltip: {trigger: 'item', formatter: '{b}: {c}条 ({d}%)'},
      legend: {orient: 'vertical', right: 10, top: 'center', textStyle: {fontSize: 11}},
      series: [
        {
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['35%', '50%'],
          data: marketData,
          label: {show: false}
        }
      ]
    }
  }, [stats])

  // 折线图 option：近14天业务趋势（按业务类型分线，统计来自实际业务记录）
  const lineOption = useMemo(() => {
    const typeKeys = Object.keys(TYPE_LABEL) as AiTradeRecordType[]
    const colors = ['rgb(180, 83, 9)', 'rgb(217, 119, 6)', 'rgb(13, 148, 136)', 'rgb(100, 116, 139)']
    return {
      grid: {left: 40, right: 20, top: 40, bottom: 30},
      legend: {top: 0, textStyle: {fontSize: 10}, itemWidth: 14, itemHeight: 8},
      xAxis: {type: 'category', data: stats.dayKeys, axisLabel: {fontSize: 9}},
      yAxis: {type: 'value', minInterval: 1},
      series: typeKeys.map((t, i) => ({
        name: TYPE_LABEL[t],
        type: 'line',
        data: stats.dayKeys.map((k) => stats.byDay[k]?.[t] || 0),
        smooth: true,
        symbolSize: 5,
        itemStyle: {color: colors[i % colors.length]},
        lineStyle: {width: 2}
      })),
      tooltip: {trigger: 'axis'}
    }
  }, [stats])

  // 饼图 option：业务状态分布（人工审核流程）
  const statusPieOption = useMemo(() => {
    const data = [
      {name: '待人工审核', value: stats.byStatus.draft, itemStyle: {color: 'rgb(217, 119, 6)'}},
      {name: '已确认', value: stats.byStatus.confirmed, itemStyle: {color: 'rgb(22, 163, 74)'}}
    ].filter((d) => d.value > 0)
    return {
      tooltip: {trigger: 'item', formatter: '{b}: {c}条 ({d}%)'},
      legend: {orient: 'vertical', right: 10, top: 'center', textStyle: {fontSize: 11}},
      series: [
        {
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['35%', '50%'],
          data,
          label: {show: false}
        }
      ]
    }
  }, [stats])

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 概览 */}
      <View className="bg-card rounded-[32px] p-6 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-foreground">业务概览</Text>
          <View className="flex flex-row gap-2">
            <View
              className="bg-amber-50 border border-amber-200 rounded-full px-3 py-1 active:scale-95 transition-all"
              onClick={handleLoadDemo}>
              <Text className="text-sm text-amber-700 font-bold">加载演示数据</Text>
            </View>
            {hasDemo && (
              <View
                className="bg-red-50 border border-red-200 rounded-full px-3 py-1 active:scale-95 transition-all"
                onClick={handleResetDemo}>
                <Text className="text-sm text-red-600 font-bold">重置演示数据</Text>
              </View>
            )}
          </View>
        </View>
        <View className="grid grid-cols-2 gap-3">
          <View className="bg-muted/60 rounded-2xl p-4">
            <Text className="text-2xl text-foreground font-black block">{stats.total}</Text>
            <Text className="text-sm text-muted-foreground">业务记录总数</Text>
          </View>
          <View className="bg-muted/60 rounded-2xl p-4">
            <Text className="text-2xl text-foreground font-black block">{Object.keys(stats.byMarket).length}</Text>
            <Text className="text-sm text-muted-foreground">覆盖目标市场数</Text>
          </View>
          <View className="bg-muted/60 rounded-2xl p-4">
            <Text className="text-2xl text-primary font-black block">{stats.byStatus.draft}</Text>
            <Text className="text-sm text-muted-foreground">待人工审核</Text>
          </View>
          <View className="bg-muted/60 rounded-2xl p-4">
            <Text className="text-2xl text-emerald-600 font-black block">{stats.byStatus.confirmed}</Text>
            <Text className="text-sm text-muted-foreground">已人工确认</Text>
          </View>
        </View>
        {/* 10类业务次数统计（需求十九） */}
        <View className="flex flex-row flex-wrap gap-2 mt-3">
          {(Object.keys(TYPE_LABEL) as AiTradeRecordType[]).map((t) => (
            <View key={t} className="bg-muted rounded-full px-3 py-1.5 flex flex-row items-center">
              <Text className="text-xs text-muted-foreground mr-1.5">{TYPE_LABEL[t]}</Text>
              <Text className="text-sm text-foreground font-black">{stats.byType[t] || 0}</Text>
            </View>
          ))}
        </View>
        {hasDemo ? (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mt-3">
            <Text className="text-xs text-amber-700 leading-relaxed">
              当前统计包含{DEMO_BADGE_TEXT}（记录列表中带"演示"标记的条目），仅用于课堂展示，不代表真实业务数据。
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View className="bg-card rounded-3xl p-8 shadow-card border border-border border-opacity-10 flex items-center justify-center">
          <Text className="text-base text-muted-foreground">统计中...</Text>
        </View>
      ) : stats.total === 0 ? (
        <View className="bg-card rounded-3xl p-8 shadow-card border border-border border-opacity-10 flex flex-col items-center">
          <View className="i-mdi-chart-bar text-5xl text-muted-foreground/40 mb-3" />
          <Text className="text-base text-muted-foreground mb-4">暂无业务记录，请先体验AI跨境贸易助手</Text>
          <View
            className="rounded-full bg-primary px-6 py-2.5 active:scale-95 transition-all"
            onClick={() => Taro.navigateTo({url: '/pages/ai-trade/index'})}>
            <Text className="text-base text-primary-foreground font-bold">前往体验</Text>
          </View>
        </View>
      ) : (
        <>
          {/* 功能使用次数柱状图 */}
          <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
            <Text className="text-lg font-bold text-foreground mb-1">AI功能使用次数</Text>
            <Text className="text-xs text-muted-foreground mb-3">{AI_DISCLAIMER.chart}</Text>
            <DashboardChart canvasId="ai-trade-bar" option={barOption} height="360px" />
          </View>

          {/* 目标市场分布饼图 */}
          <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
            <Text className="text-lg font-bold text-foreground mb-1">目标市场分布</Text>
            <Text className="text-xs text-muted-foreground mb-3">{AI_DISCLAIMER.chart}</Text>
            <DashboardChart canvasId="ai-trade-pie" option={pieOption} height="360px" />
          </View>

          {/* 近14天业务趋势折线图（多维度） */}
          <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
            <Text className="text-lg font-bold text-foreground mb-1">近14天业务趋势</Text>
            <Text className="text-xs text-muted-foreground mb-3">统计来自实际AI业务记录，按业务类型分线展示</Text>
            <DashboardChart canvasId="ai-trade-line" option={lineOption} height="360px" />
          </View>

          {/* 业务状态分布（人工审核流程） */}
          <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
            <Text className="text-lg font-bold text-foreground mb-1">业务状态分布</Text>
            <Text className="text-xs text-muted-foreground mb-3">记录审核流转：待人工审核 / 已确认</Text>
            <DashboardChart canvasId="ai-trade-status-pie" option={statusPieOption} height="360px" />
          </View>

          {/* 商品处理次数 */}
          <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-8">
            <Text className="text-lg font-bold text-foreground mb-4">商品处理次数</Text>
            {stats.topProducts.map(([name, count], i) => (
              <View
                key={i}
                className="flex flex-row items-center justify-between py-2.5 border-b border-border border-opacity-10">
                <Text className="text-base text-foreground flex-1 truncate">{name}</Text>
                <Text className="text-base text-primary font-bold ml-2">{count}次</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  )
}
