import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {DEMO_TICKET_TYPES} from '@/data/demoCatalog'
import {getTicketTypeDetail} from '@/db/api'
import type {TicketType} from '@/db/types'
import {useLanguage} from '@/hooks/useLanguage'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

type TicketTypeKey = 'adult' | 'child_free' | 'teen' | 'senior' | 'student' | 'disabled' | 'hmt' | 'foreigner'

export default function TicketPricing() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const router = useRouter()
  const {id} = router.params
  const [ticket, setTicket] = useState<TicketType | null>(
    () => DEMO_TICKET_TYPES.find((item) => item.id === id) || null
  )
  const [selectedType, setSelectedType] = useState<TicketTypeKey>('adult')
  const [quantity, setQuantity] = useState(1)
  const [showPolicyDetail, setShowPolicyDetail] = useState(false)

  const loadTicket = useCallback(async () => {
    if (!id) return
    const fallback = DEMO_TICKET_TYPES.find((item) => item.id === id)
    if (fallback) setTicket(fallback)
    const result = await Promise.race([
      getTicketTypeDetail(id),
      new Promise<{data: null}>((resolve) => setTimeout(() => resolve({data: null}), 1200))
    ])
    if (result.data) setTicket(result.data)
  }, [id])

  useEffect(() => {
    if (id) {
      loadTicket()
    }
  }, [id, loadTicket])

  const basePrice = ticket?.price || 0

  const ticketTypes = [
    {
      type: 'adult' as TicketTypeKey,
      name: ui('成人票', 'Adult'),
      price: basePrice,
      discount: ui('原价', 'Standard'),
      description: ui('18周岁以上成人', 'Adults aged 18 and above'),
      conditions: ui('需出示有效身份证件', 'Valid identity document required'),
      icon: 'i-mdi-account'
    },
    {
      type: 'child_free' as TicketTypeKey,
      name: ui('儿童免票', 'Child (free)'),
      price: 0,
      discount: ui('免费', 'Free'),
      description: ui('6周岁及以下儿童', 'Children aged 6 and under'),
      conditions: ui(
        '需由成人陪同，出示户口本或身份证',
        'Must be accompanied by an adult; household register or ID required'
      ),
      icon: 'i-mdi-baby-face'
    },
    {
      type: 'teen' as TicketTypeKey,
      name: ui('青少年票', 'Youth'),
      price: Math.floor(basePrice * 0.5),
      discount: ui('5折', '50% off'),
      description: ui('7-18周岁以下未成年人', 'Minors aged 7–17'),
      conditions: ui('需出示身份证或学生证', 'ID card or student card required'),
      icon: 'i-mdi-human-child'
    },
    {
      type: 'senior' as TicketTypeKey,
      name: ui('敬老票', 'Senior'),
      price: Math.floor(basePrice * 0.5),
      discount: ui('5折', '50% off'),
      description: ui('60周岁以上老年人', 'Visitors aged 60 and above'),
      conditions: ui('需出示身份证或老年证', 'ID card or senior card required'),
      icon: 'i-mdi-human-cane'
    },
    {
      type: 'student' as TicketTypeKey,
      name: ui('大学生票', 'University student'),
      price: Math.floor(basePrice * 0.7),
      discount: ui('7折', '30% off'),
      description: ui('全日制在校大学生（含研究生）', 'Full-time university students, including graduate students'),
      conditions: ui(
        '需出示学生证，限本人使用（记得携带学生证）',
        'Student card required; valid for the named student only'
      ),
      icon: 'i-mdi-school'
    },
    {
      type: 'disabled' as TicketTypeKey,
      name: ui('身心障碍票', 'Accessibility ticket'),
      price: Math.floor(basePrice * 0.5),
      discount: ui('5折', '50% off'),
      description: ui('持有效残疾证人士', 'Visitors with a valid disability certificate'),
      conditions: ui(
        '需出示残疾证，陪同人员1名享同等优惠',
        'Disability certificate required; one companion receives the same discount'
      ),
      icon: 'i-mdi-wheelchair-accessibility'
    },
    {
      type: 'hmt' as TicketTypeKey,
      name: ui('港澳台票', 'Hong Kong, Macao & Taiwan'),
      price: Math.floor(basePrice * 0.7),
      discount: ui('7折', '30% off'),
      description: ui('港澳台同胞', 'Visitors from Hong Kong, Macao, or Taiwan'),
      conditions: ui('需出示港澳通行证或台胞证', 'Valid travel permit required'),
      icon: 'i-mdi-passport'
    },
    {
      type: 'foreigner' as TicketTypeKey,
      name: ui('外籍人士票', 'International visitor'),
      price: Math.floor(basePrice * 0.9),
      discount: ui('9折', '10% off'),
      description: ui('外国友人', 'International visitors'),
      conditions: ui('需出示护照', 'Passport required'),
      icon: 'i-mdi-earth'
    }
  ]

  const handleBuy = () => {
    if (!ticket) return
    const selectedTicketType = ticketTypes.find((t) => t.type === selectedType)
    if (!selectedTicketType) return
    Taro.navigateTo({
      url: `/pages/ticket-confirm/index?id=${ticket.id}&quantity=${quantity}&ticketType=${selectedType}&unitPrice=${selectedTicketType.price}`
    })
  }

  const incrementQuantity = () => {
    if (quantity < 10) {
      setQuantity(quantity + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  if (!ticket) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Text className="text-muted-foreground">{ui('加载中...', 'Loading...')}</Text>
      </View>
    )
  }

  const selectedTicketType = ticketTypes.find((t) => t.type === selectedType)
  const totalPrice = (selectedTicketType?.price || 0) * quantity

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-32" scrollY>
        {ticket.image_url && (
          <View className="w-full h-48 bg-muted">
            <Image src={ticket.image_url || DEFAULT_PRODUCT_IMAGE} className="w-full h-full" mode="aspectFill" />
          </View>
        )}

        <View className="p-4">
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-2xl font-bold text-foreground">{ticket.name}</Text>

            {ticket.description && (
              <Text className="text-base text-muted-foreground leading-relaxed mt-4">{ticket.description}</Text>
            )}
          </View>

          {/* 景点介绍区块 */}
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-accent">{ui('景点介绍', 'Attraction introduction')}</Text>

            <View className="space-y-4 mt-4">
              <View className="bg-muted bg-opacity-30 p-4 rounded-xl border border-border border-opacity-30">
                <Text className="text-base font-bold text-foreground">
                  {ui('联名景区付费景点', 'Partner attractions')}
                </Text>

                <View className="mt-2">
                  <Text className="text-base text-muted-foreground leading-relaxed">
                    {ui(
                      '包含根书艺术体验馆、古法造纸坊、活字印刷体验区。周边包含：青龙湖湿地公园、云雾山观景台等。',
                      'Includes the Root Calligraphy experience hall, traditional papermaking workshop, and movable-type printing area. Nearby attractions include Qinglong Lake Wetland Park and Yunwu Mountain lookout.'
                    )}
                  </Text>
                </View>
              </View>
              <View className="bg-secondary bg-opacity-10 p-4 rounded-xl border border-secondary border-opacity-20">
                <Text className="text-base font-bold text-accent">{ui('持票福利', 'Ticket benefits')}</Text>

                <View className="mt-2">
                  <Text className="text-base text-muted-foreground leading-relaxed">
                    凭此套票在景区内任意指定纪念品商店购买周边商品，可享受{' '}
                    <Text className="text-primary font-bold">9折</Text> 优惠。
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 价格说明区块 */}
          <View className="bg-blue-50 rounded-xl p-4 mb-4 border-2 border-blue-200">
            <View className="flex items-center">
              <View className="i-mdi-information text-2xl text-blue-600 mr-2" />
              <Text className="text-base font-bold text-blue-900">{ui('票价说明', 'Price information')}</Text>
            </View>

            <View className="space-y-2 mt-4">
              <View className="flex items-start">
                <View className="i-mdi-check-circle text-lg text-blue-600 mr-2 mt-0.5" />
                <Text className="text-base text-blue-900 flex-1">
                  {ui(
                    '票价已包含所有税费及入场费用，无需额外支付',
                    'The ticket price includes taxes and admission; no extra payment is required.'
                  )}
                </Text>
              </View>
              <View className="flex items-start">
                <View className="i-mdi-check-circle text-lg text-blue-600 mr-2 mt-0.5" />
                <Text className="text-base text-blue-900 flex-1">
                  优惠票种需在入园时出示相应有效证件，否则需补齐差价
                </Text>
              </View>
              <View className="flex items-start">
                <View className="i-mdi-check-circle text-lg text-blue-600 mr-2 mt-0.5" />
                <Text className="text-base text-blue-900 flex-1">
                  {ui(
                    '门票一经售出，概不退换。如遇特殊情况请联系客服',
                    'Tickets are non-refundable after purchase. Contact support for exceptional circumstances.'
                  )}
                </Text>
              </View>
            </View>
          </View>

          {/* 票种选择 */}
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground">{ui('选择票种', 'Choose ticket type')}</Text>

            <View className="space-y-3 mt-4">
              {ticketTypes.map((type) => (
                <View
                  key={type.type}
                  className={`border-2 rounded-xl p-4 ${selectedType === type.type ? 'border-selected-bg bg-selected-bg' : 'border-border'}`}
                  onClick={() => setSelectedType(type.type)}>
                  <View className="flex items-start justify-between mb-2">
                    <View className="flex items-center flex-1">
                      <View
                        className={`${type.icon} text-2xl ${selectedType === type.type ? 'text-selected-text' : 'text-primary'} mr-2`}
                      />
                      <View className="flex-1 flex flex-col space-y-2">
                        <View className="flex items-center">
                          <Text
                            className={`text-base font-bold ${selectedType === type.type ? 'text-selected-text' : 'text-foreground'} mr-2`}>
                            {type.name}
                          </Text>
                          <View
                            className={`${selectedType === type.type ? 'bg-selected-text' : 'bg-primary'} px-2 py-0.5 rounded`}>
                            <Text
                              className={`text-base ${selectedType === type.type ? 'text-selected-bg' : 'text-white'} font-bold`}>
                              {type.discount}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className={`text-base ${selectedType === type.type ? 'text-selected-text opacity-80' : 'text-muted-foreground'}`}>
                          {type.description}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className={`text-xl font-bold ${selectedType === type.type ? 'text-selected-text' : 'text-primary'} ml-2`}>
                      {type.price === 0 ? '免费' : `¥${type.price}`}
                    </Text>
                  </View>
                  <View
                    className={`${selectedType === type.type ? 'bg-black bg-opacity-20' : 'bg-muted'} rounded-lg px-3 py-2 mt-2`}>
                    <Text
                      className={`text-base ${selectedType === type.type ? 'text-selected-text' : 'text-foreground'}`}>
                      {type.conditions}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 购买数量 */}
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground">{ui('购买数量', 'Quantity')}</Text>

            <View className="flex items-center justify-between mt-4">
              <Text className="text-base text-muted-foreground">{ui('选择数量', 'Select quantity')}</Text>
              <View className="flex items-center">
                <View
                  className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"
                  onClick={decrementQuantity}>
                  <View className="i-mdi-minus text-lg text-foreground" />
                </View>
                <Text className="text-lg font-bold text-foreground mx-4">{quantity}</Text>
                <View
                  className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"
                  onClick={incrementQuantity}>
                  <View className="i-mdi-plus text-lg text-white" />
                </View>
              </View>
            </View>
          </View>

          {/* 退款政策 - 可展开 */}
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <View className="flex items-center justify-between" onClick={() => setShowPolicyDetail(!showPolicyDetail)}>
              <View className="flex items-center">
                <View className="i-mdi-shield-check text-xl text-primary mr-2" />
                <Text className="text-base font-bold text-foreground">
                  {ui('退款与取消政策', 'Refund and cancellation policy')}
                </Text>
              </View>
              <View
                className={`i-mdi-chevron-down text-xl text-muted-foreground transition-transform ${showPolicyDetail ? 'rotate-180' : ''}`}
              />
            </View>

            {showPolicyDetail && (
              <View className="mt-4 pt-4 border-t border-border space-y-3">
                <View>
                  <Text className="text-base font-bold text-foreground mb-2">
                    {ui('退款说明', 'Refund information')}
                  </Text>
                  <View className="space-y-2">
                    <View className="flex items-start">
                      <View className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-1.5" />
                      <Text className="text-base text-muted-foreground flex-1">门票一经售出，原则上不予退换</Text>
                    </View>
                    <View className="flex items-start">
                      <View className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-1.5" />
                      <Text className="text-base text-muted-foreground flex-1">
                        如遇活动取消或场馆闭馆等特殊情况，将全额退款
                      </Text>
                    </View>
                    <View className="flex items-start">
                      <View className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-1.5" />
                      <Text className="text-base text-muted-foreground flex-1">
                        退款将在3-7个工作日内原路返回支付账户
                      </Text>
                    </View>
                  </View>
                </View>

                <View>
                  <Text className="text-base font-bold text-foreground mb-2">
                    {ui('特殊情况处理', 'Special circumstances')}
                  </Text>
                  <View className="space-y-2">
                    <View className="flex items-start">
                      <View className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-1.5" />
                      <Text className="text-base text-muted-foreground flex-1">
                        如因个人原因无法使用，可联系客服申请改期（限一次）
                      </Text>
                    </View>
                    <View className="flex items-start">
                      <View className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-1.5" />
                      <Text className="text-base text-muted-foreground flex-1">改期需在原定参观日期前3天提出申请</Text>
                    </View>
                  </View>
                </View>

                <View className="bg-yellow-50 rounded-lg p-3 mt-3">
                  <View className="flex items-start">
                    <View className="i-mdi-alert text-lg text-yellow-600 mr-2 mt-0.5" />
                    <Text className="text-base text-yellow-800 flex-1">
                      客服热线：400-123-4567（工作时间：9:00-18:00）
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 使用须知 */}
          <View className="bg-card rounded-xl p-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">{ui('使用须知', 'Important information')}</Text>
            <View className="space-y-2">
              <View className="flex items-start py-1">
                <View className="i-mdi-clock-outline text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-base text-muted-foreground flex-1">
                  门票自购买之日起{ticket.validity_days}天内有效
                </Text>
              </View>
              <View className="flex items-start py-1">
                <View className="i-mdi-qrcode text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-base text-muted-foreground flex-1">一人一票，凭电子票二维码入园</Text>
              </View>
              <View className="flex items-start py-1">
                <View className="i-mdi-card-account-details text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-base text-muted-foreground flex-1">优惠票种需在入园时出示有效证件原件</Text>
              </View>
              <View className="flex items-start py-1">
                <View className="i-mdi-camera-off text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-base text-muted-foreground flex-1">场馆内禁止使用闪光灯拍照，请爱护展品</Text>
              </View>
              <View className="flex items-start py-1">
                <View className="i-mdi-smoking-off text-lg text-primary mr-2 mt-0.5" />
                <Text className="text-base text-muted-foreground flex-1">场馆内禁止吸烟、饮食，请保持环境整洁</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card p-4 border-t border-border">
        <View className="flex items-center justify-between mb-3">
          <View>
            <Text className="text-base text-muted-foreground">总计</Text>
            <Text className="text-2xl font-bold text-primary">{totalPrice === 0 ? '免费' : `¥${totalPrice}`}</Text>
          </View>
          <Button
            className="bg-gradient-primary text-white rounded-full px-8 py-3 text-base font-bold break-keep"
            onClick={handleBuy}>
            立即购买
          </Button>
        </View>
      </View>
    </View>
  )
}
