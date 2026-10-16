import {Button, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createNoteReport, reportComment} from '@/db/api'
import {useLanguage} from '@/hooks/useLanguage'

const REPORT_REASONS = [
  {value: '色情低俗', en: 'Sexual or vulgar content'},
  {value: '违法违规', en: 'Illegal or policy-violating content'},
  {value: '虚假信息', en: 'False information'},
  {value: '侵权内容', en: 'Copyright or other infringement'},
  {value: '垃圾广告', en: 'Spam or advertising'},
  {value: '人身攻击', en: 'Personal attack'},
  {value: '其他原因', en: 'Other'}
] as const

export default function NoteReport() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const router = useRouter()
  const {noteId, commentId} = router.params
  const {user} = useAuth()
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const reasons = REPORT_REASONS

  const toggleReason = (reason: (typeof REPORT_REASONS)[number]) => {
    if (selectedReasons.includes(reason.value)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== reason.value))
    } else {
      if (selectedReasons.length >= 3) {
        Taro.showToast({title: ui('最多选择3个理由', 'Select up to 3 reasons'), icon: 'none'})
        return
      }
      setSelectedReasons([...selectedReasons, reason.value])
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }
    if (selectedReasons.length === 0) {
      Taro.showToast({title: ui('请最少选择1个原因', 'Select at least 1 reason'), icon: 'none'})
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
      Taro.showToast({title: ui('参数错误', 'Invalid parameters'), icon: 'none'})
      return
    }
    setLoading(false)

    if (error) {
      Taro.showToast({title: ui('举报失败', 'Report failed'), icon: 'none'})
    } else {
      Taro.showToast({
        title: ui('举报成功，我们会尽快处理', 'Report submitted. We will review it soon.'),
        icon: 'success'
      })
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
                  {commentId
                    ? ui('举报评论须知', 'Report comment guidelines')
                    : ui('举报笔记须知', 'Report note guidelines')}
                </Text>
                <Text className="text-sm text-blue-700 leading-relaxed">
                  {ui(
                    '请如实填写举报信息，我们会在24小时内进行审核处理。恶意举报将受到相应处罚。',
                    'Please provide accurate report details. We will review them within 24 hours. Malicious reports may result in penalties.'
                  )}
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-6">
            <View className="flex flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-slate-800">
                {ui('举报原因（必选，1-3个）', 'Report reasons (required, choose 1–3)')}
              </Text>
              <Text className="text-sm text-slate-400">{selectedReasons.length}/3</Text>
            </View>
            <View className="flex flex-wrap gap-2">
              {reasons.map((reason) => {
                const isSelected = selectedReasons.includes(reason.value)
                return (
                  <View
                    key={reason.value}
                    className={`px-4 py-2 rounded-full border-2 transition-all active:opacity-80 ${
                      isSelected ? 'bg-primary border-primary' : 'bg-slate-50 border-transparent'
                    }`}
                    onClick={() => toggleReason(reason)}>
                    <Text className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                      {ui(reason.value, reason.en)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-slate-800 block mb-3">
              {ui('详细说明（可选）', 'Additional details (optional)')}
            </Text>
            <View className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <Textarea
                className="w-full text-base"
                placeholder={ui(
                  '请详细描述举报原因，帮助我们更好地处理',
                  'Describe the reason for your report to help us review it'
                )}
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
              <Text className="text-white">{ui('提交举报', 'Submit report')}</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
