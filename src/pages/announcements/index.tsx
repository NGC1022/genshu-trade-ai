import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {getParkAnnouncements} from '@/db/api'
import {useLanguage} from '@/hooks/useLanguage'

interface Announcement {
  id: string
  title: string
  content: string
  priority: number
  created_at: string
}

export default function Announcements() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const announcementText = (value: string) =>
    language === 'en'
      ? value === '开放时间调整通知'
        ? 'Opening Hours Update'
        : value.includes('根书文创园开放时间')
          ? 'Root Culture Park is open daily from 9:00 to 18:00. Last entry is at 17:30. The park normally remains open on public holidays; special notices will be posted in advance.'
          : 'Root Culture Park Announcement'
      : value
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const loadData = useCallback(async () => {
    const {data} = await getParkAnnouncements()
    setAnnouncements(data)
  }, [])

  useDidShow(() => {
    loadData()
  })

  const navigateToDetail = (id: string) => {
    Taro.navigateTo({url: `/pages/announcement-detail/index?id=${id}`})
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="w-full" scrollY>
        <View className="px-6 py-8">
          <View className="flex flex-col space-y-4">
            {announcements.map((announcement, index) => (
              <View
                key={announcement.id}
                className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 active:scale-[0.98] transition-all"
                onClick={() => navigateToDetail(announcement.id)}>
                <View className="flex items-start">
                  <View
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center mr-4 shrink-0 shadow-sm ${index % 3 === 0 ? 'bg-primary' : index % 3 === 1 ? 'bg-secondary' : 'bg-accent'}`}>
                    <View className="i-mdi-bullhorn text-xl text-white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-foreground mb-2 block">
                      {announcementText(announcement.title)}
                    </Text>
                    <Text className="text-base text-muted-foreground line-clamp-2 leading-relaxed opacity-80">
                      {announcementText(announcement.content)}
                    </Text>
                    <View className="h-4" />
                    <View className="flex flex-row items-center justify-between">
                      <Text className="text-base text-muted-foreground">
                        {announcement.created_at ? announcement.created_at.split('T')[0] : ''}
                      </Text>
                      <View className="flex flex-row items-center">
                        <Text className="text-base text-primary font-bold mr-1">{ui('查看详情', 'View details')}</Text>
                        <View className="i-mdi-chevron-right text-primary text-xl" />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {announcements.length === 0 && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-text-box-search-outline text-6xl text-muted-foreground/30 mb-4" />
              <Text className="text-base text-muted-foreground">{ui('暂无公告内容', 'No announcements yet')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
