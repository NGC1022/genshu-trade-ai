import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getUserTickets} from '@/db/api'
import type {Ticket} from '@/db/types'
import {formatDate, formatDateTime} from '@/utils/time'

export default function MyTickets() {
  const {user} = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [activeTab, setActiveTab] = useState<string>('unused')

  const loadTickets = useCallback(async () => {
    if (!user) return
    const status = activeTab === 'all' ? undefined : activeTab
    const {data} = await getUserTickets(user.id, status as any)
    setTickets(data)
  }, [user, activeTab])

  useDidShow(() => {
    loadTickets()
  })

  const navigateToQR = (ticketNo: string) => {
    Taro.navigateTo({url: `/pages/ticket-qr/index?ticketNo=${ticketNo}`})
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      unused: '未使用',
      used: '已使用',
      expired: '已过期/已退款'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      unused: 'text-green-600',
      used: 'text-muted-foreground',
      expired: 'text-red-600'
    }
    return colorMap[status] || 'text-foreground'
  }

  const tabs = [
    {key: 'unused', label: '未使用'},
    {key: 'used', label: '已使用'},
    {key: 'expired', label: '已过期/退款'},
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
        {tickets.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <View className="i-mdi-ticket text-6xl text-muted-foreground mb-4" />
            <Text className="text-muted-foreground">暂无门票</Text>
          </View>
        ) : (
          tickets.map((ticket) => (
            <View
              key={ticket.id}
              className="bg-card rounded-xl p-4 mb-4 shadow-card"
              onClick={() => ticket.status === 'unused' && navigateToQR(ticket.ticket_no)}>
              <View className="flex items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground mb-1">
                    {ticket.ticket_type_snapshot?.name || '未知票种'}
                  </Text>
                  <Text className="text-base text-muted-foreground">票号：{ticket.ticket_no}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${ticket.status === 'unused' ? 'bg-green-100' : 'bg-muted'}`}>
                  <Text className={`text-base font-bold ${getStatusColor(ticket.status)}`}>
                    {getStatusText(ticket.status)}
                  </Text>
                </View>
              </View>

              <View className="border-t border-border pt-3 space-y-2">
                <View className="flex items-center justify-between">
                  <Text className="text-base text-muted-foreground">购买时间</Text>
                  <Text className="text-base text-foreground">{formatDate(ticket.created_at)}</Text>
                </View>
                {ticket.valid_until && (
                  <View className="flex items-center justify-between">
                    <Text className="text-base text-muted-foreground">有效期至</Text>
                    <Text className="text-base text-foreground">{formatDate(ticket.valid_until)}</Text>
                  </View>
                )}
                {ticket.used_at && (
                  <View className="flex items-center justify-between">
                    <Text className="text-base text-muted-foreground">使用时间</Text>
                    <Text className="text-base text-foreground">{formatDateTime(ticket.used_at)}</Text>
                  </View>
                )}
              </View>

              {ticket.status === 'unused' && (
                <View className="mt-3 pt-3 border-t border-border flex items-center justify-center">
                  <View className="i-mdi-qrcode text-xl text-primary mr-2" />
                  <Text className="text-base text-primary font-medium">点击查看二维码</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}
