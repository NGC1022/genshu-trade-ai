import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useLanguage} from '@/hooks/useLanguage'
import {getProviderInfo} from '@/services/aiTrade'

const WORKFLOWS = [
  {
    id: 'market',
    icon: 'i-mdi-chart-areaspline',
    title: '数字贸易分析',
    title_en: 'Trade Data Analysis',
    desc: '数据来源、趋势图和目标市场判断',
    desc_en: 'Sources, trend charts, and target-market insights',
    color: 'bg-primary',
    url: '/pages/ai-trade-dashboard/index'
  },
  {
    id: 'market-workbench',
    icon: 'i-mdi-earth-box',
    title: '海外市场分析',
    title_en: 'Overseas Market Analysis',
    desc: '商品 × 市场 × AI机会评分',
    desc_en: 'Product × market × AI opportunity scoring',
    color: 'bg-teal-700',
    url: '/pages/ai-trade-market/index'
  },
  {
    id: 'inquiry',
    icon: 'i-mdi-email-search-outline',
    title: '跨境询盘工作台',
    title_en: 'Cross-Border Inquiry Desk',
    desc: '识别需求并生成英文回复',
    desc_en: 'Identify buyer needs and draft English replies',
    color: 'bg-amber-700',
    url: '/pages/ai-trade-inquiry/index'
  },
  {
    id: 'compliance',
    icon: 'i-mdi-shield-check-outline',
    title: '贸易合规检查',
    title_en: 'Trade Compliance Check',
    desc: '初步识别资料缺口与风险',
    desc_en: 'Identify missing information and potential risks',
    color: 'bg-slate-700',
    url: '/pages/ai-trade-compliance/index'
  }
]

const OPERATIONS = [
  {
    id: 'translate',
    title: '商品国际化',
    title_en: 'Product Localization',
    desc: '英文标题、卖点和文化说明',
    desc_en: 'English titles, selling points, and cultural context',
    url: '/pages/ai-trade-translate/index'
  },
  {
    id: 'quote',
    title: '智能报价',
    title_en: 'Smart Quoting',
    desc: '程序算价，AI生成说明',
    desc_en: 'Prices calculated by rules; AI drafts the explanation',
    url: '/pages/ai-trade-quote-workbench/index'
  },
  {
    id: 'document',
    title: '贸易单证',
    title_en: 'Trade Documents',
    desc: '生成待人工审核的单证草稿',
    desc_en: 'Create document drafts for human review',
    url: '/pages/ai-trade-documents/index'
  },
  {
    id: 'marketing',
    title: '海外营销素材',
    title_en: 'Overseas Marketing Content',
    desc: 'Instagram、Facebook、TikTok内容',
    desc_en: 'Content for Instagram, Facebook, and TikTok',
    url: '/pages/ai-trade-marketing/index'
  }
]

