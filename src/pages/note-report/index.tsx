import {Button, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createNoteReport, reportComment} from '@/db/api'

export default function NoteReport() {
  const router = useRouter()
  const {noteId, commentId} = router.params
  const {user} = useAuth()
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const reasons = ['色情低俗', '违法违规', '虚假信息', '侵权内容', '垃圾广告', '人身攻击', '其他原因']

  const toggleReason = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== reason))
    } else {
      if (selectedReasons.length >= 3) {
        Taro.showToast({title: '最多选择3个理由', icon: 'none'})
        return
      }
      setSelectedReasons([...selectedReasons, reason])
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }
    if (selectedReasons.length === 0) {
      Taro.showToast({title: '请最少选择1个原因', icon: 'none'})
      return
    }

    setLoading(true)
    let error: any = null
    if (commentId) {
      // 举报评论
      const res = await reportComment(commentId as string, user.id, selectedReasons, description.trim() || undefined)
      error = res.error
    } else if (noteId) {
      // 举报笔记
      const res = await createNoteReport({
        note_id: noteId as string,
        reporter_id: user.id,
        reason: selectedReasons,
        description: description.trim() || undefined
      })
      error = res.error
    } else {
      setLoading(false)
      Taro.showToast({title: '参数错误', icon: 'none'})
      return
    }
    setLoading(false)

    if (error) {
      Taro.showToast({title: '举报失败', icon: 'none'})
    } else {
      Taro.showToast({title: '举报成功，我们会尽快处理', icon: 'success'})
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  }

  return (
    <View className="min-h-screen bg-white">
      <ScrollView className="w-full h-full" scrollY>
        <View className="p-4">
          <View className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
            <View className="flex flex-row items-start">
              <View className="i-mdi-shield-alert text-xl text-blue-600 mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-base font-bold text-blue-800 block mb-1">
                  {commentId ? '举报评论' : '举报笔记'}须知
                </Text>
                <Text className="text-sm text-blue-700 leading-relaxed">
                  请如实填写举报信息，我们会在24小时内进行审核处理。恶意举报将受到相应处罚。
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-6">
            <View className="flex flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-slate-800">举报原因（必选，1-3个）</Text>
              <Text className="text-sm text-slate-400">{selectedReasons.length}/3</Text>
            </View>
            <View className="flex flex-wrap gap-2">
              {reasons.map((reason) => {
                const isSelected = selectedReasons.includes(reason)
                return (
                  <View
                    key={reason}
                    className={`px-4 py-2 rounded-full border-2 transition-all active:opacity-80 ${
                      isSelected ? 'bg-primary border-primary' : 'bg-slate-50 border-transparent'
                    }`}
                    onClick={() => toggleReason(reason)}>
                    <Text className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                      {reason}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-slate-800 block mb-3">详细说明（可选）</Text>
            <View className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <Textarea
                className="w-full text-base"
                placeholder="请详细描述举报原因，帮助我们更好地处理"
                value={description}
                onInput={(e) => setDescription(e.detail.value)}
                maxlength={500}
                autoHeight
                style={{minHeight: '120px'}}
              />
            </View>
            <Text className="text-sm text-slate-400 mt-2 text-right">{description.length}/500</Text>
          </View>

          <Button
            className="w-full bg-primary text-white rounded-lg text-base font-bold border-none"
            onClick={handleSubmit}
            loading={loading}>
            <View className="py-2">
              <Text className="text-white">提交举报</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
