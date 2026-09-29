// AI跨境贸易助手：Mock Provider（演示模式）
// 说明：
// 1. 当前无真实AI API，使用规则引擎模拟AI输出，所有页面显示"演示模式"标记
// 2. 模拟真实网络行为：延迟、超时、随机失败，用于验证页面 loading/防重/错误处理
// 3. 未来接入真实AI：新增 realProvider（通过 Supabase Edge Function 调用大模型），
//    在 provider.ts 的 getAiTradeProvider() 切换即可，页面与 Service 入口零改动
// 4. Mock 输出遵守同一合规规则：不虚构事实，缺失信息统一"待确认"

import {ensureStr, ensureStrArray, PENDING_CN} from './parser'
import {
  PROMPT_INQUIRY_ANALYSIS,
  PROMPT_INQUIRY_REPLY,
  PROMPT_MARKET_ANALYSIS,
  PROMPT_MARKETING_CONTENT,
  PROMPT_PRODUCT_INTERNATIONALIZATION,
  PROMPT_QUOTE_DESCRIPTION,
  PROMPT_SUPPORT,
  PROMPT_TRADE_COMPLIANCE,
  PROMPT_TRADE_DOCUMENT
} from './prompts'
import type {AiTradeProvider} from './provider'
import {
  AiServiceError,
  type ComplianceInput,
  type ComplianceResult,
  type CustomerIntentResult,
  type ExceptionSuggestionResult,
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
  type TradeDocField,
  type TradeDocumentInput,
  type TradeDocumentResult
} from './types'

// ---------- Mock 行为参数 ----------
const MOCK_DELAY_MS = 1200 // 模拟AI推理耗时
const MOCK_TIMEOUT_MS = 20000 // 对外承诺的超时时间
const MOCK_RANDOM_FAIL_RATE = 0 // 随机失败率（0=关闭，便于课堂演示稳定运行）
const MARKETS = ['美国', '日本', '新加坡', '韩国']

/** 模拟网络延迟（含随机失败与超时保护） */
function mockDelay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (MOCK_RANDOM_FAIL_RATE > 0 && Math.random() < MOCK_RANDOM_FAIL_RATE) {
      return reject(new AiServiceError('SERVICE_ERROR', 'AI服务暂时不可用（演示模式模拟），请重试'))
    }
    const t = setTimeout(resolve, MOCK_DELAY_MS)
    // 超时保护
    setTimeout(() => {
      clearTimeout(t)
      reject(new AiServiceError('TIMEOUT', 'AI请求超时，请重试'))
    }, MOCK_TIMEOUT_MS)
  })
}

/** 必填校验 */
function assertInput(cond: boolean, msg: string) {
  if (!cond) throw new AiServiceError('EMPTY_INPUT', msg)
}

// ---------- 功能1：AI商品国际化（Mock规则引擎） ----------
async function generateProductInternationalization(input: ProductIntlInput): Promise<ProductIntlResult> {
  assertInput(!!input && !!input.name, '商品数据缺失：请先选择商品')
  await mockDelay()

  const material = ensureStr(input.material, '')
  const spec = ensureStr(input.specification, '')
  const culture = ensureStr(input.culturalBackground, '')
  const desc = ensureStr(input.description, '')

  // 简易中→英对照（仅演示商品覆盖到的词汇；未匹配时兜底直译说明）
  const zhEnMap: Record<string, string> = {
    根书: 'Root Calligraphy',
    木质: 'wooden',
    书签: 'bookmarks',
    套装: 'set',
    天然木材: 'natural wood',
    徽章: 'badge',
    钥匙扣: 'keychain',
    抱枕: 'cushion',
    帆布袋: 'canvas bag',
    明信片: 'postcards',
    冰箱贴: 'fridge magnet',
    印章: 'seal',
    摆件: 'ornament',
    字画: 'calligraphy artwork',
    '5枚装': 'set of 5',
    四件套: 'set of 4',
    非遗: 'intangible cultural heritage',
    手工制作: 'handcrafted',
    大师: 'master',
    精选: 'selected',
    根宝: 'Genbao'
  }
  const translateName = (zh: string) => {
    let en = zh
    for (const [zhKey, enVal] of Object.entries(zhEnMap)) {
      en = en.replace(new RegExp(zhKey, 'g'), enVal)
    }
    return en
  }

  const titleEn = material
    ? `${translateName(input.name)} (${material === '天然木材' ? 'natural wood' : PENDING_CN})`
    : translateName(input.name)

  const features: string[] = ['Handcrafted using traditional Root Calligraphy (Gen Shu) techniques']
  if (material) features.push(`Made of ${translateName(material)}`)
  if (spec) features.push(`Sold as ${translateName(spec)}`)
  if (culture) features.push('Carries the cultural story of Sichuan intangible cultural heritage')
  if (input.price) features.push(`Reference unit price: CNY ${input.price.toFixed(2)}`)

  const keywords = [
    'Root Calligraphy',
    'wooden bookmark',
    ...(!material || material === '天然木材' ? ['natural wood'] : [translateName(material)]),
    ...(spec ? [translateName(spec)] : []),
    'Chinese intangible cultural heritage',
    'handmade gift'
  ]

  return {
    title: titleEn,
    description: desc
      ? `Traditional Sichuan Root Calligraphy craftsmanship meets everyday reading. ${translateName(desc)} ${culture ? 'Each piece celebrates intangible cultural heritage artistry.' : ''}`.trim()
      : PENDING_CN,
    features: features.length > 0 ? features : [PENDING_CN],
    keywords: keywords.slice(0, 8),
    cultural_background: culture
      ? `Root Calligraphy (Gen Shu) is a Sichuan intangible cultural heritage art. ${translateName(culture)} It transforms natural tree roots into calligraphy artworks through more than ten handcraft steps including root selection, boiling, peeling, polishing and assembling.`
      : PENDING_CN,
    material: material ? translateName(material) : PENDING_CN,
    specification: spec ? translateName(spec) : PENDING_CN,
    notice:
      'This product information is generated for demonstration. No certifications, sales volume, rankings or logistics commitments are included; all facts are based on the provided product data only. Details to be confirmed by the seller.'
  }
}

