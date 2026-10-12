// 海外物流方案预估：根据目的国返回国内/国际快递与海运的费用区间、天数区间
// 说明：为课堂演示与参考用途，所有数值均为公开常识性区间，非实时报价，
// 实际费用与时效以承运商确认为准（页面会标注"仅供参考"）。

export interface ShippingPlan {
  carrier: string // 承运方式/公司
  costRange: string // 费用区间（人民币）
  daysRange: string // 时效区间（天）
  note: string
}

const OVERSEAS_PLANS: Record<string, ShippingPlan[]> = {
  美国: [
    {
      carrier: '国际快递（DHL / FedEx）',
      costRange: '¥150 - ¥350',
      daysRange: '5 - 9 天',
      note: '门到门，时效快，适合小件高价值文创'
    },
    {
      carrier: '国际小包（ePacket）',
      costRange: '¥40 - ¥120',
      daysRange: '12 - 25 天',
      note: '经济型，适合轻小件，时效较慢'
    },
    {
      carrier: '海运（FBA / 整柜）',
      costRange: '¥30 - ¥80 /kg',
      daysRange: '25 - 45 天',
      note: '大批量批发推荐，需提前规划'
    }
  ],
  日本: [
    {
      carrier: '国际快递（EMS / SF）',
      costRange: '¥80 - ¥200',
      daysRange: '3 - 7 天',
      note: '时效快，适合样品与零售订单'
    },
    {carrier: '国际小包（航空）', costRange: '¥30 - ¥90', daysRange: '7 - 15 天', note: '经济实惠，适合轻小文创'},
    {carrier: '海运', costRange: '¥20 - ¥60 /kg', daysRange: '15 - 30 天', note: '大批量批发推荐'}
  ],
  韩国: [
    {carrier: '国际快递（EMS）', costRange: '¥70 - ¥180', daysRange: '3 - 6 天', note: '时效快，适合零售订单'},
    {carrier: '国际小包', costRange: '¥25 - ¥80', daysRange: '7 - 14 天', note: '经济型'},
    {carrier: '海运', costRange: '¥20 - ¥55 /kg', daysRange: '12 - 25 天', note: '大批量推荐'}
  ],
  新加坡: [
    {carrier: '国际快递（DHL / SF）', costRange: '¥90 - ¥220', daysRange: '4 - 8 天', note: '时效快'},
    {carrier: '国际小包', costRange: '¥30 - ¥90', daysRange: '8 - 16 天', note: '经济型'},
    {carrier: '海运', costRange: '¥25 - ¥65 /kg', daysRange: '15 - 30 天', note: '大批量推荐'}
  ],
  英国: [
    {
      carrier: '国际快递（DHL / UPS）',
      costRange: '¥160 - ¥380',
      daysRange: '6 - 10 天',
      note: '时效快，适合高价值文创'
    },
    {carrier: '国际小包', costRange: '¥50 - ¥130', daysRange: '15 - 30 天', note: '经济型'},
    {carrier: '海运', costRange: '¥35 - ¥85 /kg', daysRange: '30 - 50 天', note: '大批量推荐'}
  ],
  德国: [
    {carrier: '国际快递（DHL）', costRange: '¥150 - ¥360', daysRange: '6 - 10 天', note: '时效快'},
    {carrier: '国际小包', costRange: '¥45 - ¥120', daysRange: '15 - 30 天', note: '经济型'},
    {carrier: '海运', costRange: '¥35 - ¥80 /kg', daysRange: '30 - 50 天', note: '大批量推荐'}
  ],
  澳大利亚: [
    {carrier: '国际快递（DHL / FedEx）', costRange: '¥140 - ¥340', daysRange: '5 - 9 天', note: '时效快'},
    {carrier: '国际小包', costRange: '¥45 - ¥120', daysRange: '12 - 25 天', note: '经济型'},
    {carrier: '海运', costRange: '¥30 - ¥75 /kg', daysRange: '25 - 45 天', note: '大批量推荐'}
  ]
}

const DEFAULT_OVERSEAS_PLANS: ShippingPlan[] = [
  {
    carrier: '国际快递（DHL / FedEx / UPS）',
    costRange: '¥150 - ¥380',
    daysRange: '5 - 12 天',
    note: '门到门，时效快，适合高价值文创'
  },
  {carrier: '国际小包（航空）', costRange: '¥40 - ¥130', daysRange: '12 - 30 天', note: '经济型，适合轻小件'},
  {carrier: '海运', costRange: '¥30 - ¥85 /kg', daysRange: '25 - 50 天', note: '大批量批发推荐，需提前规划'}
]

/** 根据目的国获取物流方案预估 */
export function getOverseasShippingPlans(country: string): ShippingPlan[] {
  if (!country) return []
  const key = Object.keys(OVERSEAS_PLANS).find((k) => country.includes(k))
  return key ? OVERSEAS_PLANS[key] : DEFAULT_OVERSEAS_PLANS
}

