import {Button, Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getProfile, updateProfile} from '@/db/api'

export default function ProfileEdit() {
  const {user} = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    avatar_url: '',
    phone: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!user) return
    const {data} = await getProfile(user.id)
    if (data) {
      setFormData({
        username: data.username || '',
        avatar_url: data.avatar_url || '',
        phone: data.phone || '',
        email: data.email || ''
      })
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user, loadProfile])

  const updateField = (field: string, value: string) => {
    setFormData({...formData, [field]: value})
  }

  const handleChooseAvatar = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        updateField('avatar_url', tempFilePath)
        Taro.showToast({title: '头像已选择，保存后生效', icon: 'none'})
      }
    })
  }

  const handleSubmit = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    if (!formData.username.trim()) {
      Taro.showToast({title: '请输入用户名', icon: 'none'})
      return
    }

    if (formData.username.length < 2 || formData.username.length > 20) {
      Taro.showToast({title: '用户名长度为2-20个字符', icon: 'none'})
      return
    }

    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      Taro.showToast({title: '请输入正确的手机号', icon: 'none'})
      return
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Taro.showToast({title: '请输入正确的邮箱', icon: 'none'})
      return
    }

    setLoading(true)

    try {
      const {error} = await updateProfile(user.id, formData)
      if (error) throw error

      Taro.showToast({title: '保存成功', icon: 'success'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error: any) {
      Taro.showToast({title: error.message || '保存失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-24" scrollY>
        <View className="p-4">
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-4">基本信息</Text>

            <View className="mb-6">
              <Text className="text-base text-muted-foreground mb-3">头像</Text>
              <View className="flex items-center">
                <View className="w-20 h-20 rounded-full bg-muted overflow-hidden mr-4" onClick={handleChooseAvatar}>
                  {formData.avatar_url ? (
                    <Image src={formData.avatar_url} className="w-full h-full" mode="aspectFill" />
                  ) : (
                    <View className="w-full h-full flex items-center justify-center">
                      <View className="i-mdi-account text-4xl text-muted-foreground" />
                    </View>
                  )}
                </View>
                <Button
                  className="bg-muted text-foreground rounded-lg px-4 py-2 text-base break-keep"
                  onClick={handleChooseAvatar}>
                  更换头像
                </Button>
              </View>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-base text-muted-foreground mb-2">用户名 *</Text>
                <View className="bg-input rounded-lg border border-border px-3 py-2">
                  <Input
                    className="w-full text-foreground"
                    placeholder="请输入用户名（2-20个字符）"
                    value={formData.username}
                    maxlength={20}
                    onInput={(e) => updateField('username', e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="text-base text-muted-foreground mb-2">手机号</Text>
                <View className="bg-input rounded-lg border border-border px-3 py-2">
                  <Input
                    className="w-full text-foreground"
                    placeholder="请输入手机号"
                    type="number"
                    maxlength={11}
                    value={formData.phone}
                    onInput={(e) => updateField('phone', e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="text-base text-muted-foreground mb-2">邮箱</Text>
                <View className="bg-input rounded-lg border border-border px-3 py-2">
                  <Input
                    className="w-full text-foreground"
                    placeholder="请输入邮箱"
                    value={formData.email}
                    onInput={(e) => updateField('email', e.detail.value)}
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 shadow-card">
            <View className="flex items-start py-2">
              <View className="i-mdi-information-outline text-lg text-primary mr-2 mt-0.5" />
              <Text className="text-base text-muted-foreground flex-1">
                用户名将显示在订单、评论等处，建议使用真实姓名或常用昵称
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card p-4 border-t border-border">
        <View
          className="w-full bg-slate-100 text-slate-700 rounded-full py-3 text-base font-bold text-center mb-3 active:opacity-70"
          onClick={() => Taro.navigateTo({url: '/pages/change-password/index'})}>
          <Text className="text-xl">修改登录密码</Text>
        </View>
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-3 text-base font-bold break-keep"
          onClick={handleSubmit}
          loading={loading}>
          保存修改
        </Button>
      </View>
    </View>
  )
}