// ---------- 功能2：AI海外市场分析（Mock规则引擎） ----------
async function analyzeTargetMarket(input: ProductIntlInput, markets: string[]): Promise<MarketAnalysisResult[]> {
  assertInput(!!input && !!input.name, '商品数据缺失：请先选择商品')
  assertInput(Array.isArray(markets) && markets.length > 0, '请选择目标市场')
  const invalid = markets.filter((m) => !MARKETS.includes(m))
  if (invalid.length > 0) throw new AiServiceError('EMPTY_INPUT', `不支持的市场：${invalid.join('、')}`)

  await Promise.all(markets.map((_m) => mockDelay()))

  return markets.map((market) => {
    const marketEn = {美国: 'United States', 日本: 'Japan', 新加坡: 'Singapore', 韩国: 'South Korea'}[market] || market
    const priceRef = input.price ? `CNY ${input.price.toFixed(2)}` : PENDING_CN

    const profiles: Record<string, string> = {
      美国: '对亚洲文化有浓厚兴趣、追求个性化手工礼品的消费者；礼品采购与家居装饰场景居多（AI辅助分析，不代表官方统计数据）',
      日本: '重视工艺细节与自然材质，偏好传统手工艺与匠人故事的消费者；常见于文具与礼品场景（AI辅助分析，不代表官方统计数据）',
      新加坡:
        '多元文化背景，接受度高的华族文化与新中式礼品消费者；节庆与企业礼品场景常见（AI辅助分析，不代表官方统计数据）',
      韩国: '关注设计感与文化独特性，偏好小众文创产品的年轻消费群体；学校与文创零售场景常见（AI辅助分析，不代表官方统计数据）'
    }
    const scenarios: Record<string, string> = {
      美国: '文化活动现场礼品、书店文创区、博物馆商店、线上手工礼品平台（AI辅助分析，不代表官方统计数据）',
      日本: '文具店、杂货铺、传统文化体验课堂、旅游纪念品渠道（AI辅助分析，不代表官方统计数据）',
      新加坡: '华族文化节庆、企业年会礼品、博物馆文创店（AI辅助分析，不代表官方统计数据）',
      韩国: '文创市集、校园文化周、设计概念店（AI辅助分析，不代表官方统计数据）'
    }
    const priceFit: Record<string, string> = {
      美国: `${priceRef} 属手工文创常见价位带（AI辅助分析，不代表官方统计数据）`,
      日本: `${priceRef} 与当地手工文具/杂货价位相近（AI辅助分析，不代表官方统计数据）`,
      新加坡: `${priceRef} 在节庆礼品预算内（AI辅助分析，不代表官方统计数据）`,
      韩国: `${priceRef} 适合文创零售定价区间（AI辅助分析，不代表官方统计数据）`
    }
    return {
      market: market,
      consumer_profile: profiles[market] || PENDING_CN,
      consumption_scenario: scenarios[market] || PENDING_CN,
      cultural_fit:
        market === '美国' || market === '新加坡'
          ? '根书文化作为中华非遗叙事易被理解为"自然与书法结合的手工艺术"，文化适配度较高；建议在文案中弱化宗教/民俗歧义，突出艺术与手工价值（AI辅助分析，不代表官方统计数据）'
          : '日本、韩国对汉字书法文化天然亲近，文化适配度高；建议强调匠人工艺与自然材质故事（AI辅助分析，不代表官方统计数据）',
      price_fit: priceFit[market] || PENDING_CN,
      marketing_focus: [
        `主打"天然树根×书法艺术"的独特性`,
        `讲述非遗传承人故事，突出手工温度`,
        `进入${marketEn}手工艺与文创礼品渠道`,
        '强调每件作品的唯一性（自然树根形态不可复制）'
      ],
      potential_risks: [
        '木质品进出口检疫要求需要进一步核验',
        '长距离物流可能造成的破损风险需要进一步核验',
        '本地竞品价格策略需要进一步核验',
        '商标与知识产权保护需要进一步核验'
      ],
      data_to_verify: [
        '目标市场进口关税与税费政策（需要进一步核验）',
        '当地物流时效与费用（需要进一步核验）',
        '目标消费者画像与规模数据（需要进一步核验）',
        '平台佣金与结算规则（需要进一步核验）'
      ],
      analysis_summary: `针对${market}市场的AI辅助分析：${translate(input.name)}具备非遗文化故事与手工唯一性卖点，建议以文化礼品定位切入，重点核验检疫、物流与关税数据后再做定价决策。本结论为AI辅助分析结果，不代表官方统计数据。`
    }
  })

  function translate(zh: string): string {
    return zh.replace(/根书/g, 'Root Calligraphy').replace(/木质/g, 'wooden')
  }
}

