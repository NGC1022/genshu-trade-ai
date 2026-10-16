import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {checkFollowing, followUser, getLikedNotes, getNotes, getUserProfile, unfollowUser} from '@/db/api'
import type {Note, Profile} from '@/db/types'
import {DEFAULT_AVATAR} from '@/utils/images'
import {useLanguage} from '@/hooks/useLanguage'
export default function UserProfile() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const router = useRouter()
  const {userId} = router.params
  const {user} = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [likedNotes, setLikedNotes] = useState<Note[]>([])
  const [activeTab, setActiveTab] = useState<'notes' | 'likes'>('notes')
  const [isFollowing, setIsFollowing] = useState(false)
  const [sortBy, setSortBy] = useState<'latest' | 'hottest'>('latest')
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(
    async (sort: 'latest' | 'hottest' = 'latest') => {
      if (!userId) return
      setLoading(true)
      try {
        // 加载用户资料
        const {data: profileData} = await getUserProfile(userId)
        setProfile(profileData)

        // 加载用户笔记
        const {data: notesData} = await getNotes({userId, sortBy: sort})
        setNotes(notesData)

        // 加载点赞笔记
        const {data: likedData} = await getLikedNotes(userId)
        setLikedNotes(likedData)

        // 检查是否已追踪
        if (user && user.id !== userId) {
          const {data: followData} = await checkFollowing(user.id, userId)
          setIsFollowing(!!followData)
        }
      } catch (e) {
        console.error('UserProfile loadData error:', e)
      } finally {
        setLoading(false)
      }
    },
    [userId, user]
  )

  useDidShow(() => {
    loadData(sortBy)
  })

  useEffect(() => {
    // 监听追踪状态改变事件以支持多端同步
    const handleFollowChange = (eventData: any) => {
      if (eventData.userId === userId) {
        setIsFollowing(eventData.isFollowing)
        // 更新本地粉丝数预览（虽然 loadData 也会做，但这里能更快给反馈）
        setProfile((prev) => {
          if (!prev) return null
          const diff = eventData.isFollowing ? 1 : -1
          return {
            ...prev,
            followers_count: Math.max(0, (prev.followers_count || 0) + diff)
          }
        })
      }
    }

    Taro.eventCenter.on('followStatusChanged', handleFollowChange)
    return () => {
      Taro.eventCenter.off('followStatusChanged', handleFollowChange)
    }
  }, [userId])

  const handleSortChange = (sort: 'latest' | 'hottest') => {
    setSortBy(sort)
    loadData(sort)
  }

  const handleFollow = async () => {
    if (!user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }

    if (!userId) return

    if (isFollowing) {
      // 取消追踪需要确认
      Taro.showModal({
        title: '取消追踪',
        content: '确定取消追踪该用户吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const {error} = await unfollowUser(user.id, userId)
              if (error) throw error
              setIsFollowing(false)
              Taro.showToast({title: '已取消追踪', icon: 'success'})
              // 通知其他页面更新追踪状态
              Taro.eventCenter.trigger('followStatusChanged', {userId, isFollowing: false})

              // 从本地近期追踪缓存中移除
              const recentFollows = Taro.getStorageSync('recent_follows') || []
              const newRecent = recentFollows.filter((id: string) => id !== userId)
              Taro.setStorageSync('recent_follows', newRecent)

              loadData(sortBy)
            } catch (err) {
              Taro.showToast({title: '操作失败，请重试', icon: 'none'})
              console.error('Unfollow error:', err)
            }
          }
        }
      })
    } else {
      try {
        const {error} = await followUser(user.id, userId)
        if (error) throw error
        setIsFollowing(true)
        Taro.showToast({title: '追踪成功', icon: 'success'})

        // 标记为近期新增追踪，用于列表显示“新增”标签
        const recentFollows = Taro.getStorageSync('recent_follows') || []
        if (!recentFollows.includes(userId)) {
          Taro.setStorageSync('recent_follows', [...recentFollows, userId])
          // 记录最后一次追踪时间戳，用于有效期管理
          Taro.setStorageSync(`follow_time_${userId}`, Date.now())
        }

        // 通知其他页面更新追踪状态
        Taro.eventCenter.trigger('followStatusChanged', {
          userId,
          isFollowing: true,
          timestamp: Date.now()
        })
        loadData(sortBy)
      } catch (err) {
        Taro.showToast({title: '操作失败，请重试', icon: 'none'})
        console.error('Follow error:', err)
      }
    }
  }

  const navigateToDetail = (id: string) => {
    Taro.navigateTo({url: `/pages/note-detail/index?id=${id}`})
  }

  // 简单的瀑布流分栏
  const currentNotes = activeTab === 'notes' ? notes : likedNotes
  const leftNotes = currentNotes.filter((_, i) => i % 2 === 0)
  const rightNotes = currentNotes.filter((_, i) => i % 2 !== 0)

  if (loading || !profile) {
    return (
      <View className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Text className="text-xl text-slate-400">加载中...</Text>
      </View>
    )
  }

  const isOwnProfile = user?.id === userId
  const canSeeLikes = isOwnProfile || profile.show_likes_list

  return (
    <View className="min-h-screen bg-slate-50">
      <ScrollView className="w-full h-full" scrollY>
        {/* 用户信息卡片 */}
        <View className="bg-white p-6 mb-4">
          <View className="flex flex-col items-center mb-6">
            <Image src={profile.avatar_url || DEFAULT_AVATAR} className="w-24 h-24 rounded-full mb-4 bg-slate-100" />
            <Text className="text-2xl font-black text-slate-900 mb-2">{profile.username || '用户'}</Text>
            <Text className="text-lg text-slate-400 mb-4">ID: {profile.id.slice(0, 8)}</Text>

            {profile.bio && (
              <View className="w-full bg-slate-50 rounded-xl p-4 mb-4">
                <Text className="text-lg text-slate-600 text-center leading-relaxed">{profile.bio}</Text>
              </View>
            )}

            {/* 统计数据 */}
            <View className="flex flex-row items-center justify-around w-full py-4 border-t border-b border-slate-100">
              <View
                className="flex flex-col items-center flex-1 active:opacity-60"
                onClick={() => {
                  if (isOwnProfile || profile.show_following_list) {
                    Taro.navigateTo({url: `/pages/following-list/index?userId=${userId}`})
                  } else {
                    Taro.showToast({title: '该用户已隐藏追踪列表', icon: 'none'})
                  }
                }}>
                <Text className="text-3xl font-black text-primary mb-1">{profile.following_count || 0}</Text>
                <Text className="text-base text-slate-500">已追踪</Text>
              </View>
              <View className="w-[1px] h-12 bg-slate-100" />
              <View className="flex flex-col items-center flex-1">
                <Text className="text-3xl font-black text-primary mb-1">{profile.followers_count || 0}</Text>
                <Text className="text-base text-slate-500">被追踪</Text>
              </View>
              <View className="w-[1px] h-12 bg-slate-100" />
              <View className="flex flex-col items-center flex-1">
                <Text className="text-3xl font-black text-primary mb-1">{profile.total_likes || 0}</Text>
                <Text className="text-base text-slate-500">获赞</Text>
              </View>
              <View className="w-[1px] h-12 bg-slate-100" />
              <View className="flex flex-col items-center flex-1">
                <Text className="text-3xl font-black text-primary mb-1">{profile.notes_count || 0}</Text>
                <Text className="text-base text-slate-500">笔记</Text>
              </View>
            </View>

            {/* 追踪按钮 */}
            {!isOwnProfile && (
              <View className="w-full mt-6">
                <View
                  className={`w-full py-4 rounded-xl text-center border-2 active:opacity-70 transition-all ${
                    isFollowing
                      ? 'bg-white border-primary'
                      : 'bg-primary border-primary shadow-elegant shadow-primary/20'
                  }`}
                  onClick={handleFollow}>
                  <Text className={`text-xl font-bold ${isFollowing ? 'text-primary' : 'text-white'}`}>
                    {isFollowing ? '已追踪' : '追踪'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 标签栏切换 */}
        <View className="bg-white flex flex-row px-4 border-b border-slate-100 sticky top-0 z-10">
          <View
            className={`flex-1 py-4 text-center relative ${activeTab === 'notes' ? 'text-primary' : 'text-slate-400'}`}
            onClick={() => setActiveTab('notes')}>
            <Text className="text-xl font-bold">笔记</Text>
            {activeTab === 'notes' && (
              <View className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
            )}
          </View>
          <View
            className={`flex-1 py-4 text-center relative ${activeTab === 'likes' ? 'text-primary' : 'text-slate-400'}`}
            onClick={() => {
              if (canSeeLikes) {
                setActiveTab('likes')
              } else {
                Taro.showToast({title: '用户设置了点赞不可见', icon: 'none'})
              }
            }}>
            <View className="flex flex-row items-center justify-center">
              {!canSeeLikes && <View className="i-mdi-lock text-base mr-1" />}
              <Text className="text-xl font-bold">点赞</Text>
            </View>
            {activeTab === 'likes' && (
              <View className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
            )}
          </View>
        </View>

        {/* 笔记/点赞列表 */}
        <View className="px-4 py-4 pb-6">
          {activeTab === 'notes' && (
            <View className="flex flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-600">全部笔记 ({notes.length})</Text>
              <View className="flex flex-row items-center gap-2">
                <View
                  className={`px-3 py-1 rounded-full text-sm font-medium ${sortBy === 'latest' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}
                  onClick={() => handleSortChange('latest')}>
                  <Text>{ui('最新', 'Latest')}</Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full text-sm font-medium ${sortBy === 'hottest' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}
                  onClick={() => handleSortChange('hottest')}>
                  <Text>{ui('最热', 'Hottest')}</Text>
                </View>
              </View>
            </View>
          )}

          {currentNotes.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-20">
              <View
                className={`i-mdi-${activeTab === 'notes' ? 'note-text-outline' : 'heart-outline'} text-8xl text-slate-200 mb-4`}
              />
              <Text className="text-xl text-slate-400">
                {activeTab === 'notes' ? '还没有发布笔记' : '还没有点赞笔记'}
              </Text>
            </View>
          ) : (
            <View className="flex flex-row items-start">
              {/* 左栏 */}
              <View className="flex-1 flex flex-col space-y-3 mr-1.5">
                {leftNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onClick={() => navigateToDetail(note.id)} />
                ))}
              </View>
              {/* 右栏 */}
              <View className="flex-1 flex flex-col space-y-3 ml-1.5">
                {rightNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onClick={() => navigateToDetail(note.id)} />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function NoteCard({note, onClick}: {note: Note; onClick: () => void}) {
  const coverImage = note.cover_image || (note.images && note.images.length > 0 ? note.images[0] : null)

  return (
    <View className="bg-white rounded-xl overflow-hidden shadow-sm active:opacity-90" onClick={onClick}>
      {coverImage ? (
        <View className="w-full aspect-[3/4] bg-slate-100 overflow-hidden">
          <Image src={coverImage} className="w-full h-full" mode="aspectFill" />
        </View>
      ) : (
        <View className="w-full aspect-[3/4] bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex flex-col justify-center">
          <Text className="text-lg font-bold text-slate-800 line-clamp-3 mb-2">{note.title}</Text>
          <Text className="text-sm text-slate-600 line-clamp-4">{note.content}</Text>
        </View>
      )}
      <View className="p-3">
        <Text className="text-base font-bold text-slate-800 line-clamp-2 mb-2">{note.title}</Text>
        <View className="flex flex-row items-center">
          <View className="i-mdi-heart-outline text-sm text-slate-400 mr-1" />
          <Text className="text-sm text-slate-400">{note.likes_count || 0}</Text>
        </View>
      </View>
    </View>
  )
}
