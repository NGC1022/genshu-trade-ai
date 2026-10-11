import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getUserCustomizations} from '@/db/api'
import type {CustomizationOrder} from '@/db/types'

export default function CustomizationList() {
  const {user} = useAuth()
  const [orders, setOrders] = useState<CustomizationOrder[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')

  const loadOrders = useCallback(async () => {
    if (!user) return
    const status = activeTab === 'all' ? undefined : activeTab
    const {data} = await getUserCustomizations(user.id, status as any)
    setOrders(data)
  }, [user, activeTab])

  useDidShow(() => {
    loadOrders()
  })

  const navigateToDetail = (id: string) => {
    Taro.navigateTo({url: `/pages/customization-detail/index?id=${id}`})
  }

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

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'text-yellow-600',
      reviewing: 'text-blue-600',
      approved: 'text-green-600',
      rejected: 'text-red-600',
      in_progress: 'text-orange-600',
      completed: 'text-muted-foreground',
      cancelled: 'text-muted-foreground'
    }
    return colorMap[status] || 'text-foreground'
  }

  const getTypeText = (type: string) => {
    return type === '3d_print' ? '3D打印定制' : '高端实体定制'
  }

  const tabs = [
    {key: 'all', label: '全部'},
    {key: 'pending', label: '待审核'},
    {key: 'approved', label: '已报价'},
    {key: 'in_progress', label: '制作中'},
    {key: 'completed', label: '已完成'}
  ]

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <View className="bg-card px-4 py-3 flex gap-4 overflow-x-auto">
        {tabs.map((tab) => (
          <View
            key={tab.key}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${activeTab === tab.key ? 'bg-primary' : 'bg-muted'}`}
            onClick={() => setActiveTab(tab.key)}>
            <Text className={`text-base ${activeTab === tab.key ? 'text-white font-bold' : 'text-foreground'}`}>
              {tab.label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView className="flex-1 p-4" scrollY>
        {orders.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <View className="i-mdi-cube-outline text-6xl text-muted-foreground mb-4" />
            <Text className="text-muted-foreground">暂无定制订单</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View
              key={order.id}
              className="bg-card rounded-xl p-4 mb-4 shadow-card"
              onClick={() => navigateToDetail(order.id)}>
              <View className="flex items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground mb-1">{getTypeText(order.type)}</Text>
                  <Text className="text-base text-muted-foreground">订单号：{order.order_no}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-100' : 'bg-muted'}`}>
                  <Text className={`text-base font-bold ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>

              <View className="bg-muted rounded-lg p-3 mb-3">
                <Text className="text-base text-muted-foreground mb-1">需求概要</Text>
                <Text className="text-base text-foreground line-clamp-2">
                  {typeof order.requirements === 'string' ? order.requirements : JSON.stringify(order.requirements)}
                </Text>
              </View>

              <View className="flex items-center justify-between pt-3 border-t border-border">
                <Text className="text-base text-muted-foreground">
                  提交时间：{new Date(order.created_at).toLocaleDateString('zh-CN')}
                </Text>
                {(order.estimated_price || 0) > 0 && (
                  <Text className="text-lg font-bold text-primary">¥{order.estimated_price}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}