// ---------- 功能3a：AI询盘识别（Mock规则引擎） ----------
async function analyzeInquiry(inquiryText: string): Promise<InquiryAnalysisResult> {
  assertInput(!!inquiryText && inquiryText.trim().length > 0, '请输入英文询盘内容')
  await mockDelay()

  const text = inquiryText.trim()
  const lower = text.toLowerCase()

  // 商品识别
  let product = PENDING_CN
  if (lower.includes('bookmark')) product = '木质书签（Root Calligraphy wooden bookmarks）'
  else if (lower.includes('badge')) product = '徽章'
  else if (lower.includes('keychain') || lower.includes('key chain')) product = '钥匙扣'
  else if (lower.includes('cushion') || lower.includes('pillow')) product = '抱枕'
  else if (lower.includes('bag')) product = '帆布袋'
  else if (lower.includes('postcard')) product = '明信片'
  else if (lower.includes('fridge magnet')) product = '冰箱贴'
  else if (lower.includes('seal') || lower.includes('stamp')) product = '印章'
  else if (lower.includes('ornament')) product = '摆件'
  else if (lower.includes('calligraphy')) product = '根书作品'
  else if (lower.includes('craft') || lower.includes('gift')) product = '文创礼品（待确认具体商品）'

  // 数量识别
  let quantity = PENDING_CN
  const qtyMatch = text.match(/(\d[\d,]*)\s*(pieces|pcs|units|sets|items)/i)
  if (qtyMatch) quantity = `${qtyMatch[1]} ${qtyMatch[2].toLowerCase()}`
  else if (lower.includes('bulk')) quantity = '批量采购（具体数量待确认）'

  // 目的国识别
  let destination = PENDING_CN
  const countries = [
    'united states',
    'usa',
    'us',
    'japan',
    'singapore',
    'south korea',
    'korea',
    'uk',
    'germany',
    'france',
    'australia',
    'canada'
  ]
  for (const c of countries) {
    if (lower.includes(c)) {
      destination =
        c === 'usa' || c === 'us' || c === 'united states'
          ? '美国'
          : c === 'japan'
            ? '日本'
            : c === 'singapore'
              ? '新加坡'
              : c === 'south korea' || c === 'korea'
                ? '韩国'
                : c
      break
    }
  }

  // 客户类型与场景
  let customerType = '待确认'
  let scenario = PENDING_CN
  if (lower.includes('wholesale')) {
    customerType = '批发商/经销商'
    scenario = '渠道批发采购'
  } else if (lower.includes('cultural event')) {
    customerType = '活动主办方'
    scenario = '文化活动现场使用'
  } else if (lower.includes('store') || lower.includes('shop')) {
    customerType = '零售商'
    scenario = '门店上架销售'
  } else if (lower.includes('museum')) {
    customerType = '博物馆/文化机构'
    scenario = '文创商店销售'
  } else if (lower.includes('school') || lower.includes('education')) {
    customerType = '教育机构'
    scenario = '教学/体验活动'
  }

  // 需求与缺失信息
  const requirements: string[] = []
  const missing: string[] = []
  if (lower.includes('price') || lower.includes('quote') || lower.includes('cost')) requirements.push('获取价格/报价')
  if (lower.includes('delivery') || lower.includes('shipping')) requirements.push('了解物流时效')
  if (lower.includes('sample')) requirements.push('样品需求')
  if (lower.includes('custom') || lower.includes('logo')) requirements.push('定制需求')
  if (qtyMatch) requirements.push(`采购数量 ${quantity}`)
  if (destination !== PENDING_CN) requirements.push(`目的国：${destination}`)
  if (requirements.length === 0) requirements.push('商品兴趣（具体需求待确认）')

  if (!qtyMatch && !lower.includes('bulk')) missing.push('采购数量未明确')
  if (destination === PENDING_CN) missing.push('目的国未明确')
  if (!lower.includes('sample')) missing.push('是否需要样品未明确')
  if (!lower.includes('delivery') && !lower.includes('shipping')) missing.push('物流要求未明确')
  if (!lower.includes('custom') && !lower.includes('logo')) missing.push('是否需要定制/印标未明确')
  if (!lower.includes('price') && !lower.includes('quote') && !lower.includes('cost')) missing.push('价格预算未明确')

  return {
    product,
    quantity,
    destination,
    customer_type: customerType,
    purchase_scenario: scenario,
    requirements,
    missing_information: missing.length > 0 ? missing : ['无明显缺失信息']
  }
}

// ---------- 功能3b：AI英文回复（Mock规则引擎） ----------
async function generateInquiryReply(inquiryText: string, analysis: InquiryAnalysisResult): Promise<InquiryReplyResult> {
  assertInput(!!inquiryText && inquiryText.trim().length > 0, '请输入英文询盘内容')
  assertInput(!!analysis && typeof analysis === 'object', '请先完成询盘识别')
  await mockDelay()

  const toConfirm: string[] = []
  if (analysis.missing_information.length > 0 && analysis.missing_information[0] !== '无明显缺失信息') {
    toConfirm.push(...analysis.missing_information)
  }
  toConfirm.push('最终价格与交易条款')
  toConfirm.push('库存与物流时效')

  const qtyText = analysis.quantity === PENDING_CN ? 'the quantity you need' : analysis.quantity
  const greeting = 'Dear Customer,\n\nThank you very much for your interest in our Root Calligraphy products.'

  const bodyLines: string[] = []
  bodyLines.push(
    `Regarding ${qtyText} of our ${analysis.product === PENDING_CN ? 'handcrafted products' : 'Root Calligraphy wooden bookmarks'}:`
  )
  bodyLines.push(
    '\n1. Product & Craft: Our items are handcrafted using traditional Root Calligraphy (Gen Shu) techniques, a Sichuan intangible cultural heritage. Each piece is unique due to the natural form of tree roots.'
  )
  bodyLines.push(
    '\n2. Pricing: We are preparing the quotation based on your quantity. As this involves handmade cultural products, we will confirm the wholesale price for you.'
  )
  bodyLines.push(
    '\n3. Delivery: For estimated delivery time and shipping options, we will confirm this for you after checking with our logistics partner.'
  )
  if (toConfirm.includes('是否需要定制/印标未明确')) {
    bodyLines.push(
      '\n4. Customization: If you would like customization (such as logo printing or custom packaging), please let us know and we will confirm this for you.'
    )
  }

  const reply = [
    greeting,
    ...bodyLines,
    '\nCould you also confirm your destination country and preferred shipping method? This will help us provide an accurate quotation.',
    '\nWe look forward to your reply and hope to support your cultural event.',
    '\nBest regards,',
    'Root Calligraphy Team'
  ].join(' ')

  return {reply, to_confirm: toConfirm}
}

