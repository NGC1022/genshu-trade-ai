// @title 商家订单管理
// 商家订单管理：全部订单列表 + 生命周期状态统计 + 订单详情跳转
// 复用消费者订单API（RLS按user_id隔离，商家查看本账号业务订单）

import {Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getAllOrders} from '@/db/api'
import type {Order} from '@/db/types'
import {ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS} from '@/db/types'
import {isBusinessRole} from '@/utils/roles'

// 订单全生命周期状态（13态统一状态机）
export const LIFECYCLE_STATUSES = [
  {key: 'pending', label: '待付款'},
  {key: 'paid', label: '已付款'},
  {key: 'preparing', label: '备货中'},
  {key: 'shipped', label: '已发货'},
  {key: 'in_transit', label: '国际运输中'},
  {key: 'customs', label: '目的国清关'},
  {key: 'customs_cleared', label: '清关完成'},
  {key: 'last_mile', label: '末端配送'},
  {key: 'delivered', label: '已签收'},
  {key: 'completed', label: '订单完成'}
]

export default function MerchantOrders() {
  const {user} = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterIdx, setFilterIdx] = useState(0)

  const canView = isBusinessRole((user as any)?.role)

  const loadOrders = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    const {data, error} = await getAllOrders()
    if (!error) setOrders(data)
    setLoading(false)
  }, [user])

  useDidShow(() => {
    if (canView) loadOrders()
    else setLoading(false)
  })

  const statusLabel = (s: string) => ORDER_STATUS_LABELS[s as keyof typeof ORDER_STATUS_LABELS] || s
  const paymentLabel = (s?: string) => PAYMENT_STATUS_LABELS[s as keyof typeof PAYMENT_STATUS_LABELS] || s || '待支付'
  const isCrossBorder = (o: Order) => !!o.address_snapshot?.is_overseas

  const crossBorderCount = orders.filter(isCrossBorder).length

  const filterOptions = ['全部订单', '跨境订单', '国内订单', '待处理']
  const filtered = orders.filter((o) => {
    if (filterIdx === 1) return isCrossBorder(o)
    if (filterIdx === 2) return !isCrossBorder(o)
    if (filterIdx === 3) return ['pending', 'paid', 'preparing'].includes(o.status)
    return true
  })

  if (!canView) {
    return (
      <View className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <View className="i-mdi-lock-outline text-5xl text-muted-foreground/40 mb-3" />
        <Text className="text-lg font-bold text-foreground mb-2">无访问权限</Text>
        <Text className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
          订单管理仅面向商家/运营人员与管理员开放。
        </Text>
        <View className="rounded-full bg-primary px-6 py-2.5" onClick={() => Taro.navigateBack()}>
          <Text className="text-base text-primary-foreground font-bold">返回</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 统计头 */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-3">
          <View className="w-1 h-5 bg-primary rounded-full mr-2" />
          <Text className="text-xl font-bold text-foreground">订单管理</Text>
        </View>
        <View className="flex flex-row gap-3">
          <View className="flex-1 bg-muted/60 rounded-xl p-3">
            <Text className="text-2xl font-black text-foreground">{orders.length}</Text>
            <Text className="text-xs text-muted-foreground mt-1">总订单</Text>
          </View>
          <View className="flex-1 bg-muted/60 rounded-xl p-3">
            <Text className="text-2xl font-black text-primary">{crossBorderCount}</Text>
            <Text className="text-xs text-muted-foreground mt-1">跨境订单</Text>
          </View>
          <View className="flex-1 bg-muted/60 rounded-xl p-3">
            <Text className="text-2xl font-black text-secondary">
              {orders.filter((o) => ['pending', 'paid', 'preparing'].includes(o.status)).length}
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">待处理</Text>
          </View>
        </View>
      </View>

      {/* 筛选 */}
      <View className="bg-card rounded-2xl p-4 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row gap-2">
          {filterOptions.map((f, i) => (
            <View
              key={f}
              className={`flex-1 rounded-xl px-2 py-2 items-center ${filterIdx === i ? 'bg-primary' : 'bg-muted'}`}
              onClick={() => setFilterIdx(i)}>
              <Text
                className={`text-sm font-bold ${filterIdx === i ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                {f}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 订单列表 */}
      {loading ? (
        <View className="py-12 items-center">
          <Text className="text-sm text-muted-foreground">加载订单中...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View className="bg-muted/60 rounded-3xl p-8 items-center mb-8">
          <View className="i-mdi-order-bool-ascending text-4xl text-muted-foreground/40 mb-2" />
          <Text className="text-sm text-muted-foreground">当前筛选条件下暂无订单</Text>
        </View>
      ) : (
        <View className="flex flex-col gap-3 mb-8">
          {filtered.map((o) => {
            const items = (o.items || []) as any[]
            return (
              <View
                key={o.id}
                className="bg-card rounded-3xl p-4 shadow-card border border-border border-opacity-10"
                onClick={() => Taro.navigateTo({url: `/pages/order-detail/index?orderNo=${o.order_no}`})}>
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-bold text-foreground">{o.order_no}</Text>
                  <View className={`rounded-full px-2.5 py-0.5 ${isCrossBorder(o) ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Text
                      className={`text-xs font-bold ${isCrossBorder(o) ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isCrossBorder(o) ? '跨境' : '国内'}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground mb-2" numberOfLines={1}>
                  {items.map((it) => it.sku_snapshot?.name || it.name).join('、') || '商品'}
                </Text>
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-base font-black text-primary">¥{o.total_amount}</Text>
                  <View className="flex flex-row items-center">
                    <Text className="text-xs text-muted-foreground mr-2">{paymentLabel(o.payment_status)}</Text>
                    <Text className="text-sm font-bold text-primary mr-2">{statusLabel(o.status)}</Text>
                    <View className="i-mdi-chevron-right text-muted-foreground" />
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      )}

      <View className="bg-muted/60 rounded-2xl p-4 mb-8">
        <Text className="text-xs text-muted-foreground leading-relaxed">
          订单状态机：待付款→已付款→备货中→已发货→国际运输中→目的国清关→清关完成→末端配送→已签收→订单完成；旁路：售后中/退款中/已退款/已取消。点击订单查看完整时间轴。
        </Text>
      </View>
    </View>
  )
}
