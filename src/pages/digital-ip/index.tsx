import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {DEMO_DIGITAL_IPS, getDigitalIPList} from '@/db/api'
import type {DigitalIP} from '@/db/types'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

export default function DigitalIPPage() {
  const [ips, setIps] = useState<DigitalIP[]>(DEMO_DIGITAL_IPS)
  const [loading, _setLoading] = useState(false)

  const loadData = useCallback(async () => {
    const {data} = await getDigitalIPList()
    setIps(data)
  }, [])

  useDidShow(() => {
    loadData()
  })

  if (loading) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-xl text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full h-full" scrollY>
        <View className="p-6">
          {/* 标题部分 */}
          <View className="flex flex-col items-center py-10 mb-6">
            <View className="w-24 h-24 bg-gradient-primary rounded-[32px] flex items-center justify-center shadow-elegant mb-6">
              <View className="i-mdi-robot-happy text-5xl text-white" />
            </View>
            <Text className="text-3xl font-black text-foreground tracking-tighter mb-2">数字IP专区</Text>
            <Text className="text-base text-muted-foreground font-medium mb-1">
              根书文化拟人化探索 · 赋予艺术生命力
            </Text>
          </View>

          {ips.map((ip) => (
            <View key={ip.id} className="space-y-6">
              {/* IP形象展示 */}
              <View className="bg-card rounded-3xl overflow-hidden shadow-card border border-border border-opacity-10 mb-6">
                <Image src={ip.image_url || DEFAULT_PRODUCT_IMAGE} className="w-full h-80" mode="aspectFill" />
                <View className="p-6">
                  <Text className="text-3xl font-black text-primary mb-2 block">{ip.name}</Text>
                  <Text className="text-xl font-bold text-foreground mb-4 block">{ip.concept}</Text>
                  <View className="bg-primary/5 p-4 rounded-2xl border-l-4 border-primary">
                    <Text className="text-base text-primary font-bold leading-relaxed">{ip.highlights}</Text>
                  </View>
                </View>
              </View>

              {/* 设定板块 */}
              <View className="grid grid-cols-1 gap-6 mb-6">
                <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10">
                  <View className="flex flex-row items-center mb-4">
                    <View className="i-mdi-book-open-variant text-2xl text-primary mr-2" />
                    <Text className="text-xl font-bold text-foreground">背景故事</Text>
                  </View>
                  <Text className="text-base text-muted-foreground leading-relaxed">{ip.background_story}</Text>
                </View>

                <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10">
                  <View className="flex flex-row items-center mb-4">
                    <View className="i-mdi-account-details text-2xl text-primary mr-2" />
                    <Text className="text-xl font-bold text-foreground">角色设定</Text>
                  </View>
                  <Text className="text-base text-muted-foreground leading-relaxed">{ip.role_setting}</Text>
                </View>
              </View>

              {/* 漫画/插图系列 */}
              <View className="bg-card rounded-3xl p-6 mb-10 shadow-card border border-border border-opacity-10">
                <View className="flex flex-row items-center mb-6">
                  <View className="i-mdi-palette text-2xl text-primary mr-2" />
                  <Text className="text-xl font-bold text-foreground">系列插图</Text>
                </View>
                <View className="grid grid-cols-2 gap-4">
                  {ip.comic_strip?.map((img, idx) => (
                    <View key={idx} className="rounded-2xl overflow-hidden aspect-square shadow-sm">
                      <Image
                        src={img}
                        className="w-full h-full"
                        mode="aspectFill"
                        onClick={() => Taro.previewImage({urls: ip.comic_strip!, current: img})}
                      />
                    </View>
                  ))}
                </View>

                {/* 开发中提示 */}
                <View className="mt-6 bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col items-center">
                  <View className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <View className="i-mdi-hammer-wrench text-3xl text-primary" />
                  </View>
                  <Text className="text-lg font-black text-foreground mb-2 block">更多精彩内容</Text>
                  <Text className="text-base text-muted-foreground text-center leading-relaxed">
                    根宝的系列小漫画、动态表情包、互动小游戏等内容正在紧锣密鼓地制作中...
                  </Text>
                  <View className="bg-primary/10 px-4 py-2 rounded-full mt-4">
                    <Text className="text-sm text-primary font-black uppercase tracking-widest">Coming Soon</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* 底部版权 */}
          <View className="text-center pb-10">
            <Text className="text-sm text-muted-foreground font-medium block mb-1">© 2026 根书文创艺术有限公司</Text>
            <Text className="text-xs text-muted-foreground/40 font-bold tracking-widest uppercase">
              Digital IP Rights Reserved
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
