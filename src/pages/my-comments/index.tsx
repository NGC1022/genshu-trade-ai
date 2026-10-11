import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getMyReceivedComments} from '@/db/api'
import {DEFAULT_AVATAR} from '@/utils/images'
import {formatDateTime} from '@/utils/time'

export default function MyComments() {
  const {user} = useAuth()
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const {data} = await getMyReceivedComments(user.id)
    setComments(data || [])
    setLoading(false)
  }, [user])

  useDidShow(() => {
    loadData()
  })

  const navigateToDetail = (id: string) => {
    Taro.navigateTo({url: `/pages/note-detail/index?id=${id}`})
  }

  return (
    <View className="min-h-screen bg-slate-50">
      <ScrollView className="w-full h-full p-4" scrollY>
        <View className="flex flex-col space-y-4">
          {comments.map((c) => (
            <View
              key={c.id}
              className="bg-white rounded-xl p-4 shadow-sm active:opacity-90"
              onClick={() => navigateToDetail(c.note_id)}>
              <View className="flex flex-row items-center mb-3">
                <Image
                  src={c.author?.avatar_url || DEFAULT_AVATAR}
                  className="w-10 h-10 rounded-full mr-3 bg-slate-100"
                />
                <View className="flex-1">
                  <View className="flex flex-row items-center">
                    <Text className="text-sm font-bold text-slate-800 mr-1">{c.author?.username || '用户'}</Text>
                    <Text className="text-xs text-slate-400">评论了你的笔记</Text>
                  </View>
                  <Text className="text-xs text-slate-400">{formatDateTime(c.created_at)}</Text>
                </View>
              </View>
              <Text className="text-base text-slate-700 block mb-3 pl-13">{c.content}</Text>
              <View className="bg-slate-50 p-2 rounded-lg ml-13 border-l-4 border-slate-200">
                <Text className="text-sm text-slate-500 line-clamp-1">原文: {c.note?.title}</Text>
              </View>
            </View>
          ))}
          {comments.length === 0 && !loading && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-comment-outline text-6xl text-slate-200 mb-4" />
              <Text className="text-base text-slate-400">还没有收到任何评论</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
