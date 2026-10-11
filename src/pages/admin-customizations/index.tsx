import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {getAllCustomizationOrders, updateCustomizationOrder} from '@/db/api'
import type {CustomizationOrder} from '@/db/types'

export default function AdminCustomizations() {
  const [orders, setOrders] = useState<CustomizationOrder[]>([])
  const [activeTab, setActiveTab] = useState<string>('reviewing')

  const loadOrders = useCallback(async () => {
    const status = activeTab === 'all' ? undefined : activeTab
    const {data} = await getAllCustomizationOrders(status as any)
    setOrders(data)
  }, [activeTab])

  useDidShow(() => {
    loadOrders()
  })

  const handleQuote = (orderId: string) => {
    Taro.showModal({
      title: '输入报价',
      success: async (res: any) => {
        if (res.confirm && res.content) {
          try {
            const price = parseFloat(res.content)
            if (Number.isNaN(price)) {
              Taro.showToast({title: '请输入有效金额', icon: 'none'})
              return
            }
            const {error} = await updateCustomizationOrder(orderId, {status: 'approved', estimated_price: price})
            if (error) throw error
            Taro.showToast({title: '报价成功', icon: 'success'})
            loadOrders()
          } catch (error: any) {
            Taro.showToast({title: error.message || '操作失败', icon: 'none'})
          }
        }
      }
    } as any)
  }

  const handleUpdateStatus = (orderId: string) => {
    const statusOptions = ['approved', 'in_progress', 'completed', 'cancelled']
    const statusLabels = ['已通过/已报价', '制作中', '已完成', '已取消']

    Taro.showActionSheet({
      itemList: statusLabels,
      success: async (res) => {
        try {
          const newStatus = statusOptions[res.tapIndex]
          const {error} = await updateCustomizationOrder(orderId, {status: newStatus as any})
          if (error) throw error
          Taro.showToast({title: '状态更新成功', icon: 'success'})
          loadOrders()
        } catch (error: any) {
          Taro.showToast({title: error.message || '更新失败', icon: 'none'})
        }
      }
    })
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待提交',
      reviewing: '审核中',
      approved: '已通过',
      rejected: '已拒绝',
      in_progress: '制作中',
      completed: '已完成',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'text-muted-foreground',
      reviewing: 'text-yellow-600',
      approved: 'text-blue-600',
      rejected: 'text-red-600',
      in_progress: 'text-green-600',
      completed: 'text-muted-foreground',
      cancelled: 'text-muted-foreground'
    }
    return colorMap[status] || 'text-foreground'
  }

  const getTypeText = (type: string) => {
    return type === '3d_print' ? '3D打印定制' : '高端实体定制'
  }

  const tabs = [
    {key: 'reviewing', label: '待审核'},
    {key: 'approved', label: '已报价'},
    {key: 'in_progress', label: '制作中'},
    {key: 'completed', label: '已完成'},
    {key: 'all', label: '全部'}
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
            <View key={order.id} className="bg-card rounded-xl p-4 mb-4 shadow-card">
              <View className="flex items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground mb-1">{getTypeText(order.type)}</Text>
                  <Text className="text-base text-muted-foreground">订单号：{order.order_no}</Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${order.status === 'reviewing' ? 'bg-yellow-100' : 'bg-muted'}`}
                  onClick={() => handleUpdateStatus(order.id)}>
                  <Text className={`text-base font-bold ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>

              <View className="bg-muted rounded-lg p-3 mb-3">
                <Text className="text-base text-muted-foreground mb-1">定制需求</Text>
                <Text className="text-base text-foreground line-clamp-3">
                  {typeof order.requirements === 'string'
                    ? order.requirements
                    : JSON.stringify(order.requirements, null, 2)}
                </Text>
              </View>

              <View className="flex items-center justify-between py-2 border-t border-border">
                <Text className="text-base text-muted-foreground">
                  提交时间：{new Date(order.created_at).toLocaleDateString('zh-CN')}
                </Text>
                {Number(order.estimated_price || 0) > 0 && (
                  <Text className="text-lg font-bold text-primary">¥{order.estimated_price}</Text>
                )}
              </View>

              {order.status === 'reviewing' && (
                <View className="mt-3">
                  <Button
                    className="w-full bg-gradient-primary text-white rounded-lg py-2 text-base break-keep"
                    onClick={() => handleQuote(order.id)}>
                    提交报价
                  </Button>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}
