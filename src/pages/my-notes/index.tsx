import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getNotes} from '@/db/api'
import type {Note} from '@/db/types'
import {formatDate} from '@/utils/time'

export default function MyNotes() {
  const {user} = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const {data} = await getNotes({userId: user.id})
    setNotes(data)
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
          {notes.map((note) => (
            <View
              key={note.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm flex flex-row active:opacity-90"
              onClick={() => navigateToDetail(note.id)}>
              <Image src={note.images[0]} className="w-32 h-32 flex-shrink-0" mode="aspectFill" />
              <View className="flex-1 p-3 flex flex-col justify-between">
                <View>
                  <Text className="text-lg font-bold text-slate-800 line-clamp-1 mb-1">{note.title}</Text>
                  <Text className="text-sm text-slate-500 line-clamp-2">{note.content}</Text>
                </View>
                <View className="flex flex-row items-center justify-between text-slate-400 text-xs">
                  <Text>{formatDate(note.created_at)}</Text>
                  <View className="flex flex-row items-center space-x-3">
                    <View className="flex flex-row items-center">
                      <View className="i-mdi-heart-outline mr-1" />
                      <Text>{note.likes_count}</Text>
                    </View>
                    <View className="flex flex-row items-center">
                      <View className="i-mdi-comment-outline mr-1" />
                      <Text>{note.comments_count}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))}
          {notes.length === 0 && !loading && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-note-text-outline text-6xl text-slate-200 mb-4" />
              <Text className="text-base text-slate-400">你还没有发布过笔记</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
