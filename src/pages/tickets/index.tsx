import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {DEMO_TICKET_TYPES} from '@/data/demoCatalog'
import {getTicketTypeList} from '@/db/api'
import type {TicketType} from '@/db/types'
import {useLanguage} from '@/hooks/useLanguage'

export default function Tickets() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const localizeTicket = (text: string | null | undefined) => {
    if (!text || language !== 'en') return text || ''
    const known: Record<string, string> = {
      乐山大佛景区门票: 'Leshan Giant Buddha Scenic Area Ticket',
      根书艺术馆深度讲解: 'Root Calligraphy Museum Guided Tour',
      联票: 'Combo Ticket',
      根书文创园成人票: 'Root Culture Park Adult Ticket',
      根书文创园文化联票: 'Root Culture Park Combo Ticket',
      专题讲解服务: 'Themed Guided Tour'
    }
    if (known[text]) return known[text]
    let result = text.replace(/根书文创园/g, 'Root Culture Park').replace(/根书/g, 'Root Calligraphy')
    result = result.replace(/成人票/g, 'Adult Ticket').replace(/文化联票/g, 'Cultural Combo Ticket')
    return /[\u3400-\u9fff]/.test(result) ? 'Root Culture Ticket' : result
  }
  const [tickets, setTickets] = useState<TicketType[]>(DEMO_TICKET_TYPES)

  const loadData = useCallback(async () => {
    const {data} = await getTicketTypeList()
    setTickets(data)
  }, [])

  useDidShow(() => {
    loadData()
  })

  const navigateToDetail = (id: string) => {
    Taro.navigateTo({url: `/pages/ticket-detail/index?id=${id}`})
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <View className="bg-gradient-primary p-6 mb-4">
        <Text className="text-3xl font-black text-white block mb-6 tracking-wide">
          {ui('文旅门票', 'Cultural Experience Tickets')}
        </Text>
        <Text className="text-base text-white opacity-90 block">
          {ui('体验根书艺术 · 探索文化之旅', 'Experience Root Calligraphy · Explore a cultural journey')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4" scrollY>
        {tickets.map((ticket) => (
          <View
            key={ticket.id}
            className="bg-card rounded-xl overflow-hidden mb-4 shadow-card"
            onClick={() => navigateToDetail(ticket.id)}>
            {ticket.image_url && <Image src={ticket.image_url} className="w-full h-48" mode="aspectFill" lazyLoad />}
            <View className="p-4">
              <View className="flex items-start justify-between mb-2">
                <Text className="text-lg font-bold text-foreground flex-1">{localizeTicket(ticket.name)}</Text>
                <View className="bg-primary px-3 py-1 rounded-full ml-2">
                  <Text className="text-base text-white font-bold">{ui('特惠', 'Special')}</Text>
                </View>
              </View>

              <Text className="text-base text-muted-foreground mb-3 line-clamp-2">
                {localizeTicket(ticket.description)}
              </Text>

              <View className="flex items-center justify-between">
                <View className="flex items-center">
                  <Text className="text-2xl font-bold text-primary mr-2">¥{ticket.price}</Text>
                  {ticket.original_price && (
                    <Text className="text-base text-muted-foreground line-through">¥{ticket.original_price}</Text>
                  )}
                </View>
                <View className="bg-gradient-primary px-6 py-2 rounded-full">
                  <Text className="text-base text-white font-medium">{ui('立即购买', 'Buy now')}</Text>
                </View>
              </View>

              {ticket.validity_days && (
                <View className="mt-3 pt-3 border-t border-border">
                  <Text className="text-base text-muted-foreground">
                    {ui(
                      `有效期：购买后${ticket.validity_days}天内有效`,
                      `Valid for ${ticket.validity_days} days after purchase`
                    )}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
