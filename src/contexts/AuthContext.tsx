import type {User} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import {createContext, type ReactNode, useContext, useEffect, useState} from 'react'
import {isSupabaseConfigured, supabase} from '@/client/supabase'

export interface Profile {
  [key: string]: unknown
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const {data, error} = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  if (error) {
    console.error('Failed to fetch user profile:', error)
    return null
  }
  return data
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithUsername: (username: string, password: string) => Promise<{error: Error | null}>
  signUpWithUsername: (username: string, password: string) => Promise<{error: Error | null}>
  signUpWithPhone: (phone: string, password: string) => Promise<{error: Error | null}>
  signInWithPhone: (phone: string) => Promise<{error: Error | null}>
  verifyPhoneOtp: (phone: string, code: string) => Promise<{error: Error | null}>
  signInWithWechat: () => Promise<{error: Error | null}>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const DEMO_SESSION_KEY = 'genshu-demo-session'
const DEMO_ACCOUNTS: Record<string, {password: string; role: 'user' | 'admin'}> = {
  demo: {password: 'demo123', role: 'user'},
  admin: {password: 'admin123', role: 'admin'}
}

function createDemoUser(username: string) {
  const account = DEMO_ACCOUNTS[username] || {password: '', role: 'user' as const}
  return {
    id: `demo-${username}`,
    aud: 'authenticated',
    role: 'authenticated',
    email: `${username}@demo.genshu.local`,
    app_metadata: {},
    user_metadata: {username},
    identities: [],
    created_at: new Date(0).toISOString(),
    updated_at: new Date().toISOString(),
    confirmation_sent_at: undefined,
    email_confirmed_at: new Date(0).toISOString(),
    phone: undefined,
    last_sign_in_at: new Date().toISOString(),
    user_role: account.role
  } as unknown as User
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null)
      return
    }

    const profileData = await getProfile(user.id)
    setProfile(profileData)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const demoUsername = Taro.getStorageSync(DEMO_SESSION_KEY)
      if (demoUsername) {
        setUser(createDemoUser(demoUsername))
        setProfile({username: demoUsername, role: DEMO_ACCOUNTS[demoUsername]?.role || 'user', is_demo: true})
      }
      setLoading(false)
      return
    }

    supabase.auth
      .getSession()
      .then(({data: {session}}) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          getProfile(session.user.id).then(setProfile)
        }
        setLoading(false)
      })
      .catch((error) => {
        console.warn('Failed to get session:', error)
        setUser(null)
        setProfile(null)
        setLoading(false)
      })

    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const {
      data: {subscription}
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getProfile(session.user.id).then(setProfile)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithUsername = async (username: string, password: string) => {
    if (!isSupabaseConfigured) {
      const account = DEMO_ACCOUNTS[username]
      if (!account || account.password !== password) {
        return {error: new Error('预览模式账号或密码错误。可使用 demo / demo123，管理员使用 admin / admin123')}
      }
      Taro.setStorageSync(DEMO_SESSION_KEY, username)
      setUser(createDemoUser(username))
      setProfile({username, role: account.role, is_demo: true})
      return {error: null}
    }

    try {
      const email = `${username}@miaoda.com`
      const {error} = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      return {error: null}
    } catch (error) {
      return {error: error as Error}
    }
  }

  const signUpWithUsername = async (username: string, password: string) => {
    if (!isSupabaseConfigured) {
      if (!username || password.length < 6) return {error: new Error('预览模式密码至少需要 6 位')}
      Taro.setStorageSync(DEMO_SESSION_KEY, username)
      setUser(createDemoUser(username))
      setProfile({username, role: 'user', is_demo: true})
      return {error: null}
    }

    try {
      const email = `${username}@miaoda.com`
      const {error} = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (error) throw error
      return {error: null}
    } catch (error) {
      return {error: error as Error}
    }
  }

  const signUpWithPhone = async (phone: string, password: string) => {
    try {
      const {error} = await supabase.auth.signUp({
        phone,
        password
      })

      if (error) throw error
      return {error: null}
    } catch (error) {
      return {error: error as Error}
    }
  }

  const signInWithPhone = async (phone: string) => {
    try {
      const {error} = await supabase.auth.signInWithOtp({phone})

      if (error) throw error
      return {error: null}
    } catch (error) {
      return {error: error as Error}
    }
  }

  const verifyPhoneOtp = async (phone: string, code: string) => {
    try {
      const {error} = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: 'sms'
      })
      if (error) throw error
      return {error: null}
    } catch (error) {
      return {error: error as Error}
    }
  }

  const signInWithWechat = async () => {
    try {
      if (!isSupabaseConfigured) {
        throw new Error('网页版预览请使用 demo / demo123 登录；微信快捷登录需在正式小程序环境配置后端')
      }

      // Check if running in WeChat Mini Program environment
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        throw new Error('仅支持微信小程序登录，网页端请使用用户名密码登录')
      }

      // Get WeChat login code
      const loginResult = await Taro.login()

      // Call backend Edge Function for login
      const {data, error} = await supabase.functions.invoke('wechat_miniapp_login', {
        body: {code: loginResult?.code}
      })

      if (error) {
        const errorMsg = (await error?.context?.text?.()) || error.message
        throw new Error(errorMsg)
      }

      // Verify OTP token
      const {error: verifyError} = await supabase.auth.verifyOtp({
        token_hash: data.token,
        type: 'email'
      })

      if (verifyError) throw verifyError
      return {error: null}
    } catch (error) {
      return {error: error as Error}
    }
  }

  const signOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    Taro.removeStorageSync(DEMO_SESSION_KEY)
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithUsername,
        signUpWithUsername,
        signUpWithPhone,
        signInWithPhone,
        verifyPhoneOtp,
        signInWithWechat,
        signOut,
        refreshProfile
      }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