const SHOWCASE_STEPS: {
  time: string
  time_en: string
  title: string
  title_en: string
  desc: string
  desc_en: string
  url?: string
  cta?: string
  cta_en?: string
}[] = [
  {
    time: '1分钟',
    time_en: '1 min',
    title: '说明问题与用户',
    title_en: 'Problem and Users',
    desc: '面向非遗文创商家：解决贸易数据口径分散、商品海外表达困难、询盘报价与合规审核脱节。',
    desc_en:
      'For cultural-heritage merchants: address fragmented trade data, difficult product localization, and disconnected inquiry, quoting, and compliance workflows.'
  },
  {
    time: '5分钟',
    time_en: '5 min',
    title: '数据证据与来源',
    title_en: 'Data Evidence and Sources',
    desc: '在看板区分跨境电商货物、服务贸易、数字化交付服务，并展开来源、年份与统计口径。',
    desc_en:
      'Distinguish cross-border e-commerce goods, services trade, and digitally delivered services; review sources, years, and definitions.',
    url: '/pages/ai-trade-dashboard/index',
    cta: '打开数字贸易看板',
    cta_en: 'Open Trade Data Dashboard'
  },
  {
    time: '5分钟',
    time_en: '5 min',
    title: '美国与日本市场比较',
    title_en: 'Compare the U.S. and Japan',
    desc: '先加载根书书签课堂案例，再看消费者画像、评分与待核验风险。个人判断：先用50—100件验证点击、询盘、报价接受与复购；美国机会大但合规履约压力高，日本适合先测文化内容。',
    desc_en:
      'Load the Root Calligraphy bookmark demo, then review buyer profiles, scores, and risks to verify. Suggested pilot: 50–100 units to test clicks, inquiries, quote acceptance, and repeat purchases. The U.S. has greater potential but higher compliance and fulfillment demands; Japan is suitable for testing cultural storytelling.',
    url: '/pages/ai-trade-market/index',
    cta: '打开海外市场分析',
    cta_en: 'Open Market Analysis'
  },
  {
    time: '2分钟',
    time_en: '2 min',
    title: '演示询盘到报价',
    title_en: 'From Inquiry to Quote',
    desc: '使用100件美国文化活动询盘，展示AI识别后进入报价工作台；金额由程序计算，AI只整理商务说明。',
    desc_en:
      'Use a U.S. cultural-event inquiry for 100 units to demonstrate AI extraction and the quoting workflow. The system calculates amounts; AI only drafts the business explanation.',
    url: '/pages/ai-trade-inquiry/index',
    cta: '打开询盘工作台',
    cta_en: 'Open Inquiry Desk'
  },
  {
    time: '1分钟',
    time_en: '1 min',
    title: '说明人工复核边界',
    title_en: 'Human Review Boundaries',
    desc: '价格、库存、物流、关税、认证与最终发布须由业务人员确认；AI结果默认是草稿或辅助判断。',
    desc_en:
      'Business staff must verify pricing, inventory, logistics, duties, certifications, and final publication. AI output is a draft or decision aid.'
  }
]

