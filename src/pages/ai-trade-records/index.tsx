// AI业务记录：全部AI贸易业务记录列表（搜索/类型筛选/Excel导出/彩色类型标签）

import {Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useMemo, useState} from 'react'
import {supabase} from '@/client/supabase'
import {useAuth} from '@/contexts/AuthContext'
import {getAiTradeRecords} from '@/db/api'
import type {AiTradeRecord, AiTradeRecordType} from '@/db/types'

const TYPE_META: Record<AiTradeRecordType, {label: string; icon: string; color: string; tagBg: string}> = {
  product_translate: {label: '商品国际化', icon: 'i-mdi-earth', color: 'text-primary', tagBg: 'bg-primary/10'},
  market_analysis: {
    label: '市场分析',
    icon: 'i-mdi-chart-areaspline',
    color: 'text-secondary',
    tagBg: 'bg-secondary/10'
  },
  inquiry: {label: '跨境询盘', icon: 'i-mdi-email-search-outline', color: 'text-accent', tagBg: 'bg-accent/10'},
  quote: {label: '智能报价', icon: 'i-mdi-cash-multiple', color: 'text-chart-4', tagBg: 'bg-chart-4/10'},
  trade_compliance: {
    label: '贸易合规',
    icon: 'i-mdi-shield-check-outline',
    color: 'text-primary',
    tagBg: 'bg-primary/10'
  },
  trade_document: {
    label: '贸易单证',
    icon: 'i-mdi-file-document-outline',
    color: 'text-secondary',
    tagBg: 'bg-secondary/10'
  },
  marketing_content: {
    label: '营销素材',
    icon: 'i-mdi-bullhorn-outline',
    color: 'text-accent',
    tagBg: 'bg-accent/10'
  },
  customer_intent: {
    label: '意向识别',
    icon: 'i-mdi-account-search-outline',
    color: 'text-chart-4',
    tagBg: 'bg-chart-4/10'
  },
  export_plan: {label: '出海方案', icon: 'i-mdi-rocket-launch-outline', color: 'text-primary', tagBg: 'bg-primary/10'},
  support_chat: {label: 'AI客服', icon: 'i-mdi-robot-outline', color: 'text-secondary', tagBg: 'bg-secondary/10'}
}

const FILTERS: Array<{key: string; label: string}> = [
  {key: '', label: '全部'},
  {key: 'product_translate', label: '商品国际化'},
  {key: 'market_analysis', label: '市场分析'},
  {key: 'inquiry', label: '询盘'},
  {key: 'quote', label: '报价'},
  {key: 'trade_compliance', label: '合规'},
  {key: 'trade_document', label: '单证'},
  {key: 'marketing_content', label: '营销'},
  {key: 'customer_intent', label: '意向'},
  {key: 'export_plan', label: '出海方案'},
  {key: 'support_chat', label: '客服'}
]