// ---------- 功能4：AI报价说明（Mock规则引擎，金额一律程序计算） ----------
async function generateQuoteDescription(input: QuoteInput, calc: QuoteCalculation): Promise<QuoteDescriptionResult> {
  assertInput(!!input && !!input.productName, '请先选择商品')
  assertInput(Number.isFinite(input.quantity) && input.quantity > 0, '请输入有效数量')
  assertInput(Number.isFinite(input.unitPrice) && input.unitPrice > 0, '请输入有效单价')

  await mockDelay()

  const currency = ensureStr(input.currency, 'CNY')
  const productAmount = calc.productAmount.toFixed(2)
  const totalCost = calc.totalCost.toFixed(2)

  const itemsToConfirm: string[] = [
    '实际交易价格需由业务人员确认',
    '物流费用需以实际承运商报价为准',
    '汇率需按交易日实时汇率确认',
    '进口关税与税费需进一步核验',
    '贸易条款（Incoterms）需双方协商确认'
  ]
  if (ensureStr(input.exchangeRate, '') === '') itemsToConfirm.push('未提供汇率参考')
  if (ensureStr(input.remark, '') !== '') itemsToConfirm.push('备注信息需人工核实')

  const rateLine =
    input.exchangeRate && Number.isFinite(input.exchangeRate) && input.exchangeRate > 0
      ? `Exchange Rate Reference: 1 ${currency} = ${input.exchangeRate} CNY (entered manually for classroom demonstration only, not a real-time rate).`
      : 'Exchange Rate Reference: not provided. We will confirm this for you.'

  const description = [
    `Dear Customer,`,
    `\nThank you for your inquiry. Please find below the quotation for ${input.productName}:`,
    `\n- Product: ${input.productName}`,
    `- Quantity: ${input.quantity}`,
    `- Unit Price: ${currency} ${input.unitPrice.toFixed(2)}`,
    `- Product Amount: ${currency} ${productAmount}`,
    `- Shipping Cost: ${currency} ${input.shippingCost.toFixed(2)}`,
    `- Other Costs: ${currency} ${input.otherCost.toFixed(2)}`,
    `- Estimated Total Cost: ${currency} ${totalCost}`,
    `\n${rateLine}`,
    `\nNote: All amounts are calculated by our system and reviewed by our team. This quotation is AI-assisted and for business reference only. Actual transaction price, shipping costs, exchange rate, taxes and trade terms shall be confirmed by our sales team.`,
    input.remark ? `\nRemark: ${input.remark}` : ''
  ]
    .filter(Boolean)
    .join(' ')

  return {description, items_to_confirm: itemsToConfirm}
}

// ---------- AI跨境客服（Mock规则引擎：关键词匹配，不虚构事实数据） ----------
async function generateSupportReply(messages: SupportMessage[]): Promise<SupportReplyResult> {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  assertInput(!!lastUser && !!lastUser.content && lastUser.content.trim().length > 0, '请输入您的问题')
  await mockDelay()

  const q = (lastUser?.content || '').toLowerCase()
  const has = (...words: string[]) => words.some((w) => q.includes(w))

  if (has('价格', '报价', '多少钱', 'price')) {
    return {
      reply:
        '您好！跨境报价涉及数量、币种、物流等多项因素，建议使用「AI跨境贸易助手 - AI智能报价」功能：系统会按 单价×数量 自动计算商品金额与预估总成本，并生成英文报价说明供您参考。最终交易价格需由业务人员确认。您也可以直接告诉我商品名称与数量，我为您说明需要准备的信息。',
      suggestions: ['如何生成英文报价？', '汇率如何确认？', '批发100件书签如何报价？']
    }
  }
  if (has('物流', '发货', '运输', '时效', '交期', 'delivery', 'shipping')) {
    return {
      reply:
        '您好！物流时效与运费会因目的国、运输方式（空运/海运/国际快递）差异较大。为避免误导，我们不提供未经确认的时效承诺。建议您在询盘回复中使用"we will confirm this for you"，由业务人员与承运商核实后确认。跨境物流费用请以实际承运商报价为准。',
      suggestions: ['美国市场如何发货？', '报价里包含运费吗？', '如何处理海外询盘？']
    }
  }
  if (has('定制', 'logo', '印标', '刻字', '包装', 'custom')) {
    return {
      reply:
        '您好！本平台支持非遗文创个性定制（可在小程序「个性定制」模块提交需求）。跨境定制订单建议说明：定制内容、数量、交付时间与目的国。定制涉及根书手工工艺，具体可行性需要工艺师傅评估后人工确认，我们不会在确认前承诺任何定制效果。',
      suggestions: ['根书工艺可以定制什么？', '批量定制如何报价？', '定制周期多久？']
    }
  }
  if (has('根书', '非遗', '文化', 'heritage', '文化背景')) {
    return {
      reply:
        '您好！根书（Root Calligraphy）是以天然树根为材料、依根形创作书法艺术的四川非物质文化遗产技艺，讲究"天人合一"，每一件作品都独一无二。我们的文创产品将根书技艺与现代生活用品结合（如木质书签、摆件），适合作为文化传播礼品与文化交流活动用品。海外客户对"handmade"与"cultural heritage"元素接受度较高。',
      suggestions: ['根书产品如何出海？', '美国市场适合哪些产品？', '如何向海外客户介绍根书？']
    }
  }
  if (has('询盘', '客户', '回复', '英文', 'inquiry', 'reply')) {
    return {
      reply:
        '您好！处理海外英文询盘建议使用「AI跨境贸易助手 - AI跨境询盘」功能：AI会从询盘中识别商品、数量、目的国、客户类型与采购场景，并生成专业英文商务回复草稿（缺失信息以"we will confirm this for you"处理，不虚构事实），最后由人工审核确认后发出。',
      suggestions: ['帮我分析一条英文询盘', '英文回复要注意什么？', '询盘识别后如何报价？']
    }
  }
  if (has('市场', '美国', '日本', '韩国', '新加坡', '出海', '海外', 'market')) {
    return {
      reply:
        '您好！海外市场初步分析建议使用「AI跨境贸易助手 - AI海外市场分析」功能，支持美国、日本、新加坡、韩国等市场，从消费者画像、消费场景、文化适配、价格适配等维度生成AI辅助分析。请注意：分析结果不代表官方统计数据，市场规模、关税等数据需进一步核验。',
      suggestions: ['美国消费者画像如何？', '日本市场注意什么？', '文化适配如何分析？']
    }
  }
  if (has('合作', '批发', '代理', '经销', 'wholesale', 'bulk')) {
    return {
      reply:
        '您好！欢迎洽谈批发与合作。建议流程：①选择意向商品 → ②AI生成英文商品信息 → ③目标市场分析 → ④客户询盘处理 → ⑤AI辅助报价 → ⑥双方人工确认合作条款。批发价格、起订量（MOQ）与账期等条款需人工确认，我们不预设任何未经确认的交易条件。',
      suggestions: ['批发报价流程是什么？', '如何开始一次出海流程？', '如何展示商品给海外客户？']
    }
  }
  if (has('汇率', 'exchange', '关税', '税费', 'tax')) {
    return {
      reply:
        '您好！汇率实时波动、关税因商品编码与目的国政策而异，我们不对这两项提供虚构数据。报价页面支持手动输入参考汇率（仅课堂演示用途），实际结算汇率请以交易日银行牌价为准；关税与税费请查询目的国官方海关规定或咨询专业报关机构。',
      suggestions: ['报价时汇率怎么填？', '出口美国有关税吗？', '报价包含哪些费用？']
    }
  }
  if (has('你好', '您好', 'hi', 'hello', '在吗', '谢谢')) {
    return {
      reply:
        '您好！我是"根生万象"AI跨境客服，可以为您解答非遗文创跨境贸易的相关咨询，包括：商品国际化、海外市场分析、客户询盘处理、智能报价与个性定制合作。请问有什么可以帮您？',
      suggestions: ['根书是什么技艺？', '如何给海外客户报价？', '我想把产品卖到美国']
    }
  }
  return {
    reply:
      '您好！您的问题我已收到。为避免提供未经确认的信息，涉及具体价格、库存、物流时效与贸易条款的内容，建议使用「AI跨境贸易助手」的对应功能生成参考内容，或由人工客服进一步确认。其他跨境贸易流程问题（商品国际化、市场分析、询盘、报价）我都可以为您解答。',
    suggestions: ['根书是什么技艺？', '如何处理海外询盘？', '如何给海外客户报价？', '我想把产品卖到美国']
  }
}

