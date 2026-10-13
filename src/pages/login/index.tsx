import {Button, Input, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'

const STORAGE_KEY_REDIRECT_PATH = 'loginRedirectPath'

export default function Login() {
  const {signInWithUsername, signUpWithUsername, signInWithWechat} = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!username || !password) {
      Taro.showToast({title: '请输入用户名和密码', icon: 'none'})
      return
    }

    if (!agreed) {
      Taro.showToast({title: '请阅读并同意用户协议和隐私政策', icon: 'none'})
      return
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Taro.showToast({title: '用户名只能包含字母、数字和下划线', icon: 'none'})
      return
    }

    setLoading(true)

    try {
      const {error} = isLogin
        ? await signInWithUsername(username, password)
        : await signUpWithUsername(username, password)

      if (error) {
        Taro.showToast({title: error.message, icon: 'none'})
        return
      }

      Taro.showToast({title: isLogin ? '登录成功' : '注册成功', icon: 'success'})

      // 登录成功后跳转
      setTimeout(() => {
        const redirectPath = Taro.getStorageSync(STORAGE_KEY_REDIRECT_PATH)
        if (redirectPath) {
          Taro.removeStorageSync(STORAGE_KEY_REDIRECT_PATH)
          const tabBarPages = [
            'pages/home/index',
            'pages/products/index',
            'pages/customization/index',
            'pages/notes/index',
            'pages/profile/index'
          ]
          const isTabBar = tabBarPages.some((page) => redirectPath.includes(page))
          if (isTabBar) {
            Taro.switchTab({url: `/${redirectPath}`})
          } else {
            Taro.navigateTo({url: `/${redirectPath}`})
          }
        } else {
          Taro.switchTab({url: '/pages/home/index'})
        }
      }, 1000)
    } finally {
      setLoading(false)
    }
  }

  const handleWechatLogin = async () => {
    if (!agreed) {
      Taro.showToast({title: '请阅读并同意用户协议和隐私政策', icon: 'none'})
      return
    }

    setLoading(true)

    try {
      const {error} = await signInWithWechat()

      if (error) {
        Taro.showToast({title: error.message, icon: 'none'})
        return
      }

      Taro.showToast({title: '登录成功', icon: 'success'})

      setTimeout(() => {
        const redirectPath = Taro.getStorageSync(STORAGE_KEY_REDIRECT_PATH)
        if (redirectPath) {
          Taro.removeStorageSync(STORAGE_KEY_REDIRECT_PATH)
          const tabBarPages = [
            'pages/home/index',
            'pages/products/index',
            'pages/customization/index',
            'pages/notes/index',
            'pages/profile/index'
          ]
          const isTabBar = tabBarPages.some((page) => redirectPath.includes(page))
          if (isTabBar) {
            Taro.switchTab({url: `/${redirectPath}`})
          } else {
            Taro.navigateTo({url: `/${redirectPath}`})
          }
        } else {
          Taro.switchTab({url: '/pages/home/index'})
        }
      }, 1000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-6">
      <View className="w-full max-w-md">
        {/* Logo区域 */}
        <View className="flex flex-col items-center mb-12">
          <View className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mb-4 shadow-elegant">
            <Text className="text-4xl text-white">根</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2">根书文创</Text>
          <Text className="text-base text-muted-foreground">传承文化 · 创新未来</Text>
        </View>

        {/* 登录表单 */}
        <View className="bg-card rounded-xl p-6 shadow-card">
          <View className="flex mb-6">
            <View
              className={`flex-1 text-center py-2 ${isLogin ? 'border-b-2 border-primary' : ''}`}
              onClick={() => setIsLogin(true)}>
              <Text className={`text-base ${isLogin ? 'text-primary font-bold' : 'text-muted-foreground'}`}>登录</Text>
            </View>
            <View
              className={`flex-1 text-center py-2 ${!isLogin ? 'border-b-2 border-primary' : ''}`}
              onClick={() => setIsLogin(false)}>
              <Text className={`text-base ${!isLogin ? 'text-primary font-bold' : 'text-muted-foreground'}`}>注册</Text>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-base text-foreground mb-2">用户名（最多15个字符）</Text>
            <View className="bg-input rounded-lg border border-border px-4 py-3">
              <Input
                className="w-full text-foreground"
                placeholder="请输入用户名"
                value={username}
                maxlength={15}
                onInput={(e) => setUsername(e.detail.value)}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-base text-foreground mb-2">密码</Text>
            <View className="bg-input rounded-lg border border-border px-4 py-3">
              <Input
                className="w-full text-foreground"
                password
                placeholder="请输入密码"
                value={password}
                onInput={(e) => setPassword(e.detail.value)}
              />
            </View>
          </View>

          <View className="flex items-center mb-6" onClick={() => setAgreed(!agreed)}>
            <View
              className={`w-5 h-5 rounded border-2 mr-2 flex items-center justify-center ${agreed ? 'bg-primary border-primary' : 'border-border'}`}>
              {agreed && <View className="i-mdi-check text-white text-base" />}
            </View>
            <Text className="text-base text-muted-foreground">我已阅读并同意《用户协议》和《隐私政策》</Text>
          </View>

          <Button
            className="w-full bg-gradient-primary text-white rounded-lg py-3 text-base font-bold break-keep"
            onClick={handleSubmit}
            loading={loading}>
            {isLogin ? '登录' : '注册'}
          </Button>

          <View className="mt-4">
            <Button
              className="w-full bg-secondary text-foreground rounded-lg py-3 text-base font-bold break-keep"
              onClick={handleWechatLogin}
              loading={loading}>
              微信快捷登录
            </Button>
          </View>

          <View className="mt-4 rounded-lg bg-muted/60 px-3 py-2">
            <Text className="block text-xs text-muted-foreground leading-relaxed">
              H5 预览账号：demo / demo123
              {'\n'}商家演示账号：merchant / merchant123
              {'\n'}管理员演示账号：admin / admin123
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}
