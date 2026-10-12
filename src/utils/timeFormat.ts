/**
 * 时间格式化工具函数
 * 统一使用北京时间（UTC+8）
 */

/**
 * 将UTC时间转换为北京时间字符串
 * @param utcDateString UTC时间字符串
 * @returns 北京时间格式化字符串
 */
export function formatBeijingTime(utcDateString: string): string {
  const date = new Date(utcDateString)
  // 转换为北京时间（UTC+8）
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)

  const year = beijingTime.getUTCFullYear()
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(beijingTime.getUTCDate()).padStart(2, '0')
  const hours = String(beijingTime.getUTCHours()).padStart(2, '0')
  const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0')
  const seconds = String(beijingTime.getUTCSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 将UTC时间转换为相对时间（如"刚刚"、"5分钟前"）
 * @param utcDateString UTC时间字符串
 * @returns 相对时间字符串
 */
export function formatRelativeTime(utcDateString: string): string {
  const date = new Date(utcDateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  if (months < 12) return `${months}个月前`
  return `${years}年前`
}

/**
 * 将UTC时间转换为简短的北京时间字符串（如"2024-01-01 12:30"）
 * @param utcDateString UTC时间字符串
 * @returns 简短的北京时间字符串
 */
export function formatShortBeijingTime(utcDateString: string): string {
  const date = new Date(utcDateString)
  // 转换为北京时间（UTC+8）
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)

  const year = beijingTime.getUTCFullYear()
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(beijingTime.getUTCDate()).padStart(2, '0')
  const hours = String(beijingTime.getUTCHours()).padStart(2, '0')
  const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 获取当前北京时间的ISO字符串
 * @returns 北京时间的ISO字符串
 */
export function getBeijingTimeISO(): string {
  const now = new Date()
  // 转换为北京时间（UTC+8）
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return beijingTime.toISOString()
}
