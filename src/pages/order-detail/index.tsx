import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {cancelOrderAndReleaseStock, getAfterSales, getOrderDetail} from '@/db/api'
import type {Order} from '@/db/types'
import {ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS} from '@/db/types'
import {getOpenId, requestDemoPayment, requestWechatPay} from '@/utils/payment'
import {formatDateTime} from '@/utils/time'

export default function OrderDetail() {
  const router = useRouter()
  const {orderNo} = router.params
  const {profile, refreshProfile, user} = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)

  const loadOrder = useCallback(async () => {
    const {data} = await getOrderDetail(orderNo!)
    if (data) {
      setOrder(data)
    }
  }, [orderNo])

  useEffect(() => {
    if (orderNo) {
      loadOrder()
    }
  }, [orderNo, loadOrder])

  // 轮询支付状态（支付状态未终态时持续刷新）
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (order?.payment_status === 'pending' || order?.payment_status === 'processing') {
      timer = setInterval(() => {
        loadOrder()
      }, 3000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [order?.payment_status, loadOrder])

  const handlePay = async () => {
    if (!order || !profile) return
    setLoading(true)
    try {
      let success = false
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        const openid = await getOpenId(profile, refreshProfile)
        if (!openid) throw new Error('支付环境初始化失败')
        success = await requestWechatPay(order.order_no, openid, 'goods')
      } else {
        Taro.showLoading({title: '课堂演示支付中...'})
        success = await requestDemoPayment(order.order_no, Number(order.total_amount))
        Taro.hideLoading()
      }
      if (success) {
        await loadOrder()
      }
    } catch (error: any) {
      Taro.showToast({title: error.message || '发起支付失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!order) return
    const {confirm} = await Taro.showModal({
      title: '确认取消订单',
      content: '取消后库存将自动释放，是否继续？',
      confirmText: '确认取消',
      cancelText: '再想想'
    })
    if (!confirm) return

    setLoading(true)
    try {
      const {error} = await cancelOrderAndReleaseStock(order.order_no, '用户主动取消')
      if (error) throw error
      Taro.showToast({title: '已取消订单', icon: 'success'})
      await loadOrder()
    } catch (error: any) {
      Taro.showToast({title: error.message || '取消失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = (itemIndex: number) => {
    Taro.navigateTo({
      url: `/pages/refund-apply/index?orderNo=${order?.order_no}&itemIndex=${itemIndex}`
    })
  }

  const getStatusText = (status: string) => ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] || status
  const getPaymentStatusText = (status?: string) =>
    PAYMENT_STATUS_LABELS[status as keyof typeof PAYMENT_STATUS_LABELS] || status || '待支付'

  const getDeliveryMethodText = (method: string) => {
    return method === 'express' ? '快速配送' : '线下自提'
  }

  // 国际物流轨迹节点与清关进度（仅海外订单）
  const isOverseasOrder = !!order?.address_snapshot?.is_overseas
  const orderStatus = order?.status || ''
  const showLogistics = isOverseasOrder && (orderStatus === 'shipped' || orderStatus === 'completed')

  // 订单全生命周期13节点状态机（演示物流数据，按当前状态推导）
  const LIFECYCLE_NODES = useMemo(
    () => [
      {key: 'pending', title: '待付款', desc: '订单创建，等待买家付款'},
      {key: 'paid', title: '已付款', desc: '支付成功，款项已到账'},
      {key: 'preparing', title: '备货中', desc: '仓库拣货打包，准备发货'},
      {key: 'shipped', title: '已发货', desc: '包裹已从文创园仓库发出'},
      {key: 'in_transit', title: '国际运输中', desc: '国际干线运输（空运/海运）'},
      {key: 'customs', title: '目的国清关', desc: '目的国海关申报查验'},
      {key: 'customs_cleared', title: '清关完成', desc: '海关放行，税费核定完成'},
      {key: 'last_mile', title: '末端配送', desc: '当地快递揽收派送'},
      {key: 'delivered', title: '已签收', desc: '买家已签收包裹'},
      {key: 'completed', title: '订单完成', desc: '订单交易完成'}
    ],
    []
  )

  // 按订单当前状态推导已到达节点
  const reachedIndex = useMemo(() => {
    const idx = LIFECYCLE_NODES.findIndex((n) => n.key === orderStatus)
    if (idx >= 0) return idx
    if (['after_sales', 'refunding', 'refunded'].includes(orderStatus)) {
      return LIFECYCLE_NODES.findIndex((n) => n.key === 'delivered')
    }
    return 0
  }, [orderStatus, LIFECYCLE_NODES])

  // 演示物流时间（基于订单创建时间按节点间隔推算，非实时数据）
  const logisticsNodes = useMemo(() => {
    const base = order?.created_at ? new Date(order.created_at).getTime() : Date.now()
    const hoursOffset = [0, 0.5, 24, 48, 72, 120, 144, 168, 192, 240]
    return LIFECYCLE_NODES.map((node, idx) => ({
      ...node,
      done: idx <= reachedIndex,
      current: idx === reachedIndex,
      time: new Date(base + hoursOffset[idx] * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' '),
      carrier:
        idx >= 3 && idx <= 6 ? '国际干线：演示国际物流（I-Demo-Express）' : idx >= 7 ? '末端承运：USPS（演示）' : ''
    }))
  }, [order?.created_at, reachedIndex, LIFECYCLE_NODES.map])

  // 清关4态：待清关/清关中/清关完成/清关异常（演示数据）
  const customsStep = useMemo(() => {
    if (['customs_cleared', 'last_mile', 'delivered', 'completed'].includes(orderStatus))
      return {label: '清关完成', percent: 100, color: 'bg-emerald-500'}
    if (orderStatus === 'customs') return {label: '清关中', percent: 60, color: 'bg-primary'}
    if (['in_transit', 'shipped'].includes(orderStatus)) return {label: '待清关', percent: 40, color: 'bg-amber-400'}
    return {label: '待清关', percent: 20, color: 'bg-amber-400'}
  }, [orderStatus])

  // 已有清关异常售后记录时显示"清关异常"态（演示：从售后单推导）
  const [hasCustomsIssue, setHasCustomsIssue] = useState(false)
  useEffect(() => {
    if (!order || !user) return
    getAfterSales(user.id).then(({data}) => {
      setHasCustomsIssue(
        (data || []).some((r) => r.order_no === order.order_no && r.type === 'damage' && r.status !== 'completed')
      )
    })
  }, [order, user])

  const customsDisplay = hasCustomsIssue ? {label: '清关异常', percent: 75, color: 'bg-red-400'} : customsStep

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
            <View className="i-mdi-check-circle text-4xl text-white mr-3" />
            <View>
              <View className="flex items-center gap-2 mb-1">
                <Text className="text-xl font-bold text-white">{getStatusText(order.status)}</Text>
                <Text className="text-sm text-white/80 px-2 py-0.5 bg-white/15 rounded-full">
                  {getPaymentStatusText(order.payment_status)}
                </Text>
              </View>
              <Text className="text-base text-white opacity-90">{formatDateTime(order.created_at)}</Text>
            </View>
          </View>
        </View>

        <View className="px-4">
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">配送信息</Text>
            <View className="flex items-start">
              <View className="i-mdi-map-marker text-xl text-primary mr-3 mt-1" />
              <View className="flex-1">
                <Text className="text-base text-foreground font-medium mb-1">
                  {getDeliveryMethodText(order.delivery_method)}
                </Text>
                {order.delivery_method === 'express' && order.address_snapshot && (
                  <View>
                    <Text className="text-base text-foreground mb-1">
                      {order.address_snapshot.receiver_name} {order.address_snapshot.phone}
                    </Text>
                    <Text className="text-base text-muted-foreground">
                      {order.address_snapshot.province} {order.address_snapshot.city} {order.address_snapshot.district}{' '}
                      {order.address_snapshot.detail}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* 国际物流轨迹 + 清关进度（仅海外订单，演示物流数据） */}
          {showLogistics ? (
            <View className="bg-card rounded-xl p-4 mb-4 shadow-card border border-primary/15">
              <View className="flex flex-row items-center mb-1">
                <View className="i-mdi-truck-check text-xl text-primary mr-2" />
                <Text className="text-base font-bold text-foreground">国际物流轨迹</Text>
                <Text className="text-xs text-muted-foreground ml-2">({order.address_snapshot?.country})</Text>
              </View>
              <View className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-3 flex flex-row items-center">
                <View className="i-mdi-information-outline text-base text-amber-600 mr-1.5" />
                <Text className="text-xs text-amber-700 leading-relaxed flex-1">
                  演示物流数据：当前未接入实时物流API，节点与时间为按订单状态推算的课堂演示数据
                </Text>
              </View>

              {/* 轨迹节点（含时间/状态/说明/物流信息） */}
              <View className="pl-1">
                {logisticsNodes.map((node, idx) => (
                  <View key={node.key} className="flex flex-row">
                    <View className="flex flex-col items-center mr-3">
                      <View
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          node.done ? 'bg-primary' : 'bg-muted'
                        }`}>
                        <View
                          className={`i-mdi-check text-sm ${node.done ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                        />
                      </View>
                      {idx < logisticsNodes.length - 1 ? (
                        <View
                          className={`w-0.5 flex-1 my-1 ${node.done ? 'bg-primary/40' : 'bg-border'}`}
                          style={{minHeight: '24px'}}
                        />
                      ) : null}
                    </View>
                    <View className="flex-1 pb-4">
                      <View className="flex flex-row items-center justify-between">
                        <Text
                          className={`text-base font-bold ${node.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {node.title}
                        </Text>
                        {node.current && (
                          <View className="bg-primary/10 rounded-full px-2.5 py-0.5">
                            <Text className="text-xs text-primary font-bold">当前节点</Text>
                          </View>
                        )}
                      </View>
                      {node.done ? (
                        <Text className="text-xs text-muted-foreground mt-0.5 block">{node.time}</Text>
                      ) : null}
                      <Text className="text-xs text-muted-foreground mt-0.5 block">{node.desc}</Text>
                      {node.done && node.carrier ? (
                        <Text className="text-xs text-muted-foreground/80 mt-0.5 block">{node.carrier}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>

              {/* 清关状态进度条（4态：待清关/清关中/清关完成/清关异常） */}
              <View className="mt-2 bg-muted/50 rounded-xl p-4">
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-bold text-foreground">清关状态</Text>
                  <Text className={`text-sm font-bold ${hasCustomsIssue ? 'text-red-500' : 'text-primary'}`}>
                    {customsDisplay.label}
                  </Text>
                </View>
                <View className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full transition-all ${customsDisplay.color}`}
                    style={{width: `${customsDisplay.percent}%`}}
                  />
                </View>
                <Text className="text-xs text-muted-foreground mt-2 block">
                  清关进度为演示数据，实际以目的国海关核定结果为准
                </Text>
              </View>
            </View>
          ) : isOverseasOrder ? (
            <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
              <View className="flex flex-row items-center">
                <View className="i-mdi-package-variant-closed text-xl text-muted-foreground mr-2" />
                <Text className="text-base text-muted-foreground">海外订单待发货后可查看国际物流轨迹</Text>
              </View>
            </View>
          ) : null}

          {/* 售后入口：售后期/已签收/已完成的跨境或国内订单可申请售后 */}
          {order.status !== 'pending' && order.status !== 'cancelled' && (
            <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center flex-1">
                  <View className="i-mdi-headset text-xl text-primary mr-2" />
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">售后中心</Text>
                    <Text className="text-xs text-muted-foreground">退货、换货、退款、物流破损申报</Text>
                  </View>
                </View>
                <View
                  className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5"
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages/after-sales/index?orderNo=${order.order_no}`
                    })
                  }>
                  <Text className="text-xs text-primary font-bold">申请售后</Text>
                </View>
              </View>
            </View>
          )}

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">商品清单</Text>
            {order.items.map((item, index) => (
              <View key={index} className="py-3 border-t border-border first:border-t-0">
                <View className="flex items-center mb-2">
                  <View className="flex-1">
                    <Text className="text-base text-foreground font-medium mb-1">{item.sku_snapshot.name}</Text>
                    <Text className="text-base text-muted-foreground">
                      ¥{item.unit_price} × {item.quantity}
                    </Text>
                  </View>
                  <Text className="text-base font-bold text-primary">¥{item.subtotal}</Text>
                </View>
                {order.status === 'paid' && (
                  <Button
                    className="w-full bg-muted text-foreground rounded-lg py-2 text-base break-keep mt-2"
                    onClick={() => handleRefund(index)}>
                    申请退款
                  </Button>
                )}
              </View>
            ))}
          </View>

          <View className="bg-card rounded-xl p-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">费用明细</Text>
            <View className="flex items-center justify-between py-2">
              <Text className="text-base text-muted-foreground">商品总额</Text>
              <Text className="text-base text-foreground">¥{order.total_amount}</Text>
            </View>
            <View className="border-t border-border pt-2 mt-2">
              <View className="flex items-center justify-between">
                <Text className="text-base font-bold text-foreground">实付金额</Text>
                <Text className="text-xl font-bold text-primary">¥{order.total_amount}</Text>
              </View>
            </View>
            {order.status === 'pending' && (
              <View className="flex flex-col gap-3 mt-4">
                <Button
                  className="w-full bg-gradient-primary text-white rounded-full py-4 text-lg font-bold break-keep"
                  onClick={handlePay}
                  loading={loading}>
                  去支付
                </Button>
                <Button
                  className="w-full border border-border text-foreground rounded-full py-4 text-lg font-bold break-keep"
                  onClick={handleCancel}
                  loading={loading}>
                  取消订单
                </Button>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
