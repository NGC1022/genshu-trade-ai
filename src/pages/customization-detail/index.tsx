import {ScrollView, Text, View} from '@tarojs/components'
import {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {getCustomizationDetail} from '@/db/api'
import type {CustomizationOrder} from '@/db/types'
import {formatDateTime} from '@/utils/time'

export default function CustomizationDetail() {
  const router = useRouter()
  const {id} = router.params
  const [order, setOrder] = useState<CustomizationOrder | null>(null)

  const loadOrder = useCallback(async () => {
    const {data} = await getCustomizationDetail(id!)
    if (data) {
      setOrder(data)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      loadOrder()
    }
  }, [id, loadOrder])

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待审核',
      reviewing: '审核中',
      approved: '已报价',
      rejected: '已拒绝',
      in_progress: '制作中',
      completed: '已完成',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  }

  const getTypeText = (type: string) => {
    return type === '3d_print' ? '3D打印定制' : '高端实体定制'
  }

  if (!order) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-6" scrollY>
        <View className="bg-gradient-primary p-6 mb-4">
          <View className="flex items-center">
            <View className="i-mdi-cube-outline text-4xl text-white mr-3" />
            <View>
              <Text className="text-xl font-bold text-white mb-1">{getStatusText(order.status)}</Text>
              <Text className="text-base text-white opacity-90">{formatDateTime(order.created_at)}</Text>
            </View>
          </View>
        </View>

        <View className="px-4">
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">订单信息</Text>
            <View className="space-y-2">
              <View className="flex items-center justify-between py-2">
                <Text className="text-base text-muted-foreground">订单号</Text>
                <Text className="text-base text-foreground font-mono">{order.order_no}</Text>
              </View>
              <View className="flex items-center justify-between py-2">
                <Text className="text-base text-muted-foreground">定制类型</Text>
                <Text className="text-base text-foreground">{getTypeText(order.type)}</Text>
              </View>
              <View className="flex items-center justify-between py-2">
                <Text className="text-base text-muted-foreground">提交时间</Text>
                <Text className="text-base text-foreground">{formatDateTime(order.created_at)}</Text>
              </View>
              {(order.estimated_price || 0) > 0 && (
                <View className="flex items-center justify-between py-2">
                  <Text className="text-base text-muted-foreground">预估价格</Text>
                  <Text className="text-lg font-bold text-primary">¥{order.estimated_price}</Text>
                </View>
              )}
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">定制需求</Text>
            <View className="bg-muted rounded-lg p-3">
              <Text className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                {typeof order.requirements === 'string'
                  ? order.requirements
                  : JSON.stringify(order.requirements, null, 2)}
              </Text>
            </View>
          </View>

          {order.progress && (
            <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
              <Text className="text-base font-bold text-foreground mb-3">制作进度</Text>
              <View className="space-y-3">
                {order.progress.map((item: any, index: number) => (
                  <View key={index} className="flex items-start">
                    <View className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <View className="i-mdi-check text-base text-white" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-foreground mb-1">{item.title}</Text>
                      <Text className="text-base text-muted-foreground">{item.description}</Text>
                      <Text className="text-base text-muted-foreground mt-1">{formatDateTime(item.updated_at)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {order.admin_notes && (
            <View className="bg-card rounded-xl p-4 shadow-card">
              <Text className="text-base font-bold text-foreground mb-3">团队备注</Text>
              <View className="bg-blue-50 rounded-lg p-3">
                <Text className="text-base text-foreground leading-relaxed">{order.admin_notes}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
