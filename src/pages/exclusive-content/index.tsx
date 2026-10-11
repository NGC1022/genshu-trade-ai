import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import type {ExclusiveContent} from '@/db/types'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

export default function ExclusiveContentDetail() {
  const router = useRouter()
  const {id} = router.params
  const [content, setContent] = useState<ExclusiveContent | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const {data, error} = await supabase.from('exclusive_content').select('*').eq('id', id).maybeSingle()

    if (data) {
      setContent(data)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-xl text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  if (!content) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-xl text-muted-foreground">内容不存在</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full h-full" scrollY>
        <Image src={content.cover_image || DEFAULT_PRODUCT_IMAGE} className="w-full h-64" mode="aspectFill" />
        <View className="p-6 -mt-10 relative z-10">
          <View className="bg-card rounded-[32px] p-8 shadow-card border border-border border-opacity-10">
            <View className="bg-primary/10 self-start px-3 py-1 rounded-full mb-6">
              <Text className="text-sm text-primary font-black uppercase tracking-widest">{content.category}</Text>
            </View>
            <Text className="text-3xl font-black text-foreground mb-8 leading-snug tracking-tight">
              {content.title}
            </Text>

            <View className="h-[1px] bg-border/20 mb-8" />

            <View className="prose max-w-none">
              <Text className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {content.content}
              </Text>
            </View>

            <View className="mt-12 bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-row items-center">
              <View className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mr-4">
                <View className="i-mdi-shield-star text-2xl text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-black text-foreground block mb-1">会员专享内容</Text>
                <Text className="text-sm text-muted-foreground font-medium">感谢您对根书文化的关注与支持</Text>
              </View>
            </View>
          </View>

          {/* 底部导航 */}
          <View className="flex flex-row items-center justify-between py-10 px-4">
            <View className="flex flex-row items-center active:opacity-60" onClick={() => Taro.navigateBack()}>
              <View className="i-mdi-arrow-left text-xl text-primary mr-2" />
              <Text className="text-base font-bold text-primary">返回列表</Text>
            </View>
            <View className="flex flex-row items-center space-x-6">
              <View className="i-mdi-share-variant text-2xl text-muted-foreground active:text-primary transition-colors" />
              <View className="i-mdi-heart-outline text-2xl text-muted-foreground active:text-primary transition-colors" />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
