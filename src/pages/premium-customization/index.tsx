import {Button, Input, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createCustomizationOrder} from '@/db/api'

export default function PremiumCustomization() {
  const {user} = useAuth()
  const [formData, setFormData] = useState({
    theme: '',
    budget: '',
    deadline: '',
    requirements: '',
    contactName: '',
    contactPhone: ''
  })
  const [loading, setLoading] = useState(false)

  const updateField = (field: string, value: string) => {
    setFormData({...formData, [field]: value})
  }

  const handleSubmit = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    if (!formData.theme.trim()) {
      Taro.showToast({title: '请输入定制主题', icon: 'none'})
      return
    }

    if (!formData.requirements.trim()) {
      Taro.showToast({title: '请输入详细需求', icon: 'none'})
      return
    }

    if (!formData.contactName.trim() || !formData.contactPhone.trim()) {
      Taro.showToast({title: '请填写联系方式', icon: 'none'})
      return
    }

    setLoading(true)

    try {
      const {error} = await createCustomizationOrder({
        user_id: user.id,
        type: 'premium',
        requirements: formData,
        estimated_price: parseFloat(formData.budget) || 0
      })

      if (error) throw error

      Taro.showToast({title: '提交成功，我们会尽快联系您', icon: 'success', duration: 2000})
      setTimeout(() => {
        Taro.redirectTo({url: '/pages/customization-list/index'})
      }, 2000)
    } catch (error: any) {
      Taro.showToast({title: error.message || '提交失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-24" scrollY>
        <View className="bg-gradient-primary p-8 mb-6 flex flex-col items-start">
          <Text className="text-2xl font-black text-white tracking-widest uppercase">高端实体定制</Text>
          <View className="h-4" />
          <Text className="text-base text-white opacity-90 font-medium tracking-tight leading-relaxed">
            专业团队 · 量身打造 · 匠心品质
          </Text>
        </View>

        <View className="px-4">
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">定制主题</Text>
            <View className="bg-input rounded-lg border border-border px-3 py-2">
              <Input
                className="w-full text-foreground"
                placeholder="请输入定制主题（如企业礼品、纪念品等）"
                value={formData.theme}
                onInput={(e) => updateField('theme', e.detail.value)}
              />
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">预算范围</Text>
            <View className="bg-input rounded-lg border border-border px-3 py-2">
              <Input
                className="w-full text-foreground"
                placeholder="请输入预算金额（元）"
                type="number"
                value={formData.budget}
                onInput={(e) => updateField('budget', e.detail.value)}
              />
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">期望交付时间</Text>
            <View className="bg-input rounded-lg border border-border px-3 py-2 mb-2">
              <Input
                className="w-full text-foreground"
                placeholder="请输入期望交付时间"
                value={formData.deadline}
                onInput={(e) => updateField('deadline', e.detail.value)}
              />
            </View>
            <View className="bg-yellow-50 rounded-lg p-3">
              <View className="flex items-start">
                <View className="i-mdi-information-outline text-lg text-yellow-600 mr-2 mt-0.5" />
                <Text className="text-base text-yellow-800 flex-1">
                  手工制作根书需要时间，建议预留至少3个月的制作周期，复杂作品可能需要6个月或更长时间
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">详细需求</Text>
            <View className="bg-input rounded-lg border border-border px-3 py-2">
              <Textarea
                className="w-full text-foreground"
                placeholder="请详细描述您的定制需求、尺寸、材质、数量等要求"
                value={formData.requirements}
                maxlength={500}
                style={{minHeight: '120px'}}
                onInput={(e) => updateField('requirements', e.detail.value)}
              />
            </View>
            <Text className="text-base text-muted-foreground mt-2">{formData.requirements.length}/500</Text>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">联系方式</Text>
            <View className="space-y-3">
              <View>
                <Text className="text-base text-muted-foreground mb-2">联系人</Text>
                <View className="bg-input rounded-lg border border-border px-3 py-2">
                  <Input
                    className="w-full text-foreground"
                    placeholder="请输入联系人姓名"
                    value={formData.contactName}
                    onInput={(e) => updateField('contactName', e.detail.value)}
                  />
                </View>
              </View>
              <View>
                <Text className="text-base text-muted-foreground mb-2">联系电话</Text>
                <View className="bg-input rounded-lg border border-border px-3 py-2">
                  <Input
                    className="w-full text-foreground"
                    placeholder="请输入联系电话"
                    type="number"
                    value={formData.contactPhone}
                    onInput={(e) => updateField('contactPhone', e.detail.value)}
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 shadow-card">
            <Text className="text-base font-bold text-foreground">服务流程</Text>

            <View className="space-y-6 mt-6">
              <View className="flex items-start">
                <View className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <Text className="text-base text-white font-bold">1</Text>
                </View>
                <View className="flex-1 flex flex-col space-y-2">
                  <Text className="text-base font-bold text-foreground">提交需求</Text>
                  <Text className="text-base text-muted-foreground leading-relaxed">填写详细的定制需求和联系方式</Text>
                </View>
              </View>
              <View className="flex items-start">
                <View className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <Text className="text-base text-white font-bold">2</Text>
                </View>
                <View className="flex-1 flex flex-col space-y-2">
                  <Text className="text-base font-bold text-foreground">需求评估</Text>
                  <Text className="text-base text-muted-foreground leading-relaxed">
                    专业团队评估需求并提供报价方案
                  </Text>
                </View>
              </View>
              <View className="flex items-start">
                <View className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <Text className="text-base text-white font-bold">3</Text>
                </View>
                <View className="flex-1 flex flex-col space-y-2">
                  <Text className="text-base font-bold text-foreground">方案确认</Text>
                  <Text className="text-base text-muted-foreground leading-relaxed">
                    与您沟通确认设计方案和制作细节
                  </Text>
                </View>
              </View>
              <View className="flex items-start">
                <View className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <Text className="text-base text-white font-bold">4</Text>
                </View>
                <View className="flex-1 flex flex-col space-y-2">
                  <Text className="text-base font-bold text-foreground">制作交付</Text>
                  <Text className="text-base text-muted-foreground leading-relaxed">开始制作并按约定时间交付成品</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card p-4 border-t border-border">
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-3 text-base font-bold break-keep"
          onClick={handleSubmit}
          loading={loading}>
          提交定制需求
        </Button>
      </View>
    </View>
  )
}
