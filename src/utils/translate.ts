// 文本翻译：通过 Supabase Edge Function 调用服务端翻译网关；密钥不进入前端。
import {supabase} from '@/client/supabase'

export interface TranslateResult {
  from: string
  to: string
  trans_result: Array<{src: string; dst: string}>
}

const CJK_PATTERN = /[\u3400-\u9fff]/
const SUPPORTED_LANGUAGES = new Set(['auto', 'zh', 'en', 'ja', 'ko'])

/** 翻译文本；from 可用 auto 自动检测，to 必须指定明确语言代码。 */
export async function translateText(q: string, from: string, to: string): Promise<string> {
  const text = q.trim()
  if (!text) throw new Error('Translation text is empty')
  if (text.length > 5000) throw new Error('Translation text is too long')
  if (!SUPPORTED_LANGUAGES.has(from) || !SUPPORTED_LANGUAGES.has(to) || from === to || to === 'auto') {
    throw new Error('Unsupported translation language pair')
  }

  const {data, error} = await supabase.functions.invoke('text-translation', {
    body: {q: text, from, to}
  })
  if (error) {
    const message = error instanceof Error ? error.message : 'Translation service call failed'
    throw new Error(
      message.toLowerCase().includes('timeout')
        ? 'Translation timed out; please retry.'
        : 'Translation service is unavailable.'
    )
  }
  if (data?.error_code) throw new Error('Translation provider could not translate this text.')

  const result = data?.result as TranslateResult | undefined
  const translated = result?.trans_result
    ?.map((item) => item.dst)
    .join('\n')
    .trim()
  if (!translated) throw new Error('Translation provider returned no text.')
  if (to === 'en' && CJK_PATTERN.test(translated)) throw new Error('Translation result still contains Chinese text.')
  return translated
}
