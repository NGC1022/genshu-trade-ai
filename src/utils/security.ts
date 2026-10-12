/**
 * 内容安全审核工具
 */

// 基础敏感词库 (示例)
const SENSITIVE_WORDS = [
  '色情',
  '暴力',
  '政治',
  '反动',
  '毒品',
  '赌博',
  '枪支',
  '炸药',
  '虚假信息',
  '杀人',
  '强奸',
  '自杀',
  '邪教',
  '恐怖分子',
  '人民币',
  '微信群',
  '兼职',
  '刷单'
]

/**
 * 检查文本内容是否合规
 * @param text 要检查的文本
 * @returns { isSafe: boolean, reason?: string, originalText: string }
 */
export function checkContentSafety(text: string): {isSafe: boolean; reason?: string} {
  if (!text) return {isSafe: true}

  const foundWords = SENSITIVE_WORDS.filter((word) => text.includes(word))

  if (foundWords.length > 0) {
    return {
      isSafe: false,
      reason: `内容包含敏感词：${foundWords.join(', ')}`
    }
  }

  return {isSafe: true}
}

/**
 * 检查笔记内容（标题+正文）
 */
export function checkNoteSafety(title: string, content: string): {isSafe: boolean; reason?: string} {
  const titleResult = checkContentSafety(title)
  if (!titleResult.isSafe) return titleResult

  const contentResult = checkContentSafety(content)
  if (!contentResult.isSafe) return contentResult

  return {isSafe: true}
}