// ---------- 功能5：AI贸易合规检查（Mock规则引擎，不虚构法规） ----------
async function checkTradeCompliance(input: ComplianceInput): Promise<ComplianceResult> {
  assertInput(!!input && !!input.productName, '请先选择商品')
  assertInput(!!input.market, '请选择目的国/地区')

  await mockDelay()

  // 木质工艺品通用合规要点（不虚构具体法规条文）
  const materialWood = (input.material || '').includes('木') || (input.productName || '').includes('木质')
  const missing: string[] = []
  if (!input.material) missing.push('材质信息')
  if (!input.usage) missing.push('用途信息')
  if (!input.tradeMode) missing.push('交易方式')
  const total = 3
  const completeness = Math.max(0, Math.round(((total - missing.length) / total) * 100))

  const hsBase = materialWood ? '第44章 木及木制品' : '待确认商品类别'

  return {
    completeness_score: input.material && input.usage && input.tradeMode ? 100 : completeness,
    missing_fields: missing.length > 0 ? missing : ['无缺失字段'],
    hs_code_suggestion: materialWood
      ? `${hsBase}，参考品目 4420（木制小工艺品/装饰品，AI初步建议，需人工确认）`
      : `商品类别待确认（AI无法给出建议，请人工补充材质信息）`,
    hs_code_note:
      '以上HS编码仅为AI初步建议，不得视为已完成正式海关归类。正式归类需由报关行或专业归类服务机构依据商品实际材质、工艺、用途向海关确认。',
    import_requirements: [
      `${input.market}进口木制工艺品可能涉及植物检疫要求（具体要求需以${input.market}官方机构规定为准）`,
      '产品标签可能需包含原产国、材质、生产商信息（具体标签规范需以目的国官方要求为准）',
      '大宗贸易可能需要正式报关及缴纳进口税费（税率以目的国海关公布的最新政策为准）'
    ],
    packaging_label_checks: [
      '检查包装是否标注"Made in China"原产地标识（具体要求需以目的国海关规定为准）',
      '检查外箱唛头信息完整性（收货人、订单号、箱数、毛净重）',
      '检查产品标签语言是否符合目的国要求（需人工确认）'
    ],
    origin_checks: [
      '原产地信息：中国（基于系统商品数据）',
      '如需享受优惠关税，可核实是否适用原产地证书（如FORM A/RCEP等，具体适用性需人工确认）'
    ],
    trade_risks: [
      '木质品进出口检疫要求需要进一步核验',
      '目的国对木制品的进口政策可能变化，需以官方最新规定为准',
      '长距离物流破损风险需要进一步核验',
      '商标与知识产权保护需要进一步核验'
    ],
    manual_confirmation: [
      '正式HS归类确认（需报关行/专业机构）',
      '目的国最新进口法规与关税税率（需官方机构确认）',
      '产品认证要求（如需要，需认证机构确认）',
      '贸易条款与运输保险安排（需双方协商确认）'
    ]
  }
}

