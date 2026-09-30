import {supabase} from '@/client/supabase'
import {TRADE_DATA_SNAPSHOT} from './tradeData'
import {PROMPT_MARKET_ANALYSIS} from './prompts'
import {mockProvider} from './mockProvider'
import type {AiTradeProvider} from './provider'
import type {MarketAnalysisResult, ProductIntlInput} from './types'

interface ChatResponse {
  choices?: Array<{message?: {content?: string}}>
  error?: {message?: string}
}

function extractJson(text: string): unknown {
  let normalized = text.trim()
  const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) normalized = fenced[1].trim()
  const start = normalized.indexOf('{')
  const end = normalized.lastIndexOf('}')
  if (start >= 0 && end > start) normalized = normalized.slice(start, end + 1)
  try {
    return JSON.parse(normalized)
  } catch {
    return null
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(asObject)
  const object = asObject(value)
  if (Array.isArray(object.results)) return object.results.map(asObject)
  if (Array.isArray(object.markets)) return object.markets.map(asObject)
  return [object]
}

async function callRemoteMarketAnalysis(input: ProductIntlInput, markets: string[]): Promise<unknown> {
  const evidence = TRADE_DATA_SNAPSHOT.map((item) => ({
    indicator: item.indicator,
    geography: item.geography,
    year: item.year,
    value: item.value,
    unit: item.unit,
    definition: item.definition,
    publisher: item.publisher,
    source: item.sourceUrl
  }))
  const userPrompt = JSON.stringify({
    task: '请分别分析每个目标市场，并严格返回JSON。',
    product: input,
    markets,
    verified_data: evidence,
    output_shape: {results: markets.map((market) => ({market, consumer_profile: '', consumption_scenario: '', cultural_fit: '', price_fit: '', marketing_focus: [], potential_risks: [], data_to_verify: [], analysis_summary: ''}))}
  })
  const {data, error} = await supabase.functions.invoke('minimax-chat', {
    body: {
      model: 'MiniMax-M3',
      messages: [
        {role: 'system', content: PROMPT_MARKET_ANALYSIS},
        {role: 'user', content: userPrompt}
      ],
      temperature: 0.2,
      top_p: 0.8,
      max_completion_tokens: 3000
    }
  })
  if (error) throw new Error(error instanceof Error ? error.message : '远程AI服务调用失败')
  const response = data as ChatResponse | null
  if (response?.error?.message) throw new Error(response.error.message)
  const content = response?.choices?.[0]?.message?.content
  if (!content) throw new Error('远程AI未返回有效分析结果')
  return extractJson(content)
}

export const remoteProvider: AiTradeProvider = {
  ...mockProvider,
  name: 'MiniMax-M3（远程市场分析）',
  isMock: false,
  async analyzeTargetMarket(input: ProductIntlInput, markets: string[]): Promise<MarketAnalysisResult[]> {
    const parsed = asList(await callRemoteMarketAnalysis(input, markets))
    return markets.map((market, index) => {
      const matched = parsed.find((item) => String(item.market || '') === market) || parsed[index] || {}
      return {...matched, market} as MarketAnalysisResult
    })
  }
}
