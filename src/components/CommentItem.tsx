import {Image, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {
  checkCommentLike,
  createMessage,
  deleteComment,
  getCommentRepliesWithPagination,
  hideComment,
  restoreComment,
  toggleCommentLike
} from '@/db/api'
import type {NoteComment} from '@/db/types'
import {DEFAULT_AVATAR} from '@/utils/images'
import {formatDateTime} from '@/utils/time'
import MentionText from './MentionText'
import ReplyItem from './ReplyItem'

interface CommentItemProps {
  comment: NoteComment
  currentUserId?: string
  currentUserRole?: string
  noteAuthorId: string
  authorFollowerIds?: string[]
  currentUserFollowingIds?: string[]
  repliesCount?: number
  shouldHighlight?: boolean
  autoExpand?: boolean
  highlightCommentId?: string
  onReply: (comment: NoteComment) => void
  onReport: (comment: NoteComment) => void
  onUpdate: () => void
}

export default function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  noteAuthorId,
  authorFollowerIds = [],
  currentUserFollowingIds = [],
  repliesCount = 0,
  shouldHighlight = false,
  autoExpand = false,
  highlightCommentId,
  onReply,
  onReport,
  onUpdate
}: CommentItemProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0)
  const [isHidden, setIsHidden] = useState(false)
  const [replies, setReplies] = useState<NoteComment[]>([])
  const [showReplies, setShowReplies] = useState(false)
  const [repliesOffset, setRepliesOffset] = useState(0)
  const [hasMoreReplies, setHasMoreReplies] = useState(false)
  const [isHighlighted, setIsHighlighted] = useState(false)

  const isAuthor = comment.user_id === noteAuthorId
  const isFollowerOfAuthor = authorFollowerIds.includes(comment.user_id)
  const _isFollowingByCurrentUser = currentUserFollowingIds.includes(comment.user_id)
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin'
  const canDelete = currentUserId && (currentUserId === comment.user_id || isAdmin)

  const loadReplies = useCallback(
    async (offset: number = 0) => {
      const {data} = await getCommentRepliesWithPagination(comment.id, 5, offset)
      if (offset === 0) {
        setReplies(data)
      } else {
        setReplies((prev) => [...prev, ...data])
      }
      setHasMoreReplies(data.length === 5)
      setRepliesOffset(offset + data.length)
    },
    [comment.id]
  )

  useEffect(() => {
    if (currentUserId) {
      checkCommentLike(comment.id, currentUserId).then(({data}) => {
        setIsLiked(!!data)
      })
    }
  }, [comment.id, currentUserId])

  useEffect(() => {
    if (shouldHighlight) {
      setIsHighlighted(true)
      setTimeout(() => {
        setIsHighlighted(false)
      }, 2000)
    }
  }, [shouldHighlight])

  useEffect(() => {
    if (autoExpand && !showReplies) {
      loadReplies(0)
      setShowReplies(true)
    }
  }, [autoExpand, showReplies, loadReplies])

  const handleLike = async () => {
    if (!currentUserId) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }

    const newLiked = !isLiked
    setIsLiked(newLiked)
    setLikesCount((prev) => prev + (newLiked ? 1 : -1))
    await toggleCommentLike(comment.id, currentUserId, isLiked)
  }

  const handleDelete = () => {
    Taro.showModal({
      title: '删除评论',
      content: '确定要删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          const {error} = await deleteComment(comment.id)
          if (!error) {
            Taro.showToast({title: '已删除', icon: 'success'})

            // 如果是管理员删除，发送通知给评论作者
            if (isAdmin && currentUserId !== comment.user_id) {
              await createMessage({
                user_id: comment.user_id,
                type: 'note_deleted',
                title: '内容违规删除通知',
                content: `您发布的评论“${(comment.content || '').substring(0, 15)}...”因违反社区规范已被管理员删除。`,
                related_note_id: comment.note_id
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
    await hideComment(comment.id, currentUserId)
    setIsHidden(true)
    Taro.showToast({title: '已隐藏', icon: 'none'})
  }

  const handleRestore = async () => {
    const {error} = await restoreComment(comment.id)
    if (!error) {
      setIsHidden(false)
      Taro.showToast({title: '已恢复显示', icon: 'success'})
    }
  }

  const handleUserClick = () => {
    Taro.navigateTo({url: `/pages/user-profile/index?userId=${comment.user_id}`})
  }

  const handleMore = () => {
    const items: string[] = []
    items.push('複製評論')
    if (canDelete) items.push('删除')
    if (!canDelete) items.push('举报')
    if (currentUserId && currentUserId !== comment.user_id) items.push('不感兴趣')

    Taro.showActionSheet({
      itemList: items,
      success: (res) => {
        const action = items[res.tapIndex]
        if (action === '複製評論') {
          Taro.setClipboardData({
            data: comment.content,
            success: () => Taro.showToast({title: '已复制内容', icon: 'success'})
          })
        } else if (action === '删除') {
          handleDelete()
        } else if (action === '举报') {
          onReport(comment)
        } else if (action === '不感兴趣') {
          handleHide()
        }
      }
    })
  }

  const handleToggleReplies = async () => {
    if (!showReplies) {
      await loadReplies(0)
      setShowReplies(true)
    } else {
      setShowReplies(false)
      setReplies([])
      setRepliesOffset(0)
    }
  }

  const handleLoadMoreReplies = () => {
    loadReplies(repliesOffset)
  }

  if (isHidden) {
    return (
      <View className="bg-slate-50 rounded-xl p-4 mb-3">
        <Text className="text-sm text-slate-400">已隐藏此评论</Text>
        <View className="mt-2" onClick={handleRestore}>
          <Text className="text-sm text-primary font-medium">恢复显示</Text>
        </View>
      </View>
    )
  }

  return (
    <View
      className={`mb-4 transition-all duration-500 ${isHighlighted ? 'bg-red-500/50 rounded-xl p-2 ring-4 ring-red-500/20' : ''}`}
      onLongPress={handleMore}>
      <View className="flex flex-row items-start">
        <Image
          src={comment.author?.avatar_url || DEFAULT_AVATAR}
          className="w-10 h-10 rounded-full mr-3 bg-slate-100"
          onClick={handleUserClick}
        />
        <View className="flex-1">
          <View className="flex flex-row items-center mb-1">
            <Text className="text-base font-bold text-slate-800" onClick={handleUserClick}>
              {comment.author?.username || '用户'}
            </Text>
            {isAuthor && (
              <View className="ml-2 bg-primary/10 px-2 py-0.5 rounded">
                <Text className="text-xs text-primary font-bold">作者</Text>
              </View>
            )}
            {isFollowerOfAuthor && !isAuthor && (
              <View className="ml-2 bg-slate-100 px-2 py-0.5 rounded flex flex-row items-center">
                <Text className="text-xs text-slate-500 font-bold">已关注用户</Text>
              </View>
            )}
          </View>

          <MentionText content={comment.content} className="text-base text-slate-700 leading-relaxed mb-2" />

          {comment.images && comment.images.length > 0 && (
            <View className="flex flex-wrap gap-2 mb-2">
              {comment.images.map((img, idx) => (
                <Image
                  key={idx}
                  src={img}
                  className="w-24 h-24 rounded-lg"
                  mode="aspectFill"
                  onClick={() => Taro.previewImage({current: img, urls: comment.images || []})}
                />
              ))}
            </View>
          )}

          <View className="flex flex-row items-center">
            <Text className="text-xs text-slate-400 mr-4">{formatDateTime(comment.created_at)}</Text>
            <View className="flex flex-row items-center mr-4" onClick={handleLike}>
              <View
                className={`i-mdi-heart${isLiked ? '' : '-outline'} text-base ${isLiked ? 'text-red-500' : 'text-slate-400'} mr-1`}
              />
              <Text className="text-xs text-slate-500">{likesCount}</Text>
            </View>
            <View className="flex flex-row items-center mr-4" onClick={() => onReply(comment)}>
              <View className="i-mdi-reply text-base text-slate-400 mr-1" />
              <Text className="text-xs text-slate-500">回复</Text>
            </View>
            <View className="flex flex-row items-center" onClick={handleMore}>
              <View className="i-mdi-dots-horizontal text-base text-slate-400" />
            </View>
          </View>

          {/* 回复列表 */}
          {repliesCount > 0 && (
            <View className="mt-3">
              {!showReplies ? (
                <View className="flex flex-row items-center" onClick={handleToggleReplies}>
                  <Text className="text-sm text-primary font-medium">展开 {repliesCount} 条回复</Text>
                  <View className="i-mdi-chevron-down text-base text-primary ml-1" />
                </View>
              ) : (
                <View>
                  <View className="bg-slate-50 rounded-xl p-3 space-y-3">
                    {replies.map((reply) => (
                      <ReplyItem
                        key={reply.id}
                        reply={reply}
                        parentAuthorName={comment.author?.username || '用户'}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        noteAuthorId={noteAuthorId}
                        authorFollowerIds={authorFollowerIds}
                        currentUserFollowingIds={currentUserFollowingIds}
                        shouldHighlight={highlightCommentId === reply.id}
                        onReply={onReply}
                        onReport={onReport}
                        onUpdate={onUpdate}
                      />
                    ))}
                  </View>
                  <View className="flex flex-row items-center mt-2">
                    {hasMoreReplies && (
                      <View className="mr-4" onClick={handleLoadMoreReplies}>
                        <Text className="text-sm text-primary font-medium">加载更多回复</Text>
                      </View>
                    )}
                    <View onClick={handleToggleReplies}>
                      <Text className="text-sm text-slate-500">收起</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
