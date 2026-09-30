/**
 * 时间处理工具类
 * 统一所有时间展示为北京时间（UTC+8）
 */

const TIMEZONE = 'Asia/Shanghai'

/**
 * 格式化日期时间 (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTime(date: string | number | Date | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''

  return d
    .toLocaleString('zh-CN', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    .replace(/\//g, '-')
}

/**
 * 格式化日期 (YYYY-MM-DD)
 */
export function formatDate(date: string | number | Date | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''

  return d
    .toLocaleDateString('zh-CN', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    .replace(/\//g, '-')
}

/**
 * 格式化时间 (HH:mm:ss)
 */
export function formatTimeOnly(date: string | number | Date | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''

  return d.toLocaleTimeString('zh-CN', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/**
 * 格式化时分 (HH:mm)
 */
export function formatHourMinute(date: string | number | Date | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''

  return d.toLocaleTimeString('zh-CN', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * 获取当前北京时间
 */
export function getBeijingNow(): Date {
  const now = new Date()
  // 返回的对象依然是 JS Date，展示时请使用上述格式化方法
  return now
}
