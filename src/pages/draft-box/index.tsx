import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {deleteDraft, getDrafts} from '@/db/api'
import type {NoteDraft} from '@/db/types'
import {formatDateTime} from '@/utils/time'

export default function DraftBox() {
  const {user} = useAuth()
  const [drafts, setDrafts] = useState<NoteDraft[]>([])
  const [loading, setLoading] = useState(false)

  const loadDrafts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const {data} = await getDrafts(user.id)
    setDrafts(data)
    setLoading(false)
  }, [user])

  useDidShow(() => {
    loadDrafts()
  })

  const handleEdit = (draft: NoteDraft) => {
    Taro.navigateTo({url: `/pages/note-create/index?draftId=${draft.id}`})
  }

  const handleDelete = (draft: NoteDraft) => {
    Taro.showModal({
      title: '删除草稿',
      content: '确定要删除这篇草稿吗？',
      success: async (res) => {
        if (res.confirm) {
          const {error} = await deleteDraft(draft.id)
          if (!error) {
            Taro.showToast({title: '已删除', icon: 'success'})
            loadDrafts()
          } else {
            Taro.showToast({title: '删除失败', icon: 'none'})
          }
        }
      }
    })
  }

  return (
    <View className="min-h-screen bg-slate-50">
      <ScrollView className="w-full h-full" scrollY>
        <View className="p-4">
          {loading && (
            <View className="text-center py-20">
              <Text className="text-xl text-slate-400">加载中...</Text>
            </View>
          )}

          {!loading && drafts.length === 0 && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-file-document-outline text-8xl text-slate-200 mb-4" />
              <Text className="text-xl text-slate-400">暂无草稿</Text>
            </View>
          )}

          {!loading && drafts.length > 0 && (
            <View className="flex flex-col gap-4">
              {drafts.map((draft) => (
                <View key={draft.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <View className="flex flex-row items-start mb-4">
                    {draft.images && draft.images.length > 0 ? (
                      <Image
                        src={draft.images[0]}
                        className="w-20 h-20 rounded-xl bg-slate-100 mr-4"
                        mode="aspectFill"
                      />
                    ) : (
                      <View className="w-20 h-20 rounded-xl bg-slate-100 mr-4 flex items-center justify-center">
                        <View className="i-mdi-image-outline text-3xl text-slate-300" />
                      </View>
                    )}

                    <View className="flex-1">
                      <Text className="text-xl font-black text-slate-900 line-clamp-2 mb-2">
                        {draft.title || '无标题'}
                      </Text>
                      {draft.content && (
                        <Text className="text-lg text-slate-600 line-clamp-2 mb-2">{draft.content}</Text>
                      )}
                      <Text className="text-base text-slate-400">{formatDateTime(draft.updated_at)}</Text>
                    </View>
                  </View>

                  <View className="flex flex-row gap-3 pt-4 border-t border-slate-100">
                    <View
                      className="flex-1 bg-slate-100 text-center py-4 rounded-xl active:opacity-70"
                      onClick={() => handleDelete(draft)}>
                      <Text className="text-lg font-bold text-slate-700">删除</Text>
                    </View>
                    <View
                      className="flex-1 bg-primary text-center py-4 rounded-xl active:opacity-70 shadow-elegant shadow-primary/20"
                      onClick={() => handleEdit(draft)}>
                      <Text className="text-lg font-bold text-white">继续编辑</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
