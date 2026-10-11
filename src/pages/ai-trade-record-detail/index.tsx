// AI业务记录详情：按类型展示完整输入与AI结果，支持人工确认

import {Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {getAiTradeRecordById, updateAiTradeRecord} from '@/db/api'
import type {AiTradeRecord} from '@/db/types'

export default function AiTradeRecordDetail() {
  const router = useRouter()
  const id = router.params?.id || ''
  const [record, setRecord] = useState<AiTradeRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const loadRecord = useCallback(async () => {
    if (!id) return
    const {data} = await getAiTradeRecordById(id)
    setRecord(data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  const handleConfirm = () => {
    if (!record) return
    Taro.showModal({
      title: '人工确认',
      content: '确认已核对本记录内容，可作为正式业务信息使用？',
      success: async (res) => {
        if (!res.confirm) return
        const {error} = await updateAiTradeRecord(record.id, {status: 'confirmed'})
        if (error) {
          Taro.showToast({title: '确认失败，请重试', icon: 'none'})
          return
        }
        Taro.showToast({title: '已人工确认'})
        loadRecord()
      }
    })
  }

  const Field = ({label, value}: {label: string; value: string}) => (
    <View className="flex flex-col mb-3">
      <Text className="text-sm text-muted-foreground mb-1">{label}</Text>
      <Text
        className="text-base text-foreground leading-relaxed"
        style={value.length > 60 ? {whiteSpace: 'pre-wrap'} : undefined}>
        {value}
      </Text>
    </View>
  )

  const Card = ({title, children}: {title: string; children: React.ReactNode}) => (
    <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
      <Text className="text-lg font-bold text-foreground mb-4">{title}</Text>
      {children}
    </View>
  )

  const safe = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '待确认'
    if (typeof v === 'string') return v
    if (typeof v === 'number') return String(v)
    if (Array.isArray(v)) {
      const list = v.filter((i) => typeof i === 'string')
      return list.length > 0 ? list.join('\n') : JSON.stringify(v)
    }
    return JSON.stringify(v)
  }

  if (loading) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-base text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  if (!record) {
    return (
      <View className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <View className="i-mdi-file-question-outline text-5xl text-muted-foreground/40 mb-3" />
        <Text className="text-base text-muted-foreground mb-4">记录不存在或无权访问</Text>
        <View className="rounded-full bg-primary px-6 py-2.5" onClick={() => Taro.navigateBack()}>
          <Text className="text-base text-primary-foreground font-bold">返回</Text>
        </View>
      </View>
    )
  }

  const typeName = {
    product_translate: 'AI商品国际化',
    market_analysis: 'AI海外市场分析',
    inquiry: 'AI跨境询盘',
    quote: 'AI智能报价',
    trade_compliance: 'AI贸易合规检查',
    trade_document: 'AI贸易单证',
    marketing_content: 'AI营销素材',
    customer_intent: 'AI客户意向识别',
    export_plan: '一键出海方案',
    support_chat: 'AI跨境客服'
  }[record.type]

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 基本信息 */}
      <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-foreground">{typeName}</Text>
          <View className="flex flex-row items-center gap-2">
            {record.is_demo ? (
              <View className="bg-amber-100 rounded-full px-2 py-0.5">
                <Text className="text-xs text-amber-700 font-bold">课堂演示数据</Text>
              </View>
            ) : null}
            <View
              className={`rounded-full px-2.5 py-0.5 ${record.status === 'confirmed' ? 'bg-green-100' : 'bg-muted'}`}>
              <Text
                className={`text-xs font-bold ${record.status === 'confirmed' ? 'text-green-700' : 'text-muted-foreground'}`}>
                {record.status === 'confirmed' ? '已人工确认' : '待人工确认'}
              </Text>
            </View>
          </View>
        </View>
        <Field label="关联商品" value={safe(record.product_name)} />
        <Field label="目标市场" value={safe(record.market)} />
        <Field label="创建时间" value={safe(record.created_at).replace('T', ' ').slice(0, 19)} />
        <Field label="更新时间" value={safe(record.updated_at).replace('T', ' ').slice(0, 19)} />
      </View>

      {/* 输入数据 */}
      <Card title="输入数据">
        {Object.entries(record.input_data || {}).map(([k, v], i) => (
          <Field key={i} label={k} value={safe(v)} />
        ))}
      </Card>

      {/* AI结果 */}
      <Card title="AI结果">
        {Object.entries(record.ai_result || {}).map(([k, v], i) => (
          <Field key={i} label={k} value={safe(v)} />
        ))}
      </Card>

      {/* 人工确认 */}
      {record.status !== 'confirmed' ? (
        <View
          className="rounded-full bg-primary flex items-center justify-center py-4 mb-8 shadow-elegant active:scale-[0.98] transition-all"
          onClick={handleConfirm}>
          <Text className="text-lg text-primary-foreground font-black">人工确认</Text>
        </View>
      ) : (
        <View className="rounded-full bg-green-50 border border-green-200 flex flex-row items-center justify-center py-4 mb-8">
          <View className="i-mdi-check-circle text-green-600 text-lg mr-2" />
          <Text className="text-base text-green-700 font-bold">该记录已人工确认</Text>
        </View>
      )}

      <View className="bg-muted/60 rounded-3xl p-5 mb-8">
        <Text className="text-xs text-muted-foreground leading-relaxed">
          所有AI生成内容均须人工确认后方可作为正式业务信息使用；AI不虚构认证、销量、排名、物流、评价等事实。
        </Text>
      </View>
    </View>
  )
}