export default function AiTradeIndex() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const provider = getProviderInfo()
  const navigate = (url: string) => Taro.navigateTo({url})

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      <View className="bg-card rounded-[32px] p-6 shadow-card border border-border border-opacity-10 relative overflow-hidden mb-4">
        <View className="absolute -top-14 -right-14 w-44 h-44 bg-primary/10 rounded-full" />
        <View className="relative z-10">
          <View className="flex flex-row items-center justify-between mb-4">
            <View className="bg-primary/10 rounded-full px-3 py-1">
              <Text className="text-xs text-primary font-black tracking-[1px]">AI TRADE ASSISTANT</Text>
            </View>
            <View className="bg-emerald-50 rounded-full px-2.5 py-1">
              <Text className="text-[10px] text-emerald-700 font-bold">{ui('作业一展示版', 'Class Demo')}</Text>
            </View>
          </View>
          <Text className="text-3xl text-foreground font-black block leading-tight">
            {ui('让根书文创', 'Bring Root Culture')}
            <Text className="text-primary">{ui(' 有证据地出海', ' to Global Markets—with Evidence')}</Text>
          </Text>
          <Text className="text-sm text-muted-foreground leading-relaxed block mt-3">
            {ui(
              '从公开贸易数据到商品决策，把跨境业务中的资料整理、市场判断和沟通动作串成一条可复现的 AI 工作流。',
              'Connect public trade data to product decisions in a reproducible AI workflow for research, market assessment, and cross-border communication.'
            )}
          </Text>
          <View className="rounded-2xl bg-muted/60 p-3 mt-3">
            <Text className="text-xs text-primary font-bold block">{ui('服务对象', 'Designed For')}</Text>
            <Text className="text-xs text-foreground leading-relaxed block mt-1">
              {ui(
                '非遗文创商家、跨境业务运营人员与审核人员',
                'Cultural-heritage merchants, cross-border operators, and reviewers'
              )}
            </Text>
            <Text className="text-xs text-muted-foreground leading-relaxed block mt-2">
              {ui(
                '关键痛点：公开数据口径容易混淆，商品资料难适配海外消费者，询盘、报价、合规和营销之间容易断裂。',
                'Key challenges: inconsistent public-data definitions, product information that is not localized for overseas buyers, and disconnected inquiry, quoting, compliance, and marketing tasks.'
              )}
            </Text>
          </View>
          <View className="flex flex-row gap-2 mt-5">
            <View
              className="flex-1 rounded-xl bg-primary flex items-center justify-center py-3"
              onClick={() => navigate('/pages/ai-trade-market/index')}>
              <Text className="text-sm text-primary-foreground font-bold">
                {ui('开始市场分析', 'Start Market Analysis')}
              </Text>
            </View>
            <View
              className="flex-1 rounded-xl bg-muted flex items-center justify-center py-3"
              onClick={() => navigate('/pages/ai-trade-dashboard/index')}>
              <Text className="text-sm text-foreground font-bold">{ui('查看数据看板', 'View Data Dashboard')}</Text>
            </View>
          </View>
          {provider.isMock && (
            <View className="flex flex-row items-start bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5 mt-4">
              <View className="i-mdi-flask-outline text-amber-600 text-base mr-2 mt-0.5" />
              <Text className="text-xs text-amber-800 leading-relaxed flex-1">
                {ui(
                  '当前 AI 生成服务为演示 Provider；统计数据使用已审核快照，所有结论需人工复核。',
                  'AI generation is in demo mode. Statistics use reviewed snapshots; all conclusions require human review.'
                )}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className="bg-slate-900 rounded-[28px] p-5 mb-4">
        <View className="flex flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xs text-emerald-300 font-black tracking-[1px]">DECISION LOOP</Text>
            <Text className="text-lg text-white font-black block mt-1">
              {ui('把 AI 建议变成可执行动作', 'Turn AI Suggestions into Actions')}
            </Text>
          </View>
          <View className="i-mdi-route text-emerald-300 text-2xl" />
        </View>
        <View className="grid grid-cols-2 gap-2">
          {[
            [
              '01',
              ui('事实层', 'Evidence'),
              ui('贸易统计、商品资料、政策来源', 'Trade statistics, product data, and policy sources')
            ],
            [
              '02',
              ui('判断层', 'Assessment'),
              ui('市场评分、客户意向、报价建议', 'Market scores, buyer intent, and quote guidance')
            ],
            [
              '03',
              ui('执行层', 'Execution'),
              ui('询盘回复、单证草稿、营销内容', 'Inquiry replies, document drafts, and marketing content')
            ],
            [
              '04',
              ui('审核层', 'Review'),
              ui('人工确认、风险留痕、版本更新', 'Human approval, audit trail, and version updates')
            ]
          ].map(([step, title, desc]) => (
            <View key={step} className="rounded-2xl bg-white/10 p-3">
              <Text className="text-[10px] text-emerald-300 font-black">{step}</Text>
              <Text className="text-sm text-white font-bold block mt-1">{title}</Text>
              <Text className="text-[10px] text-slate-300 leading-relaxed block mt-1">{desc}</Text>
            </View>
          ))}
        </View>
        <Text className="text-[10px] text-emerald-100 leading-relaxed block mt-3">
          {ui(
            '业务闭环：商品资料 → 数据初筛 → 询盘与客户档案 → 程序计算报价 → AI整理说明 → 人工审核 → 跟进验证。',
            'Workflow: product data → data screening → inquiries and customer records → rule-based quotes → AI-drafted explanations → human review → follow-up and validation.'
          )}
        </Text>
        <Text className="text-[10px] text-slate-400 leading-relaxed block mt-3">
          {ui(
            '系统不会把 AI 推测当成事实。价格、库存、HS 编码、税费和目的国法规必须在提交前由业务人员复核。',
            'AI suggestions are not facts. Business staff must verify prices, inventory, HS codes, duties, and destination-country regulations before submission.'
          )}
        </Text>
      </View>

      <View className="bg-card rounded-[28px] p-5 border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-lg text-foreground font-bold block">{ui('课堂展示路线', 'Classroom Demo Flow')}</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {ui('约14分钟 · 可直接点击打开每个演示环节', 'About 14 minutes · Select a step to open its demo')}
            </Text>
          </View>
          <View className="i-mdi-presentation-play text-primary text-2xl" />
        </View>
        <View className="flex flex-col gap-2">
          {SHOWCASE_STEPS.map((step, index) => (
            <View
              key={step.title}
              className={`rounded-2xl border border-border border-opacity-20 p-3 ${step.url ? 'bg-muted/30' : 'bg-background'}`}
              onClick={step.url ? () => navigate(step.url as string) : undefined}>
              <View className="flex flex-row items-start">
                <View className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5">
                  <Text className="text-xs text-primary font-black">{index + 1}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex flex-row items-center justify-between">
                    <Text className="text-sm text-foreground font-bold flex-1">
                      {language === 'en' ? step.title_en : step.title}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground ml-2">
                      {language === 'en' ? step.time_en : step.time}
                    </Text>
                  </View>
                  <Text className="text-xs text-muted-foreground leading-relaxed block mt-1">
                    {language === 'en' ? step.desc_en : step.desc}
                  </Text>
                  {step.cta && (
                    <Text className="text-xs text-primary font-bold block mt-2">
                      {language === 'en' ? step.cta_en : step.cta} →
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="mb-4">
        <View className="flex flex-row items-end justify-between mb-3">
          <View>
            <Text className="text-xl text-foreground font-black">{ui('核心工作台', 'Core Workbenches')}</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {ui('优先展示能形成业务判断的功能', 'Prioritizes tools that support business decisions')}
            </Text>
          </View>
          <Text className="text-xs text-primary font-bold">{ui('4 个模块', '4 Modules')}</Text>
        </View>
        <View className="grid grid-cols-2 gap-3">
          {WORKFLOWS.map((item) => (
            <View
              key={item.id}
              className="bg-card rounded-2xl p-4 border border-border border-opacity-10"
              onClick={() => navigate(item.url)}>
              <View className={`${item.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                <View className={`${item.icon} text-xl text-white`} />
              </View>
              <Text className="text-sm text-foreground font-bold block">
                {language === 'en' ? item.title_en : item.title}
              </Text>
              <Text className="text-xs text-muted-foreground leading-relaxed mt-1">
                {language === 'en' ? item.desc_en : item.desc}
              </Text>
              <View className="flex flex-row items-center mt-3">
                <Text className="text-xs text-primary font-bold">{ui('进入工作台', 'Open Workbench')}</Text>
                <View className="i-mdi-arrow-right text-primary text-sm ml-1" />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="bg-card rounded-[28px] p-5 border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center justify-between mb-3">
          <Text className="text-lg text-foreground font-bold">{ui('业务自动化', 'Business Operations')}</Text>
          <Text className="text-xs text-muted-foreground">
            {ui('AI辅助 · 人工确认', 'AI-assisted · Human-approved')}
          </Text>
        </View>
        <View className="flex flex-col gap-2">
          {OPERATIONS.map((item) => (
            <View
              key={item.id}
              className="flex flex-row items-center rounded-2xl bg-muted/50 p-3"
              onClick={() => navigate(item.url)}>
              <View className="w-9 h-9 rounded-xl bg-white flex items-center justify-center mr-3">
                <View className="i-mdi-arrow-top-right text-primary text-lg" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-foreground font-bold block">
                  {language === 'en' ? item.title_en : item.title}
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  {language === 'en' ? item.desc_en : item.desc}
                </Text>
              </View>
              <View className="i-mdi-chevron-right text-muted-foreground text-lg" />
            </View>
          ))}
        </View>
      </View>

      <View className="bg-slate-900 rounded-[28px] p-5 mb-6">
        <View className="flex flex-row items-center mb-3">
          <View className="i-mdi-shield-check-outline text-emerald-300 text-lg mr-2" />
          <Text className="text-sm text-white font-bold">{ui('数据与 AI 使用边界', 'Data and AI Boundaries')}</Text>
        </View>
        <Text className="text-xs text-slate-300 leading-relaxed">
          {ui(
            '官方统计用于说明宏观趋势；AI负责整理和解释；机会评分属于辅助判断；价格、库存、物流、关税、HS编码和法规必须由业务人员根据最新资料确认。',
            'Official statistics describe macro trends; AI organizes and explains information; opportunity scores are decision aids. Staff must verify pricing, inventory, logistics, duties, HS codes, and regulations against current sources.'
          )}
        </Text>
      </View>
    </View>
  )
}
