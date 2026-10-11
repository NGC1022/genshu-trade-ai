import Taro from '@tarojs/taro'
import {useEffect} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getUnreadMessageCount} from '@/db/api'

export function useMessageBadge() {
  const {user} = useAuth()

  useEffect(() => {
    if (!user) return

    const updateBadge = async () => {
      const {count} = await getUnreadMessageCount(user.id)
      if (count > 0) {
        Taro.setTabBarBadge({
          index: 4, // "我的"页面的索引
          text: 'NEW'
        })
      } else {
        Taro.removeTabBarBadge({
          index: 4
        })
      }
    }

    updateBadge()

    // 每30秒检查一次
    const interval = setInterval(updateBadge, 30000)

    return () => clearInterval(interval)
  }, [user])
}
