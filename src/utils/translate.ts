// 文本翻译：通过 Edge Function(text-translation) 调用百度翻译 API
// 密钥仅在服务端读取，前端不接触
import {supabase} from '@/client/supabase'

export interface TranslateResult {
  from: string
  to: string
  trans_result: Array<{src: string; dst: string}>
}

/** 翻译文本（from 可用 'auto' 自动检测，to 须指定明确语言代码） */
export async function translateText(q: string, from: string, to: string): Promise<string> {
  const {data, error} = await supabase.functions.invoke('text-translation', {
    body: {q, from, to}
  })
  if (error) {
    const msg = error instanceof Error ? error.message : '翻译服务调用失败'
    throw new Error(msg.includes('timeout') ? '翻译超时，请重试' : `翻译失败：${msg}`)
  }
  if (data?.error_code) {
    throw new Error(`翻译失败：${data.error_msg || '请稍后重试'}`)
  }
  const result = data?.result as TranslateResult | undefined
  if (!result?.trans_result?.length) {
    throw new Error('翻译未返回结果，请重试')
  }
  return result.trans_result.map((t) => t.dst).join('\n')
}
