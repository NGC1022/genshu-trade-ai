import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {
  createMessage,
  deleteComment,
  deleteNote,
  getAllCommentReports,
  getAllReports,
  getAllSystemReports,
  updateReportStatus,
  updateSystemReport
} from '@/db/api'
import {DEFAULT_AVATAR} from '@/utils/images'
import {formatDateTime} from '@/utils/time'

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('all')
  const [contentType, setContentType] = useState<'note' | 'comment' | 'system'>('note')

  const filters = [
    {key: 'all', label: '全部'},
    {key: 'pending', label: '待处理'},
    {key: 'rejected', label: '已驳回'},
    {key: 'resolved', label: '已删除'},
    {key: 'ignored', label: '已忽略'}
  ]

  const loadReports = useCallback(
    async (status?: string) => {
      setLoading(true)
      if (contentType === 'note') {
        const {data} = await getAllReports(status)
        setReports(data || [])
      } else if (contentType === 'comment') {
        const {data} = await getAllCommentReports(status)
        setReports(data || [])
      } else {
        const {data} = await getAllSystemReports(status === 'all' ? undefined : status)
        setReports(data || [])
      }
      setLoading(false)
    },
    [contentType]
  )

  useEffect(() => {
    loadReports(currentFilter === 'all' ? undefined : currentFilter)
  }, [loadReports, currentFilter])

  const handleApprove = async (report: any) => {
    // 检查内容是否已被删除
    const isDeleted =
      (contentType === 'note' && report.note?.is_deleted) || (contentType === 'comment' && report.comment?.is_deleted)

    if (isDeleted) {
      // 如果已删除，执行确认完成逻辑
      handleConfirmDeleted(report)
      return
    }

    Taro.showModal({
      title: '确认删除',
      content: `确定要删除此${contentType === 'note' ? '笔记' : '评论'}吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({title: '处理中...'})
          try {
            // 1. 删除内容
            const {error: deleteError} =
              contentType === 'note' ? await deleteNote(report.note.id) : await deleteComment(report.comment.id)

            if (deleteError) throw deleteError

            // 2. 更新举报状态为已解决
            await updateReportStatus(report.id, 'resolved', contentType as any)

            // 3. 发送通知给内容发布者
            const targetUserId = contentType === 'note' ? report.note?.user_id : report.comment?.user_id
            if (targetUserId) {
              await createMessage({
                user_id: targetUserId,
                type: 'note_deleted',
                title: '内容违规删除通知',
                content: `您发布的${contentType === 'note' ? '笔记' : '评论'}因违反社区规范已被管理员删除。`,
                related_note_id: contentType === 'note' ? report.note?.id : report.comment?.note_id
              })
            }

            Taro.showToast({title: '删除成功', icon: 'success'})
            loadReports(currentFilter === 'all' ? undefined : currentFilter)
          } catch (error) {
            console.error('删除内容失败:', error)
            Taro.showToast({title: '操作失败', icon: 'none'})
          } finally {
            Taro.hideLoading()
          }
        }
      }
    })
  }

  const handleDeleteReport = async (report: any) => {
    Taro.showModal({
      title: '删除举报记录',
      content: '确定要永久删除这条举报记录吗？',
      success: async (res) => {
        if (res.confirm) {
          const {deleteNoteReport, deleteCommentReport} = await import('@/db/api')
          const {error} =
            contentType === 'note' ? await deleteNoteReport(report.id) : await deleteCommentReport(report.id)

          if (error) {
            Taro.showToast({title: '删除失败', icon: 'none'})
          } else {
            Taro.showToast({title: '已删除', icon: 'success'})
            loadReports(currentFilter === 'all' ? undefined : currentFilter)
          }
        }
      }
    })
  }

  const handleConfirmDeleted = async (report: any) => {
    Taro.showModal({
      title: '确认完成',
      content: '确认已通过其他方式删除了该违规内容吗？',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({title: '正在确认...'})
          try {
            // 1. 更新举报状态为已解决
            await updateReportStatus(report.id, 'resolved', contentType as any)

            // 2. 发送消息给内容发布者
            const targetUserId = contentType === 'note' ? report.note?.user_id : report.comment?.user_id
            if (targetUserId) {
              await createMessage({
                user_id: targetUserId,
                type: 'note_deleted',
                title: '内容违规删除通知',
                content: `您发布的${contentType === 'note' ? '笔记' : '评论'}因违反社区规范已被管理员删除。`,
                related_note_id: contentType === 'note' ? report.note?.id : report.comment?.note_id
              })
            }

            Taro.showToast({title: '已确认完成', icon: 'success'})
            loadReports(currentFilter === 'all' ? undefined : currentFilter)
          } catch (e) {
            console.error('确认完成操作失败:', e)
            Taro.showToast({title: '操作失败', icon: 'none'})
          } finally {
            Taro.hideLoading()
          }
        }
      }
    })
  }

  const _handleReject = async (report: any) => {
    Taro.showModal({
      title: '确认驳回举报',
      content: '确定要驳回这个举报吗？',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({title: '正在驳回...'})
          try {
            // 1. 更新举报状态
            await updateReportStatus(report.id, 'rejected', contentType as 'note' | 'comment')

            // 2. 发送消息给举报者
            if (report.reporter_id) {
              const contentTitle =
                contentType === 'note'
                  ? `笔记《${report.note?.title || '无标题'}》`
                  : `评论内容“${(report.comment?.content || '').substring(0, 10)}...”`

              await createMessage({
                user_id: report.reporter_id,
                type: 'report_rejected',
                title: '举报反馈',
                content: `您对${contentTitle}的举报经核实未违反规范，已被驳回。感谢您的监督。`,
                related_note_id: contentType === 'note' ? report.note?.id : report.comment?.note_id
              })
            }

            Taro.showToast({title: '已驳回举报', icon: 'success'})
            loadReports(currentFilter === 'all' ? undefined : currentFilter)
          } catch (e) {
            console.error('驳回举报失败:', e)
            Taro.showToast({title: '操作失败', icon: 'none'})
          } finally {
            Taro.hideLoading()
          }
        }
      }
    })
  }

  const handleIgnore = async (report: any) => {
    Taro.showModal({
      title: '确认忽略',
      content: '忽略后该举报将不再显示在待处理列表中。',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({title: '处理中...'})
          try {
            if (contentType === 'system') {
              await updateSystemReport(report.id, {status: 'ignored'})
            } else {
              const {error} = await updateReportStatus(report.id, 'ignored', contentType as any)
              if (error) throw error
            }
            Taro.showToast({title: '已忽略', icon: 'success'})
            loadReports(currentFilter === 'all' ? undefined : currentFilter)
          } catch (e) {
            console.error('忽略报告失败:', e)
            Taro.showToast({title: '操作失败', icon: 'none'})
          } finally {
            Taro.hideLoading()
          }
        }
      }
    })
  }

  const handleResolveSystemReport = async (report: any) => {
    Taro.showModal({
      title: '标记为已解决',
      content: '确定该系统问题已修复或已处理吗？',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({title: '处理中...'})
          try {
            await updateSystemReport(report.id, {status: 'resolved'})
            Taro.showToast({title: '已解决', icon: 'success'})
            loadReports(currentFilter === 'all' ? undefined : currentFilter)
          } catch (e) {
            console.error('处理失败:', e)
            Taro.showToast({title: '操作失败', icon: 'none'})
          } finally {
            Taro.hideLoading()
          }
        }
      }
    })
  }

  const getSystemTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      system_error: '系统错误',
      ui_issue: '界面异常',
      feature_request: '功能建议',
      other: '其他问题'
    }
    return map[type] || type
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理'
      case 'resolved':
        return contentType === 'system' ? '已解决' : '已处理'
      case 'rejected':
        return '已驳回'
      case 'ignored':
        return '已忽略'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-amber-600 bg-amber-50'
      case 'resolved':
        return 'text-green-600 bg-green-50'
      case 'rejected':
        return 'text-red-600 bg-red-50'
      case 'ignored':
        return 'text-slate-600 bg-slate-50'
      default:
        return 'text-slate-600 bg-slate-50'
    }
  }

  return (
    <View className="min-h-screen bg-slate-50 flex flex-col">
      {/* 内容类型切换 */}
      <View className="bg-white border-b border-slate-100 flex flex-row">
        <View
          className={`flex-1 py-4 text-center active:opacity-70 ${
            contentType === 'note' ? 'border-b-2 border-primary' : ''
          }`}
          onClick={() => setContentType('note')}>
          <Text className={`text-xl font-bold ${contentType === 'note' ? 'text-primary' : 'text-slate-600'}`}>
            笔记
          </Text>
        </View>
        <View
          className={`flex-1 py-4 text-center active:opacity-70 ${
            contentType === 'comment' ? 'border-b-2 border-primary' : ''
          }`}
          onClick={() => setContentType('comment')}>
          <Text className={`text-xl font-bold ${contentType === 'comment' ? 'text-primary' : 'text-slate-600'}`}>
            评论
          </Text>
        </View>
        <View
          className={`flex-1 py-4 text-center active:opacity-70 ${
            contentType === 'system' ? 'border-b-2 border-primary' : ''
          }`}
          onClick={() => setContentType('system')}>
          <Text className={`text-xl font-bold ${contentType === 'system' ? 'text-primary' : 'text-slate-600'}`}>
            系统
          </Text>
        </View>
      </View>

      {/* 筛选分类 */}
      <View className="bg-white border-b border-slate-100 flex flex-row sticky top-0 z-10">
        <ScrollView className="w-full" scrollX showScrollbar={false}>
          <View className="flex flex-row px-2">
            {filters.map((f) => (
              <View
                key={f.key}
                className={`px-4 py-4 relative flex items-center justify-center min-w-[100px] active:opacity-70 transition-all ${
                  currentFilter === f.key ? 'text-primary' : 'text-slate-600'
                }`}
                onClick={() => setCurrentFilter(f.key)}>
                <Text className={`text-xl font-bold ${currentFilter === f.key ? 'text-primary' : ''}`}>{f.label}</Text>
                {currentFilter === f.key && <View className="absolute bottom-0 w-8 h-1 bg-primary rounded-full" />}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView className="flex-1" scrollY>
        <View className="p-4">
          {loading && (
            <View className="text-center py-10">
              <Text className="text-xl text-slate-400">加载中...</Text>
            </View>
          )}

          {!loading && reports.length === 0 && (
            <View className="text-center py-20 flex flex-col items-center">
              <View className="i-mdi-shield-check text-8xl text-slate-200 mb-4" />
              <Text className="text-xl text-slate-400">暂无相关举报记录</Text>
            </View>
          )}

          {!loading && reports.length > 0 && (
            <View className="flex flex-col gap-4 pb-10">
              {reports.map((report) => (
                <View key={report.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <View className="flex flex-row items-center justify-between mb-4">
                    <Text className="text-xl font-black text-slate-900">举报记录</Text>
                    <View className={`px-3 py-1 rounded-full ${getStatusColor(report.status)}`}>
                      <Text className="text-base font-bold">{getStatusText(report.status)}</Text>
                    </View>
                  </View>

                  {contentType === 'system' ? (
                    <View className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
                      <View className="flex flex-row justify-between items-center">
                        <Text className="text-lg text-slate-500 w-24 shrink-0">问题类型：</Text>
                        <Text className="text-lg font-black text-primary flex-1">
                          {getSystemTypeLabel(report.type)}
                        </Text>
                      </View>
                      <View className="flex flex-row items-center">
                        <Text className="text-lg text-slate-500 w-24 shrink-0">报告人：</Text>
                        <View className="flex flex-row items-center flex-1">
                          <Image
                            src={report.author?.avatar_url || DEFAULT_AVATAR}
                            className="w-8 h-8 rounded-full mr-2"
                          />
                          <Text className="text-lg font-medium text-slate-700">
                            {report.author?.username || '未知用户'}
                          </Text>
                        </View>
                      </View>
                      <View className="flex flex-col">
                        <Text className="text-lg text-slate-500 mb-1">问题描述：</Text>
                        <Text className="text-lg text-slate-800 font-medium bg-white p-3 rounded-lg border border-slate-100 leading-relaxed">
                          {report.description}
                        </Text>
                      </View>
                      {report.images && report.images.length > 0 && (
                        <View className="flex flex-row flex-wrap gap-2 pt-1">
                          {report.images.map((img: string) => (
                            <Image
                              key={img}
                              src={img}
                              className="w-20 h-20 rounded-lg"
                              mode="aspectFill"
                              onClick={() => Taro.previewImage({urls: report.images, current: img})}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    <View className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
                      <View className="flex flex-row justify-between items-center mb-1">
                        <Text className="text-lg text-slate-500 w-24 shrink-0">笔记标题：</Text>
                        {report.note && (
                          <View
                            className="flex flex-row items-center active:opacity-60"
                            onClick={() =>
                              Taro.navigateTo({
                                url: `/pages/note-detail/index?id=${report.note.id}&reportId=${report.id}`
                              })
                            }>
                            <Text className="text-base text-primary font-bold mr-1">查看笔记详情</Text>
                            <View className="i-mdi-chevron-right text-base text-primary" />
                          </View>
                        )}
                      </View>
                      <View className="flex flex-row">
                        <Text className="text-lg font-bold text-slate-800 flex-1">
                          {report.note?.title || (report.comment?.content ? '评论举报' : '内容已删除')}
                        </Text>
                      </View>
                      {report.comment && (
                        <View className="flex flex-col space-y-2">
                          <View className="flex flex-row justify-between items-center">
                            <Text className="text-lg text-slate-500 w-24 shrink-0">评论内容：</Text>
                            <View
                              className="flex flex-row items-center active:opacity-60"
                              onClick={() =>
                                Taro.navigateTo({
                                  url: `/pages/note-detail/index?id=${report.comment.note_id}&highlightCommentId=${report.comment.id}&reportId=${report.id}`
                                })
                              }>
                              <Text className="text-base text-primary font-bold mr-1">查看评论详情</Text>
                              <View className="i-mdi-chevron-right text-base text-primary" />
                            </View>
                          </View>
                          <Text className="text-lg text-slate-700 flex-1 line-clamp-2">{report.comment.content}</Text>
                        </View>
                      )}
                      <View className="flex flex-row items-center">
                        <Text className="text-lg text-slate-500 w-24 shrink-0">举报人：</Text>
                        <View className="flex flex-row items-center flex-1">
                          <Image
                            src={report.reporter?.avatar_url || DEFAULT_AVATAR}
                            className="w-8 h-8 rounded-full mr-2"
                          />
                          <Text className="text-lg font-medium text-slate-700">
                            {report.reporter?.username || '匿名用户'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {contentType !== 'system' && (
                    <View className="mb-4">
                      <Text className="text-lg font-black text-slate-800 block mb-2">举报原因：</Text>
                      <View className="flex flex-wrap gap-2">
                        {Array.isArray(report.reason) ? (
                          report.reason.map((r: string, idx: number) => (
                            <View key={idx} className="bg-red-50 px-3 py-1 rounded-full border border-red-100">
                              <Text className="text-base text-red-600 font-medium">{r}</Text>
                            </View>
                          ))
                        ) : (
                          <View className="bg-red-50 px-3 py-1 rounded-full border border-red-100">
                            <Text className="text-base text-red-600 font-medium">{report.reason}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {contentType !== 'system' && report.description && (
                    <View className="mb-4 p-3 bg-red-50/30 rounded-lg border border-red-50">
                      <Text className="text-lg font-black text-slate-800 block mb-1">详细说明：</Text>
                      <Text className="text-lg text-slate-600 leading-relaxed">{report.description}</Text>
                    </View>
                  )}

                  <View className="flex flex-row items-center justify-between mt-2 pt-4 border-t border-slate-50">
                    <Text className="text-base text-slate-400">提交于 {formatDateTime(report.created_at)}</Text>
                  </View>

                  {report.status === 'pending' && (
                    <View className="flex flex-col gap-3 mt-5">
                      <View className="flex flex-row gap-3">
                        <View
                          className="flex-1 bg-slate-100 text-center py-4 rounded-xl active:opacity-70 transition-all"
                          onClick={() => handleIgnore(report)}>
                          <Text className="text-lg font-bold text-slate-700">忽略处理</Text>
                        </View>
                        <View
                          className="flex-1 bg-primary text-center py-4 rounded-xl active:opacity-70 shadow-elegant shadow-primary/20 transition-all"
                          onClick={() =>
                            contentType === 'system' ? handleResolveSystemReport(report) : handleApprove(report)
                          }>
                          <Text className="text-lg font-bold text-white">
                            {contentType === 'system'
                              ? '标记解决'
                              : contentType === 'note' && report.note?.is_deleted
                                ? '确认完成'
                                : contentType === 'comment' && report.comment?.is_deleted
                                  ? '确认完成'
                                  : '确认删除'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {report.status === 'resolved' && (
                    <View className="mt-5">
                      <View
                        className="w-full bg-red-500 text-center py-4 rounded-xl active:opacity-70 transition-all"
                        onClick={() => handleDeleteReport(report)}>
                        <Text className="text-lg font-bold text-white">删除记录</Text>
                      </View>
                    </View>
                  )}

                  {(report.status === 'rejected' || report.status === 'ignored') && (
                    <View className="mt-5">
                      <View
                        className="w-full bg-red-500 text-center py-4 rounded-xl active:opacity-70 transition-all"
                        onClick={() => handleDeleteReport(report)}>
                        <Text className="text-lg font-bold text-white">删除记录</Text>
                      </View>
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
