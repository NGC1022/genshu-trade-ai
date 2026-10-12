import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getUserOrders} from '@/db/api'
import type {Order} from '@/db/types'
import {ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS} from '@/db/types'

export default function OrderList() {
  const {user} = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')

  const loadOrders = useCallback(async () => {
    if (!user) return
    const status = activeTab === 'all' ? undefined : activeTab
    const {data} = await getUserOrders(user.id, status as any)
    setOrders(data)
  }, [user, activeTab])

  useDidShow(() => {
    loadOrders()
  })

  const navigateToDetail = (orderNo: string) => {
    Taro.navigateTo({url: `/pages/order-detail/index?orderNo=${orderNo}`})
  }

  const getStatusText = (status: string) => ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] || status
  const getPaymentStatusText = (status?: string) =>
    PAYMENT_STATUS_LABELS[status as keyof typeof PAYMENT_STATUS_LABELS] || status || '待支付'

  const tabs = [
    {key: 'all', label: '全部'},
    {key: 'pending', label: '待支付'},
    {key: 'paid', label: '待发货'},
    {key: 'shipped', label: '待收货'},
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
            <View className="i-mdi-package-variant text-6xl text-muted-foreground mb-4" />
            <Text className="text-muted-foreground">暂无订单</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View
              key={order.id}
              className="bg-card rounded-xl p-4 mb-4 shadow-card"
              onClick={() => navigateToDetail(order.order_no)}>
              <View className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                <Text className="text-base text-muted-foreground">订单号：{order.order_no}</Text>
                <View className="flex items-center gap-2">
                  <Text className="text-sm text-muted-foreground">{getPaymentStatusText(order.payment_status)}</Text>
                  <Text className="text-base font-bold text-primary">{getStatusText(order.status)}</Text>
                </View>
              </View>

              {order.items.map((item, index) => (
                <View key={index} className="flex items-center py-2">
                  <View className="flex-1">
                    <Text className="text-base text-foreground font-medium mb-1">{item.sku_snapshot.name}</Text>
                    <Text className="text-base text-muted-foreground">
                      ¥{item.unit_price} × {item.quantity}
                    </Text>
                  </View>
                  <Text className="text-base font-bold text-foreground">¥{item.subtotal}</Text>
                </View>
              ))}

              <View className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                <Text className="text-base text-muted-foreground">
                  共{order.items.reduce((sum, item) => sum + item.quantity, 0)}件商品
                </Text>
                <View className="flex items-center">
                  <Text className="text-base text-muted-foreground mr-2">合计：</Text>
                  <Text className="text-lg font-bold text-primary">¥{order.total_amount}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}
