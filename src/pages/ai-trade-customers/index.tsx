// @title 海外客户CRM
// 海外客户CRM：AI询盘自动沉淀客户记录，状态机7态流转，敏感信息脱敏展示
// 客户资料仅业务角色可见（服务端RLS + 前端权限提示双重控制）

import {Picker, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getOverseasCustomers} from '@/db/api'
import type {CustomerStatus, OverseasCustomer} from '@/db/types'
import {CUSTOMER_KIND_LABELS, CUSTOMER_STATUS_LABELS} from '@/db/types'
import {maskContact} from '@/utils/masking'
import {isBusinessRole} from '@/utils/roles'

const STATUS_FILTERS: Array<{key: string; label: string}> = [
  {key: '', label: '全部状态'},
  {key: 'new_inquiry', label: '新询盘'},
  {key: 'contacted', label: '已联系'},
  {key: 'quoted', label: '已报价'},
  {key: 'sample_confirmed', label: '样品确认'},
  {key: 'ordered', label: '已下单'},
  {key: 'deal_closed', label: '已成交'},
  {key: 'completed', label: '已完成'}
]

export default function AiTradeCustomers() {
  const {user} = useAuth()
  const [customers, setCustomers] = useState<OverseasCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [keyword, setKeyword] = useState('')

  const canView = isBusinessRole((user as any)?.role)

  const loadCustomers = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    const {data, error} = await getOverseasCustomers(user.id, statusFilter || undefined)
    if (!error) setCustomers(data)
    setLoading(false)
  }, [user, statusFilter])

  useDidShow(() => {
    if (canView) loadCustomers()
    else setLoading(false)
  })

  const filtered = customers.filter(
    (c) => !keyword || c.name.toLowerCase().includes(keyword.toLowerCase()) || (c.country || '').includes(keyword)
  )

  if (!canView) {
    return (
      <View className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <View className="i-mdi-lock-outline text-5xl text-muted-foreground/40 mb-3" />
        <Text className="text-lg font-bold text-foreground mb-2">无访问权限</Text>
        <Text className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
          海外客户CRM仅面向商家/运营人员、审核人员与管理员开放。{'\n'}普通消费者账号无法查看客户业务数据。
        </Text>
        <View className="rounded-full bg-primary px-6 py-2.5" onClick={() => Taro.navigateBack()}>
          <Text className="text-base text-primary-foreground font-bold">返回</Text>
        </View>
      </View>
    )
  }

  const statusColor = (s: CustomerStatus) => {
    const map: Record<CustomerStatus, string> = {
      new_inquiry: 'bg-accent/10 text-accent',
      contacted: 'bg-chart-4/10 text-chart-4',
      quoted: 'bg-secondary/10 text-secondary',
      sample_confirmed: 'bg-primary/10 text-primary',
      ordered: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
      deal_closed: 'bg-primary text-primary-foreground',
      completed: 'bg-muted text-muted-foreground'
    }
    return map[s] || 'bg-muted text-muted-foreground'
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 筛选区 */}
      <View className="bg-card rounded-3xl p-4 shadow-card border border-border border-opacity-10 mb-4">
        <View className="bg-muted rounded-xl px-3 py-2.5 mb-3">
          <input
            className="w-full text-base text-foreground"
            value={keyword}
            placeholder="搜索客户名称或国家"
            onInput={(e) => setKeyword(((e as any).detail?.value ?? (e as any).target?.value ?? '') as string)}
          />
        </View>
        <Picker
          mode="selector"
          range={STATUS_FILTERS.map((s) => s.label)}
          value={Math.max(
            0,
            STATUS_FILTERS.findIndex((s) => s.key === statusFilter)
          )}
          onChange={(e) => setStatusFilter(STATUS_FILTERS[Number(e.detail.value)].key)}>
          <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
            <Text className="text-base text-foreground">
              {STATUS_FILTERS.find((s) => s.key === statusFilter)?.label || '全部状态'}
            </Text>
            <View className="i-mdi-chevron-down text-muted-foreground" />
          </View>
        </Picker>
      </View>

      {/* 客户列表 */}
      {loading ? (
        <View className="py-16 items-center">
          <Text className="text-sm text-muted-foreground">加载客户数据中...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View className="bg-muted/60 rounded-3xl p-8 items-center mb-8">
          <View className="i-mdi-account-group-outline text-4xl text-muted-foreground/40 mb-2" />
          <Text className="text-base text-muted-foreground text-center leading-relaxed">
            暂无客户记录{'\n'}在AI询盘页点击"加入客户档案"，询盘将自动沉淀为客户记录
          </Text>
        </View>
      ) : (
        <View className="flex flex-col gap-3 mb-8">
          {filtered.map((c) => (
            <View
              key={c.id}
              className="bg-card rounded-3xl p-4 shadow-card border border-border border-opacity-10"
              onClick={() => Taro.navigateTo({url: `/pages/ai-trade-customer-detail/index?id=${c.id}`})}>
              <View className="flex flex-row items-center justify-between mb-2">
                <View className="flex flex-row items-center flex-1 mr-2">
                  <Text className="text-lg font-bold text-foreground flex-shrink-0">{c.name}</Text>
                  {c.is_demo && (
                    <View className="ml-2 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      <Text className="text-xs text-amber-700">课堂演示数据</Text>
                    </View>
                  )}
                </View>
                <View className={`rounded-full px-2.5 py-1 ${statusColor(c.status)}`}>
                  <Text className="text-xs font-bold">{CUSTOMER_STATUS_LABELS[c.status]}</Text>
                </View>
              </View>
              <View className="flex flex-row items-center flex-wrap gap-2 mb-2">
                <View className="bg-muted rounded-full px-2 py-0.5">
                  <Text className="text-xs text-muted-foreground">{c.country || '国家待确认'}</Text>
                </View>
                <View className="bg-muted rounded-full px-2 py-0.5">
                  <Text className="text-xs text-muted-foreground">{CUSTOMER_KIND_LABELS[c.customer_type]}</Text>
                </View>
                {c.tags.slice(0, 2).map((tag, i) => (
                  <View key={i} className="bg-primary/10 rounded-full px-2 py-0.5">
                    <Text className="text-xs text-primary">{tag}</Text>
                  </View>
                ))}
              </View>
              <View className="flex flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">联系方式（脱敏）：{maskContact(c.contact || '')}</Text>
                <View className="i-mdi-chevron-right text-muted-foreground text-lg" />
              </View>
            </View>
          ))}
        </View>
      )}

      <View className="bg-muted/60 rounded-2xl p-4 mb-8">
        <View className="flex flex-row items-center mb-1.5">
          <View className="i-mdi-shield-account-outline text-muted-foreground text-lg mr-2" />
          <Text className="text-sm font-bold text-muted-foreground">隐私与权限说明</Text>
        </View>
        <Text className="text-xs text-muted-foreground leading-relaxed">
          客户联系方式等信息已脱敏展示，完整信息需相应业务权限；客户数据按角色访问控制（服务端RLS策略）。
        </Text>
      </View>
    </View>
  )
}
