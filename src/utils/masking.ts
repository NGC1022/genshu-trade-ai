// 数据脱敏工具（隐私安全：普通用户与无权限角色查看时脱敏展示）

/** 手机号脱敏：保留前3后4，如 138****5678；国际号码保留国家码+后4位 */
export function maskPhone(phone: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (!digits) return phone
  if (digits.length >= 11) return `${digits.slice(0, 3)}****${digits.slice(-4)}`
  if (digits.length >= 7) return `${digits.slice(0, 2)}****${digits.slice(-3)}`
  return `${digits.slice(0, 1)}****${digits.slice(-2)}`
}

/** 邮箱脱敏：local部分保留首字符，如 e****@example.com */
export function maskEmail(email: string): string {
  if (!email?.includes('@')) return email || ''
  const [local, domain] = email.split('@')
  if (local.length <= 1) return `${local}***@${domain}`
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 4))}@${domain}`
}

/** 通用联系方式脱敏：邮箱→邮箱规则；电话→电话规则；其他保留前2后2 */
export function maskContact(contact: string): string {
  if (!contact) return ''
  if (contact.includes('@')) return maskEmail(contact)
  if (/[\d+()\-\s]{7,}/.test(contact)) return maskPhone(contact)
  if (contact.length <= 4) return contact
  return `${contact.slice(0, 2)}****${contact.slice(-2)}`
}

/** 详细地址脱敏：保留省市，后面打码 */
export function maskAddress(addr: string): string {
  if (!addr) return ''
  if (addr.length <= 6) return addr
  return `${addr.slice(0, 6)}****`
}

/** 客户姓名脱敏（个人名）：保留首字符 */
export function maskName(name: string): string {
  if (!name) return ''
  if (name.length <= 2) return name
  return `${name[0]}${'*'.repeat(Math.min(name.length - 1, 5))}`
}
