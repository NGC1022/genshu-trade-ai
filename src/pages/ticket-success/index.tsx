import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {getTicketsByOrderId} from '@/db/api'
import type {Ticket} from '@/db/types'

export default function TicketSuccess() {
  const router = useRouter()
  const {orderId} = router.params
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  const loadTickets = useCallback(async () => {
    try {
      const {data} = await getTicketsByOrderId(orderId!)
      if (data) {
        setTickets(data)
      }
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (orderId) {
      loadTickets()
    }
  }, [orderId, loadTickets])

  const handleViewTickets = () => {
    Taro.redirectTo({url: '/pages/my-tickets/index'})
  }

  const handleBackHome = () => {
    Taro.switchTab({url: '/pages/home/index'})
  }

  if (loading) {
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
          <View className="bg-card rounded-xl p-6 mb-4 shadow-card text-center">
            <View className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <View className="i-mdi-check-circle text-5xl text-green-600" />
            </View>
            <Text className="text-2xl font-bold text-foreground mb-2">购买成功</Text>
            <Text className="text-base text-muted-foreground">您的门票已生成</Text>
          </View>

          {tickets.length > 0 && (
            <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
              <Text className="text-base font-bold text-foreground mb-3">电子票信息</Text>
              {tickets.map((ticket, index) => (
                <View key={ticket.id} className="bg-gradient-primary rounded-xl p-4 mb-3 last:mb-0">
                  <View className="flex items-center justify-between mb-3">
                    <Text className="text-base font-bold text-white">
                      门票 {index + 1}/{tickets.length}
                    </Text>
                    <View className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                      <Text className="text-base text-white font-bold">
                        {ticket.status === 'unused' ? '未使用' : '已使用'}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-white rounded-lg p-4 mb-3">
                    <View className="w-full h-48 flex items-center justify-center bg-muted rounded-lg">
                      <View className="text-center">
                        <View className="i-mdi-qrcode text-6xl text-muted-foreground mb-2" />
                        <Text className="text-base text-muted-foreground">票号：{ticket.ticket_no}</Text>
                      </View>
                    </View>
                  </View>

                  <View className="space-y-2">
                    <View className="flex items-center justify-between">
                      <Text className="text-base text-white opacity-90">票号</Text>
                      <Text className="text-base text-white font-mono">{ticket.ticket_no}</Text>
                    </View>
                    <View className="flex items-center justify-between">
                      <Text className="text-base text-white opacity-90">状态</Text>
                      <Text className="text-base text-white">{ticket.status === 'unused' ? '有效' : '已使用'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <View className="flex items-center mb-3">
              <View className="i-mdi-information text-2xl text-primary mr-2" />
              <Text className="text-base font-bold text-foreground">使用说明</Text>
            </View>
            <View className="space-y-2">
              <View className="flex items-start py-1">
                <View className="i-mdi-check-circle text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-base text-muted-foreground flex-1">请在"我的门票"中查看完整的电子票二维码</Text>
              </View>
              <View className="flex items-start py-1">
                <View className="i-mdi-check-circle text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-base text-muted-foreground flex-1">入园时出示二维码给工作人员扫描核销</Text>
              </View>
              <View className="flex items-start py-1">
                <View className="i-mdi-check-circle text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-base text-muted-foreground flex-1">优惠票种需同时出示有效证件原件</Text>
              </View>
              <View className="flex items-start py-1">
                <View className="i-mdi-check-circle text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-base text-muted-foreground flex-1">每张门票仅限使用一次，核销后不可重复使用</Text>
              </View>
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <View className="flex items-center mb-3">
              <View className="i-mdi-alert-circle text-2xl text-yellow-600 mr-2" />
              <Text className="text-base font-bold text-foreground">重要提示</Text>
            </View>
            <View className="space-y-2">
              <View className="flex items-start py-1">
                <View className="w-1.5 h-1.5 bg-yellow-600 rounded-full mr-2 mt-1.5" />
                <Text className="text-base text-muted-foreground flex-1">请妥善保管电子票二维码，切勿泄露给他人</Text>
              </View>
              <View className="flex items-start py-1">
                <View className="w-1.5 h-1.5 bg-yellow-600 rounded-full mr-2 mt-1.5" />
                <Text className="text-base text-muted-foreground flex-1">建议提前截图保存，避免网络不佳时无法显示</Text>
              </View>
              <View className="flex items-start py-1">
                <View className="w-1.5 h-1.5 bg-yellow-600 rounded-full mr-2 mt-1.5" />
                <Text className="text-base text-muted-foreground flex-1">如遇问题请及时联系客服：400-123-4567</Text>
              </View>
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 shadow-card">
            <View className="flex items-center mb-3">
              <View className="i-mdi-shield-check text-2xl text-primary mr-2" />
              <Text className="text-base font-bold text-foreground">退款政策</Text>
            </View>
            <View className="space-y-2">
              <View className="flex items-start py-1">
                <View className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-1.5" />
                <Text className="text-base text-muted-foreground flex-1">门票一经售出，原则上不予退换</Text>
              </View>
              <View className="flex items-start py-1">
                <View className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-1.5" />
                <Text className="text-base text-muted-foreground flex-1">
                  如遇活动取消或场馆闭馆等特殊情况，将全额退款
                </Text>
              </View>
              <View className="flex items-start py-1">
                <View className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-1.5" />
                <Text className="text-base text-muted-foreground flex-1">
                  如因个人原因无法使用，可联系客服申请改期（限一次，需提前3天）
                </Text>
              </View>
              <View className="flex items-start py-1">
                <View className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-1.5" />
                <Text className="text-base text-muted-foreground flex-1">退款将在3-7个工作日内原路返回支付账户</Text>
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
            onClick={handleViewTickets}>
            查看门票
          </Button>
        </View>
      </View>
    </View>
  )
}
