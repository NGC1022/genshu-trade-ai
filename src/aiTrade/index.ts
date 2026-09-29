// AI跨境贸易助手：Service 统一入口
// 页面只 import 本文件暴露的 5 个方法 + 常量，不直接接触 Provider 细节。
// 所有方法带统一超时包装与用户友好错误文案。

import {
  validateCompliance,
  validateCustomerIntent,
  validateExceptionSuggestion,
  validateInquiryAnalysis,
  validateInquiryReply,
  validateMarketAnalysis,
  validateMarketingContent,
  validateProductIntl,
  validateQuoteDescription,
  validateSupportReply,
  validateTradeDocument
} from './parser'
import {getAiTradeProvider} from './provider'
import {
  AiServiceError,
  type ComplianceInput,
  type ComplianceResult,
  type CustomerIntentResult,
  type ExceptionSuggestionResult,
  type ImageAnalysisResult,
  type InquiryAnalysisResult,
  type InquiryReplyResult,
  type MarketAnalysisResult,
  type MarketingContentResult,
  type MarketingInput,
  type ProductIntlInput,
  type ProductIntlResult,
  type QuoteCalculation,
  type QuoteDescriptionResult,
  type QuoteInput,
  type SupportMessage,
  type SupportReplyResult,
  type TradeDocumentInput,
  type TradeDocumentResult
} from './types'

export {DEMO_BADGE_TEXT, DEMO_INQUIRY, DEMO_MARKET, DEMO_PRODUCT, DEMO_QUOTE_INPUT} from './demoData'
export {AI_DISCLAIMER} from './prompts'
export type {
  ComplianceInput,
  ComplianceResult,
  CustomerIntentResult,
  ExceptionSuggestionResult,
  ImageAnalysisResult,
  InquiryAnalysisResult,
  InquiryReplyResult,
  MarketAnalysisResult,
  MarketingContentResult,
  MarketingInput,
  ProductIntlInput,
  ProductIntlResult,
  QuoteCalculation,
  QuoteDescriptionResult,
  QuoteInput,
  SupportMessage,
  SupportReplyResult,
  TradeDocField,
  TradeDocumentInput,
  TradeDocumentResult
} from './types'
export {AiServiceError} from './types'

// MiniMax-M3 真实 Provider（AI客服对话 + 文创商品图片识别）
import {minimaxProvider} from './minimaxProvider'

// 统一请求超时
const REQUEST_TIMEOUT_MS = 25000

/** 统一超时+错误转译包装 */
async function withGuard<T>(scene: string, fn: () => Promise<T>): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new AiServiceError('TIMEOUT', `${scene}请求超时，请重试`)), REQUEST_TIMEOUT_MS)
    )
  ]).catch((err: unknown) => {
    // 网络层异常转译为用户可读文案
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('timeout') || msg.includes('aborted')) {
      throw new AiServiceError('TIMEOUT', `${scene}请求超时，请重试`)
    }
    if (msg.includes('network') || msg.includes('Failed to fetch')) {
      throw new AiServiceError('SERVICE_ERROR', `网络异常，${scene}失败，请检查网络后重试`)
    }
    throw err
  })
}

/** 当前Provider信息（页面显示"演示模式"标记用） */
export function getProviderInfo() {
  const p = getAiTradeProvider()
  return {name: p.name, isMock: p.isMock}
}

/** 功能1：AI商品国际化 */
export async function generateProductInternationalization(input: ProductIntlInput): Promise<ProductIntlResult> {
  const p = getAiTradeProvider()
  const raw = await withGuard('AI商品国际化', () => p.generateProductInternationalization(input))
  return validateProductIntl(raw)
}

/** 功能2：AI海外市场分析 */
export async function analyzeTargetMarket(input: ProductIntlInput, markets: string[]): Promise<MarketAnalysisResult[]> {
  const p = getAiTradeProvider()
  const raw = await withGuard('AI市场分析', () => p.analyzeTargetMarket(input, markets))
  return raw.map((r) => validateMarketAnalysis(r))
}

