import {Text, View} from '@tarojs/components'

interface DemoBadgeProps {
  text?: string
  className?: string
}

export default function DemoBadge({text = '演示数据，仅用于课堂展示', className = ''}: DemoBadgeProps) {
  return (
    <View className={`inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 ${className}`}>
      <View className="i-mdi-information-outline text-xs text-amber-600 mr-1" />
      <Text className="text-xs text-amber-700">{text}</Text>
    </View>
  )
}
