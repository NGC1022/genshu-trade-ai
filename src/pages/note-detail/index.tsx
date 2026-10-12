import {Button, Image, Input, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {useRouter, useShareAppMessage, useShareTimeline} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import CommentItem from '@/components/CommentItem'
import MentionSelector from '@/components/MentionSelector'
import {useAuth} from '@/contexts/AuthContext'
import {
  checkFollowing,
  checkNoteLike,
  createMessage,
  createNoteComment,
  deleteNote,
  followUser,
  getCommentDetail,
  getCommentRepliesCount,
  getComments,
  getFollowerIds,
  getNoteDetail,
  getSKUList,
  incrementNoteViewCount,
  toggleNoteLike,
  unfollowUser
} from '@/db/api'
import type {Note, NoteComment, SKU} from '@/db/types'
import {DEFAULT_AVATAR, DEFAULT_PRODUCT_IMAGE} from '@/utils/images'
import {checkContentSafety} from '@/utils/security'
import {formatDateTime} from '@/utils/time'

export default function NoteDetail() {
  const router = useRouter()
  const {id, highlightCommentId} = router.params
  const {user} = useAuth()

  const [note, setNote] = useState<Note | null>(null)
  const [comments, setComments] = useState<NoteComment[]>([])
  const [commentRepliesCounts, setCommentRepliesCounts] = useState<Record<string, number>>({})
  const [isLiked, setIsLiked] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentImages, setCommentImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [recommendedSKUs, setRecommendedSKUs] = useState<SKU[]>([])
  const [commentSortBy, setCommentSortBy] = useState<'latest' | 'hottest'>('latest')
  const [replyTo, setReplyTo] = useState<NoteComment | null>(null)
  const [highlightParentId, setHighlightParentId] = useState<string | null>(null)
  const [showMentionSelector, setShowMentionSelector] = useState(false)
  const [mentionSearchText, setMentionSearchText] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [authorFollowerIds, setAuthorFollowerIds] = useState<string[]>([])

  const loadData = useCallback(async () => {
    if (!id) return

    // 如果有高亮评论，先获取其父评论ID以便自动展开
    if (highlightCommentId) {
      const {data: hComment} = await getCommentDetail(highlightCommentId)
      if (hComment?.parent_id) {
        setHighlightParentId(hComment.parent_id)
      }
    }

    const {data} = await getNoteDetail(id)
    if (data) {
      setNote(data)

      // 获取笔记作者的粉丝 ID 列表，用于标识关注了作者的用户
      const {data: followerIds} = await getFollowerIds(data.user_id)
      setAuthorFollowerIds(followerIds || [])

      const {data: comms} = await getComments(id, {sortBy: commentSortBy, parentId: null})
      setComments(comms)

      // 加载每个评论的回复数量
      const counts: Record<string, number> = {}
      await Promise.all(
        comms.map(async (c) => {
          const {count} = await getCommentRepliesCount(c.id)
          counts[c.id] = count
        })
      )
      setCommentRepliesCounts(counts)

      // 增加观看量
      await incrementNoteViewCount(id)

      if (user) {
        const {data: like} = await checkNoteLike(id, user.id)
        setIsLiked(!!like)

        // 检查是否已追踪作者
        if (data.user_id !== user.id) {
          const {data: followData} = await checkFollowing(user.id, data.user_id)
          setIsFollowing(!!followData)
        }
      }

      // 加载推荐商品详细信息
      if (data.recommended_products && data.recommended_products.length > 0) {
        const {data: allSKUs} = await getSKUList()
        const filtered = allSKUs.filter((sku) => data.recommended_products?.includes(sku.sku_code))
        setRecommendedSKUs(filtered)
      }
    }
  }, [id, user, commentSortBy, highlightCommentId])

  useEffect(() => {
    loadData()

    // 监听追踪状态变化
    const handleFollowStatusChanged = (data: {userId: string; isFollowing: boolean}) => {
      if (note && data.userId === note.user_id) {
        setIsFollowing(data.isFollowing)
      }
    }

    Taro.eventCenter.on('followStatusChanged', handleFollowStatusChanged)

    return () => {
      Taro.eventCenter.off('followStatusChanged', handleFollowStatusChanged)
    }
  }, [loadData, note])

  useShareAppMessage(() => ({
    title: note?.title || '精彩笔记',
    path: `/pages/note-detail/index?id=${id}`,
    imageUrl: note?.images?.[0]
  }))

  useShareTimeline(() => ({
    title: note?.title || '精彩笔记',
    query: `id=${id}`,
    imageUrl: note?.images?.[0]
  }))

  const handleToggleLike = async () => {
    if (!user || !note) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }
    const newLiked = !isLiked
    setIsLiked(newLiked)
    setNote((prev) => (prev ? {...prev, likes_count: prev.likes_count + (newLiked ? 1 : -1)} : null))
    await toggleNoteLike(note.id, user.id, !newLiked)
  }

  const handleFollow = async () => {
    if (!user || !note) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }

    if (isFollowing) {
      // 取消追踪需要确认
      Taro.showModal({
        title: '取消追踪',
        content: '确定取消追踪该用户吗？',
        success: async (res) => {
          if (res.confirm) {
            const {error} = await unfollowUser(user.id, note.user_id)
            if (!error) {
              setIsFollowing(false)
              Taro.showToast({title: '已取消追踪', icon: 'success'})
              // 通知其他页面更新追踪状态
              Taro.eventCenter.trigger('followStatusChanged', {userId: note.user_id, isFollowing: false})
            }
          }
        }
      })
    } else {
      const {error} = await followUser(user.id, note.user_id)
      if (!error) {
        setIsFollowing(true)
        Taro.showToast({title: '追踪成功', icon: 'success'})
        // 通知其他页面更新追踪状态
        Taro.eventCenter.trigger('followStatusChanged', {userId: note.user_id, isFollowing: true})
      }
    }
  }

  const handleUserClick = () => {
    if (!note) return
    Taro.navigateTo({url: `/pages/user-profile/index?userId=${note.user_id}`})
  }

  const handleCommentTextChange = (e: any) => {
    const text = e.detail.value
    setCommentText(text)

    // 检测@符号
    const lastAtIndex = text.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      // 获取@后面的文本
      const afterAt = text.substring(lastAtIndex + 1)
      // 如果@后面没有空格，显示用户选择器
      if (!afterAt.includes(' ') && afterAt.length >= 0) {
        setShowMentionSelector(true)
        setMentionSearchText(afterAt)
        setMentionStartIndex(lastAtIndex)
      } else {
        setShowMentionSelector(false)
      }
    } else {
      setShowMentionSelector(false)
    }
  }

  const handleMentionSelect = (user: {id: string; username: string}) => {
    // 替换@文本为@[用户名](用户ID)格式
    const beforeMention = commentText.substring(0, mentionStartIndex)
    const afterMention = commentText.substring(mentionStartIndex + 1 + mentionSearchText.length)
    const newText = `${beforeMention}@[${user.username}](${user.id}) ${afterMention}`
    setCommentText(newText)
    setShowMentionSelector(false)
    setMentionSearchText('')
    setMentionStartIndex(-1)
  }

  const handlePostComment = async () => {
    if (!user || !note) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }
    if (!commentText.trim() && commentImages.length === 0) {
      Taro.showToast({title: '请输入内容或选择图片', icon: 'none'})
      return
    }

    // 内容安全审核
    const safetyCheck = checkContentSafety(commentText)
    if (!safetyCheck.isSafe) {
      Taro.showModal({
        title: '发布失败',
        content: `评论内容未通过安全审核：${safetyCheck.reason}。请修改后重试。`,
        showCancel: false
      })
      return
    }

    setLoading(true)
    try {
      // 上传图片到Supabase Storage
      let uploadedImageUrls: string[] = []
      if (commentImages.length > 0) {
        Taro.showLoading({title: '上传图片中...'})
        const {uploadCommentImages} = await import('@/utils/imageUpload')
        uploadedImageUrls = await uploadCommentImages(commentImages, user.id)
        Taro.hideLoading()
      }

      // 创建评论
      const {error} = await createNoteComment({
        note_id: note.id,
        user_id: user.id,
        content: commentText || '',
        parent_id: replyTo ? replyTo.parent_id || replyTo.id : undefined,
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined
      })

      if (error) {
        Taro.showToast({title: '评论失败', icon: 'none'})
      } else {
        setCommentText('')
        setCommentImages([])
        setReplyTo(null)
        Taro.showToast({title: '已发布', icon: 'success'})
        loadData()
      }
    } catch (error) {
      console.error('发布评论错误:', error)
      Taro.showToast({title: '发布失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handleChooseImage = () => {
    Taro.chooseImage({
      count: 3 - commentImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        setCommentImages([...commentImages, ...res.tempFilePaths])
      }
    })
  }

  const handleRemoveImage = (index: number) => {
    setCommentImages(commentImages.filter((_, i) => i !== index))
  }

  const handleReply = (comment: NoteComment) => {
    setReplyTo(comment)
    // 滚动到输入框
    setTimeout(() => {
      Taro.pageScrollTo({
        scrollTop: 9999,
        duration: 300
      })
    }, 100)
    Taro.showToast({title: `回复 ${comment.author?.username || '用户'}`, icon: 'none'})
  }

  const handleReportComment = (comment: NoteComment) => {
    Taro.navigateTo({url: `/pages/note-report/index?commentId=${comment.id}`})
  }

  const handleLongPressNote = () => {
    if (!note) return
    Taro.showActionSheet({
      itemList: ['复制笔记内容'],
      success: (res) => {
        if (res.tapIndex === 0) {
          Taro.setClipboardData({
            data: `${note.title}\n\n${note.content}`,
            success: () => Taro.showToast({title: '内容已复制', icon: 'success'})
          })
        }
      }
    })
  }

  const handleSortChange = (sort: 'latest' | 'hottest') => {
    setCommentSortBy(sort)
  }

  const handlePreviewImage = (current: string, urls: string[]) => {
    Taro.previewImage({
      current,
      urls
    })
  }

  const handleLongPressImage = async (imageUrl: string) => {
    Taro.showActionSheet({
      itemList: ['保存图片（含水印）'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          try {
            Taro.showLoading({title: '处理中...'})
            const downloadRes = await Taro.downloadFile({url: imageUrl})
            await Taro.saveImageToPhotosAlbum({filePath: downloadRes.tempFilePath})
            Taro.hideLoading()
            Taro.showToast({title: '已保存到相册', icon: 'success'})
          } catch (_e) {
            Taro.hideLoading()
            Taro.showToast({title: '保存失败', icon: 'none'})
          }
        }
      }
    })
  }

  const handleShareToPlatform = () => {
    const shareUrl = `https://app.genshu.com/notes/${id}`

    // 优先满足用户的核心需求：点击分享自动复制链接
    Taro.setClipboardData({
      data: shareUrl,
      success: () => {
        Taro.showToast({title: '链接已复制，去分享吧', icon: 'success'})

        // 然后再显示多平台分享选项供用户选择
        setTimeout(() => {
          Taro.showActionSheet({
            itemList: ['微信', '朋友圈', '微博', '小红书', '抖音', 'Instagram'],
            success: (res) => {
              const platforms = ['微信', '朋友圈', '微博', '小红书', '抖音', 'Instagram']
              const platform = platforms[res.tapIndex]
              if (platform === '微信' || platform === '朋友圈') {
                Taro.showToast({title: '请使用右上角系统分享功能', icon: 'none'})
              } else {
                Taro.showToast({title: `即将分享到${platform}`, icon: 'none'})
              }
            }
          })
        }, 1000)
      },
      fail: () => {
        // 如果自动复制失败（如环境限制），则降级到菜单选择
        Taro.showActionSheet({
          itemList: ['复制链接', '微信', '朋友圈', '其他平台'],
          success: (res) => {
            if (res.tapIndex === 0) {
              Taro.setClipboardData({
                data: shareUrl,
                success: () => Taro.showToast({title: '链接已复制', icon: 'success'})
              })
            } else {
              Taro.showToast({title: '请使用系统分享', icon: 'none'})
            }
          }
        })
      }
    })
  }

  const handleTopicClick = (topic: string) => {
    Taro.setStorageSync('search_topic', topic)
    Taro.switchTab({url: '/pages/notes/index'})
  }

  const handleMoreActions = () => {
    if (!note || !user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }

    const isOwner = note.user_id === user.id
    const isAdmin = user.role === 'admin' || user.role === 'super_admin'
    const canDelete = isOwner || isAdmin
    const itemList = canDelete ? ['删除笔记'] : ['举报该笔记']

    Taro.showActionSheet({
      itemList,
      success: async (res) => {
        if (canDelete && res.tapIndex === 0) {
          // 删除笔记
          Taro.showModal({
            title: '确认删除',
            content: '删除后将无法恢复，确定要删除这篇笔记吗？',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                const {error} = await deleteNote(note.id)
                if (error) {
                  Taro.showToast({title: '删除失败', icon: 'none'})
                } else {
                  // 如果是管理员删除，发送通知给笔记作者
                  if (isAdmin && !isOwner) {
                    await createMessage({
                      user_id: note.user_id,
                      type: 'note_deleted',
                      title: '内容违规删除通知',
                      content: `您发布的笔记《${note.title || '无标题'}》因违反社区规范已被管理员删除。`,
                      related_note_id: note.id
                    })
                  }
                  Taro.showToast({title: '删除成功', icon: 'success'})
                  setTimeout(() => Taro.navigateBack(), 1500)
                }
              }
            }
          })
        } else if (!canDelete && res.tapIndex === 0) {
          // 举报笔记
          Taro.navigateTo({url: `/pages/note-report/index?noteId=${note.id}`})
        }
      }
    })
  }

  if (!note)
    return (
      <View className="p-10 text-center">
        <Text>加载中...</Text>
      </View>
    )

  return (
    <View className="min-h-screen bg-white flex flex-col pb-20">
      <ScrollView className="flex-1" scrollY>
        {/* 图片轮播 - 仅在有图片时显示 */}
        {note.images && note.images.length > 0 && (
          <Swiper
            key={`swiper-${note.images.length}`}
            className="w-full h-[500px] bg-black"
            indicatorDots={note.images.length > 1}
            autoplay={false}
            circular={note.images.length > 1}>
            {note.images.map((src, index) => (
              <SwiperItem key={index}>
                <View
                  className="w-full h-full flex items-center justify-center"
                  onClick={() => handlePreviewImage(src, note.images)}
                  onLongPress={() => handleLongPressImage(src)}>
                  <Image src={src} className="w-full h-full" mode="aspectFit" />
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        )}

        <View className="p-4">
          {/* 作者信息及追踪按钮 */}
          <View className="flex flex-row items-center justify-between mb-4">
            <View className="flex flex-row items-center flex-1" onClick={handleUserClick}>
              <Image
                src={note.author?.avatar_url || DEFAULT_AVATAR}
                className="w-10 h-10 rounded-full mr-3 bg-slate-100"
              />
              <Text className="text-base font-bold text-slate-800">{note.author?.username || '用户'}</Text>
            </View>

            <View className="flex flex-row items-center gap-3">
              {/* 追踪按钮 - 仅在不是自己的笔记时显示 */}
              {user && note.user_id !== user.id && (
                <View
                  className={`px-4 py-2 rounded-full border-2 active:opacity-70 ${
                    isFollowing ? 'border-primary bg-white' : 'border-primary bg-primary'
                  }`}
                  onClick={handleFollow}>
                  <Text className={`text-base font-bold ${isFollowing ? 'text-primary' : 'text-white'}`}>
                    {isFollowing ? '已追踪' : '追踪'}
                  </Text>
                </View>
              )}

              {/* 更多操作按钮 */}
              <View
                className="i-mdi-dots-vertical text-2xl text-slate-600 p-1 active:opacity-60"
                onClick={handleMoreActions}
              />
            </View>
          </View>

          {/* 标题正文 */}
          <View onLongPress={handleLongPressNote}>
            <Text className="text-xl font-bold text-slate-900 block mb-3">{note.title}</Text>
            <Text className="text-base text-slate-700 leading-relaxed block mb-4">{note.content}</Text>
          </View>

          {/* 话题 */}
          {note.topics && note.topics.length > 0 && (
            <View className="flex flex-wrap gap-2 mb-4">
              {note.topics.map((t, i) => (
                <View
                  key={i}
                  className="flex flex-row items-center bg-primary px-3 py-1 rounded-full active:opacity-80"
                  onClick={() => handleTopicClick(t)}>
                  <Text className="text-white text-sm font-medium"># {t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 位置信息 */}
          {note.location && (
            <View className="flex flex-row items-center bg-blue-50 p-3 rounded-lg mb-4">
              <View className="i-mdi-map-marker text-xl text-blue-500 mr-2" />
              <Text className="text-sm text-blue-600 font-medium truncate flex-1">{note.location.address}</Text>
            </View>
          )}

          {/* 推荐商品 */}
          {recommendedSKUs.length > 0 && (
            <View className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-cart text-xl text-amber-600 mr-2" />
                <Text className="text-base font-bold text-amber-800">作者推荐的商品</Text>
              </View>
              <View className="flex flex-col gap-3">
                {recommendedSKUs.map((sku) => (
                  <View
                    key={sku.sku_code}
                    className="bg-white rounded-lg p-3 flex flex-row items-center active:opacity-80 border border-amber-200"
                    onClick={() => Taro.navigateTo({url: `/pages/product-detail/index?sku=${sku.sku_code}`})}>
                    <Image
                      src={sku.image_url || DEFAULT_PRODUCT_IMAGE}
                      className="w-16 h-16 rounded-lg bg-slate-100 mr-3"
                      mode="aspectFill"
                    />
                    <View className="flex-1">
                      <Text className="text-base font-bold text-slate-800 block mb-1">{sku.name}</Text>
                      <Text className="text-lg font-bold text-primary">¥{sku.price}</Text>
                    </View>
                    <View className="i-mdi-chevron-right text-2xl text-slate-400" />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 发布时间 */}
          <Text className="text-sm text-slate-400 block mb-8">发布于 {formatDateTime(note.created_at)}</Text>

          {/* 评论区 */}
          <View className="border-t border-slate-100 pt-6">
            <View className="flex flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900">共 {note.comments_count} 条评论</Text>
              <View className="flex flex-row items-center gap-2">
                <View
                  className={`px-3 py-1 rounded-full ${commentSortBy === 'latest' ? 'bg-primary' : 'bg-slate-100'}`}
                  onClick={() => handleSortChange('latest')}>
                  <Text
                    className={`text-sm font-medium ${commentSortBy === 'latest' ? 'text-white' : 'text-slate-600'}`}>
                    最新
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${commentSortBy === 'hottest' ? 'bg-primary' : 'bg-slate-100'}`}
                  onClick={() => handleSortChange('hottest')}>
                  <Text
                    className={`text-sm font-medium ${commentSortBy === 'hottest' ? 'text-white' : 'text-slate-600'}`}>
                    最热
                  </Text>
                </View>
              </View>
            </View>

            {replyTo && (
              <View className="bg-blue-50 rounded-xl p-3 mb-4 flex flex-row items-center justify-between">
                <Text className="text-sm text-blue-700">
                  回复 <Text className="font-bold">{replyTo.author?.username || '用户'}</Text>
                </Text>
                <View className="i-mdi-close text-lg text-blue-700" onClick={() => setReplyTo(null)} />
              </View>
            )}

            <View className="space-y-4">
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  currentUserId={user?.id}
                  currentUserRole={user?.role}
                  noteAuthorId={note.user_id}
                  authorFollowerIds={authorFollowerIds}
                  repliesCount={commentRepliesCounts[c.id] || 0}
                  shouldHighlight={highlightCommentId === c.id}
                  autoExpand={highlightParentId === c.id}
                  highlightCommentId={highlightCommentId}
                  onReply={handleReply}
                  onReport={handleReportComment}
                  onUpdate={loadData}
                />
              ))}
              {comments.length === 0 && (
                <View className="py-10 text-center">
                  <View className="i-mdi-comment-outline text-6xl text-slate-200 mb-2" />
                  <Text className="text-base text-slate-300">首位评论者虚位以待</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      <View className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 z-10 safe-area-bottom">
        {commentImages.length > 0 && (
          <View className="flex flex-row gap-2 mb-2 flex-wrap">
            {commentImages.map((img, idx) => (
              <View key={idx} className="relative">
                <Image src={img} className="w-16 h-16 rounded-lg" mode="aspectFill" />
                <View
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                  onClick={() => handleRemoveImage(idx)}>
                  <View className="i-mdi-close text-sm text-white" />
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="flex flex-row items-center relative">
          <View className="flex-1 bg-slate-100 rounded-full px-4 py-2 mr-2 flex flex-row items-center relative">
            <MentionSelector
              visible={showMentionSelector}
              searchText={mentionSearchText}
              excludeUserId={note?.user_id}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentionSelector(false)}
            />
            <Input
              className="flex-1 text-base"
              placeholder={replyTo ? `回复 ${replyTo.author?.username || '用户'}` : '爱评论的人运气都不差~'}
              value={commentText}
              onInput={handleCommentTextChange}
            />
          </View>
          {commentImages.length < 3 && (
            <View className="i-mdi-image text-2xl text-slate-600 mr-2" onClick={handleChooseImage} />
          )}
          <Button
            className="bg-primary text-white rounded-full px-6 text-base font-bold border-none"
            onClick={handlePostComment}
            loading={loading}
            disabled={!commentText.trim() && commentImages.length === 0}>
            <View className="py-1">
              <Text className="text-white">发送</Text>
            </View>
          </Button>
          <View className="flex flex-row items-center ml-3 space-x-3">
            <View className="flex flex-col items-center" onClick={handleToggleLike}>
              <View
                className={`i-mdi-heart${isLiked ? '' : '-outline'} text-2xl ${isLiked ? 'text-red-500' : 'text-slate-600'}`}
              />
              <Text className="text-xs text-slate-500 mt-1">{note.likes_count}</Text>
            </View>
            <View className="flex flex-col items-center" onClick={handleShareToPlatform}>
              <View className="i-mdi-share-variant-outline text-2xl text-slate-600" />
              <Text className="text-xs text-slate-500 mt-1">分享</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
