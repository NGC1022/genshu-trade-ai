import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'

export default function CustomizationSuccess() {
  const router = useRouter()
  const {orderId, price} = router.params

  const handleViewOrder = () => {
    Taro.redirectTo({url: `/pages/customization-detail/index?id=${orderId}`})
  }

  const handleBackHome = () => {
    Taro.switchTab({url: '/pages/home/index'})
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-24" scrollY>
        <View className="p-4">
          <View className="bg-card rounded-xl p-6 mb-4 shadow-card text-center">
            <View className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <View className="i-mdi-check-circle text-5xl text-green-600" />
            </View>
            <Text className="text-2xl font-bold text-foreground mb-2">提交成功</Text>
            <Text className="text-base text-muted-foreground">您的定制需求已提交</Text>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">订单信息</Text>
            <View className="space-y-2">
              <View className="flex items-center justify-between py-2">
                <Text className="text-base text-muted-foreground">订单编号</Text>
                <Text className="text-base text-foreground font-mono">{orderId}</Text>
              </View>
              {price && (
                <View className="flex items-center justify-between py-2">
                  <Text className="text-base text-muted-foreground">预估价格</Text>
                  <Text className="text-lg font-bold text-primary">¥{price}</Text>
                </View>
              )}
              <View className="flex items-center justify-between py-2">
                <Text className="text-base text-muted-foreground">订单状态</Text>
                <Text className="text-base text-yellow-600 font-bold">待审核</Text>
              </View>
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">接下来</Text>
            <View className="space-y-3">
              <View className="flex items-start">
                <View className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <Text className="text-base text-white font-bold">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-foreground mb-1">团队审核</Text>
                  <Text className="text-base text-muted-foreground">我们会在1-2个工作日内审核您的需求</Text>
                </View>
              </View>
              <View className="flex items-start">
                <View className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <Text className="text-base text-white font-bold">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-foreground mb-1">生成预览</Text>
                  <Text className="text-base text-muted-foreground">审核通过后会生成设计预览图供您确认</Text>
                </View>
              </View>
              <View className="flex items-start">
                <View className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <Text className="text-base text-white font-bold">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-foreground mb-1">开始制作</Text>
                  <Text className="text-base text-muted-foreground">确认预览图后开始3D打印，制作周期约5-7个工作日</Text>
                </View>
              </View>
              <View className="flex items-start">
                <View className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <Text className="text-base text-white font-bold">4</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-foreground mb-1">完成交付</Text>
                  <Text className="text-base text-muted-foreground">制作完成后通知您取货或安排配送</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card p-4 border-t border-border">
        <View className="flex gap-3">
          <Button
            className="flex-1 bg-muted text-foreground rounded-full py-3 text-base break-keep"
            onClick={handleBackHome}>
            返回首页
          </Button>
          <Button
            className="flex-1 bg-gradient-primary text-white rounded-full py-3 text-base font-bold break-keep"
            onClick={handleViewOrder}>
            查看订单
          </Button>
        </View>
      </View>
    </View>
  )
}
