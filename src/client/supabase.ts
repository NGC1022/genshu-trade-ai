// @ts-nocheck

import {createClient} from '@supabase/supabase-js'
import Taro, {showToast} from '@tarojs/taro'

// 未配置后端时仍允许 H5 预览渲染；真实环境必须通过环境变量注入正式地址和 anon key。
const supabaseUrl: string = process.env.TARO_APP_SUPABASE_URL || 'https://preview-placeholder.supabase.co'
const supabaseAnonKey: string = process.env.TARO_APP_SUPABASE_ANON_KEY || 'preview-placeholder-anon-key'
const appId: string = process.env.TARO_APP_APP_ID || 'genshu-trade-ai-preview'
export const isSupabaseConfigured =
  Boolean(supabaseUrl.trim() && supabaseAnonKey.trim()) &&
  !supabaseUrl.includes('preview-placeholder') &&
  !supabaseAnonKey.includes('preview-placeholder')

let noticed = false
export const customFetch: typeof fetch = async (url: string, options: RequestInit) => {
  // H5 预览没有 Supabase 密钥时不再尝试访问占位地址，所有业务 API 会立即使用本地演示回退数据。
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      status: 503,
      json: async () => ({error: 'SUPABASE_NOT_CONFIGURED'}),
      text: async () => 'SUPABASE_NOT_CONFIGURED',
      headers: {get: () => null}
    } as unknown as Response
  }

  let headers: HeadersInit = options.headers || {}
  const {method = 'GET', body} = options

  if (options.headers instanceof Map) {
    headers = Object.fromEntries(options.headers)
  }

  const res = await Taro.request({
    url,
    method: method as keyof Taro.request.Method,
    header: headers,
    data: body,
    responseType: 'text',
    timeout: process.env.TARO_ENV === 'h5' ? 2500 : 8000
  })

  // 全局启停提示
  if (res.statusCode > 300 && res.data?.code === 'SupabaseNotReady' && !noticed) {
    const tip = res.data.message || res.data.msg || '服务端报错'
    noticed = true
    showToast({
      title: tip,
      icon: 'error',
      duration: 5000
    })
  }

  return {
    ok: res.statusCode >= 200 && res.statusCode < 300,
    status: res.statusCode,
    json: async () => res.data,
    text: async () => JSON.stringify(res.data),
    data: res.data, // 兼容小程序的返回格式
    headers: {
      get: (key: string) => res.header?.[key] || res.header?.[key?.toLowerCase()]
    }
  } as unknown as Response
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  },
  auth: {
    storageKey: `${appId}-auth-token`
  }
})