// ---------- 功能6：AI贸易单证生成（Mock规则引擎，只读取入数据） ----------
async function generateTradeDocument(input: TradeDocumentInput): Promise<TradeDocumentResult> {
  assertInput(!!input && !!input.docType, '请选择单证类型')

  await mockDelay()

  const docLabels: Record<TradeDocumentInput['docType'], string> = {
    proforma_invoice: 'PROFORMA INVOICE 形式发票',
    commercial_invoice: 'COMMERCIAL INVOICE 商业发票',
    packing_list: 'PACKING LIST 装箱单',
    order_confirmation: 'ORDER CONFIRMATION 订单确认单',
    shipping_instruction: 'SHIPPING INSTRUCTION 装运指示'
  }

  const FILL = '待填写'
  const CONFIRM = '待确认'
  const mk = (key: string, label: string, value?: string | number | null): TradeDocField => {
    const v = value === undefined || value === null || value === '' ? FILL : String(value)
    return {key, label, value: v, filled: v !== FILL && v !== CONFIRM}
  }

  // 单证字段模板（按类型差异化）
  const commonFields: TradeDocField[] = [
    mk('doc_no', '单证编号 Document No.', `DRAFT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`),
    mk('doc_date', '出单日期 Date', new Date().toISOString().slice(0, 10)),
    mk('seller', '卖方 Seller', input.sellerName || '根生万象（课堂演示卖方，待确认）'),
    mk('seller_address', '卖方地址 Seller Address', input.sellerAddress || FILL),
    mk('buyer', '买方 Buyer', input.customerName || FILL),
    mk('buyer_address', '买方地址 Buyer Address', input.customerAddress || FILL)
  ]

  let fields: TradeDocField[]
  switch (input.docType) {
    case 'packing_list':
      fields = [
        ...commonFields,
        mk('product', '品名 Description of Goods', input.productName || FILL),
        mk('quantity', '数量 Quantity', input.quantity ?? null),
        mk('packaging', '包装方式 Packaging', input.packagingInfo || FILL),
        mk('gross_weight', '毛重 Gross Weight (kg)', input.weightKg ? `${input.weightKg}（待确认）` : FILL),
        mk('net_weight', '净重 Net Weight (kg)', input.weightKg ? `${input.weightKg}（待确认）` : FILL),
        mk('origin', '原产地 Country of Origin', '中国')
      ]
      break
    case 'shipping_instruction':
      fields = [
        ...commonFields,
        mk('shipping_method', '运输方式 Shipping Method', input.shippingMethod || FILL),
        mk('port_loading', '起运港 Port of Loading', '中国（具体港口待确认）'),
        mk('port_discharge', '目的港 Port of Discharge', FILL),
        mk('incoterms', '贸易条款 Incoterms', input.incoterms || CONFIRM),
        mk('product', '品名 Description of Goods', input.productName || FILL),
        mk('quantity', '数量 Quantity', input.quantity ?? null),
        mk('remark', '备注 Remarks', '包装及运输细节待人工确认')
      ]
      break
    case 'order_confirmation':
      fields = [
        ...commonFields,
        mk('order_no', '订单号 Order No.', input.orderNo || FILL),
        mk('product', '品名 Description of Goods', input.productName || FILL),
        mk('quantity', '数量 Quantity', input.quantity ?? null),
        mk('unit_price', '单价 Unit Price', input.unitPrice ? `${input.currency || 'CNY'} ${input.unitPrice}` : FILL),
        mk(
          'total',
          '总金额 Total Amount',
          input.totalAmount ? `${input.currency || 'CNY'} ${input.totalAmount}` : FILL
        ),
        mk('incoterms', '贸易条款 Incoterms', input.incoterms || CONFIRM),
        mk('delivery', '交货期 Delivery', CONFIRM)
      ]
      break
    default:
      // proforma_invoice / commercial_invoice
      fields = [
        ...commonFields,
        mk('product', '品名 Description of Goods', input.productName || FILL),
        mk('quantity', '数量 Quantity', input.quantity ?? null),
        mk('unit_price', '单价 Unit Price', input.unitPrice ? `${input.currency || 'CNY'} ${input.unitPrice}` : FILL),
        mk(
          'total',
          '总金额 Total Amount',
          input.totalAmount ? `${input.currency || 'CNY'} ${input.totalAmount}` : FILL
        ),
        mk('incoterms', '贸易条款 Incoterms', input.incoterms || CONFIRM),
        mk('payment_terms', '付款方式 Payment Terms', CONFIRM),
        mk('bank_info', '银行信息 Bank Info', input.bankInfo || FILL),
        mk('origin', '原产地 Country of Origin', '中国')
      ]
  }

  const missing = fields.filter((f) => !f.filled).map((f) => f.label)
  const notes = [
    '本单证为AI生成草稿，状态：待人工审核',
    '标注"待填写/待确认"的字段禁止AI编造，须由业务人员人工补充确认',
    '单证内容须与实际交易一致后方可正式使用'
  ]

  return {
    doc_type: input.docType,
    title: docLabels[input.docType],
    fields,
    missing_fields: missing.length > 0 ? missing : ['无缺失字段'],
    notes
  }
}

// ---------- 功能7：AI客户意向识别（Mock规则引擎） ----------
async function analyzeCustomerIntent(message: string): Promise<CustomerIntentResult> {
  assertInput(!!message && message.trim().length > 0, '请输入客户消息')
  await mockDelay()

  const text = message.trim()
  const lower = text.toLowerCase()

  // 意图类型识别（价格协商/批量采购/样品咨询/定制咨询/售后等）
  const tags: string[] = []
  let intentType = '商品咨询'
  if (lower.includes('price') || lower.includes('offer') || lower.includes('cost') || lower.includes('quote')) {
    if (lower.includes('better') || lower.includes('discount') || lower.includes('cheaper')) {
      intentType = '价格协商'
    } else {
      intentType = '询价'
    }
    tags.push('价格需求')
  }
  if (/\d{2,}\s*(pieces|pcs|units|sets)/i.test(text) || lower.includes('bulk') || lower.includes('wholesale')) {
    tags.push('批量采购')
  }
  if (lower.includes('sample')) tags.push('样品需求')
  if (lower.includes('custom') || lower.includes('logo') || lower.includes('brand')) tags.push('定制需求')
  if (lower.includes('cultural event') || lower.includes('event')) tags.push('活动采购')

  // 商品识别
  let product = PENDING_CN
  if (lower.includes('bookmark')) product = '木质书签（Root Calligraphy wooden bookmarks）'
  else if (lower.includes('badge')) product = '徽章'
  else if (lower.includes('keychain') || lower.includes('key chain')) product = '钥匙扣'
  else if (lower.includes('cushion') || lower.includes('pillow')) product = '抱枕'
  else if (lower.includes('bag')) product = '帆布袋'
  else if (lower.includes('postcard')) product = '明信片'
  else if (lower.includes('fridge magnet')) product = '冰箱贴'
  else if (lower.includes('seal') || lower.includes('stamp')) product = '印章'
  else if (lower.includes('calligraphy')) product = '根书作品'

  // 数量识别
  let quantity = PENDING_CN
  const qtyMatch = text.match(/(\d[\d,]*)\s*(pieces|pcs|units|sets|items)/i)
  if (qtyMatch) quantity = `${qtyMatch[1]} ${qtyMatch[2].toLowerCase()}`
  else if (lower.includes('bulk')) quantity = '批量采购（具体数量待确认）'

  // 目的国识别
  let destination = PENDING_CN
  const countryMap: Record<string, string> = {
    'united states': '美国',
    usa: '美国',
    us: '美国',
    japan: '日本',
    singapore: '新加坡',
    'south korea': '韩国',
    korea: '韩国',
    uk: '英国',
    germany: '德国',
    france: '法国',
    australia: '澳大利亚',
    canada: '加拿大'
  }
  for (const [en, zh] of Object.entries(countryMap)) {
    if (lower.includes(en)) {
      destination = zh
      break
    }
  }

  // 采购场景
  let scenario = PENDING_CN
  if (lower.includes('cultural event')) scenario = '海外文化活动采购'
  else if (lower.includes('wholesale')) scenario = '渠道批发采购'
  else if (lower.includes('store') || lower.includes('shop')) scenario = '门店上架销售'
  else if (lower.includes('museum')) scenario = '博物馆文创商店'
  else if (lower.includes('school') || lower.includes('education')) scenario = '教育机构教学采购'
  else if (lower.includes('gift')) scenario = '礼品赠送'

  // 重点需求
  const keyRequirements: string[] = []
  if (lower.includes('price') || lower.includes('offer') || lower.includes('quote') || lower.includes('cost')) {
    keyRequirements.push('获取批发价格与报价单')
  }
  if (lower.includes('delivery') || lower.includes('shipping')) keyRequirements.push('了解物流时效')
  if (qtyMatch) keyRequirements.push(`采购数量 ${quantity}`)
  if (destination !== PENDING_CN) keyRequirements.push(`目的国：${destination}`)
  if (keyRequirements.length === 0) keyRequirements.push('商品兴趣（具体需求待确认）')

  const priceNeed = tags.includes('价格需求')
    ? `客户关注价格${lower.includes('better price') ? '，并希望获得更优价格（可能存在议价空间）' : '，需提供报价'}`
    : PENDING_CN
  const deliveryNeed =
    lower.includes('delivery') || lower.includes('shipping')
      ? '客户关注交货时间（不得AI承诺交期，需人工确认库存与生产周期）'
      : PENDING_CN
  const logisticsNeed =
    lower.includes('shipping') || lower.includes('air') || lower.includes('sea') || lower.includes('express')
      ? '客户关注物流方式（空运/海运/国际快递，具体以实际承运商为准）'
      : PENDING_CN

  const missing: string[] = []
  if (quantity === PENDING_CN) missing.push('采购数量未明确')
  if (destination === PENDING_CN) missing.push('目的国未明确')
  if (!lower.includes('sample')) missing.push('是否需要样品未明确')
  if (!lower.includes('custom') && !lower.includes('logo')) missing.push('是否需要定制/印标未明确')
  if (!lower.includes('delivery') && !lower.includes('shipping')) missing.push('交期要求未明确')
  if (missing.length === 0) missing.push('无明显缺失信息')

  return {
    intent_type: intentType,
    intent_tags: tags.length > 0 ? tags : ['商品咨询'],
    product,
    quantity,
    destination,
    purchase_scenario: scenario,
    key_requirements: keyRequirements,
    price_need: priceNeed,
    delivery_need: deliveryNeed,
    logistics_need: logisticsNeed,
    missing_information: missing
  }
}

