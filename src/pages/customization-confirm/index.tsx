import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createCustomizationOrder, getDefaultAddress} from '@/db/api'

export default function CustomizationConfirm() {
  const router = useRouter()
  const {user} = useAuth()
  const [customData, setCustomData] = useState<any>(null)
  const [selectedAddress, setSelectedAddress] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const {data} = router.params
    if (data) {
      setCustomData(JSON.parse(decodeURIComponent(data)))
    }
  }, [router.params])

  useDidShow(async () => {
    // 优先读取地址列表写入的选择结果，避免依赖页面实例 setData 与 React 状态同步
    const pendingAddress = Taro.getStorageSync('pendingSelectedAddress:customization')
    if (pendingAddress) {
      setSelectedAddress(pendingAddress)
      Taro.removeStorageSync('pendingSelectedAddress:customization')
    } else if (!selectedAddress && user) {
      // 首次加载，获取默认地址
      const {data} = await getDefaultAddress(user.id)
      if (data) {
        setSelectedAddress(data)
      }
    }
  })

  const selectAddress = () => {
    Taro.navigateTo({url: '/pages/address-list/index?select=true&target=customization'})
  }

  const handleSubmit = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    if (!selectedAddress) {
      Taro.showToast({title: '请选择收货地址', icon: 'none'})
      return
    }

    setLoading(true)

    try {
      const {data, error} = await createCustomizationOrder({
        user_id: user.id,
        type: customData.type,
        custom_text: customData.text,
        template_id: customData.templateId,
        estimated_price: customData.estimatedPrice,
        deposit_amount: Math.floor(customData.estimatedPrice * 0.3),
        requirements: {
          ...customData,
          address: selectedAddress
        }
      })

      if (error || !data) throw error || new Error('提交失败')

      Taro.showToast({title: '提交成功', icon: 'success'})
      setTimeout(() => {
        Taro.redirectTo({url: `/pages/customization-success/index?id=${data.id}`})
      }, 1500)
    } catch (error: any) {
      Taro.showToast({title: error.message || '提交失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  if (!customData) return null

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-24" scrollY>
        <View className="p-4">
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card border border-border">
            <Text className="text-base font-bold text-accent mb-3">定制信息确认</Text>
            <View className="space-y-3">
              <View className="flex justify-between">
                <Text className="text-base text-muted-foreground">定制模板</Text>
                <Text className="text-base text-foreground">{customData.templateName}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-base text-muted-foreground">定制文字</Text>
                <Text className="text-base text-foreground">{customData.text}</Text>
              </View>
              {customData.remarks && (
                <View className="flex justify-between">
                  <Text className="text-base text-muted-foreground">备注说明</Text>
                  <Text className="text-base text-foreground text-right">{customData.remarks}</Text>
                </View>
              )}
              <View className="flex justify-between border-t border-border pt-3 mt-3">
                <Text className="text-base font-bold text-foreground">预估总价</Text>
                <Text className="text-lg font-bold text-primary">¥{customData.estimatedPrice}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-base text-muted-foreground">需付定金(30%)</Text>
                <Text className="text-base font-bold text-accent">¥{Math.floor(customData.estimatedPrice * 0.3)}</Text>
              </View>
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card border border-border" onClick={selectAddress}>
            <Text className="text-base font-bold text-accent mb-3">收货地址</Text>
            {selectedAddress ? (
              <View className="flex items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">
                    {selectedAddress.receiver_name} {selectedAddress.phone}
                  </Text>
                  <Text className="text-base text-muted-foreground mt-1 line-clamp-2">
                    {selectedAddress.province} {selectedAddress.city} {selectedAddress.district}{' '}
                    {selectedAddress.detail}
                  </Text>
                </View>
                <View className="i-mdi-chevron-right text-xl text-muted-foreground ml-2" />
              </View>
            ) : (
              <View className="flex items-center justify-between py-2">
                <Text className="text-base text-muted-foreground">点击选择收货地址</Text>
                <View className="i-mdi-chevron-right text-xl text-muted-foreground" />
              </View>
            )}
          </View>

          <View className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <View className="flex items-start">
              <View className="i-mdi-information text-xl text-yellow-600 mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-base font-bold text-yellow-800 mb-1">定制须知</Text>
                <Text className="text-base text-yellow-700 leading-relaxed">
                  1. 提交定制后需支付30%定金，剩余尾款在制作完成前支付。 2. 定制商品非质量问题不支持退换货。 3.
                  制作周期预计为5-15个工作日。
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card p-4 border-t border-border">
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-3 text-base font-bold shadow-elegant break-keep"
          onClick={handleSubmit}
          loading={loading}>
          确认并提交定制
        </Button>
      </View>
    </View>
  )
}
