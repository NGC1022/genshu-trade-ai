import {ScrollView, Switch, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getUserProfile, updateUserProfile} from '@/db/api'

export default function PrivacySettings() {
  const {user} = useAuth()
  const [notifyComment, setNotifyComment] = useState(true)
  const [notifyLike, setNotifyLike] = useState(true)
  const [notifyMention, setNotifyMention] = useState(true)
  const [notifySystem, setNotifySystem] = useState(true)
  const [showFollowingList, setShowFollowingList] = useState(true)
  const [showLikesList, setShowLikesList] = useState(true)
  const [showCustomizationStatus, setShowCustomizationStatus] = useState(true)

  useDidShow(() => {
    // 从本地存储加载设置
    const commentSetting = Taro.getStorageSync('notify_comment')
    const likeSetting = Taro.getStorageSync('notify_like')
    const mentionSetting = Taro.getStorageSync('notify_mention')
    const systemSetting = Taro.getStorageSync('notify_system')

    if (commentSetting !== undefined) setNotifyComment(commentSetting)
    if (likeSetting !== undefined) setNotifyLike(likeSetting)
    if (mentionSetting !== undefined) setNotifyMention(mentionSetting)
    if (systemSetting !== undefined) setNotifySystem(systemSetting)

    // 从数据库加载隐私设置
    if (user) {
      loadPrivacySettings()
    }
  })

  const loadPrivacySettings = async () => {
    if (!user) return
    const {data} = await getUserProfile(user.id)
    if (data) {
      setShowFollowingList(data.show_following_list ?? true)
      setShowLikesList(data.show_likes_list ?? true)
      setShowCustomizationStatus(data.show_customization_status ?? true)
    }
  }

  const handleToggle = (key: string, value: boolean) => {
    Taro.setStorageSync(key, value)
    Taro.showToast({title: '设置已保存', icon: 'success', duration: 1500})
  }

  const handlePrivacyToggle = async (
    field: 'show_following_list' | 'show_likes_list' | 'show_customization_status',
    value: boolean
  ) => {
    if (!user) return
    const {error} = await updateUserProfile(user.id, {[field]: value})
    if (!error) {
      if (field === 'show_following_list') setShowFollowingList(value)
      if (field === 'show_likes_list') setShowLikesList(value)
      if (field === 'show_customization_status') setShowCustomizationStatus(value)
      Taro.showToast({title: '设置已保存', icon: 'success', duration: 1500})
    } else {
      Taro.showToast({title: '保存失败', icon: 'none'})
    }
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full h-full" scrollY>
        <View className="p-6">
          <View className="bg-card rounded-3xl p-6 mb-6 shadow-card">
            <Text className="text-xl font-bold text-foreground block mb-6">广场通知设置</Text>

            <View className="flex flex-row items-center justify-between py-4 border-b border-border border-opacity-10">
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground block mb-1">评论通知</Text>
                <Text className="text-sm text-muted-foreground">有人评论你的笔记时通知你</Text>
              </View>
              <Switch
                checked={notifyComment}
                color="#C92A2A"
                onChange={(e) => {
                  setNotifyComment(e.detail.value)
                  handleToggle('notify_comment', e.detail.value)
                }}
              />
            </View>

            <View className="flex flex-row items-center justify-between py-4 border-b border-border border-opacity-10">
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground block mb-1">点赞通知</Text>
                <Text className="text-sm text-muted-foreground">有人点赞你的笔记时通知你</Text>
              </View>
              <Switch
                checked={notifyLike}
                color="#C92A2A"
                onChange={(e) => {
                  setNotifyLike(e.detail.value)
                  handleToggle('notify_like', e.detail.value)
                }}
              />
            </View>

            <View className="flex flex-row items-center justify-between py-4 border-b border-border border-opacity-10">
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground block mb-1">@提及通知</Text>
                <Text className="text-sm text-muted-foreground">有人在笔记评论中 @ 你时通知你</Text>
              </View>
              <Switch
                checked={notifyMention}
                color="#C92A2A"
                onChange={(e) => {
                  setNotifyMention(e.detail.value)
                  handleToggle('notify_mention', e.detail.value)
                }}
              />
            </View>

            <View className="flex flex-row items-center justify-between py-4">
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground block mb-1">系统通知</Text>
                <Text className="text-sm text-muted-foreground">定制进度更新、退款结果等重要系统通知</Text>
              </View>
              <Switch
                checked={notifySystem}
                color="#C92A2A"
                onChange={(e) => {
                  setNotifySystem(e.detail.value)
                  handleToggle('notify_system', e.detail.value)
                }}
              />
            </View>
          </View>

          <View className="bg-card rounded-3xl p-6 mb-6 shadow-card">
            <Text className="text-xl font-bold text-foreground block mb-6">个人主页隐私</Text>

            <View className="flex flex-row items-center justify-between py-4 border-b border-border border-opacity-10">
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground block mb-1">公开已追踪列表</Text>
                <Text className="text-sm text-muted-foreground">允许他人查看你关注的用户列表</Text>
              </View>
              <Switch
                checked={showFollowingList}
                color="#C92A2A"
                onChange={(e) => {
                  handlePrivacyToggle('show_following_list', e.detail.value)
                }}
              />
            </View>

            <View className="flex flex-row items-center justify-between py-4 border-b border-border border-opacity-10">
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground block mb-1">公开点赞过的笔记</Text>
                <Text className="text-sm text-muted-foreground">允许他人查看你在主页点赞过的笔记列表</Text>
              </View>
              <Switch
                checked={showLikesList}
                color="#C92A2A"
                onChange={(e) => {
                  handlePrivacyToggle('show_likes_list', e.detail.value)
                }}
              />
            </View>

            <View className="flex flex-row items-center justify-between py-4">
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground block mb-1">公开我的定制状态</Text>
                <Text className="text-sm text-muted-foreground">允许他人查看你参与定制的项目及公开展示的成品</Text>
              </View>
              <Switch
                checked={showCustomizationStatus}
                color="#C92A2A"
                onChange={(e) => {
                  handlePrivacyToggle('show_customization_status', e.detail.value)
                }}
              />
            </View>
          </View>

          <View className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <View className="flex flex-row items-start">
              <View className="i-mdi-information text-xl text-blue-600 mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-base text-blue-800 leading-relaxed">
                  关闭通知后，你将不会收到相关的消息提醒，但仍可以在"我的动态"中查看所有互动记录。
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