// ---------- 功能9：AI海外营销素材（Mock规则引擎） ----------
async function generateMarketingContent(input: MarketingInput): Promise<MarketingContentResult> {
  assertInput(!!input && !!input.productName, '请先选择商品')
  assertInput(!!input.market, '请选择目标市场')

  await mockDelay()

  const _name = input.productName
  const material = ensureStr(input.material, '')
  const features = Array.isArray(input.features) ? input.features.filter(Boolean) : []
  const priceLine = input.price ? `from CNY ${input.price}` : ''
  const hashTags = ['#RootCalligraphy', '#WoodenBookmark', '#HandmadeCraft', '#ChineseCulture', '#CulturalGift']

  const points: string[] = [
    'Each piece is one-of-a-kind — natural tree root forms can never be replicated',
    'Traditional Sichuan intangible cultural heritage craftsmanship (Gen Shu)',
    material ? `Made of ${material.includes('木') ? 'natural wood' : material}` : 'Made of natural materials',
    ...(features.length > 0 ? [features.join('; ')] : []),
    'Perfect gift for readers, culture lovers and event giveaways'
  ].filter(Boolean)

  return {
    overseas_title:
      `Handcrafted Root Calligraphy Wooden Bookmark — Traditional Chinese Intangible Cultural Heritage Art ${priceLine ? `(${priceLine})` : ''}`.trim(),
    selling_points: points,
    seo_keywords: [
      'root calligraphy bookmark',
      'handmade wooden bookmark',
      'chinese cultural gift',
      'intangible cultural heritage craft',
      'unique wood gift for readers',
      'cultural event giveaway'
    ],
    instagram_copy: `✨ One root, one story. Our Root Calligraphy bookmarks turn natural tree roots into wearable Chinese calligraphy art. 🌿 Every piece is unique, handcrafted by heritage artisans. Perfect for cultural events and thoughtful gifting. ${priceLine} ${hashTags.slice(0, 4).join(' ')} (AI-generated draft, pending human review)`,
    facebook_copy: `🌿 Discover the art of Root Calligraphy (Gen Shu) — a Sichuan intangible cultural heritage. Our handcrafted wooden bookmarks carry the beauty of natural tree roots and traditional Chinese calligraphy. Each piece is unique. Great for cultural events, museums, bookstores and corporate gifting. ${priceLine} Message us for wholesale inquiries. (AI-generated draft, pending human review)`,
    tiktok_script: [
      'Scene 1 (0-3s): Hook — "This bookmark was once a tree root 🌿" — close-up of the natural root texture',
      'Scene 2 (3-8s): Show the artisan polishing and assembling root pieces into calligraphy strokes',
      'Scene 3 (8-15s): Reveal the finished bookmark sliding into an open book — text overlay: "One root, one story"',
      'Scene 4 (15-20s): CTA — "Perfect for cultural events & gifts. Link in bio." (AI-generated draft, pending human review)'
    ],
    email_subject: `Handcrafted Root Calligraphy Bookmarks — Unique Cultural Gifts for ${input.market} Readers`,
    risk_notice:
      'AI生成内容仅基于已有真实商品信息，不虚构产品功效、认证、销量、客户评价或市场数据；发布前须人工审核确认。'
  }
}

