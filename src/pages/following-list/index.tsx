import {Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {checkFollowing, followUser, getFollowing, unfollowUser} from '@/db/api'
import {DEFAULT_AVATAR} from '@/utils/images'

export default function FollowingList() {
  const router = useRouter()
  const {userId} = router.params
  const {user} = useAuth()
  const [following, setFollowing] = useState<any[]>([])
  const [filteredFollowing, setFilteredFollowing] = useState<any[]>([])
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({})
  const [recentFollowIds, setRecentFollowIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const {data, error} = await getFollowing(userId)

      if (error) {
        console.error('getFollowing error:', error)
        Taro.showToast({title: '获取列表失败', icon: 'none'})
        setFollowing([])
        setFilteredFollowing([])
      } else {
        setFollowing(data || [])
        setFilteredFollowing(data || [])
      }

      // 检查当前用户是否已追踪这些用户
      if (user && data && data.length > 0) {
        const statusMap: Record<string, boolean> = {}
        // 批量获取追踪状态会更好，但这里先保持原有逻辑并加错误保护
        await Promise.all(
          data.map(async (item) => {
            const {data: followData} = await checkFollowing(user.id, item.following_id)
            statusMap[item.following_id] = !!followData
          })
        )
        setFollowingStatus(statusMap)
      }
    } catch (e) {
      console.error('loadData error:', e)
      Taro.showToast({title: '网络请求异常', icon: 'none'})
    } finally {
      // 加载近期新增追踪标识（有效期：最后一次追踪后 30 分钟）
      const recents = Taro.getStorageSync('recent_follows') || []
      const now = Date.now()
      const validRecents = recents.filter((id: string) => {
        const followTime = Taro.getStorageSync(`follow_time_${id}`) || 0
        return now - followTime < 30 * 60 * 1000 // 30 分钟内有效
      })

      if (validRecents.length !== recents.length) {
        Taro.setStorageSync('recent_follows', validRecents)
      }
      setRecentFollowIds(validRecents)
      setLoading(false)
    }
  }, [userId, user])

  useDidShow(() => {
    loadData()
  })

  useEffect(() => {
    const handleFollowChange = (eventData: any) => {
      console.log('Received followStatusChanged event:', eventData)
      if (eventData.isFollowing) {
        loadData()
      } else {
        if (user && user.id === userId) {
          setFollowing((prev) => prev.filter((item) => item.following_id !== eventData.userId))
          setFilteredFollowing((prev) => prev.filter((item) => item.following_id !== eventData.userId))
        } else {
          // 如果不是自己的列表，更新按钮状态
          setFollowingStatus((prev) => ({...prev, [eventData.userId]: false}))
        }
      }
    }

    Taro.eventCenter.on('followStatusChanged', handleFollowChange)
    return () => {
      Taro.eventCenter.off('followStatusChanged', handleFollowChange)
    }
  }, [loadData, userId, user])

  const handleSearch = (e: any) => {
    const keyword = e.detail.value.toLowerCase()
    setSearchKeyword(keyword)

    if (!keyword.trim()) {
      setFilteredFollowing(following)
      return
    }

    const filtered = following.filter((item) => {
      const username = (item.following?.username || '').toLowerCase()
      const userId = item.following_id.toLowerCase()
      return username.includes(keyword) || userId.includes(keyword)
    })
    setFilteredFollowing(filtered)
  }

  const navigateToProfile = (id: string) => {
    Taro.navigateTo({url: `/pages/user-profile/index?userId=${id}`})
  }

  const handleFollow = async (targetUserId: string, e: any) => {
    e.stopPropagation()
    if (!user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }

    const isFollowing = followingStatus[targetUserId]

    if (isFollowing) {
      // 取消追踪
      Taro.showModal({
        title: '取消追踪',
        content: '确定取消追踪该用户吗？',
        success: async (res) => {
          if (res.confirm) {
            const {error} = await unfollowUser(user.id, targetUserId)
            if (!error) {
              setFollowingStatus((prev) => ({...prev, [targetUserId]: false}))
              Taro.showToast({title: '已取消追踪', icon: 'success'})
              // 通知其他页面
              Taro.eventCenter.trigger('followStatusChanged', {userId: targetUserId, isFollowing: false})
              // 如果是查看自己的关注列表，直接从列表中移除
              if (user.id === userId) {
                const newFollowing = following.filter((item) => item.following_id !== targetUserId)
                setFollowing(newFollowing)
                setFilteredFollowing(
                  newFollowing.filter((item) => {
                    if (!searchKeyword.trim()) return true
                    const username = (item.following?.username || '').toLowerCase()
                    const id = item.following_id.toLowerCase()
                    return username.includes(searchKeyword.toLowerCase()) || id.includes(searchKeyword.toLowerCase())
                  })
                )
              }
            }
          }
        }
      })
    } else {
      // 追踪
      const {error} = await followUser(user.id, targetUserId)
      if (!error) {
        setFollowingStatus((prev) => ({...prev, [targetUserId]: true}))
        Taro.showToast({title: '追踪成功', icon: 'success'})
        // 通知其他页面
        Taro.eventCenter.trigger('followStatusChanged', {userId: targetUserId, isFollowing: true})
      }
    }
  }

  return (
    <View className="min-h-screen bg-slate-50">
      <ScrollView className="w-full h-full" scrollY>
        <View className="p-4">
          {/* 搜索框 */}
          {following.length > 0 && (
            <View className="mb-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <View className="flex flex-row items-center bg-slate-100 rounded-full px-4 py-2">
                <View className="i-mdi-magnify text-xl text-slate-400 mr-2" />
                <Input
                  className="flex-1 text-base"
                  placeholder="搜索用户名或ID"
                  value={searchKeyword}
                  onInput={handleSearch}
                />
                {searchKeyword && (
                  <View
                    className="i-mdi-close-circle text-xl text-slate-300 ml-2"
                    onClick={() => {
                      setSearchKeyword('')
                      setFilteredFollowing(following)
                    }}
                  />
                )}
              </View>
              <View className="flex flex-row items-center justify-between mt-3">
                <Text className="text-sm text-slate-500">
                  {searchKeyword ? `找到 ${filteredFollowing.length} 位用户` : `共 ${following.length} 位用户`}
                </Text>
              </View>
            </View>
          )}

          {loading && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-loading animate-spin text-5xl text-primary mb-4" />
              <Text className="text-xl text-slate-400">加载中...</Text>
            </View>
          )}

          {!loading && following.length === 0 && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-account-multiple-outline text-8xl text-slate-200 mb-4" />
              <Text className="text-xl text-slate-400 mb-2">还没有追踪任何用户</Text>
              <Text className="text-base text-slate-300">去广场发现感兴趣的创作者吧</Text>
            </View>
          )}

          {!loading && following.length > 0 && filteredFollowing.length === 0 && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-account-search-outline text-8xl text-slate-200 mb-4" />
              <Text className="text-xl text-slate-400">未找到匹配的用户</Text>
            </View>
          )}

          {!loading && filteredFollowing.length > 0 && (
            <View className="flex flex-col gap-3">
              {filteredFollowing.map((item) => (
                <View
                  key={item.following_id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-row items-center active:bg-slate-50 transition-all"
                  onClick={() => navigateToProfile(item.following_id)}>
                  <Image
                    src={item.following?.avatar_url || DEFAULT_AVATAR}
                    className="w-14 h-14 rounded-full bg-slate-100 mr-4"
                  />
                  <View className="flex-1 min-w-0">
                    <View className="flex flex-row items-center mb-1 pr-2">
                      <Text className="text-xl font-black text-slate-900 truncate flex-1">
                        {item.following?.username || '用户'}
                      </Text>
                      {recentFollowIds.includes(item.following_id) && (
                        <View className="ml-2 bg-slate-100 px-2 py-0.5 rounded flex items-center justify-center border border-slate-200">
                          <Text className="text-xs text-slate-400 font-bold uppercase tracking-widest">新增</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex flex-row items-center">
                      <Text className="text-base text-slate-400 mr-2 truncate">
                        ID: {item.following_id.slice(0, 8)}...
                      </Text>
                      <View
                        className="i-mdi-content-copy text-base text-slate-300 active:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          Taro.setClipboardData({
                            data: item.following_id,
                            success: () => Taro.showToast({title: 'ID已复制', icon: 'success'})
                          })
                        }}
                      />
                    </View>
                  </View>
                  {user && user.id !== item.following_id && (
                    <View
                      className={`px-4 py-2 rounded-full border-2 active:opacity-70 transition-all ${
                        followingStatus[item.following_id]
                          ? 'border-primary bg-white'
                          : 'border-primary bg-primary shadow-sm'
                      }`}
                      onClick={(e) => handleFollow(item.following_id, e)}>
                      <Text
                        className={`text-base font-bold ${
                          followingStatus[item.following_id] ? 'text-primary' : 'text-white'
                        }`}>
                        {followingStatus[item.following_id] ? '已追踪' : '追踪'}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
