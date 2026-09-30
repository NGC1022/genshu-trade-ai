// AI跨境贸易助手：Provider 抽象层
// 设计目标：页面不直接接触 AI 请求，统一走本 Service；
// 当前实现为 MockProvider（演示模式），未来接入真实 AI 时只需新增
// 真实 Provider 并在 getAiTradeProvider() 中切换，页面代码零改动。
// 真实 Provider 应通过 Supabase Edge Function 调用大模型 API，
// API Key 保存于服务端环境变量，绝不写入前端代码。

import {mockProvider} from './mockProvider'
import {remoteProvider} from './remoteProvider'
import type {
  ComplianceInput,
  ComplianceResult,
  CustomerIntentResult,
  ExceptionSuggestionResult,
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
  TradeDocumentInput,
  TradeDocumentResult
} from './types'

export interface AiTradeProvider {
  /** Provider名称（页面展示用） */
  readonly name: string
  /** 是否为Mock实现（页面据此显示"演示模式"标记） */
  readonly isMock: boolean

  /** 功能1：AI商品国际化（输入真实商品信息 → 英文商品信息JSON） */
  generateProductInternationalization(input: ProductIntlInput): Promise<ProductIntlResult>

  /** 功能2：AI海外市场分析（商品信息 + 目标市场列表 → 各市场分析） */
  analyzeTargetMarket(input: ProductIntlInput, markets: string[]): Promise<MarketAnalysisResult[]>

  /** 功能3a：AI询盘识别（英文询盘 → 结构化需求JSON） */
  analyzeInquiry(inquiryText: string): Promise<InquiryAnalysisResult>

  /** 功能3b：AI英文回复（询盘原文 + 识别结果 → 商务英文回复） */
  generateInquiryReply(inquiryText: string, analysis: InquiryAnalysisResult): Promise<InquiryReplyResult>

  /** 功能4：AI报价说明（报价输入 + 程序计算结果 → 英文报价说明） */
  generateQuoteDescription(input: QuoteInput, calc: QuoteCalculation): Promise<QuoteDescriptionResult>

  /** AI跨境客服（多轮对话 → 回复 + 建议问题） */
  generateSupportReply(messages: SupportMessage[]): Promise<SupportReplyResult>

  /** 功能5：AI贸易合规检查（商品+目的国+材质+用途+交易方式 → 合规报告） */
  checkTradeCompliance(input: ComplianceInput): Promise<ComplianceResult>

  /** 功能6：AI贸易单证生成（业务数据 → 单证草稿字段列表） */
  generateTradeDocument(input: TradeDocumentInput): Promise<TradeDocumentResult>

  /** 功能7：AI客户意向识别（客户消息 → 意图结构化JSON） */
  analyzeCustomerIntent(message: string): Promise<CustomerIntentResult>

  /** 功能9：AI海外营销素材（商品+目标市场 → 多渠道素材） */
  generateMarketingContent(input: MarketingInput): Promise<MarketingContentResult>

  /** 功能10：异常订单AI处理建议（异常类型 → 建议与英文通知草稿） */
  generateExceptionSuggestion(type: string, description: string): Promise<ExceptionSuggestionResult>
}

/**
 * 获取AI贸易Provider实例（工厂函数）
 * 当前：MockProvider（演示模式）
 * 将来：接入真实AI后 return realProvider（Edge Function 版本）
 */
export function getAiTradeProvider(): AiTradeProvider {
  return process.env.TARO_APP_AI_PROVIDER === 'remote' ? remoteProvider : mockProvider
}
