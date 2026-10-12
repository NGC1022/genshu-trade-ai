// 智能地址文本识别：将粘贴的一段地址文本拆分为 姓名/手机号/省市区/详细地址
// 纯前端正则解析，不调用任何外部服务；识别失败时返回 null 由调用方提示

export interface ParsedAddress {
  receiver_name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  detail?: string
}

// 常见省份（含直辖市/自治区）用于匹配
const PROVINCE_PATTERNS = [
  '北京',
  '天津',
  '上海',
  '重庆',
  '河北',
  '山西',
  '辽宁',
  '吉林',
  '黑龙江',
  '江苏',
  '浙江',
  '安徽',
  '福建',
  '江西',
  '山东',
  '河南',
  '湖北',
  '湖南',
  '广东',
  '广西',
  '海南',
  '四川',
  '贵州',
  '云南',
  '西藏',
  '陕西',
  '甘肃',
  '青海',
  '宁夏',
  '新疆',
  '内蒙古',
  '香港',
  '澳门',
  '台湾'
]

const PROVINCE_SUFFIX = /省|市|自治区|特别行政区|壮族自治区|回族自治区|维吾尔自治区/

/** 从文本中提取手机号 */
function extractPhone(text: string): string | undefined {
  const m = text.match(/1[3-9]\d{9}/)
  return m ? m[0] : undefined
}

/** 提取省份（返回省份名与匹配结束位置） */
function extractProvince(text: string): {province?: string; end?: number} {
  for (const p of PROVINCE_PATTERNS) {
    const idx = text.indexOf(p)
    if (idx >= 0) {
      // 截取省份完整名称（含后缀）
      let end = idx + p.length
      const rest = text.slice(idx)
      const suffixMatch = rest.match(new RegExp(`^${p}(${PROVINCE_SUFFIX.source})`))
      if (suffixMatch) end = idx + suffixMatch[0].length
      return {province: text.slice(idx, end), end}
    }
  }
  return {}
}

/** 提取城市 */
function extractCity(text: string, after: number): {city?: string; end?: number} {
  const rest = text.slice(after)
  // 匹配"XX市"或"XX自治州"，取2-6字
  const m = rest.match(/^([一-龥]{2,6}?)(市|地区|自治州|盟)/)
  if (m) return {city: m[1] + m[2], end: after + m[0].length}
  return {}
}

/** 提取区县 */
function extractDistrict(text: string, after: number): {district?: string; end?: number} {
  const rest = text.slice(after)
  const m = rest.match(/^([一-龥]{2,6}?)(区|县|市|旗)/)
  if (m) return {district: m[1] + m[2], end: after + m[0].length}
  return {}
}

/** 提取收货人姓名（手机号前的中文名，2-5字） */
function extractName(text: string, phone?: string): string | undefined {
  if (phone) {
    const idx = text.indexOf(phone)
    if (idx > 0) {
      const before = text.slice(0, idx).replace(/[,，\s]+$/, '')
      const m = before.match(/([一-龥]{2,5})\s*$/)
      if (m) return m[1]
    }
  }
  // 无手机号时，尝试行首姓名
  const m = text.match(/^([一-龥]{2,5})[,，\s]/)
  return m ? m[1] : undefined
}

/**
 * 智能识别一段地址文本
 * 典型输入："张三，13512345678，四川省成都市武侯区天府大道1号"
 */
export function parseAddressText(raw: string): ParsedAddress | null {
  const text = (raw || '').trim().replace(/\r/g, '\n')
  if (!text) return null

  const result: ParsedAddress = {}
  const phone = extractPhone(text)
  if (phone) result.phone = phone

  const name = extractName(text, phone)
  if (name) result.receiver_name = name

  const {province, end: provEnd} = extractProvince(text)
  if (province) {
    result.province = province
    const {city, end: cityEnd} = extractCity(text, provEnd || 0)
    if (city) {
      result.city = city
      const {district, end: distEnd} = extractDistrict(text, cityEnd || 0)
      if (district) result.district = district
      // 详细地址：省市区之后到结尾
      const detailStart = distEnd || cityEnd || provEnd || 0
      const detail = text
        .slice(detailStart)
        .replace(/^[,，\s]+/, '')
        .replace(phone ? new RegExp(`${phone}`) : '', '')
        .replace(/[,，\s]+$/, '')
        .trim()
      if (detail) result.detail = detail
    }
  }

  const hasAny = result.phone || result.province || result.receiver_name
  return hasAny ? result : null
}