export const OVERSEAS_COUNTRIES = [
  '美国',
  '日本',
  '韩国',
  '新加坡',
  '英国',
  '德国',
  '法国',
  '澳大利亚',
  '加拿大',
  '马来西亚',
  '泰国',
  '其他海外地区'
]

// 各国手机号位数规则（用于海外地址手机号校验）
export interface PhoneRule {
  min: number
  max: number
  placeholder: string
  hint: string
}

const PHONE_RULES: Record<string, PhoneRule> = {
  美国: {min: 10, max: 10, placeholder: '请输入10位美国手机号', hint: '美国手机号为10位数字'},
  日本: {min: 10, max: 11, placeholder: '请输入10-11位日本手机号', hint: '日本手机号为10-11位数字'},
  韩国: {min: 10, max: 11, placeholder: '请输入10-11位韩国手机号', hint: '韩国手机号为10-11位数字'},
  新加坡: {min: 8, max: 8, placeholder: '请输入8位新加坡手机号', hint: '新加坡手机号为8位数字'},
  英国: {min: 10, max: 11, placeholder: '请输入10-11位英国手机号', hint: '英国手机号为10-11位数字'},
  德国: {min: 10, max: 11, placeholder: '请输入10-11位德国手机号', hint: '德国手机号为10-11位数字'},
  法国: {min: 9, max: 9, placeholder: '请输入9位法国手机号', hint: '法国手机号为9位数字'},
  澳大利亚: {min: 9, max: 10, placeholder: '请输入9-10位澳大利亚手机号', hint: '澳大利亚手机号为9-10位数字'},
  加拿大: {min: 10, max: 10, placeholder: '请输入10位加拿大手机号', hint: '加拿大手机号为10位数字'},
  马来西亚: {min: 9, max: 10, placeholder: '请输入9-10位马来西亚手机号', hint: '马来西亚手机号为9-10位数字'},
  泰国: {min: 9, max: 9, placeholder: '请输入9位泰国手机号', hint: '泰国手机号为9位数字'}
}

const DEFAULT_PHONE_RULE: PhoneRule = {min: 7, max: 15, placeholder: '请输入当地手机号', hint: '请输入有效的海外手机号'}

/** 根据目的国获取手机号位数校验规则 */
export function getCountryPhoneRule(country: string): PhoneRule {
  if (!country) return DEFAULT_PHONE_RULE
  const key = Object.keys(PHONE_RULES).find((k) => country.includes(k))
  return key ? PHONE_RULES[key] : DEFAULT_PHONE_RULE
}

/** 校验手机号是否合法：国内11位，海外按国家位数 */
export function validatePhone(phone: string, isOverseas: boolean, country?: string): boolean {
  const digits = phone.replace(/\D/g, '')
  if (isOverseas) {
    const rule = getCountryPhoneRule(country || '')
    return digits.length >= rule.min && digits.length <= rule.max
  }
  return /^1[3-9]\d{9}$/.test(digits)
}

// 海外关税预估：参考税率区间（课堂演示，非实时税率）
export interface TariffEstimate {
  rateMin: number // 最低税率%
  rateMax: number // 最高税率%
  label: string
}

const TARIFF_RATES: Record<string, TariffEstimate> = {
  美国: {rateMin: 7.5, rateMax: 25, label: '美国'},
  日本: {rateMin: 0, rateMax: 5, label: '日本'},
  韩国: {rateMin: 8, rateMax: 13, label: '韩国'},
  新加坡: {rateMin: 0, rateMax: 7, label: '新加坡'},
  英国: {rateMin: 0, rateMax: 12, label: '英国'},
  德国: {rateMin: 0, rateMax: 19, label: '德国（含增值税）'},
  法国: {rateMin: 0, rateMax: 20, label: '法国（含增值税）'},
  澳大利亚: {rateMin: 0, rateMax: 10, label: '澳大利亚（含GST）'},
  加拿大: {rateMin: 5, rateMax: 13, label: '加拿大'},
  马来西亚: {rateMin: 0, rateMax: 10, label: '马来西亚（含SST）'},
  泰国: {rateMin: 5, rateMax: 15, label: '泰国（含VAT）'}
}

const DEFAULT_TARIFF: TariffEstimate = {rateMin: 0, rateMax: 20, label: '目的国'}

/** 根据目的国获取关税预估参考税率 */
export function getCountryTariff(country: string): TariffEstimate {
  if (!country) return DEFAULT_TARIFF
  const key = Object.keys(TARIFF_RATES).find((k) => country.includes(k))
  return key ? TARIFF_RATES[key] : DEFAULT_TARIFF
}

/** 根据物流方案最快时效解析天数下限（用于倒计时） */
export function getMinShippingDays(country: string): number {
  const plans = getOverseasShippingPlans(country)
  if (!plans.length) return 5
  const mins = plans.map((p) => {
    const m = p.daysRange.match(/(\d+)\s*-\s*(\d+)/)
    return m ? Number(m[1]) : 99
  })
  return Math.min(...mins)
}
