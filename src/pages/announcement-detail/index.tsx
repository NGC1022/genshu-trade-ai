import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {getParkAnnouncements} from '@/db/api'
import {useLanguage} from '@/hooks/useLanguage'

interface Announcement {
  id: string
  title: string
  content: string
  publishDate: string
}

export default function AnnouncementDetail() {
  const language = useLanguage()
  const ui = useCallback((zh: string, en: string) => (language === 'en' ? en : zh), [language])
  const announcementText = (value: string) =>
    language === 'en'
      ? value === '开放时间调整通知'
        ? 'Opening Hours Update'
        : value.includes('根书文创园开放时间')
          ? 'Root Culture Park is open daily from 9:00 to 18:00. Last entry is at 17:30. The park normally remains open on public holidays; special notices will be posted in advance.'
          : 'Root Culture Park Announcement'
      : value
  const router = useRouter()
  const {id} = router.params
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAnnouncement() {
      if (!id) return
      setLoading(true)
      const {data, error} = await getParkAnnouncements()
      if (error) {
        Taro.showToast({title: ui('获取公告失败', 'Could not load the announcement'), icon: 'none'})
      } else {
        const found = data.find((a: any) => String(a.id) === String(id))
        if (found) {
          setAnnouncement({
            id: String(found.id),
            title: found.title,
            content: found.content,
            publishDate: found.created_at ? found.created_at.split('T')[0] : ''
          })
        }
      }
      setLoading(false)
    }
    loadAnnouncement()
  }, [id, ui])

  if (loading || !announcement) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-8">
        <View className="bg-card rounded-3xl p-12 shadow-card border border-border border-opacity-10 flex flex-col items-center">
          <View className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-6 animate-pulse">
            <View className="i-mdi-file-document-outline text-3xl text-white" />
          </View>

          <Text className="text-2xl font-bold text-foreground mb-3">{ui('加载中', 'Loading')}</Text>

          <Text className="text-base text-muted-foreground text-center leading-relaxed">
            {ui('正在获取公告详情，请稍候...', 'Loading announcement details...')}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="w-full" scrollY>
        <View className="px-6 py-8">
          <View className="bg-card rounded-3xl p-8 shadow-card border border-border border-opacity-10">
            <Text className="text-3xl font-black text-foreground mb-6 leading-snug">
              {announcementText(announcement.title)}
            </Text>

            <View className="h-4" />

            <View className="flex flex-row items-center mb-8">
              <View className="i-mdi-calendar text-xl text-muted-foreground mr-2" />
              <Text className="text-base text-muted-foreground">
                {ui('发布时间：', 'Published: ')}
                {announcement.publishDate}
              </Text>
            </View>

            <View className="h-6" />

            <View className="border-t border-border pt-8">
              <Text className="text-xl text-foreground leading-loose whitespace-pre-wrap">
                {announcementText(announcement.content)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
