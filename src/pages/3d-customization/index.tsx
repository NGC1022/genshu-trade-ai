import {Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {DEMO_3D_TEMPLATES} from '@/data/demoCatalog'
import {getThreeDTemplates} from '@/db/api'
import type {ThreeDTemplate} from '@/db/types'
import {useLanguage} from '@/hooks/useLanguage'

export default function ThreeDCustomization() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const templateLabel = (name: string) => {
    if (language !== 'en') return name
    return name
      .replace('根宝 IP 形象', 'Genbao IP')
      .replace('灵动款', 'Dynamic')
      .replace('徽章款', 'Badge')
      .replace('挂件款', 'Keychain')
  }
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
      Taro.showToast({title: ui('请先登录', 'Please sign in first'), icon: 'none'})
      return
    }

    if (!selectedTemplate) {
      Taro.showToast({title: ui('请选择模板', 'Select a template'), icon: 'none'})
      return
    }

    if (!customText.trim()) {
      Taro.showToast({title: ui('请输入定制文字', 'Enter custom text'), icon: 'none'})
      return
    }

    const textLength = customText.trim().length
    if (textLength > 5) {
      Taro.showToast({title: ui('定制文字最多5个汉字或字符', 'Use up to 5 characters'), icon: 'none'})
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
          <Text className="text-2xl font-black text-white tracking-widest uppercase">
            {ui('3D打印定制', '3D-Printed Customization')}
          </Text>
          <View className="h-4" />
          <Text className="text-base text-white opacity-90 font-medium tracking-tight leading-relaxed">
            {ui(
              '数字IP形象周边 · 专属底座篆刻 · 艺术随行',
              'Digital IP collectibles · Engraved base · Art to carry with you'
            )}
          </Text>
        </View>

        <View className="px-4">
          <View className="bg-card rounded-3xl p-6 mb-6 shadow-card border border-border border-opacity-10">
            <View className="flex flex-row items-center mb-6">
              <View className="i-mdi-palette-swatch text-2xl text-primary mr-2" />
              <Text className="text-xl font-bold text-foreground">
                {ui('选择IP形象模板', 'Choose an IP character template')}
              </Text>
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
                    {templateLabel(template.name)}
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
                <Text className="text-xl font-bold text-foreground">{ui('定制效果预览', 'Customization preview')}</Text>
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
                {ui(
                  '这是手机端效果示意图，实际成品会根据模板比例和打印工艺微调。',
                  'This mobile preview is illustrative. The final piece may vary slightly with the template ratio and printing process.'
                )}
              </Text>
            </View>
          )}

          <View className="bg-card rounded-3xl p-6 mb-6 shadow-card border border-border border-opacity-10">
            <View className="flex flex-row items-center justify-between mb-6">
              <View className="flex flex-row items-center">
                <View className="i-mdi-fountain-pen-tip text-2xl text-primary mr-2" />
                <Text className="text-xl font-bold text-foreground">{ui('底座定制文字', 'Base engraving text')}</Text>
              </View>
              <Text className="text-sm text-muted-foreground font-bold">{customText.length}/5</Text>
            </View>
            <View className="bg-background rounded-2xl border-2 border-border px-4 py-4 mb-4 focus-within:border-primary transition-colors">
              <Input
                className="w-full text-xl font-bold text-foreground"
                placeholder={ui('请输入定制文字（最多5字）', 'Enter text (up to 5 characters)')}
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
                <Text className="text-base font-bold text-primary">{ui('篆刻说明', 'Engraving details')}</Text>
              </View>
              <Text className="text-base text-muted-foreground leading-relaxed">
                {ui(
                  '定制文字将使用精细工艺篆刻在产品底座正前方，为您的专属IP形象增添独特标识。建议字数在3-5字，效果最佳。',
                  'Your text will be finely engraved on the front of the base. We recommend 3–5 characters for the best result.'
                )}
              </Text>
            </View>
          </View>

          {selectedTemplate && customText.trim() && (
            <View className="bg-card rounded-3xl p-6 mb-6 shadow-card border border-border border-opacity-10">
              <View className="flex items-center justify-between">
                <Text className="text-xl font-bold text-foreground">{ui('预估总价', 'Estimated total')}</Text>
                <Text className="text-3xl font-black text-primary">
                  ¥{templates.find((t) => t.id === selectedTemplate)?.price || 0}
                </Text>
              </View>
            </View>
          )}

          <View className="bg-card rounded-3xl p-6 mb-10 shadow-card border border-border border-opacity-10">
            <View className="flex flex-row items-center mb-6">
              <View className="i-mdi-shield-check text-2xl text-primary mr-2" />
              <Text className="text-xl font-bold text-foreground">{ui('服务保障', 'Service promise')}</Text>
            </View>
            <View className="space-y-6">
              <View className="flex flex-row items-start">
                <View className="w-2 h-2 rounded-full bg-primary mt-2 mr-3" />
                <View>
                  <Text className="text-base font-bold text-foreground mb-1 block">
                    {ui('匠心品质', 'Crafted with care')}
                  </Text>
                  <Text className="text-base text-muted-foreground">
                    {ui(
                      '采用高精度3D打印技术，还原每一个设计细节。',
                      'High-precision 3D printing preserves every design detail.'
                    )}
                  </Text>
                </View>
              </View>
              <View className="flex flex-row items-start">
                <View className="w-2 h-2 rounded-full bg-primary mt-2 mr-3" />
                <View>
                  <Text className="text-base font-bold text-foreground mb-1 block">
                    {ui('极速交付', 'Fast fulfilment')}
                  </Text>
                  <Text className="text-base text-muted-foreground">
                    {ui(
                      '下单后预计7个工作日内完成制作并顺丰发出。',
                      'Production is expected to finish within 7 business days, followed by tracked shipping.'
                    )}
                  </Text>
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
          {loading ? ui('提交中...', 'Submitting...') : ui('立即提交定制订单', 'Submit customization order')}
        </button>
      </View>
    </View>
  )
}