// ---------- 功能10：异常订单AI处理建议（Mock规则引擎） ----------
async function generateExceptionSuggestion(type: string, description: string): Promise<ExceptionSuggestionResult> {
  assertInput(!!type, '异常类型缺失')

  await mockDelay()

  const suggestionMap: Record<string, {suggestions: string[]; notify: string}> = {
    logistics_delay: {
      suggestions: [
        '联系承运商确认包裹当前位置与预计送达时间（以承运商反馈为准）',
        '主动向客户说明延迟原因与预计到达时间（需人工确认后发送）',
        '如延迟超期严重，评估是否协商部分运费补偿（需人工确认金额）'
      ],
      notify:
        'Dear Customer, we would like to inform you that your shipment is currently in transit and may arrive slightly later than expected. We are closely monitoring its status with the carrier. We apologize for the inconvenience and appreciate your patience. We will keep you updated on any changes. (AI draft — to be confirmed by staff before sending)'
    },
    customs_issue: {
      suggestions: [
        '核实清关文件是否齐全（发票/装箱单/原产地证等）',
        '联系报关行确认海关查验原因与处理时限（以海关反馈为准）',
        '如需补交税费，与客户协商承担方式（需双方确认）'
      ],
      notify:
        'Dear Customer, your parcel is currently undergoing customs clearance procedures in the destination country. This is a standard process for international shipments. We are working with our logistics partner to complete the clearance as soon as possible. We will notify you once the parcel is released. (AI draft — to be confirmed by staff before sending)'
    },
    address_error: {
      suggestions: [
        '联系客户确认正确收货地址（保留沟通记录）',
        '如包裹已发出，联系承运商尝试拦截或改址（可能产生费用，需人工确认）',
        '地址确认后同步更新客户档案信息'
      ],
      notify:
        'Dear Customer, we noticed that the shipping address on your order may be incomplete or incorrect. Could you please confirm your full delivery address including postal code and contact number? This will help us ensure a smooth delivery. (AI draft — to be confirmed by staff before sending)'
    },
    delivery_failed: {
      suggestions: [
        '核实派送失败原因（地址问题/联系不上/无人签收）',
        '联系客户安排重新派送或自提点取件',
        '如多次派送失败，与客户协商退货或改址方案（需人工确认）'
      ],
      notify:
        'Dear Customer, we were informed that the carrier attempted to deliver your parcel but was unable to complete the delivery. Please contact the local carrier to arrange a redelivery, or let us know your preferred solution. We are happy to assist. (AI draft — to be confirmed by staff before sending)'
    },
    package_damaged: {
      suggestions: [
        '请客户提供破损照片与外包装照片作为凭证',
        '核实物流破损责任归属（承运商/包装问题）',
        '按售后政策评估补发/退款方案（金额需人工确认，AI不自动决定）'
      ],
      notify:
        'Dear Customer, we are very sorry to hear that your parcel arrived damaged. Could you please share photos of the damaged items and the outer packaging? This will help us process your case quickly. We will arrange a solution (replacement or refund) after review. (AI draft — to be confirmed by staff before sending)'
    },
    payment_issue: {
      suggestions: [
        '核实支付渠道返回的异常原因（超时/风控/重复支付）',
        '联系客户确认支付方式与意向',
        '如需退款，走正式退款流程（金额需人工确认）'
      ],
      notify:
        'Dear Customer, we noticed an issue with the payment for your order. Our team is looking into it. If you were charged but the order is not confirmed, please do not worry — we will verify and process a refund if needed. (AI draft — to be confirmed by staff before sending)'
    },
    refunding: {
      suggestions: [
        '核实退款申请是否符合售后政策',
        '确认退款金额与原路退回路径',
        '跟进退款到账状态并告知客户预计到账时间（以支付渠道为准）'
      ],
      notify:
        'Dear Customer, your refund request has been received and is being processed. The refunded amount will be returned via the original payment method. The exact arrival time depends on your payment provider. Thank you for your patience. (AI draft — to be confirmed by staff before sending)'
    },
    customer_cancelled: {
      suggestions: [
        '联系客户确认取消原因（记录用于业务改进）',
        '如已发货，协商拦截退回或拒签处理方案（费用需人工确认）',
        '如已付款未发货，按退款流程处理（需人工确认）'
      ],
      notify:
        'Dear Customer, we have received your cancellation request. Our team will confirm the order status and process accordingly. If the order has already been shipped, we will coordinate the return process with you. (AI draft — to be confirmed by staff before sending)'
    }
  }

  const preset = suggestionMap[type] || {
    suggestions: ['核实订单实际状态（以业务系统记录为准）', '联系客户说明情况并协商处理方案（需人工确认）'],
    notify:
      'Dear Customer, we are looking into the status of your order and will update you shortly. Thank you for your understanding. (AI draft — to be confirmed by staff before sending)'
  }

  return {
    suggestions: preset.suggestions,
    notify_draft: preset.notify,
    to_confirm: [
      '处理方案须经人工确认后执行',
      'AI不自动修改订单关键状态、退款金额或赔偿金额',
      ...(description ? ['异常描述已记录，具体细节以人工核实为准'] : [])
    ]
  }
}

// ---------- 导出 Mock Provider ----------
export const mockProvider: AiTradeProvider = {
  name: '演示模式AI（Mock）',
  isMock: true,
  generateProductInternationalization,
  analyzeTargetMarket,
  analyzeInquiry,
  generateInquiryReply,
  generateQuoteDescription,
  generateSupportReply,
  checkTradeCompliance,
  generateTradeDocument,
  analyzeCustomerIntent,
  generateMarketingContent,
  generateExceptionSuggestion
}

// 引用 prompts（Mock 场景仅记录用途，保持与真实Provider接口一致）
export const MOCK_PROMPTS_IN_USE = {
  product: PROMPT_PRODUCT_INTERNATIONALIZATION,
  market: PROMPT_MARKET_ANALYSIS,
  inquiryAnalysis: PROMPT_INQUIRY_ANALYSIS,
  inquiryReply: PROMPT_INQUIRY_REPLY,
  quote: PROMPT_QUOTE_DESCRIPTION,
  support: PROMPT_SUPPORT,
  compliance: PROMPT_TRADE_COMPLIANCE,
  document: PROMPT_TRADE_DOCUMENT,
  marketing: PROMPT_MARKETING_CONTENT
}

// 引用 parser 兜底函数（保证 Mock 输出与真实 AI 走同一校验口径）
export const MOCK_PARSER_GUARD = {ensureStr, ensureStrArray}