/** 功能3a：AI询盘识别 */
export async function analyzeInquiry(inquiryText: string): Promise<InquiryAnalysisResult> {
  const p = getAiTradeProvider()
  const raw = await withGuard('AI询盘识别', () => p.analyzeInquiry(inquiryText))
  return validateInquiryAnalysis(raw)
}

/** 功能3b：AI英文回复生成 */
export async function generateInquiryReply(
  inquiryText: string,
  analysis: InquiryAnalysisResult
): Promise<InquiryReplyResult> {
  const p = getAiTradeProvider()
  const raw = await withGuard('AI回复生成', () => p.generateInquiryReply(inquiryText, analysis))
  return validateInquiryReply(raw)
}

/** 功能4a：报价计算（纯程序计算，AI不参与） */
export function calculateQuote(
  input: Pick<QuoteInput, 'quantity' | 'unitPrice' | 'shippingCost' | 'otherCost'>
): QuoteCalculation {
  const productAmount = Number(((input.unitPrice || 0) * (input.quantity || 0)).toFixed(2))
  const totalCost = Number((productAmount + (input.shippingCost || 0) + (input.otherCost || 0)).toFixed(2))
  return {productAmount, totalCost}
}

/** 功能4b：AI英文报价说明 */
export async function generateQuoteDescription(
  input: QuoteInput,
  calc: QuoteCalculation
): Promise<QuoteDescriptionResult> {
  const p = getAiTradeProvider()
  const raw = await withGuard('AI报价说明', () => p.generateQuoteDescription(input, calc))
  return validateQuoteDescription(raw)
}

/** AI跨境客服（多轮对话） */
export async function generateSupportReply(messages: SupportMessage[]): Promise<SupportReplyResult> {
  const p = getAiTradeProvider()
  const raw = await withGuard('AI客服', () => p.generateSupportReply(messages))
  return validateSupportReply(raw)
}

/** AI文创商品图片识别（MiniMax-M3 多模态，真实AI能力） */
export async function analyzeProductImage(imageUrl: string): Promise<ImageAnalysisResult> {
  return withGuard('图片识别', () => minimaxProvider.analyzeProductImage(imageUrl))
}

/** 功能5：AI贸易合规检查 */
export async function checkTradeCompliance(input: ComplianceInput): Promise<ComplianceResult> {
  const p = getAiTradeProvider()
  const raw = await withGuard('贸易合规检查', () => p.checkTradeCompliance(input))
  return validateCompliance(raw)
}

/** 功能6：AI贸易单证草稿生成 */
export async function generateTradeDocument(input: TradeDocumentInput): Promise<TradeDocumentResult> {
  const p = getAiTradeProvider()
  const raw = await withGuard('贸易单证生成', () => p.generateTradeDocument(input))
  return validateTradeDocument(raw)
}

/** 功能7：AI客户意向识别 */
export async function analyzeCustomerIntent(message: string): Promise<CustomerIntentResult> {
  const p = getAiTradeProvider()
  const raw = await withGuard('客户意向识别', () => p.analyzeCustomerIntent(message))
  return validateCustomerIntent(raw)
}

/** 功能9：AI海外营销素材生成 */
export async function generateMarketingContent(input: MarketingInput): Promise<MarketingContentResult> {
  const p = getAiTradeProvider()
  const raw = await withGuard('营销素材生成', () => p.generateMarketingContent(input))
  return validateMarketingContent(raw)
}

/** 功能10：异常订单AI处理建议 */
export async function generateExceptionSuggestion(
  type: string,
  description: string
): Promise<ExceptionSuggestionResult> {
  const p = getAiTradeProvider()
  const raw = await withGuard('异常处理建议', () => p.generateExceptionSuggestion(type, description))
  return validateExceptionSuggestion(raw)
}
