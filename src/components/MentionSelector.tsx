import {Image, ScrollView, Text, View} from '@tarojs/components'
import {useCallback, useEffect, useState} from 'react'
import {searchUsers} from '@/db/api'
import {DEFAULT_AVATAR} from '@/utils/images'

interface MentionSelectorProps {
  visible: boolean
  searchText: string
  excludeUserId?: string // 排除的用户ID（如笔记发布者）
  onSelect: (user: {id: string; username: string}) => void
  onClose: () => void
}

export default function MentionSelector({visible, searchText, excludeUserId, onSelect, onClose}: MentionSelectorProps) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const {data} = await searchUsers(searchText)
    setUsers(data || [])
    setLoading(false)
  }, [searchText])

  useEffect(() => {
    if (visible && searchText) {
      loadUsers()
    } else {
      setUsers([])
    }
  }, [visible, searchText, loadUsers])

  if (!visible) return null

  return (
    <View className="absolute bottom-full left-0 right-0 bg-white border border-border rounded-xl shadow-lg mb-2 max-h-[200px] overflow-hidden">
      <ScrollView className="w-full" scrollY style={{maxHeight: '200px'}}>
        {loading && (
          <View className="py-4 text-center">
            <Text className="text-xl text-muted-foreground">搜索中...</Text>
          </View>
        )}

        {!loading && users.length === 0 && (
          <View className="py-4 text-center">
            <Text className="text-xl text-muted-foreground">未找到用户</Text>
          </View>
        )}

        {!loading &&
          users.length > 0 &&
          users.map((user) => (
            <View
              key={user.id}
              className="flex flex-row items-center px-4 py-3 border-b border-border active:bg-slate-50"
              onClick={() => onSelect({id: user.id, username: user.username})}>
              <Image src={user.avatar_url || DEFAULT_AVATAR} className="w-10 h-10 rounded-full mr-3" />
              <View className="flex-1">
                <Text className="text-xl font-semibold text-foreground">{user.username}</Text>
                <Text className="text-base text-muted-foreground">ID: {user.id.slice(0, 8)}</Text>
              </View>
            </View>
          ))}
      </ScrollView>
    </View>
  )
}
