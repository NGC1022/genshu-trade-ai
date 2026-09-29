// AI跨境贸易助手主页：模块入口 + 业务流程 + 辅助功能

import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {getProviderInfo} from '@/services/aiTrade'

const FUNCTIONS = [
  {
    icon: 'i-mdi-earth',
    color: 'bg-primary',
    title: 'AI商品国际化',
    desc: '一键生成英文商品信息',
    url: '/pages/ai-trade-translate/index'
  },
  {
    icon: 'i-mdi-chart-areaspline',
    color: 'bg-secondary',
    title: 'AI海外市场分析',
    desc: '洞察四大目标市场',
    url: '/pages/ai-trade-market/index'
  },
  {
    icon: 'i-mdi-email-search-outline',
    color: 'bg-accent',
    title: 'AI跨境询盘',
    desc: '意向识别 · 英文回复',
    url: '/pages/ai-trade-inquiry/index'
  },
  {
    icon: 'i-mdi-cash-multiple',
    color: 'bg-chart-4',
    title: 'AI报价工作台',
    desc: '程序算价 · 版本管理',
    url: '/pages/ai-trade-quote-workbench/index'
  },
  {
    icon: 'i-mdi-shield-account-check-outline',
    color: 'bg-primary',
    title: 'AI贸易合规助手',
    desc: 'HS编码初步建议',
    url: '/pages/ai-trade-compliance/index'
  },
  {
    icon: 'i-mdi-file-document-edit-outline',
    color: 'bg-secondary',
    title: 'AI贸易单证中心',
    desc: '五类单证草稿生成',
    url: '/pages/ai-trade-documents/index'
  },
  {
    icon: 'i-mdi-account-group-outline',
    color: 'bg-accent',
    title: '海外客户CRM',
    desc: '询盘沉淀 · 客户档案',
    url: '/pages/ai-trade-customers/index'
  },
  {
    icon: 'i-mdi-bullhorn-outline',
    color: 'bg-chart-4',
    title: 'AI海外营销素材',
    desc: '海外社媒内容生成',
    url: '/pages/ai-trade-marketing/index'
  },
  {
    icon: 'i-mdi-robot-outline',
    color: 'bg-muted',
    title: 'AI跨境客服',
    desc: '中英双语实时互译',
    url: '/pages/ai-trade-support/index'
  },
  {
    icon: 'i-mdi-alert-circle-check-outline',
    color: 'bg-primary',
    title: '订单异常中心',
    desc: '异常识别 · AI建议',
    url: '/pages/order-exceptions/index'
  }
]

const FLOW_STEPS = [
  '现有非遗商品',
  'AI商品国际化',
  'AI市场分析',
  '海外客户询盘',
  'AI识别需求',
  'AI生成英文回复',
  'AI辅助报价',
  '人工确认',
  '贸易合规检查',
  '贸易单证生成',
  '客户沉淀CRM',
  '物流清关售后'
]

