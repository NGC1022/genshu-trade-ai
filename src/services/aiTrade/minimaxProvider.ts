// MiniMax-M3 真实 Provider：通过 supabase Edge Function(minimax-chat) 调用大模型
// 仅实现「AI客服多轮对话」与「文创商品图片识别」两项能力；
// 其余贸易功能仍由 MockProvider 承担（演示模式），避免影响既有页面。
// API Key(INTEGRATIONS_API_KEY) 仅在 Edge Function 服务端读取，前端不接触。

import {supabase} from '@/client/supabase'
import type {ImageAnalysisResult, SupportMessage, SupportReplyResult} from './types'

const SYSTEM_PROMPT_SUPPORT = `你是"根生万象"非遗文创平台的AI跨境客服助手，专注于中国非物质文化遗产"根书"文创产品的跨境贸易咨询。
请用简体中文回答，语气专业、友好。你可以解答：非遗根书文化、文创商品介绍、海外市场咨询、跨境询盘处理、智能报价、个性定制合作等问题。
重要原则：
- 涉及具体价格、运费、关税、时效、汇率等事实数据时，必须说明"具体以人工确认为准"，绝不编造数字。
- 回答控制在200字以内，条理清晰。`

const SYSTEM_PROMPT_IMAGE = `你是一名专业的文创商品视觉分析师。请分析用户上传的图片，判断它是否为文创类商品（尤其是中国非遗"根书"相关文创，如木质书签、摆件、根艺书法等）。
无论是否为文创商品，都请基于图片实际可见内容进行分析，不要编造图片中不存在的细节。返回严格的JSON。`

interface UpstreamChoice {
  message?: {content?: string}
}

interface UpstreamResponse {
  choices?: UpstreamChoice[]
  base_resp?: {status_code?: number; status_msg?: string}
}

/** 调用 minimax-chat Edge Function（非流式） */
async function callMinimax(messages: Array<{role: string; content: unknown}>): Promise<string> {
  const {data, error} = await supabase.functions.invoke('minimax-chat', {
    body: {model: 'MiniMax-M3', messages, temperature: 0.7, top_p: 0.95, max_completion_tokens: 2048}
  })
  if (error) {
    const msg = error instanceof Error ? error.message : 'AI服务调用失败'
    throw new Error(msg.includes('timeout') ? '请求超时，请重试' : `AI服务暂时不可用：${msg}`)
  }
  const resp = data as UpstreamResponse | null
  if (resp?.base_resp?.status_code && resp.base_resp.status_code !== 0) {
    throw new Error(`AI服务异常：${resp.base_resp.status_msg || '请稍后重试'}`)
  }
  const content = resp?.choices?.[0]?.message?.content || ''
  if (!content) throw new Error('AI未返回有效内容，请重试')
  return content
}

/** 从模型输出中提取 JSON 对象（兼容 ```json 包裹） */
function extractJson(text: string): Record<string, unknown> | null {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start < 0 || end < 0) return null
  try {
    return JSON.parse(t.slice(start, end + 1))
  } catch {
    return null
  }
}

export const minimaxProvider = {
  name: 'MiniMax-M3',
  isMock: false,

  /** AI客服多轮对话 */
  async generateSupportReply(messages: SupportMessage[]): Promise<SupportReplyResult> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUser || (!lastUser.content && !lastUser.imageUrl)) {
      throw new Error('请输入您的问题')
    }
    const history = messages
      .filter((m) => m.content || m.imageUrl)
      .map((m) => {
        if (m.role === 'user' && m.imageUrl) {
          return {
            role: 'user',
            content: [
              {type: 'text', text: m.content || '请分析这张图片中的文创商品。'},
              {type: 'image_url', image_url: {url: m.imageUrl}}
            ]
          }
        }
        return {role: m.role, content: m.content}
      })
    const apiMessages = [{role: 'system', content: SYSTEM_PROMPT_SUPPORT}, ...history]
    const content = await callMinimax(apiMessages)
    return {reply: content.trim(), suggestions: []}
  },

  /** AI文创商品图片识别（多模态） */
  async analyzeProductImage(imageUrl: string): Promise<ImageAnalysisResult> {
    const apiMessages = [
      {role: 'system', content: SYSTEM_PROMPT_IMAGE},
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请分析这张图片，返回严格JSON：{"name":"商品名称","category":"商品类别","material":"主要材质","features":["外观特征1","外观特征2"],"cultural_elements":["文化元素1","文化元素2"],"description":"100字以内的综合描述","suggestions":["建议后续问题1","建议后续问题2"]}'
          },
          {type: 'image_url', image_url: {url: imageUrl}}
        ]
      }
    ]
    const content = await callMinimax(apiMessages)
    const parsed = extractJson(content)
    if (!parsed) {
      return {
        name: '图片识别',
        category: '文创商品',
        material: '待确认',
        features: [],
        cultural_elements: [],
        description: '已收到图片，但AI未能解析出结构化结果，建议人工复核。',
        suggestions: ['这张商品如何出海？', '能生成英文商品信息吗？']
      }
    }
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [])
    return {
      name: String(parsed.name || '文创商品'),
      category: String(parsed.category || '待确认'),
      material: String(parsed.material || '待确认'),
      features: arr(parsed.features),
      cultural_elements: arr(parsed.cultural_elements),
      description: String(parsed.description || ''),
      suggestions: arr(parsed.suggestions)
    }
  }
}
