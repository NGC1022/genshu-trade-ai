import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {getProviderInfo} from '@/services/aiTrade'

const WORKFLOWS = [
  {id: 'market', icon: 'i-mdi-chart-areaspline', title: '数字贸易分析', desc: '数据来源、趋势图和目标市场判断', color: 'bg-primary', url: '/pages/ai-trade-dashboard/index'},
  {id: 'market-workbench', icon: 'i-mdi-earth-box', title: '海外市场分析', desc: '商品 × 市场 × AI机会评分', color: 'bg-teal-700', url: '/pages/ai-trade-market/index'},
  {id: 'inquiry', icon: 'i-mdi-email-search-outline', title: '跨境询盘工作台', desc: '识别需求并生成英文回复', color: 'bg-amber-700', url: '/pages/ai-trade-inquiry/index'},
  {id: 'compliance', icon: 'i-mdi-shield-check-outline', title: '贸易合规检查', desc: '初步识别资料缺口与风险', color: 'bg-slate-700', url: '/pages/ai-trade-compliance/index'}
]

const OPERATIONS = [
  {id: 'translate', title: '商品国际化', desc: '英文标题、卖点和文化说明', url: '/pages/ai-trade-translate/index'},
  {id: 'quote', title: '智能报价', desc: '程序算价，AI生成说明', url: '/pages/ai-trade-quote-workbench/index'},
  {id: 'document', title: '贸易单证', desc: '生成待人工审核的单证草稿', url: '/pages/ai-trade-documents/index'},
  {id: 'marketing', title: '海外营销素材', desc: 'Instagram、Facebook、TikTok内容', url: '/pages/ai-trade-marketing/index'}
]

const SHOWCASE_STEPS = ['选择商品', '读取数据', 'AI解释', '人工确认', '导出报告']

export default function AiTradeIndex() {
  const provider = getProviderInfo()
  const navigate = (url: string) => Taro.navigateTo({url})

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      <View className="bg-card rounded-[32px] p-6 shadow-card border border-border border-opacity-10 relative overflow-hidden mb-4">
        <View className="absolute -top-14 -right-14 w-44 h-44 bg-primary/10 rounded-full" />
        <View className="relative z-10">
          <View className="flex flex-row items-center justify-between mb-4"><View className="bg-primary/10 rounded-full px-3 py-1"><Text className="text-xs text-primary font-black tracking-[1px]">AI TRADE ASSISTANT</Text></View><View className="bg-emerald-50 rounded-full px-2.5 py-1"><Text className="text-[10px] text-emerald-700 font-bold">作业一展示版</Text></View></View>
          <Text className="text-3xl text-foreground font-black block leading-tight">让根书文创
            <Text className="text-primary"> 有证据地出海</Text>
          </Text>
          <Text className="text-sm text-muted-foreground leading-relaxed block mt-3">从公开贸易数据到商品决策，把跨境业务中的资料整理、市场判断和沟通动作串成一条可复现的 AI 工作流。</Text>
          <View className="flex flex-row gap-2 mt-5"><View className="flex-1 rounded-xl bg-primary flex items-center justify-center py-3" onClick={() => navigate('/pages/ai-trade-market/index')}><Text className="text-sm text-primary-foreground font-bold">开始市场分析</Text></View><View className="flex-1 rounded-xl bg-muted flex items-center justify-center py-3" onClick={() => navigate('/pages/ai-trade-dashboard/index')}><Text className="text-sm text-foreground font-bold">查看数据看板</Text></View></View>
          {provider.isMock && <View className="flex flex-row items-start bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5 mt-4"><View className="i-mdi-flask-outline text-amber-600 text-base mr-2 mt-0.5" /><Text className="text-xs text-amber-800 leading-relaxed flex-1">当前 AI 生成服务为演示 Provider；统计数据使用已审核快照，所有结论需人工复核。</Text></View>}
        </View>
      </View>

      <View className="bg-card rounded-[28px] p-5 border border-border border-opacity-10 mb-4"><View className="flex flex-row items-center justify-between mb-3"><View><Text className="text-lg text-foreground font-bold block">课堂展示主线</Text><Text className="text-xs text-muted-foreground mt-1">10—15分钟可完整跑通</Text></View><View className="i-mdi-presentation-play text-primary text-2xl" /></View><View className="flex flex-row items-center justify-between">{SHOWCASE_STEPS.map((step, index) => <View key={step} className="flex items-center"><View className={`w-8 h-8 rounded-full flex items-center justify-center ${index === 0 ? 'bg-primary' : 'bg-primary/10'}`}><Text className={`text-xs font-black ${index === 0 ? 'text-white' : 'text-primary'}`}>{index + 1}</Text></View><Text className="text-[10px] text-muted-foreground mt-1 text-center">{step}</Text></View>)}</View></View>

      <View className="mb-4"><View className="flex flex-row items-end justify-between mb-3"><View><Text className="text-xl text-foreground font-black">核心工作台</Text><Text className="text-xs text-muted-foreground mt-1">优先展示能形成业务判断的功能</Text></View><Text className="text-xs text-primary font-bold">4 个模块</Text></View><View className="grid grid-cols-2 gap-3">{WORKFLOWS.map((item) => <View key={item.id} className="bg-card rounded-2xl p-4 border border-border border-opacity-10" onClick={() => navigate(item.url)}><View className={`${item.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}><View className={`${item.icon} text-xl text-white`} /></View><Text className="text-sm text-foreground font-bold block">{item.title}</Text><Text className="text-xs text-muted-foreground leading-relaxed mt-1">{item.desc}</Text><View className="flex flex-row items-center mt-3"><Text className="text-xs text-primary font-bold">进入工作台</Text><View className="i-mdi-arrow-right text-primary text-sm ml-1" /></View></View>)}</View></View>

      <View className="bg-card rounded-[28px] p-5 border border-border border-opacity-10 mb-4"><View className="flex flex-row items-center justify-between mb-3"><Text className="text-lg text-foreground font-bold">业务自动化</Text><Text className="text-xs text-muted-foreground">AI辅助 · 人工确认</Text></View><View className="flex flex-col gap-2">{OPERATIONS.map((item) => <View key={item.id} className="flex flex-row items-center rounded-2xl bg-muted/50 p-3" onClick={() => navigate(item.url)}><View className="w-9 h-9 rounded-xl bg-white flex items-center justify-center mr-3"><View className="i-mdi-arrow-top-right text-primary text-lg" /></View><View className="flex-1"><Text className="text-sm text-foreground font-bold block">{item.title}</Text><Text className="text-xs text-muted-foreground mt-0.5">{item.desc}</Text></View><View className="i-mdi-chevron-right text-muted-foreground text-lg" /></View>)}</View></View>

      <View className="bg-slate-900 rounded-[28px] p-5 mb-6"><View className="flex flex-row items-center mb-3"><View className="i-mdi-shield-check-outline text-emerald-300 text-lg mr-2" /><Text className="text-sm text-white font-bold">数据与 AI 使用边界</Text></View><Text className="text-xs text-slate-300 leading-relaxed">官方统计用于说明宏观趋势；AI 负责整理和解释；机会评分属于辅助判断；价格、库存、物流、关税、HS编码和法规必须由业务人员根据最新资料确认。</Text></View>
    </View>
  )
}
