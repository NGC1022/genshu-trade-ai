import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'

interface MentionTextProps {
  content: string
  className?: string
}

/**
 * 解析评论内容中的@用户名，并渲染为可点击的链接
 * 格式：@[用户名](用户ID)
 */
export default function MentionText({content, className = ''}: MentionTextProps) {
  // 正则表达式匹配 @[用户名](用户ID)
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g

  const parts: Array<{type: 'text' | 'mention'; content: string; userId?: string}> = []
  let lastIndex = 0

  // 使用matchAll代替exec循环
  const matches = Array.from(content.matchAll(mentionRegex))

  for (const match of matches) {
    // 添加@之前的普通文本
    if (match.index !== undefined && match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index)
      })
    }

    // 添加@用户名
    parts.push({
      type: 'mention',
      content: match[1], // 用户名
      userId: match[2] // 用户ID
    })

    if (match.index !== undefined) {
      lastIndex = match.index + match[0].length
    }
  }

  // 添加最后的普通文本
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex)
    })
  }

  const handleMentionClick = (userId: string, e: any) => {
    e.stopPropagation()
    Taro.navigateTo({url: `/pages/user-profile/index?userId=${userId}`})
  }

  return (
    <View className={`flex flex-row flex-wrap ${className}`}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <Text
              key={index}
              className="text-cyan-600 font-semibold"
              onClick={(e) => handleMentionClick(part.userId!, e)}>
              @{part.content}
            </Text>
          )
        } else {
          return (
            <Text key={index} className="text-foreground">
              {part.content}
            </Text>
          )
        }
      })}
    </View>
  )
}
