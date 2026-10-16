import {Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useRef, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getNotes, searchUsers} from '@/db/api'
import type {Note, Profile} from '@/db/types'
import {useLanguage} from '@/hooks/useLanguage'
import {DEFAULT_AVATAR} from '@/utils/images'

const SEARCH_HISTORY_KEY = 'search_history'
const NOTE_PAGE_SIZE = 20

export default function Notes() {
  const router = useRouter()
  const {topic: topicParam} = router.params
  const {user} = useAuth()
  const language = useLanguage()
  const ui = useCallback((zh: string, en: string) => (language === 'en' ? en : zh), [language])
  const [notes, setNotes] = useState<Note[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [keyword, setKeyword] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [currentTopic, setCurrentTopic] = useState('')
  const [searchMode, setSearchMode] = useState<'notes' | 'users'>('notes')
  const [sortBy, setSortBy] = useState<'latest' | 'hottest' | 'following'>('latest')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const requestVersionRef = useRef(0)
  const loadingMoreRef = useRef(false)

  // 加载搜索历史
  useEffect(() => {
    const history = Taro.getStorageSync(SEARCH_HISTORY_KEY) || []
    setSearchHistory(history)
  }, [])

  const loadData = useCallback(
    async (key = '', topic = '', sort: 'latest' | 'hottest' | 'following' = 'latest', mode?: 'notes' | 'users') => {
      const requestVersion = ++requestVersionRef.current
      setLoading(true)
      loadingMoreRef.current = false
      setLoadingMore(false)
      const targetMode = mode || searchMode
      try {
        if (targetMode === 'notes') {
          const {data} = await getNotes({
            keyword: key,
            topic: topic || undefined,
            sortBy: sort,
            followerId: sort === 'following' ? user?.id : undefined,
            limit: NOTE_PAGE_SIZE,
            offset: 0
          })
          if (requestVersion !== requestVersionRef.current) return
          setAppliedKeyword(key)
          setNotes(data)
          setHasMore(data.length === NOTE_PAGE_SIZE)
          setUsers([])
        } else {
          const data = key.trim() ? (await searchUsers(key)).data : []
          if (requestVersion !== requestVersionRef.current) return
          setUsers(data)
          setNotes([])
          setHasMore(false)
        }
        setCurrentTopic(topic)
      } catch {
        if (requestVersion === requestVersionRef.current) {
          Taro.showToast({title: ui('内容加载失败，请重试', 'Failed to load content. Please try again.'), icon: 'none'})
        }
      } finally {
        if (requestVersion === requestVersionRef.current) setLoading(false)
      }
    },
    [searchMode, user?.id, ui]
  )

  useDidShow(() => {
    const cachedTopic = Taro.getStorageSync('search_topic')
    if (cachedTopic) {
      Taro.removeStorageSync('search_topic')
      setSearchMode('notes')
      loadData(keyword, cachedTopic, sortBy, 'notes')
      return
    }

    const decodedTopic = topicParam ? decodeURIComponent(topicParam) : ''
    loadData(keyword, decodedTopic || currentTopic, sortBy, searchMode)
  })

  const loadMore = useCallback(async () => {
    if (searchMode !== 'notes' || loading || !hasMore || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    const requestVersion = requestVersionRef.current
    try {
      const {data} = await getNotes({
        keyword: appliedKeyword,
        topic: currentTopic || undefined,
        sortBy,
        followerId: sortBy === 'following' ? user?.id : undefined,
        limit: NOTE_PAGE_SIZE,
        offset: notes.length
      })
      if (requestVersion !== requestVersionRef.current) return
      setNotes((previous) => {
        const existingIds = new Set(previous.map((note) => note.id))
        return [...previous, ...data.filter((note) => !existingIds.has(note.id))]
      })
      setHasMore(data.length === NOTE_PAGE_SIZE)
    } catch {
      Taro.showToast({
        title: ui('加载更多失败，请稍后重试', 'Failed to load more. Please try again later.'),
        icon: 'none'
      })
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [appliedKeyword, currentTopic, hasMore, loading, notes.length, searchMode, sortBy, user?.id, ui])

  const handleClearFilter = () => {
    setCurrentTopic('')
    setKeyword('')
    setSearchMode('notes')
    setSortBy('latest')
    loadData('', '', 'latest', 'notes')
  }

  const saveSearchHistory = (key: string) => {
    if (!key.trim()) return
    const newHistory = [key, ...searchHistory.filter((h) => h !== key)].slice(0, 10)
    setSearchHistory(newHistory)
    Taro.setStorageSync(SEARCH_HISTORY_KEY, newHistory)
  }

  const deleteHistoryItem = (e: any, key: string) => {
    e.stopPropagation()
    const newHistory = searchHistory.filter((h) => h !== key)
    setSearchHistory(newHistory)
    Taro.setStorageSync(SEARCH_HISTORY_KEY, newHistory)
  }

  const clearAllHistory = () => {
    Taro.showModal({
      title: ui('提示', 'Notice'),
      content: ui('确定清空所有搜索记录吗？', 'Are you sure you want to clear all search history?'),
      success: (res) => {
        if (res.confirm) {
          setSearchHistory([])
          Taro.setStorageSync(SEARCH_HISTORY_KEY, [])
        }
      }
    })
  }

  const handleSearch = (e: {detail: {value: string}}) => {
    const val = e.detail.value
    setKeyword(val)
    if (!val.trim()) {
      setShowHistory(true)
    }
  }

  const onConfirmSearch = (e: {detail: {value: string}}) => {
    const val = e.detail.value || keyword
    if (val.trim()) {
      saveSearchHistory(val.trim())
    }
    setShowHistory(false)
    loadData(val, currentTopic, sortBy)
  }

  const onHistoryItemClick = (key: string) => {
    setKeyword(key)
    setShowHistory(false)
    saveSearchHistory(key)
    loadData(key, currentTopic, sortBy)
  }

  const handleSwitchMode = (mode: 'notes' | 'users') => {
    setSearchMode(mode)
    setCurrentTopic('')
    setSortBy('latest')
    loadData(keyword, '', 'latest', mode)
  }

  const handleSortChange = (sort: 'latest' | 'hottest' | 'following') => {
    if (sort === 'following' && !user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }
    setSortBy(sort)
    loadData(keyword, currentTopic, sort)
  }

  const navigateToCreate = () => {
    if (!user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }
    Taro.navigateTo({url: '/pages/note-create/index'})
  }

  const navigateToDetail = (id: string) => {
    Taro.navigateTo({url: `/pages/note-detail/index?id=${id}`})
  }

  const navigateToProfile = (userId: string) => {
    Taro.navigateTo({url: `/pages/user-profile/index?userId=${userId}`})
  }

  // 简单的瀑布流分栏
  const leftNotes = notes.filter((_, i) => i % 2 === 0)
  const rightNotes = notes.filter((_, i) => i % 2 !== 0)

  return (
    <View className="min-h-screen bg-slate-50 flex flex-col">
      {/* 搜索栏 */}
      <View className="bg-white px-4 py-3 sticky top-0 z-10 border-b border-slate-100">
        {/* 搜索模式切换 */}
        <View className="flex flex-row items-center mb-3 bg-slate-100 rounded-full p-1">
          <View
            className={`flex-1 text-center py-2 rounded-full transition-all ${
              searchMode === 'notes' ? 'bg-white shadow-sm' : ''
            }`}
            onClick={() => handleSwitchMode('notes')}>
            <Text className={`text-base font-bold ${searchMode === 'notes' ? 'text-primary' : 'text-slate-500'}`}>
              {ui('笔记', 'Notes')}
            </Text>
          </View>
          <View
            className={`flex-1 text-center py-2 rounded-full transition-all ${
              searchMode === 'users' ? 'bg-white shadow-sm' : ''
            }`}
            onClick={() => handleSwitchMode('users')}>
            <Text className={`text-base font-bold ${searchMode === 'users' ? 'text-primary' : 'text-slate-500'}`}>
              {ui('用户', 'Users')}
            </Text>
          </View>
        </View>

        <View className="flex flex-row items-center bg-slate-100 rounded-full px-4 py-2">
          <View className="i-mdi-magnify text-xl text-slate-400 mr-2" />
          <Input
            className="flex-1 text-base"
            placeholder={
              searchMode === 'notes'
                ? ui('搜索你感兴趣的笔记', 'Search notes you are interested in')
                : ui('搜索用户名', 'Search users')
            }
            value={keyword}
            onInput={handleSearch}
            onConfirm={onConfirmSearch}
            onFocus={() => setShowHistory(true)}
          />
          {keyword && (
            <View
              className="i-mdi-close-circle text-xl text-slate-300 ml-2"
              onClick={() => {
                setKeyword('')
                setShowHistory(true)
              }}
            />
          )}
        </View>

        {/* 搜索历史 */}
        {showHistory && searchHistory.length > 0 && (
          <View className="mt-4 bg-white rounded-2xl p-4 shadow-lg border border-slate-100 absolute left-4 right-4 z-20">
            <View className="flex flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-slate-900">{ui('搜索历史', 'Search history')}</Text>
              <View className="flex flex-row items-center active:opacity-60" onClick={clearAllHistory}>
                <View className="i-mdi-trash-can-outline text-lg text-slate-400 mr-1" />
                <Text className="text-sm text-slate-400">{ui('清空', 'Clear')}</Text>
              </View>
            </View>
            <View className="flex flex-wrap gap-2">
              {searchHistory.map((item) => (
                <View
                  key={item}
                  className="flex flex-row items-center bg-slate-100 rounded-full px-4 py-2 active:bg-slate-200"
                  onClick={() => onHistoryItemClick(item)}>
                  <Text className="text-sm text-slate-700 mr-2">{item}</Text>
                  <View
                    className="i-mdi-close text-base text-slate-300 active:text-slate-500"
                    onClick={(e) => deleteHistoryItem(e, item)}
                  />
                </View>
              ))}
            </View>
            <View
              className="mt-4 pt-3 border-t border-slate-50 flex flex-row justify-center"
              onClick={() => setShowHistory(false)}>
              <Text className="text-sm text-slate-400">{ui('收起', 'Collapse')}</Text>
            </View>
          </View>
        )}

        {/* 排序选项 - 仅笔记模式显示 */}
        {searchMode === 'notes' && (
          <View className="flex flex-row items-center mt-3 gap-2">
            <View
              className={`flex-1 text-center py-2 rounded-xl transition-all ${
                sortBy === 'following' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() => handleSortChange('following')}>
              <Text className={`text-base font-bold ${sortBy === 'following' ? 'text-white' : 'text-slate-600'}`}>
                {ui('追踪', 'Following')}
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-2 rounded-xl transition-all ${
                sortBy === 'latest' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() => handleSortChange('latest')}>
              <Text className={`text-base font-bold ${sortBy === 'latest' ? 'text-white' : 'text-slate-600'}`}>
                {ui('最新', 'Latest')}
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-2 rounded-xl transition-all ${
                sortBy === 'hottest' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() => handleSortChange('hottest')}>
              <Text className={`text-base font-bold ${sortBy === 'hottest' ? 'text-white' : 'text-slate-600'}`}>
                {ui('最热', 'Hottest')}
              </Text>
            </View>
          </View>
        )}

        {/* 话题筛选提示 */}
        {currentTopic && searchMode === 'notes' && (
          <View className="flex flex-row items-center justify-between mt-3 bg-primary/10 rounded-xl px-4 py-3">
            <View className="flex flex-row items-center flex-1">
              <View className="i-mdi-pound text-lg text-primary mr-2" />
              <Text className="text-base font-bold text-primary">
                {ui('话题：', 'Topic: ')}
                {currentTopic}
              </Text>
            </View>
            <View
              className="flex flex-row items-center bg-white rounded-full px-3 py-1 active:opacity-70"
              onClick={handleClearFilter}>
              <View className="i-mdi-close text-base text-slate-600 mr-1" />
              <Text className="text-sm font-bold text-slate-600">{ui('清除', 'Clear')}</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView className="flex-1" scrollY onScrollToLower={loadMore}>
        {/* 用户搜索结果 */}
        {searchMode === 'users' && (
          <View className="px-4 py-4">
            {users.length === 0 && !loading && keyword && (
              <View className="flex flex-col items-center justify-center py-20">
                <View className="i-mdi-account-search-outline text-6xl text-slate-200 mb-4" />
                <Text className="text-base text-slate-400">{ui('未找到相关用户', 'No users found')}</Text>
              </View>
            )}

            {users.length === 0 && !loading && !keyword && (
              <View className="flex flex-col items-center justify-center py-20">
                <View className="i-mdi-account-search text-6xl text-slate-200 mb-4" />
                <Text className="text-base text-slate-400">
                  {ui('输入用户名进行搜索', 'Enter a username to search')}
                </Text>
              </View>
            )}

            {users.length > 0 && (
              <View className="flex flex-col gap-3">
                {users.map((user) => (
                  <View
                    key={user.id}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-row items-center active:opacity-90"
                    onClick={() => navigateToProfile(user.id)}>
                    <Image
                      src={user.avatar_url || DEFAULT_AVATAR}
                      className="w-14 h-14 rounded-full bg-slate-100 mr-4"
                    />
                    <View className="flex-1">
                      <Text className="text-xl font-black text-slate-900 mb-1">
                        {user.username || ui('用户', 'User')}
                      </Text>
                      {user.bio && <Text className="text-base text-slate-600 line-clamp-1 mb-1">{user.bio}</Text>}
                      <View className="flex flex-row items-center">
                        <Text className="text-sm text-slate-400 mr-4">
                          {user.followers_count || 0} {ui('被追踪', 'followers')}
                        </Text>
                        <Text className="text-sm text-slate-400">
                          {user.notes_count || 0} {ui('笔记', 'notes')}
                        </Text>
                      </View>
                    </View>
                    <View className="i-mdi-chevron-right text-2xl text-slate-400" />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 笔记搜索结果 */}
        {searchMode === 'notes' && (
          <View className="px-3 py-4 flex flex-row items-start">
            {/* 左栏 */}
            <View className="flex-1 flex flex-col space-y-3 mr-1.5">
              {leftNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => navigateToDetail(note.id)}
                  onUserClick={(uid) => navigateToProfile(uid)}
                />
              ))}
            </View>
            {/* 右栏 */}
            <View className="flex-1 flex flex-col space-y-3 ml-1.5">
              {rightNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => navigateToDetail(note.id)}
                  onUserClick={(uid) => navigateToProfile(uid)}
                />
              ))}
            </View>
          </View>
        )}

        {searchMode === 'notes' && loadingMore && (
          <View className="py-4 flex items-center justify-center">
            <Text className="text-sm text-slate-400">{ui('正在加载更多…', 'Loading more…')}</Text>
          </View>
        )}
        {searchMode === 'notes' && !hasMore && notes.length > 0 && (
          <View className="py-4 flex items-center justify-center">
            <Text className="text-sm text-slate-400">{ui('已经到底了', 'You have reached the end')}</Text>
          </View>
        )}

        {notes.length === 0 && !loading && searchMode === 'notes' && (
          <View className="flex flex-col items-center justify-center py-20">
            <View className="i-mdi-note-text-outline text-6xl text-slate-200 mb-4" />
            <Text className="text-base text-slate-400">
              {ui('还没有笔记，快去发布吧', 'No notes yet. Be the first to publish!')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 发布按钮 - 调整位置避免被遮挡 */}
      <View
        className="fixed right-6 bottom-24 w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform z-20"
        onClick={navigateToCreate}
        style={{boxShadow: '0 8px 24px rgba(201, 42, 42, 0.4)'}}>
        <View className="i-mdi-plus text-4xl text-white font-bold" />
      </View>
    </View>
  )
}

function NoteCard({note, onClick, onUserClick}: {note: Note; onClick: () => void; onUserClick: (uid: string) => void}) {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const coverImage = note.cover_image || (note.images && note.images.length > 0 ? note.images[0] : null)

  return (
    <View className="bg-white rounded-xl overflow-hidden shadow-sm active:opacity-90" onClick={onClick}>
      {coverImage ? (
        <View className="w-full aspect-[3/4] bg-slate-100 overflow-hidden">
          <Image src={coverImage} className="w-full h-full" mode="aspectFill" lazyLoad />
        </View>
      ) : (
        <View className="w-full aspect-[3/4] bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex flex-col justify-center">
          <Text className="text-lg font-bold text-slate-800 line-clamp-3 mb-2">{note.title}</Text>
          <Text className="text-sm text-slate-600 line-clamp-4">{note.content}</Text>
        </View>
      )}
      <View className="p-3">
        <Text className="text-base font-bold text-slate-800 line-clamp-2 mb-2">{note.title}</Text>
        <View className="flex flex-row items-center justify-between">
          <View
            className="flex flex-row items-center flex-1 min-w-0 active:opacity-60"
            onClick={(e) => {
              e.stopPropagation()
              onUserClick(note.user_id)
            }}>
            <Image
              src={note.author?.avatar_url || DEFAULT_AVATAR}
              className="w-5 h-5 rounded-full mr-1.5 bg-slate-100"
              lazyLoad
            />
            <Text className="text-sm text-slate-500 truncate flex-1">
              {note.author?.username || ui('用户', 'User')}
            </Text>
          </View>
          <View className="flex flex-row items-center ml-2">
            <View className="i-mdi-heart-outline text-sm text-slate-400 mr-1" />
            <Text className="text-sm text-slate-400">{note.likes_count || 0}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
