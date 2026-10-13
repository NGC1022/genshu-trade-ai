import {Image, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {DEMO_CATALOG} from '@/data/demoCatalog'
import {getParkAnnouncements, getSKUList, getTicketTypeList} from '@/db/api'
import type {SKU, TicketType} from '@/db/types'
import {t} from '@/utils/i18n'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

interface Announcement {
  id: string
  title: string
  content: string
  priority: number
  created_at: string
}

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<SKU[]>(DEMO_CATALOG.slice(0, 4))
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const bannerImages = [
    'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_56bef55f-8db0-4be0-ae82-b856e5c27013.jpg',
    'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_d4b942e4-8cd2-4422-9d32-8840e287a1d0.jpg',
    'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_9d0dcb15-739e-4d60-854d-3f1e168ba65f.jpg',
    'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_ba4ba8b8-f8b6-46d2-a44d-18b2b5f319ec.jpg',
    'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2a8d03a4-978b-4d76-a5bc-38afffb68702.jpg'
  ]

  const otherApps = [
    {
      name: '智慧景区',
      icon: 'i-mdi-map-marker-radius',
      color: 'bg-blue-500',
      appId: 'wx1234567890'
    },
    {
      name: '景区导览',
      icon: 'i-mdi-account-voice',
      color: 'bg-green-500',
      appId: 'wx0987654321'
    },
    {
      name: '餐饮服务',
      icon: 'i-mdi-food-fork-drink',
      color: 'bg-orange-500',
      appId: 'wx1122334455'
    },
    {
      name: '周边住宿',
      icon: 'i-mdi-home-city',
      color: 'bg-purple-500',
      appId: 'wx6677889900'
    }
  ]

  const loadData = useCallback(async () => {
    const [{data: products}, {data: ticketData}, {data: announcementData}] = await Promise.all([
      getSKUList(),
      getTicketTypeList(),
      getParkAnnouncements()
    ])
    setFeaturedProducts((products.length > 0 ? products : DEMO_CATALOG).slice(0, 4))
    setTickets(ticketData)
    setAnnouncements(announcementData.slice(0, 3))
  }, [])

  useDidShow(() => {
    loadData()
  })

  const navigateToProducts = () => {
    Taro.switchTab({url: '/pages/products/index'})
  }

  const navigateToTickets = () => {
    Taro.navigateTo({url: '/pages/tickets/index'})
  }

  const navigateToCustomization = () => {
    Taro.switchTab({url: '/pages/customization/index'})
  }

  const navigateToProductDetail = (skuCode: string) => {
    Taro.navigateTo({url: `/pages/product-detail/index?skuCode=${skuCode}`})
  }

  const navigateToTicketDetail = (id: string) => {
    Taro.navigateTo({url: `/pages/ticket-detail/index?id=${id}`})
  }

  const openMiniProgram = (appId: string) => {
    // 根书文创园的地理位置
    const parkLocation = {
      latitude: 39.7,
      longitude: 116.0,
      name: '根书文创园',
      address: '北京市房山区青龙湖镇根书文创园'
    }

    // 景区导览和周边住宿使用地图定位
    if (appId === 'wx0987654321') {
      // 景区导览 - 打开地图查看景区位置
      Taro.openLocation({
        latitude: parkLocation.latitude,
        longitude: parkLocation.longitude,
        name: parkLocation.name,
        address: parkLocation.address,
        scale: 15
      }).catch(() => {
        Taro.showToast({
          title: '打开地图失败，请稍后重试',
          icon: 'none'
        })
      })
    } else if (appId === 'wx6677889900') {
      // 周边住宿 - 打开地图查看周边
      Taro.openLocation({
        latitude: parkLocation.latitude,
        longitude: parkLocation.longitude,
        name: '根书文创园周边',
        address: parkLocation.address,
        scale: 13
      }).catch(() => {
        Taro.showToast({
          title: '打开地图失败，请稍后重试',
          icon: 'none'
        })
      })
    } else {
      // 其他小程序跳转
      Taro.showToast({
        title: '此功能在生产环境下将跳转至对应小程序',
        icon: 'none'
      })
    }
  }

  return (
    <View className="bg-gradient-subtle preview-home-page">
      <ScrollView className="min-h-screen" scrollY>
        {/* 轮播图 */}
        <Swiper
          className="w-full h-64 home-hero"
          indicatorDots
          indicatorActiveColor="#FAC356"
          indicatorColor="rgba(255, 255, 255, 0.6)"
          autoplay
          interval={5000}
          circular>
          {bannerImages.map((src, index) => (
            <SwiperItem key={index}>
              <View className="relative w-full h-full overflow-hidden">
                <Image src={src} className="w-full h-full" mode="aspectFill" />
                {index === bannerImages.length - 1 && (
                  <View className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center p-6 text-center">
                    <View className="bg-white bg-opacity-10 backdrop-blur-sm p-4 rounded-xl border border-white border-opacity-30">
                      <Text className="text-white text-xl font-bold block mb-4">根书文创小程序</Text>
                      <Text className="text-white text-base opacity-90 block">提供门票预订、文创购买、个性定制</Text>
                      <Text className="text-white text-base opacity-90 block mt-2">等一站式文旅服务</Text>
                    </View>
                  </View>
                )}
              </View>
            </SwiperItem>
          ))}
        </Swiper>

        <View className="px-4 pb-6 mt-4">
          {/* 园区公告 */}
          {announcements.length > 0 && (
            <View className="mb-6">
              <View className="flex items-center justify-between mb-4">
                <View className="flex items-center">
                  <View className="w-1 h-5 bg-primary rounded-full mr-2 shadow-sm" />
                  <Text className="text-xl font-bold text-accent tracking-wide">{t('notice')}</Text>
                </View>
                <View
                  className="flex items-center active:opacity-60 transition-opacity"
                  onClick={() => Taro.navigateTo({url: '/pages/announcements/index'})}>
                  <Text className="text-base text-muted-foreground mr-1">更多</Text>
                  <View className="i-mdi-chevron-right text-muted-foreground text-xl" />
                </View>
              </View>
              <View className="space-y-4">
                {announcements.map((announcement, index) => (
                  <View
                    key={announcement.id}
                    className="bg-gradient-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 relative overflow-hidden transition-all active:scale-[0.98]"
                    onClick={() => Taro.navigateTo({url: `/pages/announcement-detail/index?id=${announcement.id}`})}>
                    <View
                      className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-accent'}`}
                    />
                    <View className="flex items-start relative z-10">
                      <View
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center mr-4 shrink-0 shadow-sm ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-accent'}`}>
                        <View className="i-mdi-bullhorn text-xl text-white" />
                      </View>
                      <View className="flex-1 flex flex-col space-y-2">
                        <Text className="text-lg font-bold text-foreground">{announcement.title}</Text>

                        <Text className="text-base text-muted-foreground line-clamp-2 leading-relaxed opacity-80">
                          {announcement.content}
                        </Text>
                      </View>
                      <View className="i-mdi-chevron-right text-2xl text-muted-foreground ml-2" />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 快捷导航 - 圆形设计 */}
          <View className="grid grid-cols-4 gap-4 mb-8 home-quick-nav">
            <View
              className="flex flex-col items-center group active:scale-95 transition-transform"
              onClick={navigateToProducts}>
              <View className="w-16 h-16 bg-gradient-primary rounded-[20px] flex items-center justify-center mb-2 shadow-elegant transition-all">
                <View className="i-mdi-shopping text-3xl text-white" />
              </View>
              <Text className="text-base text-accent font-bold tracking-tight">{t('products')}</Text>
            </View>
            <View
              className="flex flex-col items-center group active:scale-95 transition-transform"
              onClick={navigateToTickets}>
              <View className="w-16 h-16 bg-gradient-secondary rounded-[20px] flex items-center justify-center mb-2 shadow-elegant transition-all">
                <View className="i-mdi-ticket text-3xl text-white" />
              </View>
              <Text className="text-base text-accent font-bold tracking-tight">{t('tickets')}</Text>
            </View>
            <View
              className="flex flex-col items-center group active:scale-95 transition-transform"
              onClick={navigateToCustomization}>
              <View className="w-16 h-16 bg-accent rounded-[20px] flex items-center justify-center mb-2 shadow-elegant transition-all">
                <View className="i-mdi-palette text-3xl text-white" />
              </View>
              <Text className="text-base text-accent font-bold tracking-tight">{t('customization')}</Text>
            </View>
            <View
              className="flex flex-col items-center group active:scale-95 transition-transform"
              onClick={() => Taro.navigateTo({url: '/pages/member-center/index'})}>
              <View className="w-16 h-16 bg-gradient-primary rounded-[20px] flex items-center justify-center mb-2 shadow-elegant transition-all">
                <View className="i-mdi-crown text-3xl text-white" />
              </View>
              <Text className="text-base text-accent font-bold tracking-tight">会员中心</Text>
            </View>
          </View>

          {/* 精选文创 - 不规则卡片 */}
          <View className="mb-8">
            <View className="flex items-center justify-between mb-4">
              <View className="flex items-center">
                <View className="w-1 h-5 bg-primary rounded-full mr-2 shadow-sm" />
                <Text className="text-xl font-bold text-accent tracking-wide">{t('featured')}</Text>
              </View>
              <View className="flex items-center active:opacity-60 transition-opacity" onClick={navigateToProducts}>
                <Text className="text-base text-muted-foreground mr-1">{t('view_more')}</Text>
                <View className="i-mdi-chevron-right text-muted-foreground" />
              </View>
            </View>

            {/* 根宝IP新品推荐 */}
            <View
              className="bg-gradient-primary rounded-[32px] p-6 mb-6 shadow-elegant relative overflow-hidden active:scale-[0.98] transition-all home-featured-banner"
              onClick={navigateToProducts}>
              <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <View className="flex flex-row items-center justify-between relative z-10">
                <View className="flex-1 mr-4">
                  <View className="bg-white/20 self-start px-2 py-0.5 rounded mb-2 inline-block">
                    <Text className="text-xs text-white font-black uppercase tracking-widest">New Arrival</Text>
                  </View>
                  <Text className="text-2xl font-black text-white block mb-2 tracking-tight">根宝IP周边新品上市</Text>
                  <Text className="text-base text-white/80 leading-relaxed">
                    钥匙扣、徽章、抱枕、帆布袋现已开启发售，快来带根宝回家吧！
                  </Text>
                </View>
                <View className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center shadow-sm backdrop-blur-sm">
                  <View className="i-mdi-gift-outline text-4xl text-white" />
                </View>
              </View>
            </View>

            <View className="grid grid-cols-2 gap-4 home-product-grid">
              {featuredProducts.map((product) => (
                <View
                  key={product.id}
                  className="bg-card overflow-hidden shadow-card border border-border border-opacity-10 rounded-3xl active:scale-[0.98] transition-all"
                  onClick={() => navigateToProductDetail(product.sku_code)}>
                  <Image src={product.image_url || DEFAULT_PRODUCT_IMAGE} className="w-full h-44" mode="aspectFill" />
                  <View className="p-4">
                    <Text className="text-base font-bold text-foreground mb-1.5 line-clamp-1">{product.name}</Text>
                    <View className="flex items-center justify-between">
                      <Text className="text-xl font-black text-primary">¥{product.price}</Text>
                      {product.category === 'premium' && (
                        <View className="bg-secondary/20 px-2 py-0.5 rounded-lg border border-secondary/30">
                          <Text className="text-xs text-accent font-bold uppercase">{t('premium')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 新增看板 - 数字IP专区 */}
          <View
            className="bg-card rounded-[32px] p-6 mb-8 shadow-card border border-border border-opacity-10 relative overflow-hidden active:scale-[0.98] transition-all"
            onClick={() => Taro.navigateTo({url: '/pages/digital-ip/index'})}>
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
            <View className="flex flex-row items-center justify-between relative z-10">
              <View className="flex-1 mr-4">
                <View className="bg-primary/10 self-start px-2 py-0.5 rounded mb-2 inline-block">
                  <Text className="text-xs text-primary font-black uppercase tracking-widest">Digital IP</Text>
                </View>
                <Text className="text-2xl font-black text-foreground block mb-2 tracking-tight">
                  根书拟人化：数字IP专区
                </Text>
                <Text className="text-base text-muted-foreground leading-relaxed">
                  探索古老根书与现代数字艺术的奇妙碰撞，见证传统文化的焕新升级。
                </Text>
                <View className="flex flex-row items-center mt-4">
                  <Text className="text-base text-primary font-black uppercase tracking-widest mr-1">立即开启探索</Text>
                  <View className="i-mdi-arrow-right text-primary text-xl" />
                </View>
              </View>
              <View className="w-24 h-24 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-sm">
                <View className="i-mdi-robot-happy text-5xl text-white" />
              </View>
            </View>
          </View>

          {/* AI跨境贸易助手入口 */}
          <View
            className="bg-card rounded-[32px] p-6 mb-8 shadow-card border border-border border-opacity-10 relative overflow-hidden active:scale-[0.98] transition-all"
            onClick={() => Taro.navigateTo({url: '/pages/ai-trade/index'})}>
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/5 rounded-full blur-2xl" />
            <View className="flex flex-row items-center justify-between relative z-10">
              <View className="flex-1 mr-4">
                <View className="bg-secondary/10 self-start px-2 py-0.5 rounded mb-2 inline-block">
                  <Text className="text-xs text-secondary font-black uppercase tracking-widest">
                    AI Trade Assistant
                  </Text>
                </View>
                <Text className="text-2xl font-black text-foreground block mb-2 tracking-tight">AI跨境贸易助手</Text>
                <Text className="text-base text-muted-foreground leading-relaxed">
                  商品国际化、海外市场分析、跨境询盘与智能报价，非遗文创出海的全流程AI辅助。
                </Text>
                <View className="flex flex-row items-center mt-4">
                  <Text className="text-base text-secondary font-black uppercase tracking-widest mr-1">
                    立即开启探索
                  </Text>
                  <View className="i-mdi-arrow-right text-secondary text-xl" />
                </View>
              </View>
              <View className="w-24 h-24 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-sm">
                <View className="i-mdi-earth-box text-5xl text-white" />
              </View>
            </View>
          </View>

          {/* 更多应用 - 菱形设计优化 */}
          <View className="mb-8">
            <View className="flex items-center mb-4">
              <View className="w-1 h-5 bg-secondary rounded-full mr-2 shadow-sm" />
              <Text className="text-xl font-bold text-accent tracking-wide">{t('more')}</Text>
            </View>
            <View className="grid grid-cols-2 gap-4 home-other-apps-grid">
              {otherApps.map((app, index) => (
                <View
                  key={index}
                  className="bg-card rounded-3xl p-4 flex items-center shadow-card border border-border border-opacity-10 active:scale-[0.98] transition-all"
                  onClick={() => openMiniProgram(app.appId)}>
                  <View
                    className={`${app.color} w-10 h-10 rounded-xl flex items-center justify-center mr-4 shadow-sm rotate-12`}>
                    <View className={`${app.icon} text-xl text-white -rotate-12`} />
                  </View>
                  <Text className="text-base text-foreground font-bold tracking-tight">{app.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 文旅门票 - 圆角卡片优化 */}
          <View>
            <View className="flex items-center justify-between mb-4">
              <View className="flex items-center">
                <View className="w-1 h-5 bg-accent rounded-full mr-2 shadow-sm" />
                <Text className="text-xl font-bold text-accent tracking-wide">{t('tickets')}</Text>
              </View>
              <View className="flex items-center active:opacity-60 transition-opacity" onClick={navigateToTickets}>
                <Text className="text-base text-muted-foreground mr-1">{t('view_more')}</Text>
                <View className="i-mdi-chevron-right text-muted-foreground" />
              </View>
            </View>
            {tickets.map((ticket) => (
              <View
                key={ticket.id}
                className="bg-card rounded-[32px] p-6 mb-5 shadow-card border border-border border-opacity-10 relative overflow-hidden active:scale-[0.99] transition-all"
                onClick={() => navigateToTicketDetail(ticket.id)}>
                <View className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <View className="flex items-start justify-between mb-3 relative z-10">
                  <Text className="text-lg font-bold text-foreground flex-1 leading-snug">{ticket.name}</Text>
                  <View className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    <Text className="text-xs text-primary font-bold">限时优惠</Text>
                  </View>
                </View>
                <Text className="text-base text-muted-foreground mb-4 line-clamp-2 leading-relaxed relative z-10 opacity-80">
                  {ticket.description}
                </Text>
                <View className="flex items-center justify-between relative z-10">
                  <View className="flex items-baseline">
                    <Text className="text-2xl font-black text-primary mr-2">¥{ticket.price}</Text>
                    {ticket.original_price && (
                      <Text className="text-base text-muted-foreground line-through opacity-60">
                        ¥{ticket.original_price}
                      </Text>
                    )}
                  </View>
                  <View className="bg-gradient-primary px-6 py-2.5 rounded-full shadow-elegant active:scale-95 transition-transform">
                    <Text className="text-base text-white font-bold">{t('book_now')}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
