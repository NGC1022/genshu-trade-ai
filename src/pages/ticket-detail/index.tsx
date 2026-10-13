import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {DEMO_TICKET_TYPES} from '@/data/demoCatalog'
import {getTicketTypeDetail} from '@/db/api'
import type {TicketType} from '@/db/types'

export default function TicketDetail() {
  const router = useRouter()
  const {id} = router.params
  const [ticket, setTicket] = useState<TicketType | null>(
    () => DEMO_TICKET_TYPES.find((item) => item.id === id) || null
  )
  const [loadError, setLoadError] = useState(false)
  const [_quantity, _setQuantity] = useState(1)

  const loadTicket = useCallback(async () => {
    if (!id) {
      setLoadError(true)
      return
    }
    const fallback = DEMO_TICKET_TYPES.find((item) => item.id === id) || null
    if (fallback) setTicket(fallback)

    try {
      const result = await Promise.race([
        getTicketTypeDetail(id),
        new Promise<{data: null}>((resolve) => setTimeout(() => resolve({data: null}), 1500))
      ])
      if (result.data) setTicket(result.data)
      else if (!fallback) setLoadError(true)
    } catch {
      if (!fallback) setLoadError(true)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      loadTicket()
    }
  }, [id, loadTicket])

  const handleBuy = () => {
    if (!ticket) return
    Taro.navigateTo({url: `/pages/ticket-pricing/index?id=${ticket.id}`})
  }

  if (!ticket && !loadError) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  if (!ticket && loadError) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center px-6">
        <Text className="text-lg font-bold text-foreground mb-2">暂时找不到该门票</Text>
        <Text className="text-sm text-muted-foreground text-center mb-4">请返回门票列表后重新选择票种。</Text>
        <Button className="bg-primary text-white rounded-full px-6 py-2" onClick={() => Taro.navigateBack()}>
          返回门票列表
        </Button>
      </View>
    )
  }

  if (!ticket) return null

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1" scrollY>
        {ticket.image_url && <Image src={ticket.image_url} className="w-full h-64" mode="aspectFill" />}

        <View className="bg-card rounded-t-3xl p-6 mt--4">
          <Text className="text-2xl font-bold text-foreground">{ticket.name}</Text>

          <View className="flex items-center mt-3">
            <Text className="text-3xl font-bold text-primary mr-3">¥{ticket.price}</Text>
            {ticket.original_price && (
              <Text className="text-lg text-muted-foreground line-through">¥{ticket.original_price}</Text>
            )}
          </View>

          <View className="border-t border-border pt-4 mt-6 mb-4">
            <Text className="text-xl font-bold text-accent block mb-4">票种包含内容</Text>

            <View className="space-y-4">
              {ticket.name.includes('联票') ? (
                <View className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                  <View className="flex flex-row items-center mb-4">
                    <View className="i-mdi-ticket-confirmation text-2xl text-primary mr-3" />
                    <Text className="text-lg font-black text-foreground">乐山大佛景区门票</Text>
                  </View>
                  <View className="flex flex-row items-center mb-4">
                    <View className="i-mdi-account-tie-voice text-2xl text-primary mr-3" />
                    <Text className="text-lg font-black text-foreground">根书艺术馆深度讲解</Text>
                  </View>
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-gift text-2xl text-primary mr-3" />
                    <Text className="text-lg font-black text-foreground">文创店专属9折优惠权益</Text>
                  </View>
                </View>
              ) : ticket.name.includes('乐山大佛') ? (
                <View className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-ticket-confirmation text-2xl text-primary mr-3" />
                    <Text className="text-lg font-black text-foreground">乐山大佛景区成人票(单票)</Text>
                  </View>
                </View>
              ) : (
                <View className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-information-outline text-2xl text-primary mr-3" />
                    <Text className="text-lg font-black text-foreground">{ticket.description}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View className="border-t border-border pt-4 mb-4">
            <Text className="text-xl font-bold text-accent block mb-4">景点介绍</Text>

            <View className="space-y-6 mt-6">
              <View className="bg-muted bg-opacity-50 p-6 rounded-xl border border-border">
                <Text className="text-base font-bold text-foreground block mb-4">联名景区付费景点</Text>

                <View>
                  <Text className="text-base text-muted-foreground leading-relaxed">
                    包含根书艺术体验馆、古法造纸坊、活字印刷体验区。周边包含：青龙湖湿地公园、云雾山观景台等。
                  </Text>
                </View>
              </View>
              <View className="bg-secondary bg-opacity-20 p-6 rounded-xl border border-secondary border-opacity-30">
                <Text className="text-base font-bold text-accent block mb-4">持票福利</Text>

                <View>
                  <Text className="text-base text-muted-foreground leading-relaxed">
                    凭此套票在景区内任意指定纪念品商店购买周边商品，可享受{' '}
                    <Text className="text-primary font-bold">9折</Text> 优惠。
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="border-t border-border pt-4 mb-4">
            <Text className="text-base font-bold text-accent">使用须知</Text>

            <View className="space-y-2 mt-3">
              {ticket.validity_days && (
                <View className="flex items-start py-1">
                  <View className="i-mdi-clock-outline text-lg text-primary mr-2 mt-0.5" />
                  <Text className="text-base text-muted-foreground flex-1">
                    有效期：购买后{ticket.validity_days}天内有效
                  </Text>
                </View>
              )}
              <View className="flex items-start py-1">
                <View className="i-mdi-information-outline text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-base text-muted-foreground flex-1">请提前预约参观时间，凭电子票券入场</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="bg-card p-4 border-t border-border">
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-4 text-lg font-bold shadow-elegant break-keep"
          onClick={handleBuy}>
          立即预订
        </Button>
      </View>
    </View>
  )
}
