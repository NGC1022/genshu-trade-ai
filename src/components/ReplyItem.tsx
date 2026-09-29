import {Image, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {checkCommentLike, createMessage, deleteComment, hideComment, toggleCommentLike} from '@/db/api'
import type {NoteComment} from '@/db/types'
import {DEFAULT_AVATAR} from '@/utils/images'
import MentionText from './MentionText'

interface ReplyItemProps {
  reply: NoteComment
  parentAuthorName: string
  currentUserId?: string
  isAdmin: boolean
  noteAuthorId: string
  authorFollowerIds?: string[]
  currentUserFollowingIds?: string[]
  shouldHighlight?: boolean
  onReply: (reply: NoteComment) => void
  onReport: (reply: NoteComment) => void
  onUpdate: () => void
}

export default function ReplyItem({
  reply,
  parentAuthorName,
  currentUserId,
  isAdmin,
  noteAuthorId,
  authorFollowerIds = [],
  currentUserFollowingIds = [],
  shouldHighlight = false,
  onReply,
  onReport,
  onUpdate
}: ReplyItemProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(reply.likes_count || 0)
  const [isHidden, setIsHidden] = useState(false)
  const [isHighlighted, setIsHighlighted] = useState(false)

  const isAuthor = reply.user_id === noteAuthorId
  const isFollowerOfAuthor = authorFollowerIds.includes(reply.user_id)
  const _isFollowingByCurrentUser = currentUserFollowingIds.includes(reply.user_id)

  useEffect(() => {
    if (shouldHighlight) {
      setIsHighlighted(true)
      setTimeout(() => {
        setIsHighlighted(false)
      }, 2000)
    }
  }, [shouldHighlight])

  useEffect(() => {
    if (currentUserId) {
      checkCommentLike(reply.id, currentUserId).then(({data}) => {
        setIsLiked(!!data)
      })
    }
  }, [currentUserId, reply.id])

  const handleLike = async () => {
    if (!currentUserId) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }
    await toggleCommentLike(reply.id, currentUserId, isLiked)
    setIsLiked(!isLiked)
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1)
  }

  const handleDelete = () => {
    Taro.showModal({
      title: '删除回复',
      content: '确定要删除这条回复吗？',
      success: async (res) => {
        if (res.confirm) {
          const {error} = await deleteComment(reply.id)
          if (!error) {
            Taro.showToast({title: '已删除', icon: 'success'})

            // 如果是管理员删除，发送通知给回复作者
            if (isAdmin && currentUserId !== reply.user_id) {
              await createMessage({
                user_id: reply.user_id,
                type: 'note_deleted',
                title: '内容违规删除通知',
                content: `您发布的回复“${(reply.content || '').substring(0, 15)}...”因违反社区规范已被管理员删除。`,
                related_note_id: reply.note_id
              })
            }

            onUpdate()
          }
        }
      }
    })
  }

  const handleHide = async () => {
    if (!currentUserId) return
    await hideComment(reply.id, currentUserId)
    setIsHidden(true)
    Taro.showToast({title: '已隐藏', icon: 'none'})
  }

  const handleMore = () => {
    const items: string[] = []
    const canDelete = currentUserId && (currentUserId === reply.user_id || isAdmin)

    items.push('複製評論')
    if (canDelete) items.push('删除')
    if (!canDelete) items.push('举报')
    if (currentUserId && currentUserId !== reply.user_id) items.push('不感兴趣')

    if (items.length === 0) return

    Taro.showActionSheet({
      itemList: items,
      success: (res) => {
        const action = items[res.tapIndex]
        if (action === '複製評論') {
          Taro.setClipboardData({
            data: reply.content,
            success: () => Taro.showToast({title: '已复制内容', icon: 'success'})
          })
        } else if (action === '删除') {
          handleDelete()
        } else if (action === '举报') {
          onReport(reply)
        } else if (action === '不感兴趣') {
          handleHide()
        }
      }
    })
  }

  if (isHidden) {
    return (
      <View className="bg-slate-50 rounded-lg p-2 mb-2">
        <Text className="text-xs text-slate-400">已隐藏此回复</Text>
      </View>
    )
  }

  return (
    <View
      className={`flex flex-row items-start mb-4 transition-all duration-500 ${
        isHighlighted ? 'bg-red-500/50 rounded-xl p-2 ring-4 ring-red-500/20' : ''
      }`}
      onLongPress={handleMore}>
      <Image
        src={reply.author?.avatar_url || DEFAULT_AVATAR}
        className="w-8 h-8 rounded-full mr-2 bg-slate-100"
        onClick={() => Taro.navigateTo({url: `/pages/user-profile/index?userId=${reply.user_id}`})}
      />
      <View className="flex-1">
        {/* 第一行：用户名 */}
        <View className="flex flex-row items-center mb-1">
          <Text
            className="text-sm font-bold text-slate-700"
            onClick={() => Taro.navigateTo({url: `/pages/user-profile/index?userId=${reply.user_id}`})}>
            {reply.author?.username || '用户'}
          </Text>
          {isAuthor && (
            <View className="ml-2 bg-primary/10 px-2 py-0.5 rounded">
              <Text className="text-xs text-primary font-bold">作者</Text>
            </View>
          )}
          {isFollowerOfAuthor && !isAuthor && (
            <View className="ml-2 bg-slate-100 px-2 py-0.5 rounded">
              <Text className="text-xs text-slate-500 font-bold">已关注用户</Text>
            </View>
          )}
        </View>

        {/* 第二行：@被回复者 + 回复内容 */}
        <View className="mb-2">
          <Text className="text-sm text-slate-400">@{parentAuthorName} </Text>
          <MentionText content={reply.content} className="text-sm text-slate-700" />
        </View>

        {/* 图片 */}
        {reply.images && reply.images.length > 0 && (
          <View className="flex flex-wrap gap-2 mb-2">
            {reply.images.map((img, idx) => (
              <Image
                key={idx}
                src={img}
                className="w-20 h-20 rounded-lg"
                mode="aspectFill"
                onClick={() => Taro.previewImage({current: img, urls: reply.images || []})}
              />
            ))}
          </View>
        )}

        {/* 第三行：操作按钮 */}
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-4">
            <View className="flex flex-row items-center" onClick={handleLike}>
              <View
                className={`${isLiked ? 'i-mdi-heart' : 'i-mdi-heart-outline'} text-base ${isLiked ? 'text-red-500' : 'text-slate-400'} mr-1`}
              />
              <Text className={`text-xs ${isLiked ? 'text-red-500' : 'text-slate-500'}`}>
                {likesCount > 0 ? likesCount : '点赞'}
              </Text>
            </View>
            <View className="flex flex-row items-center" onClick={() => onReply(reply)}>
              <View className="i-mdi-reply text-base text-slate-400 mr-1" />
              <Text className="text-xs text-slate-500">回复</Text>
            </View>
          </View>
          <View className="p-1" onClick={handleMore}>
            <View className="i-mdi-dots-horizontal text-base text-slate-400" />
          </View>
        </View>
      </View>
    </View>
  )
}
