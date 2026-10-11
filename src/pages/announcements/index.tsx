import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {getParkAnnouncements} from '@/db/api'

interface Announcement {
  id: string
  title: string
  content: string
  priority: number
  created_at: string
}

export default function Announcements() {
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
                    <Text className="text-xl font-bold text-foreground mb-2 block">{announcement.title}</Text>
                    <Text className="text-base text-muted-foreground line-clamp-2 leading-relaxed opacity-80">
                      {announcement.content}
                    </Text>
                    <View className="h-4" />
                    <View className="flex flex-row items-center justify-between">
                      <Text className="text-base text-muted-foreground">
                        {announcement.created_at ? announcement.created_at.split('T')[0] : ''}
                      </Text>
                      <View className="flex flex-row items-center">
                        <Text className="text-base text-primary font-bold mr-1">查看详情</Text>
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
              <Text className="text-base text-muted-foreground">暂无公告内容</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
