import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {getTicketTypeList} from '@/db/api'
import type {TicketType} from '@/db/types'

export default function Tickets() {
  const [tickets, setTickets] = useState<TicketType[]>([])

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
        <Text className="text-3xl font-black text-white block mb-6 tracking-wide">文旅门票</Text>
        <Text className="text-base text-white opacity-90 block">体验根书艺术 · 探索文化之旅</Text>
      </View>

      <ScrollView className="flex-1 px-4" scrollY>
        {tickets.map((ticket) => (
          <View
            key={ticket.id}
            className="bg-card rounded-xl overflow-hidden mb-4 shadow-card"
            onClick={() => navigateToDetail(ticket.id)}>
            {ticket.image_url && <Image src={ticket.image_url} className="w-full h-48" mode="aspectFill" />}
            <View className="p-4">
              <View className="flex items-start justify-between mb-2">
                <Text className="text-lg font-bold text-foreground flex-1">{ticket.name}</Text>
                <View className="bg-primary px-3 py-1 rounded-full ml-2">
                  <Text className="text-base text-white font-bold">特惠</Text>
                </View>
              </View>

              <Text className="text-base text-muted-foreground mb-3 line-clamp-2">{ticket.description}</Text>

              <View className="flex items-center justify-between">
                <View className="flex items-center">
                  <Text className="text-2xl font-bold text-primary mr-2">¥{ticket.price}</Text>
                  {ticket.original_price && (
                    <Text className="text-base text-muted-foreground line-through">¥{ticket.original_price}</Text>
                  )}
                </View>
                <View className="bg-gradient-primary px-6 py-2 rounded-full">
                  <Text className="text-base text-white font-medium">立即购买</Text>
                </View>
              </View>

              {ticket.validity_days && (
                <View className="mt-3 pt-3 border-t border-border">
                  <Text className="text-base text-muted-foreground">有效期：购买后{ticket.validity_days}天内有效</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
