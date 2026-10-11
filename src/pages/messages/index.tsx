import {ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {deleteAllMessages, deleteMessage, getMessagesByType, markMessageAsRead} from '@/db/api'
import type {Message, MessageType} from '@/db/types'

type TabType = 'business' | 'follow' | 'like' | 'comment' | 'other'

const BUSINESS_TYPES: MessageType[] = [
  'order_paid',
  'order_shipped',
  'order_customs',
  'order_delivered',
  'order_cancelled',
  'after_sales_update',
  'inquiry_received',
  'quote_generated',
  'logistics_delay',
  'customs_issue',
  'payment_failed'
]

export default function Messages() {
  const {user} = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('business')
  const [businessMessages, setBusinessMessages] = useState<Message[]>([])
  const [followMessages, setFollowMessages] = useState<Message[]>([])
  const [likeMessages, setLikeMessages] = useState<Message[]>([])
  const [commentMessages, setCommentMessages] = useState<Message[]>([])
  const [otherMessages, setOtherMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const loadMessages = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 加载业务通知
    const {data: businessData} = await getMessagesByType(user.id, BUSINESS_TYPES)
    setBusinessMessages(businessData)

    // 加载新增追踪消息
    const {data: followData} = await getMessagesByType(user.id, ['new_follower'])
    setFollowMessages(followData)

    // 加载赞与收藏消息
    const {data: likeData} = await getMessagesByType(user.id, ['note_liked', 'comment_liked'])
    setLikeMessages(likeData)

    // 加载评论和@消息
    const {data: commentData} = await getMessagesByType(user.id, ['note_commented', 'comment_replied', 'mentioned'])
    setCommentMessages(commentData)

    // 加载其他消息（举报相关、新笔记通知等）
    const {data: otherData} = await getMessagesByType(user.id, [
      'note_deleted',
      'report_rejected',
      'new_note_from_following',
      'system'
    ])
    setOtherMessages(otherData)

    setLoading(false)

    // 通知外部未读数已更新
    Taro.eventCenter.trigger('refreshUnreadCount')
  }, [user])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const handleMessageClick = async (message: Message) => {
    if (!message.is_read) {
      await markMessageAsRead(message.id)
      loadMessages()
    }

    // 业务消息跳转
    if (BUSINESS_TYPES.includes(message.type)) {
      if (message.related_order_no) {
        Taro.navigateTo({url: `/pages/order-detail/index?orderNo=${message.related_order_no}`})
        return
      }
      if (message.related_inquiry_id) {
        Taro.navigateTo({url: `/pages/ai-trade-inquiry-detail/index?id=${message.related_inquiry_id}`})
        return
      }
      if (message.related_quote_id) {
        Taro.navigateTo({url: `/pages/ai-trade-quote-detail/index?id=${message.related_quote_id}`})
        return
      }
      if (message.related_after_sale_id) {
        Taro.navigateTo({url: `/pages/after-sales/index`})
        return
      }
      return
    }

    // 根据消息类型跳转
    if (message.related_note_id) {
      let url = `/pages/note-detail/index?id=${message.related_note_id}`
      if (message.related_comment_id) {
        url += `&highlightCommentId=${message.related_comment_id}`
      }
      Taro.navigateTo({url})
    } else if (message.related_user_id) {
      Taro.navigateTo({url: `/pages/user-profile/index?userId=${message.related_user_id}`})
    }
  }

  const getMessageIcon = (type: string) => {
    if (BUSINESS_TYPES.includes(type as MessageType)) {
      if (type.startsWith('order_')) return 'i-mdi-package-variant-closed'
      if (type === 'after_sales_update') return 'i-mdi-shield-refresh'
      if (type === 'inquiry_received') return 'i-mdi-email-search-outline'
      if (type === 'quote_generated') return 'i-mdi-file-document-outline'
      if (type === 'logistics_delay' || type === 'customs_issue') return 'i-mdi-alert-circle-outline'
      return 'i-mdi-bell-badge'
    }
    switch (type) {
      case 'new_follower':
        return 'i-mdi-account-plus'
      case 'note_liked':
      case 'comment_liked':
        return 'i-mdi-heart'
      case 'note_commented':
      case 'comment_replied':
        return 'i-mdi-comment'
      case 'mentioned':
        return 'i-mdi-at'
      default:
        return 'i-mdi-bell'
    }
  }

  const getCurrentMessages = () => {
    switch (activeTab) {
      case 'business':
        return businessMessages
      case 'follow':
        return followMessages
      case 'like':
        return likeMessages
      case 'comment':
        return commentMessages
      case 'other':
        return otherMessages
      default:
        return []
    }
  }

  const getUnreadCount = (messages: Message[]) => {
    return messages.filter((m) => !m.is_read).length
  }

  const handleMarkAllRead = async () => {
    if (!user) return

    // 获取所有板块的未读消息
    const allUnreadIds = [
      ...businessMessages.filter((m) => !m.is_read).map((m) => m.id),
      ...followMessages.filter((m) => !m.is_read).map((m) => m.id),
      ...likeMessages.filter((m) => !m.is_read).map((m) => m.id),
      ...commentMessages.filter((m) => !m.is_read).map((m) => m.id),
      ...otherMessages.filter((m) => !m.is_read).map((m) => m.id)
    ]

    if (allUnreadIds.length === 0) {
      Taro.showToast({title: '没有未读消息', icon: 'none'})
      return
    }

    Taro.showLoading({title: '处理中...'})
    for (const id of allUnreadIds) {
      await markMessageAsRead(id)
    }
    Taro.hideLoading()
    Taro.showToast({title: '已全部标记为已读', icon: 'success'})
    loadMessages()
  }

  const handleDeleteMessage = async (messageId: string) => {
    Taro.showModal({
      title: '删除消息',
      content: '确定要删除这条消息吗？',
      success: async (res) => {
        if (res.confirm) {
          const {error} = await deleteMessage(messageId)
          if (!error) {
            Taro.showToast({title: '已删除', icon: 'success'})
            loadMessages()
          } else {
            Taro.showToast({title: '删除失败', icon: 'none'})
          }
        }
      }
    })
  }

  const handleDeleteAllMessages = async () => {
    if (!user) return
    Taro.showModal({
      title: '全部删除',
      content: '确定要删除所有消息吗？此操作不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({title: '删除中...'})
          const {error} = await deleteAllMessages(user.id)
          Taro.hideLoading()
          if (!error) {
            Taro.showToast({title: '已全部删除', icon: 'success'})
            loadMessages()
          } else {
            Taro.showToast({title: '删除失败', icon: 'none'})
          }
        }
      }
    })
  }

  if (!user) {
    return (
      <View className="min-h-screen bg-white flex items-center justify-center p-4">
        <View className="text-center">
          <View className="i-mdi-account-alert text-6xl text-slate-300 mb-4" />
          <Text className="text-base text-slate-500 block mb-4">请先登录查看消息</Text>
          <View
            className="bg-primary text-white px-6 py-2 rounded-lg inline-block active:opacity-80"
            onClick={() => Taro.navigateTo({url: '/pages/login/index'})}>
            <Text className="text-base font-medium text-white">去登录</Text>
          </View>
        </View>
      </View>
    )
  }

  const currentMessages = getCurrentMessages()

  return (
    <View className="min-h-screen bg-slate-50">
      {/* 标签栏 */}
      <View className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <View className="flex flex-row items-center justify-between px-4 py-2">
          <ScrollView scrollX className="flex-1 whitespace-nowrap">
            <View className="inline-flex flex-row">
              {[
                {key: 'business', label: '业务通知', messages: businessMessages},
                {key: 'follow', label: '追踪', messages: followMessages},
                {key: 'like', label: '赞', messages: likeMessages},
                {key: 'comment', label: '评论', messages: commentMessages},
                {key: 'other', label: '其他', messages: otherMessages}
              ].map((tab) => (
                <View
                  key={tab.key}
                  className={`px-4 py-3 text-center relative ${activeTab === tab.key ? 'text-primary' : 'text-slate-400'}`}
                  onClick={() => setActiveTab(tab.key as TabType)}>
                  <View className="flex flex-row items-center justify-center">
                    <Text className="text-base font-bold">{tab.label}</Text>
                    {getUnreadCount(tab.messages) > 0 && (
                      <View className="ml-1 bg-yellow-500 rounded-full px-1 py-0.5 min-w-[28px]">
                        <Text className="text-xs text-white font-bold text-center">NEW</Text>
                      </View>
                    )}
                  </View>
                  {activeTab === tab.key && (
                    <View className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
          <View className="ml-2 px-3 py-1 bg-primary rounded-full active:opacity-70" onClick={handleMarkAllRead}>
            <Text className="text-sm text-white font-bold">一键已读</Text>
          </View>
          <View className="ml-2 px-3 py-1 bg-red-500 rounded-full active:opacity-70" onClick={handleDeleteAllMessages}>
            <Text className="text-sm text-white font-bold">全部删除</Text>
          </View>
        </View>
      </View>

      <ScrollView className="w-full h-full" scrollY>
        <View className="p-4">
          {loading && (
            <View className="text-center py-10">
              <Text className="text-base text-slate-400">加载中...</Text>
            </View>
          )}

          {!loading && currentMessages.length === 0 && (
            <View className="text-center py-20">
              <View className="i-mdi-email-open text-6xl text-slate-300 mb-4" />
              <Text className="text-base text-slate-400">暂无消息</Text>
            </View>
          )}

          {!loading && currentMessages.length > 0 && (
            <View className="flex flex-col gap-3">
              {currentMessages.map((message) => (
                <View
                  key={message.id}
                  className={`bg-white rounded-xl p-4 active:opacity-80 ${message.is_read ? '' : 'border-l-4 border-primary'}`}
                  onClick={() => handleMessageClick(message)}
                  onLongPress={() => handleDeleteMessage(message.id)}>
                  <View className="flex flex-row items-start">
                    <View className={`${getMessageIcon(message.type)} text-2xl text-primary mr-3 mt-1`} />
                    <View className="flex-1">
                      <View className="flex flex-row items-center justify-between mb-2">
                        <Text className="text-base font-bold text-slate-800">{message.title}</Text>
                        {!message.is_read && <View className="w-2 h-2 bg-primary rounded-full" />}
                      </View>
                      <Text className="text-sm text-slate-600 leading-relaxed block mb-2">{message.content}</Text>
                      <Text className="text-xs text-slate-400">{new Date(message.created_at).toLocaleString()}</Text>
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
