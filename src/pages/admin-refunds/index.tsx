import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {approveRefund, getAllRefunds, updateRefundStatus} from '@/db/api'
import type {Refund} from '@/db/types'

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [activeTab, setActiveTab] = useState<string>('pending_review')
  const [loading, setLoading] = useState(false)

  const loadRefunds = useCallback(async () => {
    const status = activeTab === 'all' ? undefined : activeTab
    const {data} = await getAllRefunds(status as any)
    setRefunds(data)
  }, [activeTab])

  useDidShow(() => {
    loadRefunds()
  })

  const handleApprove = async (refund: Refund) => {
    Taro.showModal({
      title: '确认退款',
      content: `确定要同意该笔退款申请吗？金额 ¥${refund.refund_amount} 将原路退回。`,
      success: async (res) => {
        if (res.confirm) {
          setLoading(true)
          try {
            const {error} = await approveRefund(
              refund.id,
              refund.order_no,
              refund.item_index,
              Number(refund.refund_amount),
              refund.reason || '管理员同意退款'
            )
            if (error) throw error
            Taro.showToast({title: '退款指令已发出', icon: 'success'})
            loadRefunds()
          } catch (error: any) {
            Taro.showToast({title: error.message || '操作失败', icon: 'none'})
          } finally {
            setLoading(false)
          }
        }
      }
    })
  }

  const handleReject = (refundId: string) => {
    Taro.showModal({
      title: '拒绝退款',
      success: async (res: any) => {
        if (res.confirm) {
          setLoading(true)
          try {
            const {error} = await updateRefundStatus(refundId, 'closed', '管理员拒绝退款')
            if (error) throw error
            Taro.showToast({title: '已拒绝退款', icon: 'success'})
            loadRefunds()
          } catch (error: any) {
            Taro.showToast({title: error.message || '操作失败', icon: 'none'})
          } finally {
            setLoading(false)
          }
        }
      }
    } as any)
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending_review: '待审核',
      processing: '退款中',
      completed: '已完成',
      closed: '已关闭',
      abnormal: '退款异常'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending_review: 'text-yellow-600',
      processing: 'text-blue-600',
      completed: 'text-muted-foreground',
      closed: 'text-red-600',
      abnormal: 'text-red-600'
    }
    return colorMap[status] || 'text-foreground'
  }

  const tabs = [
    {key: 'pending_review', label: '待审核'},
    {key: 'processing', label: '退款中'},
    {key: 'completed', label: '已完成'},
    {key: 'closed', label: '已关闭'},
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
        {refunds.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <View className="i-mdi-cash-refund text-6xl text-muted-foreground mb-4" />
            <Text className="text-muted-foreground">暂无退款申请</Text>
          </View>
        ) : (
          refunds.map((refund) => (
            <View key={refund.id} className="bg-card rounded-xl p-4 mb-4 shadow-card">
              <View className="flex items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground mb-1">退款申请 #{refund.refund_no}</Text>
                  <Text className="text-base text-muted-foreground">订单号：{refund.order_no}</Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${refund.status === 'pending_review' ? 'bg-yellow-100' : 'bg-muted'}`}>
                  <Text className={`text-base font-bold ${getStatusColor(refund.status)}`}>
                    {getStatusText(refund.status)}
                  </Text>
                </View>
              </View>

              <View className="bg-muted rounded-lg p-3 mb-3">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-base text-muted-foreground">退款数量</Text>
                  <Text className="text-base text-foreground">{refund.refund_quantity}件</Text>
                </View>
                <View className="flex items-center justify-between">
                  <Text className="text-base text-muted-foreground">退款金额</Text>
                  <Text className="text-lg font-bold text-primary">¥{refund.refund_amount}</Text>
                </View>
              </View>

              {refund.reason && (
                <View className="mb-3">
                  <Text className="text-base text-muted-foreground mb-1">退款原因</Text>
                  <Text className="text-base text-foreground">{refund.reason}</Text>
                </View>
              )}

              <View className="flex items-center justify-between pt-3 border-t border-border">
                <Text className="text-base text-muted-foreground">
                  申请时间：{new Date(refund.created_at).toLocaleString('zh-CN')}
                </Text>
              </View>

              {refund.status === 'pending_review' && (
                <View className="flex gap-3 mt-3">
                  <Button
                    className="flex-1 bg-muted text-foreground rounded-lg py-2 text-base break-keep"
                    onClick={() => handleReject(refund.id)}
                    disabled={loading}>
                    拒绝
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-primary text-white rounded-lg py-2 text-base break-keep"
                    onClick={() => handleApprove(refund)}
                    loading={loading}>
                    同意退款
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
