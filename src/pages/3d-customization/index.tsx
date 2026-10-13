import {Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {DEMO_3D_TEMPLATES} from '@/data/demoCatalog'
import {getThreeDTemplates} from '@/db/api'
import type {ThreeDTemplate} from '@/db/types'

export default function ThreeDCustomization() {
  const {user} = useAuth()
  const [templates, setTemplates] = useState<ThreeDTemplate[]>(DEMO_3D_TEMPLATES as ThreeDTemplate[])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [customText, setCustomText] = useState('')
  const [loading, setLoading] = useState(false)
  const selectedTemplateData = templates.find((template) => template.id === selectedTemplate)

  const loadTemplates = useCallback(async () => {
    const {data} = await getThreeDTemplates()
    setTemplates(data)
  }, [])

  useDidShow(() => {
    loadTemplates()
  })

  const handleSubmit = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    if (!selectedTemplate) {
      Taro.showToast({title: '请选择模板', icon: 'none'})
      return
    }

    if (!customText.trim()) {
      Taro.showToast({title: '请输入定制文字', icon: 'none'})
      return
    }

    const textLength = customText.trim().length
    if (textLength > 5) {
      Taro.showToast({title: '定制文字最多5个汉字或字符', icon: 'none'})
      return
    }

    const template = templates.find((t) => t.id === selectedTemplate)
    const estimatedPrice = template?.price || 0
    setLoading(true)

    Taro.navigateTo({
      url: `/pages/customization-confirm/index?data=${encodeURIComponent(
        JSON.stringify({
          type: '3d_printing',
          templateId: selectedTemplate,
          templateName: template?.name,
          text: customText,
          estimatedPrice: estimatedPrice
        })
      )}`
    })
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-24" scrollY>
        <View className="bg-gradient-primary p-8 mb-6 flex flex-col items-start">
          <Text className="text-2xl font-black text-white tracking-widest uppercase">3D打印定制</Text>
          <View className="h-4" />
          <Text className="text-base text-white opacity-90 font-medium tracking-tight leading-relaxed">
            数字IP形象周边 · 专属底座篆刻 · 艺术随行
          </Text>
        </View>

        <View className="px-4">
          <View className="bg-card rounded-3xl p-6 mb-6 shadow-card border border-border border-opacity-10">
            <View className="flex flex-row items-center mb-6">
              <View className="i-mdi-palette-swatch text-2xl text-primary mr-2" />
              <Text className="text-xl font-bold text-foreground">选择IP形象模板</Text>
            </View>
            <View className="grid grid-cols-2 gap-4">
              {templates.map((template) => (
                <View
                  key={template.id}
                  className={`border-2 rounded-2xl p-4 transition-all ${selectedTemplate === template.id ? 'border-primary bg-primary/5 shadow-sm scale-[1.02]' : 'border-border bg-background'}`}
                  onClick={() => setSelectedTemplate(template.id)}>
                  <View className="w-full h-32 rounded-xl mb-3 overflow-hidden shadow-sm">
                    {template.image_url ? (
                      <Image src={template.image_url} className="w-full h-full" mode="aspectFill" lazyLoad />
                    ) : (
                      <View className="w-full h-full bg-muted flex items-center justify-center">
                        <View className="i-mdi-cube-outline text-4xl text-muted-foreground" />
                      </View>
                    )}
                  </View>
                  <Text
                    className={`text-base font-black mb-1 line-clamp-1 ${selectedTemplate === template.id ? 'text-primary' : 'text-foreground'}`}>
                    {template.name}
                  </Text>
                  <Text
                    className={`text-lg font-black ${selectedTemplate === template.id ? 'text-primary' : 'text-primary/70'}`}>
                    ¥{template.price}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {selectedTemplateData && customText.trim() && (
            <View className="bg-card rounded-3xl p-6 mb-6 shadow-card border border-primary/20">
              <View className="flex flex-row items-center mb-4">
                <View className="i-mdi-cube-scan text-2xl text-primary mr-2" />
                <Text className="text-xl font-bold text-foreground">定制效果预览</Text>
              </View>
              <View className="rounded-2xl bg-gradient-primary p-4 flex flex-col items-center">
                <Image
                  src={selectedTemplateData.image_url || ''}
                  className="w-40 h-40 rounded-2xl bg-white/20"
                  mode="aspectFit"
                />
                <View className="mt-3 rounded-lg bg-white/90 px-5 py-2 shadow-sm">
                  <Text className="text-lg font-black text-primary tracking-widest">{customText.trim()}</Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground block mt-3 text-center">
                这是手机端效果示意图，实际成品会根据模板比例和打印工艺微调。
              </Text>
            </View>
          )}

          <View className="bg-card rounded-3xl p-6 mb-6 shadow-card border border-border border-opacity-10">
            <View className="flex flex-row items-center justify-between mb-6">
              <View className="flex flex-row items-center">
                <View className="i-mdi-fountain-pen-tip text-2xl text-primary mr-2" />
                <Text className="text-xl font-bold text-foreground">底座定制文字</Text>
              </View>
              <Text className="text-sm text-muted-foreground font-bold">{customText.length}/5</Text>
            </View>
            <View className="bg-background rounded-2xl border-2 border-border px-4 py-4 mb-4 focus-within:border-primary transition-colors">
              <Input
                className="w-full text-xl font-bold text-foreground"
                placeholder="请输入定制文字（最多5字）"
                value={customText}
                maxlength={5}
                onInput={(e) => {
                  const ev = e as any
                  setCustomText(ev.detail?.value ?? ev.target?.value ?? '')
                }}
              />
            </View>
            <View className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
              <View className="flex flex-row items-center mb-2">
                <View className="i-mdi-information-outline text-lg text-primary mr-2" />
                <Text className="text-base font-bold text-primary">篆刻说明</Text>
              </View>
              <Text className="text-base text-muted-foreground leading-relaxed">
                定制文字将使用精细工艺篆刻在产品底座正前方，为您的专属IP形象增添独特标识。建议字数在3-5字，效果最佳。
              </Text>
            </View>
          </View>

          {selectedTemplate && customText.trim() && (
            <View className="bg-card rounded-3xl p-6 mb-6 shadow-card border border-border border-opacity-10">
              <View className="flex items-center justify-between">
                <Text className="text-xl font-bold text-foreground">预估总价</Text>
                <Text className="text-3xl font-black text-primary">
                  ¥{templates.find((t) => t.id === selectedTemplate)?.price || 0}
                </Text>
              </View>
            </View>
          )}

          <View className="bg-card rounded-3xl p-6 mb-10 shadow-card border border-border border-opacity-10">
            <View className="flex flex-row items-center mb-6">
              <View className="i-mdi-shield-check text-2xl text-primary mr-2" />
              <Text className="text-xl font-bold text-foreground">服务保障</Text>
            </View>
            <View className="space-y-6">
              <View className="flex flex-row items-start">
                <View className="w-2 h-2 rounded-full bg-primary mt-2 mr-3" />
                <View>
                  <Text className="text-base font-bold text-foreground mb-1 block">匠心品质</Text>
                  <Text className="text-base text-muted-foreground">采用高精度3D打印技术，还原每一个设计细节。</Text>
                </View>
              </View>
              <View className="flex flex-row items-start">
                <View className="w-2 h-2 rounded-full bg-primary mt-2 mr-3" />
                <View>
                  <Text className="text-base font-bold text-foreground mb-1 block">极速交付</Text>
                  <Text className="text-base text-muted-foreground">下单后预计7个工作日内完成制作并顺丰发出。</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card p-6 border-t border-border shadow-2xl z-50">
        <button
          className="w-full bg-gradient-primary text-white rounded-[20px] py-4 text-lg font-black shadow-elegant active:scale-95 transition-all flex items-center justify-center leading-none break-keep"
          onClick={handleSubmit}
          type="button">
          {loading ? '提交中...' : '立即提交定制订单'}
        </button>
      </View>
    </View>
  )
}
