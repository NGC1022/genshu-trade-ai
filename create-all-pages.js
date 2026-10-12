const fs = require('fs');
const path = require('path');

const pages = {
  'ticket-detail': `import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {getTicketTypeDetail} from '@/db/api'
import type {TicketType} from '@/db/types'

export default function TicketDetail() {
  const router = useRouter()
  const {id} = router.params
  const [ticket, setTicket] = useState<TicketType | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (id) {
      loadTicket()
    }
  }, [id])

  const loadTicket = async () => {
    const {data} = await getTicketTypeDetail(id!)
    if (data) {
      setTicket(data)
    }
  }

  const handleBuy = () => {
    if (!ticket) return
    Taro.navigateTo({
      url: \`/pages/ticket-confirm/index?id=\${ticket.id}&quantity=\${quantity}\`
    })
  }

  if (!ticket) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1" scrollY>
        {ticket.image_url && (
          <Image src={ticket.image_url} className="w-full h-64" mode="aspectFill" />
        )}

        <View className="bg-card rounded-t-3xl p-6 mt--4">
          <Text className="text-2xl font-bold text-foreground mb-2">{ticket.name}</Text>
          <View className="flex items-center mb-4">
            <Text className="text-3xl font-bold text-primary mr-3">¥{ticket.price}</Text>
            {ticket.original_price && (
              <Text className="text-lg text-muted-foreground line-through">
                ¥{ticket.original_price}
              </Text>
            )}
          </View>

          <View className="border-t border-border pt-4 mb-4">
            <Text className="text-base font-bold text-foreground mb-2">门票介绍</Text>
            <Text className="text-sm text-muted-foreground leading-relaxed">
              {ticket.description}
            </Text>
          </View>

          <View className="border-t border-border pt-4 mb-4">
            <Text className="text-base font-bold text-foreground mb-3">使用须知</Text>
            <View className="space-y-2">
              {ticket.validity_days && (
                <View className="flex items-start py-1">
                  <View className="i-mdi-clock-outline text-lg text-primary mr-2 mt-0.5" />
                  <Text className="text-sm text-muted-foreground flex-1">
                    有效期：购买后{ticket.validity_days}天内有效
                  </Text>
                </View>
              )}
              <View className="flex items-start py-1">
                <View className="i-mdi-information-outline text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-sm text-muted-foreground flex-1">
                  请提前预约参观时间，凭电子票券入场
                </Text>
              </View>
              <View className="flex items-start py-1">
                <View className="i-mdi-qrcode text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-sm text-muted-foreground flex-1">
                  入场时请出示二维码进行核销
                </Text>
              </View>
            </View>
          </View>

          <View className="border-t border-border pt-4">
            <Text className="text-base font-bold text-foreground mb-3">购买数量</Text>
            <View className="flex items-center">
              <View
                className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <View className="i-mdi-minus text-xl text-foreground" />
              </View>
              <Text className="text-lg font-bold text-foreground mx-6">{quantity}</Text>
              <View
                className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center"
                onClick={() => setQuantity(quantity + 1)}>
                <View className="i-mdi-plus text-xl text-foreground" />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="bg-card p-4 border-t border-border">
        <View className="flex items-center justify-between mb-3">
          <Text className="text-sm text-muted-foreground">合计：</Text>
          <Text className="text-2xl font-bold text-primary">¥{ticket.price * quantity}</Text>
        </View>
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-3 text-lg font-bold break-keep"
          onClick={handleBuy}>
          立即购买
        </Button>
      </View>
    </View>
  )
}`,

  'ticket-confirm': `import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useAuth} from '@/contexts/AuthContext'
import {useEffect, useState} from 'react'
import {createTicketOrder, getTicketTypeDetail} from '@/db/api'
import type {TicketType} from '@/db/types'

export default function TicketConfirm() {
  const router = useRouter()
  const {user} = useAuth()
  const {id, quantity} = router.params
  const [ticket, setTicket] = useState<TicketType | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadTicket()
    }
  }, [id])

  const loadTicket = async () => {
    const {data} = await getTicketTypeDetail(id!)
    if (data) {
      setTicket(data)
    }
  }

  const handleSubmit = async () => {
    if (!user || !ticket) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    setLoading(true)

    try {
      const {data, error} = await createTicketOrder({
        user_id: user.id,
        ticket_type_id: ticket.id,
        quantity: parseInt(quantity || '1'),
        unit_price: ticket.price,
        total_amount: ticket.price * parseInt(quantity || '1')
      })

      if (error) throw error

      Taro.showToast({title: '购买成功', icon: 'success'})
      setTimeout(() => {
        Taro.redirectTo({url: '/pages/my-tickets/index'})
      }, 1500)
    } catch (error: any) {
      Taro.showToast({title: error.message || '购买失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  if (!ticket) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  const totalAmount = ticket.price * parseInt(quantity || '1')

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-24" scrollY>
        <View className="p-4">
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">门票信息</Text>
            <View className="flex items-center justify-between py-2">
              <Text className="text-sm text-foreground">{ticket.name}</Text>
              <Text className="text-sm font-bold text-primary">¥{ticket.price}</Text>
            </View>
            <View className="flex items-center justify-between py-2">
              <Text className="text-sm text-muted-foreground">购买数量</Text>
              <Text className="text-sm text-foreground">{quantity}张</Text>
            </View>
            {ticket.validity_days && (
              <View className="flex items-center justify-between py-2">
                <Text className="text-sm text-muted-foreground">有效期</Text>
                <Text className="text-sm text-foreground">购买后{ticket.validity_days}天</Text>
              </View>
            )}
          </View>

          <View className="bg-card rounded-xl p-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">费用明细</Text>
            <View className="flex items-center justify-between py-2">
              <Text className="text-sm text-muted-foreground">门票费用</Text>
              <Text className="text-sm text-foreground">¥{totalAmount}</Text>
            </View>
            <View className="border-t border-border pt-2 mt-2">
              <View className="flex items-center justify-between">
                <Text className="text-base font-bold text-foreground">实付金额</Text>
                <Text className="text-xl font-bold text-primary">¥{totalAmount}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card p-4 border-t border-border">
        <View className="flex items-center justify-between mb-3">
          <Text className="text-sm text-muted-foreground">合计：</Text>
          <Text className="text-xl font-bold text-primary">¥{totalAmount}</Text>
        </View>
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-3 text-base font-bold break-keep"
          onClick={handleSubmit}
          loading={loading}>
          确认购买
        </Button>
      </View>
    </View>
  )
}`,

  'my-tickets': `import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from '@/contexts/AuthContext'
import {useCallback, useState} from 'react'
import {getUserTickets} from '@/db/api'
import type {Ticket} from '@/db/types'

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
    Taro.navigateTo({url: \`/pages/ticket-qr/index?ticketNo=\${ticketNo}\`})
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      unused: '未使用',
      used: '已使用',
      expired: '已过期'
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
    {key: 'expired', label: '已过期'},
    {key: 'all', label: '全部'}
  ]

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <View className="bg-card px-4 py-3 flex gap-4 overflow-x-auto">
        {tabs.map((tab) => (
          <View
            key={tab.key}
            className={\`px-4 py-2 rounded-full whitespace-nowrap \${activeTab === tab.key ? 'bg-primary' : 'bg-muted'}\`}
            onClick={() => setActiveTab(tab.key)}>
            <Text className={\`text-sm \${activeTab === tab.key ? 'text-white font-bold' : 'text-foreground'}\`}>
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
                    {ticket.ticket_type_snapshot.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    票号：{ticket.ticket_no}
                  </Text>
                </View>
                <View className={\`px-3 py-1 rounded-full \${ticket.status === 'unused' ? 'bg-green-100' : 'bg-muted'}\`}>
                  <Text className={\`text-sm font-bold \${getStatusColor(ticket.status)}\`}>
                    {getStatusText(ticket.status)}
                  </Text>
                </View>
              </View>

              <View className="border-t border-border pt-3 space-y-2">
                <View className="flex items-center justify-between">
                  <Text className="text-sm text-muted-foreground">购买时间</Text>
                  <Text className="text-sm text-foreground">
                    {new Date(ticket.created_at).toLocaleDateString('zh-CN')}
                  </Text>
                </View>
                {ticket.valid_until && (
                  <View className="flex items-center justify-between">
                    <Text className="text-sm text-muted-foreground">有效期至</Text>
                    <Text className="text-sm text-foreground">
                      {new Date(ticket.valid_until).toLocaleDateString('zh-CN')}
                    </Text>
                  </View>
                )}
                {ticket.used_at && (
                  <View className="flex items-center justify-between">
                    <Text className="text-sm text-muted-foreground">使用时间</Text>
                    <Text className="text-sm text-foreground">
                      {new Date(ticket.used_at).toLocaleString('zh-CN')}
                    </Text>
                  </View>
                )}
              </View>

              {ticket.status === 'unused' && (
                <View className="mt-3 pt-3 border-t border-border flex items-center justify-center">
                  <View className="i-mdi-qrcode text-xl text-primary mr-2" />
                  <Text className="text-sm text-primary font-medium">点击查看二维码</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}`
};

Object.entries(pages).forEach(([pageName, content]) => {
  const filePath = path.join(__dirname, 'src', 'pages', pageName, 'index.tsx');
  fs.writeFileSync(filePath, content);
  console.log(\`Updated \${pageName}/index.tsx\`);
});

console.log('Pages created successfully!');