export default function AiTradeIndex() {
  const provider = getProviderInfo()

  const navigate = (url: string) => Taro.navigateTo({url})

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 头部说明 */}
      <View className="bg-card rounded-[32px] p-6 shadow-card border border-border border-opacity-10 relative overflow-hidden mb-6">
        <View className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
        <View className="relative z-10">
          <View className="bg-primary/10 self-start px-3 py-1 rounded mb-3 inline-block">
            <Text className="text-xs text-primary font-black uppercase tracking-widest">AI Trade Assistant</Text>
          </View>
          <Text className="text-2xl font-black text-foreground block mb-2 tracking-tight">AI跨境贸易助手</Text>
          <Text className="text-base text-muted-foreground leading-relaxed">
            面向根书非遗文创的跨境贸易全流程AI辅助，覆盖商品国际化、市场分析、询盘沟通与智能报价。
          </Text>
          {provider.isMock && (
            <View className="flex flex-row items-start bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-4">
              <View className="i-mdi-flask text-amber-500 text-lg mr-2" />
              <Text className="text-sm text-amber-700 font-medium leading-relaxed flex-1">
                当前为演示模式：AI能力由本地模拟服务提供（{provider.name}），生成结果仅供课堂演示，不代表真实AI输出。
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 业务流程 */}
      <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-6">
        <View className="flex items-center mb-4">
          <View className="w-1 h-5 bg-secondary rounded-full mr-2" />
          <Text className="text-xl font-bold text-foreground tracking-wide">核心业务流程</Text>
        </View>
        <View className="flex flex-row flex-wrap gap-2">
          {FLOW_STEPS.map((step, i) => (
            <View key={i} className="flex flex-row items-center">
              <View className="bg-muted rounded-full px-3 py-1.5">
                <Text className="text-sm text-foreground font-medium">{step}</Text>
              </View>
              {i < FLOW_STEPS.length - 1 && (
                <View className="i-mdi-chevron-right text-muted-foreground text-base mx-0.5" />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* 四大功能入口 */}
      <View className="grid grid-cols-2 gap-4 mb-6">
        {FUNCTIONS.map((fn, i) => (
          <View
            key={i}
            className="bg-card rounded-3xl p-4 shadow-card border border-border border-opacity-10 active:scale-[0.98] transition-all"
            onClick={() => navigate(fn.url)}>
            <View className={`${fn.color} w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm mb-3`}>
              <View className={`${fn.icon} text-xl text-white`} />
            </View>
            <Text className="text-base text-foreground font-bold tracking-tight block mb-1">{fn.title}</Text>
            <Text className="text-sm text-muted-foreground">{fn.desc}</Text>
          </View>
        ))}
      </View>

      {/* AI风险提示中心（需求十八） */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-amber-200/60 mb-6">
        <View className="flex items-center mb-3">
          <View className="w-1 h-5 bg-amber-400 rounded-full mr-2" />
          <Text className="text-xl font-bold text-foreground tracking-wide">AI风险提示</Text>
        </View>
        <View className="flex flex-col gap-2">
          {[
            'AI不能直接保证实时关税、物流价格与海关归类结果',
            'AI不能保证目的国最新法规与实际库存、最终成交价格',
            '当前未接入实时外部数据库，市场与税费数据均为AI辅助分析',
            '涉及价格、库存、物流、税费、贸易规则的内容须以实际业务资料和权威来源为准'
          ].map((r, i) => (
            <View key={i} className="flex flex-row items-start">
              <View className="i-mdi-alert-outline text-amber-500 text-base mr-2 mt-0.5" />
              <Text className="text-sm text-muted-foreground leading-relaxed flex-1">{r}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 辅助入口 */}
      <View className="mb-6">
        <View className="flex items-center mb-4">
          <View className="w-1 h-5 bg-secondary rounded-full mr-2" />
          <Text className="text-xl font-bold text-foreground tracking-wide">业务管理</Text>
        </View>
        <View className="flex flex-col gap-4">
          <View
            className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 flex flex-row items-center active:scale-[0.98] transition-all"
            onClick={() => navigate('/pages/ai-trade-records/index')}>
            <View className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center mr-4">
              <View className="i-mdi-file-document-multiple-outline text-xl text-foreground" />
            </View>
            <View className="flex-1">
              <Text className="text-base text-foreground font-bold tracking-tight block mb-0.5">AI业务记录</Text>
              <Text className="text-sm text-muted-foreground">查看国际化、分析、询盘、报价全部记录</Text>
            </View>
            <View className="i-mdi-chevron-right text-muted-foreground text-xl" />
          </View>
          <View
            className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 flex flex-row items-center active:scale-[0.98] transition-all"
            onClick={() => navigate('/pages/ai-trade-dashboard/index')}>
            <View className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center mr-4">
              <View className="i-mdi-monitor-dashboard text-xl text-foreground" />
            </View>
            <View className="flex-1">
              <Text className="text-base text-foreground font-bold tracking-tight block mb-0.5">AI业务数据看板</Text>
              <Text className="text-sm text-muted-foreground">统计来自实际AI业务记录的使用数据</Text>
            </View>
            <View className="i-mdi-chevron-right text-muted-foreground text-xl" />
          </View>
          <View
            className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 flex flex-row items-center active:scale-[0.98] transition-all"
            onClick={() => navigate('/pages/merchant-admin/index')}>
            <View className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center mr-4">
              <View className="i-mdi-storefront-outline text-xl text-foreground" />
            </View>
            <View className="flex-1">
              <Text className="text-base text-foreground font-bold tracking-tight block mb-0.5">商家运营后台</Text>
              <Text className="text-sm text-muted-foreground">商品/SKU/订单/客户/售后一站式管理（需商家权限）</Text>
            </View>
            <View className="i-mdi-chevron-right text-muted-foreground text-xl" />
          </View>
        </View>
      </View>

      {/* 合规声明 */}
      <View className="bg-muted/60 rounded-3xl p-5 mb-8">
        <View className="flex flex-row items-center mb-2">
          <View className="i-mdi-shield-check-outline text-muted-foreground text-lg mr-2" />
          <Text className="text-sm text-muted-foreground font-bold">真实性与安全声明</Text>
        </View>
        <Text className="text-xs text-muted-foreground leading-relaxed">
          所有AI生成内容均基于商品真实信息，不虚构认证、销量、排名、物流、评价等事实；市场数据不构成官方统计；所有内容须经人工确认后方可作为正式业务信息使用。
        </Text>
      </View>
    </View>
  )
}
