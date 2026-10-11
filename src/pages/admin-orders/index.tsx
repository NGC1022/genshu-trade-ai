import {Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {getAllOrders, updateOrderStatus} from '@/db/api'
import type {Order} from '@/db/types'
import {formatDateTime} from '@/utils/time'

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchText, setSearchText] = useState('')

  const loadOrders = useCallback(async () => {
    const status = activeTab === 'all' ? undefined : activeTab
    const {data} = await getAllOrders(status as any)
    setOrders(data)
  }, [activeTab])

  useDidShow(() => {
    loadOrders()
  })

  const handleUpdateStatus = async (orderNo: string, newStatus: string) => {
    try {
      const {error} = await updateOrderStatus(orderNo, newStatus as any)
      if (error) throw error
      Taro.showToast({title: '状态更新成功', icon: 'success'})
      loadOrders()
    } catch (error: any) {
      Taro.showToast({title: error.message || '更新失败', icon: 'none'})
    }
  }

  const showStatusMenu = (order: Order) => {
    const statusOptions = ['paid', 'processing', 'shipped', 'completed', 'cancelled']
    const statusLabels = ['已支付', '处理中', '已发货', '已完成', '已取消']

    Taro.showActionSheet({
      itemList: statusLabels,
      success: (res) => {
        const newStatus = statusOptions[res.tapIndex]
        handleUpdateStatus(order.order_no, newStatus)
      }
    })
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending_payment: '待支付',
      paid: '已支付',
      processing: '处理中',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  }

  const tabs = [
    {key: 'all', label: '全部'},
    {key: 'paid', label: '待处理'},
    {key: 'processing', label: '处理中'},
    {key: 'shipped', label: '已发货'},
    {key: 'completed', label: '已完成'}
  ]

  const filteredOrders = orders.filter(
    (order) =>
      !searchText ||
      order.order_no.includes(searchText) ||
      order.items.some((item) => item.sku_snapshot.name.includes(searchText))
  )

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <View className="bg-card p-4">
        <View className="bg-input rounded-lg border border-border px-3 py-2 mb-3">
          <Input
            className="w-full text-foreground"
            placeholder="搜索订单号或商品名称"
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
        </View>
        <View className="flex gap-2 overflow-x-auto">
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
      </View>

      <ScrollView className="flex-1 p-4" scrollY>
        {filteredOrders.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <View className="i-mdi-package-variant text-6xl text-muted-foreground mb-4" />
            <Text className="text-muted-foreground">暂无订单</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View key={order.id} className="bg-card rounded-xl p-4 mb-4 shadow-card">
              <View className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                <View className="flex-1">
                  <Text className="text-base text-muted-foreground mb-1">订单号：{order.order_no}</Text>
                  <Text className="text-base text-muted-foreground">下单时间：{formatDateTime(order.created_at)}</Text>
                </View>
                <View className="px-3 py-1 rounded-full bg-primary" onClick={() => showStatusMenu(order)}>
                  <Text className="text-base text-white font-bold">{getStatusText(order.status)}</Text>
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

              {order.delivery_method === 'express' && order.address_snapshot && (
                <View className="mt-3 pt-3 border-t border-border">
                  <Text className="text-base text-muted-foreground mb-1">收货信息</Text>
                  <Text className="text-base text-foreground">
                    {order.address_snapshot.receiver_name} {order.address_snapshot.phone}
                  </Text>
                  <Text className="text-base text-muted-foreground mt-1">
                    {order.address_snapshot.province} {order.address_snapshot.city} {order.address_snapshot.district}{' '}
                    {order.address_snapshot.detail}
                  </Text>
                </View>
              )}

              <View className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                <Text className="text-base text-muted-foreground">订单金额</Text>
                <Text className="text-lg font-bold text-primary">¥{order.total_amount}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}
