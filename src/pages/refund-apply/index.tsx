import {Button, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createRefund, getOrderDetail} from '@/db/api'

export default function RefundApply() {
  const router = useRouter()
  const {orderNo, itemIndex} = router.params
  const {user} = useAuth()
  const [order, setOrder] = useState<any>(null)
  const [reason, setReason] = useState('')
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

  const item = order?.items?.[parseInt(itemIndex || '0', 10)]
  const maxRefundAmount = item ? Number(item.subtotal) - Number(item.refunded_amount || 0) : 0

  const handleSubmit = async () => {
    if (!user || !order || !item) return
    if (!reason.trim()) {
      Taro.showToast({title: '请输入退款原因', icon: 'none'})
      return
    }

    setLoading(true)
    try {
      const {error} = await createRefund({
        order_no: order.order_no,
        item_index: parseInt(itemIndex || '0', 10),
        user_id: user.id,
        refund_amount: maxRefundAmount,
        refund_quantity: item.quantity, // 假设全部退款
        reason: reason,
        status: 'pending_review',
        initiated_by: 'user'
      })

      if (error) throw error

      Taro.showToast({title: '申请已提交', icon: 'success'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error: any) {
      Taro.showToast({title: error.message || '申请失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  if (!order || !item) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-24" scrollY>
        <View className="p-4">
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">退款商品</Text>
            <View className="flex items-center">
              <View className="flex-1">
                <Text className="text-base text-foreground font-medium mb-1">{item.sku_snapshot.name}</Text>
                <Text className="text-base text-muted-foreground">
                  ¥{item.unit_price} × {item.quantity}
                </Text>
              </View>
              <Text className="text-base font-bold text-primary">¥{item.subtotal}</Text>
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <View className="flex items-center justify-between mb-4">
              <Text className="text-base font-bold text-foreground">退款金额</Text>
              <Text className="text-xl font-bold text-primary">¥{maxRefundAmount}</Text>
            </View>
            <Text className="text-base text-muted-foreground">注：实付金额原路退回</Text>
          </View>

          <View className="bg-card rounded-xl p-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">退款原因 *</Text>
            <View className="bg-input rounded-xl border border-border p-3 min-h-[120px]">
              <Textarea
                className="w-full text-foreground text-base"
                placeholder="请详细说明您的退款原因，以便我们更快为您处理..."
                value={reason}
                onInput={(e) => setReason(e.detail.value)}
                maxlength={200}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card p-4 border-t border-border">
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-3 text-base font-bold break-keep"
          onClick={handleSubmit}
          loading={loading}>
          提交申请
        </Button>
      </View>
    </View>
  )
}
