import {Button, Input, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {updateUserPassword} from '@/db/api'

export default function ChangePassword() {
  const {user, signOut} = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      Taro.showToast({title: '请填写完整信息', icon: 'none'})
      return
    }

    if (newPassword.length < 6) {
      Taro.showToast({title: '新密码至少6个字符', icon: 'none'})
      return
    }

    if (newPassword !== confirmPassword) {
      Taro.showToast({title: '两次输入的密码不一致', icon: 'none'})
      return
    }

    setLoading(true)
    try {
      const {error} = await updateUserPassword(user.id, newPassword)
      if (error) {
        Taro.showToast({title: '修改失败，请检查原密码', icon: 'none'})
      } else {
        Taro.showModal({
          title: '修改成功',
          content: '密码已修改，请重新登录',
          showCancel: false,
          success: () => {
            signOut()
            Taro.reLaunch({url: '/pages/login/index'})
          }
        })
      }
    } catch (error) {
      console.error('修改密码错误:', error)
      Taro.showToast({title: '修改失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <View className="p-6">
        <View className="bg-white rounded-2xl p-6 shadow-lg">
          <View className="mb-6">
            <Text className="text-base text-foreground mb-2">原密码</Text>
            <View className="bg-input rounded-lg border border-border px-4 py-3">
              <Input
                className="w-full text-foreground text-xl"
                placeholder="请输入原密码"
                password
                value={oldPassword}
                onInput={(e) => setOldPassword(e.detail.value)}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-base text-foreground mb-2">新密码（至少6个字符）</Text>
            <View className="bg-input rounded-lg border border-border px-4 py-3">
              <Input
                className="w-full text-foreground text-xl"
                placeholder="请输入新密码"
                password
                value={newPassword}
                onInput={(e) => setNewPassword(e.detail.value)}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-base text-foreground mb-2">确认新密码</Text>
            <View className="bg-input rounded-lg border border-border px-4 py-3">
              <Input
                className="w-full text-foreground text-xl"
                placeholder="请再次输入新密码"
                password
                value={confirmPassword}
                onInput={(e) => setConfirmPassword(e.detail.value)}
              />
            </View>
          </View>

          <Button
            className="w-full bg-primary text-primary-foreground text-xl font-bold rounded-xl border-none"
            onClick={handleSubmit}
            loading={loading}
            disabled={!oldPassword || !newPassword || !confirmPassword}>
            <View className="py-4">
              <Text className="text-white">确认修改</Text>
            </View>
          </Button>
        </View>
      </View>
    </View>
  )
}