export default function AiTradeRecords() {
  const {user} = useAuth()
  const [records, setRecords] = useState<AiTradeRecord[]>([])
  const [filter, setFilter] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const loadRecords = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const {data} = await getAiTradeRecords(user.id, filter || undefined)
    setRecords(data)
    setLoading(false)
  }, [user, filter])

  useDidShow(() => loadRecords())

  const handleFilter = (key: string) => {
    setFilter(key)
    setTimeout(loadRecords, 0)
  }

  // 搜索过滤（商品名/目标市场/业务类型，前端匹配）
  const displayRecords = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return records
    return records.filter((r) => {
      const name = (r.product_name || '').toLowerCase()
      const market = (r.market || '').toLowerCase()
      const typeLabel = TYPE_META[r.type]?.label || ''
      return name.includes(kw) || market.includes(kw) || typeLabel.includes(kw)
    })
  }, [records, keyword])

  const handleDetail = (id: string) => {
    Taro.navigateTo({url: `/pages/ai-trade-record-detail/index?id=${id}`})
  }

  // 导出Excel：Edge Function生成xlsx → 小程序预览/下载，H5新窗口打开
  const handleExport = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录后导出', icon: 'none'})
      return
    }
    if (exporting) return
    setExporting(true)
    try {
      const {data, error} = await supabase.functions.invoke('export-ai-trade-records', {body: {}})
      if (error) {
        const errText = await error?.context?.text?.().catch(() => '')
        throw new Error(errText ? JSON.parse(errText)?.error || errText : error.message)
      }
      if (!data?.success || !data?.url) throw new Error(data?.error || '导出失败，请重试')
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        Taro.showLoading({title: '正在下载...'})
        const res = await Taro.downloadFile({url: data.url})
        Taro.hideLoading()
        if (res.statusCode !== 200) throw new Error('文件下载失败，请重试')
        await Taro.openDocument({filePath: res.tempFilePath, fileType: 'xlsx', showMenu: true})
        Taro.showToast({title: `已导出${data.row_count}条`})
      } else {
        window.open(data.url, '_blank')
        Taro.showToast({title: `已导出${data.row_count}条`, icon: 'none'})
      }
    } catch (e) {
      Taro.hideLoading()
      const msg = e instanceof Error ? e.message : '导出失败，请重试'
      Taro.showToast({title: msg.slice(0, 30), icon: 'none'})
    } finally {
      setExporting(false)
    }
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 搜索框 + 导出按钮 */}
      <View className="flex flex-row items-center gap-3 mb-3">
        <View className="flex-1 bg-card rounded-full border-2 border-border border-opacity-20 px-4 py-2.5 flex flex-row items-center overflow-hidden">
          <View className="i-mdi-magnify text-xl text-muted-foreground mr-2 flex-shrink-0" />
          <input
            className="flex-1 min-w-0 text-base text-foreground bg-transparent outline-none"
            placeholder="搜索商品 / 市场 / 业务类型"
            value={keyword}
            onInput={(e) => {
              const ev = e as any
              setKeyword(ev.detail?.value ?? ev.target?.value ?? '')
            }}
          />
          {keyword ? (
            <View
              className="i-mdi-close-circle text-xl text-muted-foreground ml-2 flex-shrink-0"
              onClick={() => setKeyword('')}
            />
          ) : null}
        </View>
        <View
          className={`rounded-full px-4 py-3 flex flex-row items-center active:scale-95 transition-all ${
            exporting ? 'bg-secondary/50' : 'bg-secondary'
          }`}
          onClick={handleExport}>
          <View className="i-mdi-file-excel-outline text-xl text-secondary-foreground mr-1" />
          <Text className="text-sm text-secondary-foreground font-bold">{exporting ? '导出中' : '导出Excel'}</Text>
        </View>
      </View>

      {/* 业务类型筛选器 */}
      <View className="flex flex-row flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => (
          <View
            key={f.key}
            className={`rounded-full border-2 px-3.5 py-1.5 active:scale-95 transition-all ${
              filter === f.key ? 'border-selected-bg bg-selected-bg' : 'border-border border-opacity-30 bg-card'
            }`}
            onClick={() => handleFilter(f.key)}>
            <Text className={`text-sm font-bold ${filter === f.key ? 'text-primary' : 'text-foreground'}`}>
              {f.label}
            </Text>
          </View>
        ))}
      </View>

      {/* 记录列表 */}
      {loading ? (
        <View className="bg-card rounded-3xl p-8 shadow-card border border-border border-opacity-10 flex items-center justify-center">
          <Text className="text-base text-muted-foreground">加载中...</Text>
        </View>
      ) : records.length === 0 ? (
        <View className="bg-card rounded-3xl p-8 shadow-card border border-border border-opacity-10 flex flex-col items-center">
          <View className="i-mdi-file-document-outline text-5xl text-muted-foreground/40 mb-3" />
          <Text className="text-base text-muted-foreground">
            {user ? '暂无业务记录，请先体验AI跨境贸易助手' : '请先登录后查看业务记录'}
          </Text>
          {user ? (
            <View
              className="rounded-full bg-primary px-6 py-2.5 mt-4 active:scale-95 transition-all"
              onClick={() => Taro.navigateTo({url: '/pages/ai-trade/index'})}>
              <Text className="text-base text-primary-foreground font-bold">前往AI跨境贸易助手</Text>
            </View>
          ) : null}
        </View>
      ) : displayRecords.length === 0 ? (
        <View className="bg-card rounded-3xl p-8 shadow-card border border-border border-opacity-10 flex flex-col items-center">
          <View className="i-mdi-text-search text-5xl text-muted-foreground/40 mb-3" />
          <Text className="text-base text-muted-foreground">没有匹配「{keyword.trim()}」的记录</Text>
          <View
            className="rounded-full bg-muted px-5 py-2 mt-4 active:scale-95 transition-all"
            onClick={() => setKeyword('')}>
            <Text className="text-sm text-foreground font-bold">清除搜索</Text>
          </View>
        </View>
      ) : (
        <View className="flex flex-col">
          {displayRecords.map((r) => {
            const meta = TYPE_META[r.type]
            return (
              <View
                key={r.id}
                className="bg-card rounded-[28px] p-6 mb-4 shadow-[0_10px_28px_-12px_rgba(120,53,15,0.18)] border border-border border-opacity-20 active:scale-[0.98] transition-all"
                onClick={() => handleDetail(r.id)}>
                {/* 业务类型彩色标签 */}
                <View className={`flex flex-row items-center self-start rounded-full px-3 py-1 mb-3 ${meta.tagBg}`}>
                  <View className={`${meta.icon} ${meta.color} text-base mr-1.5`} />
                  <Text className={`text-xs font-bold ${meta.color}`}>{meta.label}</Text>
                </View>
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text className="text-lg text-foreground font-bold flex-1 min-w-0 truncate">
                    {r.product_name || '未关联商品'}
                  </Text>
                  <View className="flex flex-row items-center gap-2 ml-2 flex-shrink-0">
                    {r.is_demo ? (
                      <View className="bg-amber-100 rounded-full px-2 py-0.5">
                        <Text className="text-xs text-amber-700 font-bold">演示</Text>
                      </View>
                    ) : null}
                    <View
                      className={`rounded-full px-2.5 py-0.5 ${r.status === 'confirmed' ? 'bg-green-100' : 'bg-muted'}`}>
                      <Text
                        className={`text-xs font-bold ${r.status === 'confirmed' ? 'text-green-700' : 'text-muted-foreground'}`}>
                        {r.status === 'confirmed' ? '已确认' : '待确认'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="flex flex-row items-center justify-between pt-2 border-t border-border border-opacity-10">
                  <Text className="text-sm text-muted-foreground flex-1 truncate">
                    {r.market ? `目标市场：${r.market}` : '无市场信息'}
                  </Text>
                  <Text className="text-xs text-muted-foreground ml-2 flex-shrink-0">{formatTime(r.created_at)}</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return '时间待确认'
  }
}
