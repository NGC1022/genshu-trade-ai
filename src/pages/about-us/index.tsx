import {ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'

export default function AboutUs() {
  const version = 'v2.6.0'
  const updateLogs = [
    {
      date: '2026-09-26',
      version: 'v2.6.0',
      content: [
        'AI跨境客服支持图片识别与中英双语实时翻译',
        '收货地址支持海外地区与各国手机号校验',
        '订单确认页新增海外关税预估与时效倒计时',
        '订单详情页新增国际物流轨迹与清关进度',
        '新增售后服务专区与法规合规说明'
      ]
    },
    {
      date: '2026-04-02',
      version: 'v2.5.0',
      content: [
        '数字IP"根宝"正式亮相',
        '会员体系全新上线',
        '3D打印服务升级(统一70元)',
        '门票价格体系优化',
        '商品评价系统上线'
      ]
    },
    {
      date: '2026-02-03',
      version: 'v2.4.0',
      content: ['消息通知文案优化', '@提及功能范围扩展', '隐私管理选项更新', '帮助中心内容同步']
    },
    {
      date: '2026-01-20',
      version: 'v2.3.5',
      content: ['新增广场搜索功能', '追踪列表实时同步', '评论区身份标识']
    }
  ]

  const contactInfo = [
    {label: '官方电话', value: '400-888-9999', icon: 'i-mdi-phone'},
    {label: '官方邮箱', value: 'contact@genshu.art', icon: 'i-mdi-email'},
    {label: '微信客服', value: 'GenShu_Service', icon: 'i-mdi-wechat'}
  ]

  const handleCopy = (data: string) => {
    Taro.setClipboardData({
      data,
      success: () => {
        Taro.showToast({title: '已复制', icon: 'success'})
      }
    })
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full h-full" scrollY>
        <View className="p-6">
          {/* Logo与简介 */}
          <View className="flex flex-col items-center py-10 mb-6">
            <View className="w-24 h-24 bg-gradient-primary rounded-[32px] flex items-center justify-center shadow-elegant mb-6">
              <View className="i-mdi-script-text text-5xl text-white" />
            </View>
            <Text className="text-3xl font-black text-foreground tracking-tighter mb-2">根书文创</Text>
            <Text className="text-base text-muted-foreground font-medium mb-1">传承文化之美，开启创意生活</Text>
            <View className="bg-primary/5 px-3 py-1 rounded-full mt-2">
              <Text className="text-sm text-primary font-black">Version {version}</Text>
            </View>
          </View>

          {/* 品牌介绍 */}
          <View className="bg-card rounded-3xl p-6 mb-6 shadow-card border border-border border-opacity-10">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-script-text-outline text-2xl text-primary mr-2" />
              <Text className="text-xl font-bold text-foreground">关于根书文创</Text>
            </View>
            <View className="space-y-3">
              <Text className="text-base text-muted-foreground leading-relaxed">
                根书文创根植于四川非物质文化遗产「根书」技艺。根书是以天然树根为材料、依根之天然形态创作书法艺术的古老技艺，讲究「天人合一、道法自然」，每一件作品都独一无二、不可复制。
              </Text>
              <Text className="text-base text-muted-foreground leading-relaxed">
                我们将这一千年非遗技艺与现代生活美学相融合，打造木质书签、根艺摆件、印章定制等系列文创产品，让传统文化走进当代日常，成为可触摸、可使用、可传承的文化载体。
              </Text>
              <Text className="text-base text-muted-foreground leading-relaxed">
                根书文创园坐落于乐山大佛景区，集非遗体验、文创展售、文旅研学、个性定制于一体。我们致力于以「根生万象」为品牌理念，让中国非遗之美走向世界，为海内外用户提供兼具文化底蕴与艺术品质的文创消费体验。
              </Text>
            </View>
            <View className="flex flex-row flex-wrap gap-2 mt-5">
              {['非遗传承', '根艺书法', '文创出海', '文旅研学'].map((tag) => (
                <View key={tag} className="bg-primary/5 border border-primary/15 rounded-full px-3 py-1">
                  <Text className="text-sm text-primary font-bold">{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 更新日志 */}
          <View className="bg-card rounded-3xl p-6 mb-6 shadow-card border border-border border-opacity-10">
            <View className="flex flex-row items-center mb-6">
              <View className="i-mdi-history text-2xl text-primary mr-2" />
              <Text className="text-xl font-bold text-foreground">更新日志</Text>
            </View>

            <View className="space-y-6">
              {updateLogs.map((log, index) => (
                <View key={index} className="relative pl-6 pb-2 border-l-2 border-primary/10 last:border-l-0">
                  <View className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                  <View className="flex flex-row items-center justify-between mb-2">
                    <Text className="text-lg font-bold text-foreground">{log.version}</Text>
                    <Text className="text-sm text-muted-foreground">{log.date}</Text>
                  </View>
                  <View className="space-y-1">
                    {log.content.map((item, idx) => (
                      <View key={idx} className="flex flex-row items-start">
                        <View className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 mr-2" />
                        <Text className="text-base text-muted-foreground leading-relaxed">{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 联系方式 */}
          <View className="bg-card rounded-3xl p-6 mb-10 shadow-card border border-border border-opacity-10">
            <View className="flex flex-row items-center mb-6">
              <View className="i-mdi-contacts text-2xl text-primary mr-2" />
              <Text className="text-xl font-bold text-foreground">联系方式</Text>
            </View>

            <View className="space-y-4">
              {contactInfo.map((item, index) => (
                <View
                  key={index}
                  className="flex flex-row items-center justify-between py-3 border-b border-border border-opacity-10 last:border-b-0 active:opacity-60 transition-opacity"
                  onClick={() => handleCopy(item.value)}>
                  <View className="flex flex-row items-center">
                    <View className={`${item.icon} text-2xl text-primary mr-4`} />
                    <View>
                      <Text className="text-base font-bold text-foreground block mb-0.5">{item.label}</Text>
                      <Text className="text-base text-muted-foreground">{item.value}</Text>
                    </View>
                  </View>
                  <View className="i-mdi-content-copy text-xl text-muted-foreground/30" />
                </View>
              ))}
            </View>
          </View>

          {/* 版权信息 */}
          <View className="text-center pb-10">
            <Text className="text-sm text-muted-foreground font-medium block mb-1">© 2026 根书文创艺术有限公司</Text>
            <Text className="text-xs text-muted-foreground/40 font-bold tracking-widest uppercase">
              All Rights Reserved
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
