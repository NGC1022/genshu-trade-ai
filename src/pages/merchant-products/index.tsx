// @title 商品管理
// 商家商品管理：商品列表、上下架、销售指标与管理员 CSV 导出

import {Image, Input, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useMemo, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getSKUList, updateSKU} from '@/db/api'
import type {SKU} from '@/db/types'
import {isAdminRole, isBusinessRole} from '@/utils/roles'

const salesOf = (sku: SKU) => Number(sku.stock_sold || 0)
const monthlyOf = (sku: SKU) => Number(sku.monthly_sold ?? Math.round(salesOf(sku) * 0.35))
const money = (value: number) => `¥${value.toFixed(2)}`

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export default function MerchantProducts() {
  const {user} = useAuth()
  const [skus, setSkus] = useState<SKU[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')

  const role = (user as any)?.role
  const canView = isBusinessRole(role)
  const canExport = isAdminRole(role)

  const loadSkus = useCallback(async () => {
    setLoading(true)
    const {data, error} = await getSKUList()
    if (!error) setSkus(data)
    setLoading(false)
  }, [])

  useDidShow(() => {
    if (canView) loadSkus()
    else setLoading(false)
  })

  const visibleSkus = useMemo(() => {
    const value = keyword.trim().toLowerCase()
    return skus.filter((sku) => !value || `${sku.name} ${sku.sku_code}`.toLowerCase().includes(value))
  }, [skus, keyword])

  const summary = useMemo(
    () => ({
      total: skus.reduce((sum, sku) => sum + salesOf(sku), 0),
      monthly: skus.reduce((sum, sku) => sum + monthlyOf(sku), 0),
      revenue: skus.reduce((sum, sku) => sum + salesOf(sku) * Number(sku.price || 0), 0),
      lowStock: skus.filter((sku) => sku.stock_available <= Number(sku.stock_warning_threshold ?? 10)).length
    }),
    [skus]
  )

  const handleExport = () => {
    if (!canExport) {
      Taro.showToast({title: '仅管理员可导出销售数据', icon: 'none'})
      return
    }
    const header = ['商品名称', 'SKU', '分类', '单价', '月销量', '总销量', '销售额估算', '可用库存', '上架状态']
    const rows = skus.map((sku) => [
      sku.name,
      sku.sku_code,
      sku.category === 'premium' ? '高端' : '平价',
      sku.price,
      monthlyOf(sku),
      salesOf(sku),
      (salesOf(sku) * Number(sku.price || 0)).toFixed(2),
      sku.stock_available,
      sku.is_active ? '已上架' : '已下架'
    ])
    const csv = `\ufeff${[header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')}`
    const runtime = globalThis as any
    if (runtime.document?.createElement) {
      const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'})
      const url = runtime.URL.createObjectURL(blob)
      const anchor = runtime.document.createElement('a')
      anchor.href = url
      anchor.download = `genshu-product-sales-${new Date().toISOString().slice(0, 10)}.csv`
      anchor.click()
      runtime.URL.revokeObjectURL(url)
      Taro.showToast({title: 'CSV 已下载', icon: 'success'})
      return
    }
    Taro.setClipboardData({
      data: csv,
      success: () => Taro.showToast({title: '数据已复制，可粘贴到 Excel', icon: 'success'})
    })
  }

  const handleToggle = (sku: SKU) => {
    if (toggling) return
    Taro.showModal({
      title: sku.is_active ? '下架商品' : '上架商品',
      content: `确认${sku.is_active ? '下架' : '上架'}「${sku.name}」？`,
      success: async (res) => {
        if (!res.confirm) return
        setToggling(sku.id)
        const {error} = await updateSKU(sku.id, {is_active: !sku.is_active})
        setToggling(null)
        if (error) {
          Taro.showToast({title: '操作失败', icon: 'none'})
          return
        }
        Taro.showToast({title: sku.is_active ? '已下架' : '已上架'})
        loadSkus()
      }
    })
  }

  if (!canView)
    return (
      <View className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <View className="i-mdi-lock-outline text-5xl text-muted-foreground/40 mb-3" />
        <Text className="text-lg font-bold text-foreground mb-2">无访问权限</Text>
        <Text className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
          商品管理仅面向商家/运营人员与管理员开放。
        </Text>
        <View className="rounded-full bg-primary px-6 py-2.5" onClick={() => Taro.navigateBack()}>
          <Text className="text-base text-primary-foreground font-bold">返回</Text>
        </View>
      </View>
    )

  return (
    <View className="min-h-screen bg-background">
      <View className="mx-auto max-w-[1180px] px-4 py-5 md:px-8 md:py-8">
        <View className="flex flex-row items-start justify-between mb-4">
          <View>
            <Text className="text-xs tracking-[2px] text-primary font-black">OPERATIONS / PRODUCT</Text>
            <Text className="text-2xl text-foreground font-black block mt-1">商品销售管理</Text>
            <Text className="text-xs text-muted-foreground block mt-2">
              用订单确认后的销量观察商品表现，库存与价格仍由业务人员维护。
            </Text>
          </View>
          {canExport && (
            <View className="rounded-xl bg-primary px-3 py-2" onClick={handleExport}>
              <Text className="text-xs text-primary-foreground font-bold">导出 CSV</Text>
            </View>
          )}
        </View>

        <View className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {[
            ['总销量', summary.total, '件'],
            ['近30天销量', summary.monthly, '件'],
            ['销售额估算', money(summary.revenue), '按当前价'],
            ['低库存商品', summary.lowStock, '件']
          ].map(([label, value, note]) => (
            <View
              key={String(label)}
              className="bg-card rounded-2xl p-3 border border-border border-opacity-10 shadow-card">
              <Text className="text-xs text-muted-foreground block">{label}</Text>
              <Text className="text-xl text-foreground font-black block mt-1">{value}</Text>
              <Text className="text-[10px] text-muted-foreground">{note}</Text>
            </View>
          ))}
        </View>

        <View className="bg-card rounded-2xl p-3 border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center">
            <View className="i-mdi-magnify text-lg text-muted-foreground mr-2" />
            <Input
              value={keyword}
              onInput={(event) => setKeyword(event.detail.value)}
              placeholder="搜索商品名称或 SKU"
              className="text-sm text-foreground flex-1"
            />
            {keyword && (
              <Text className="text-xs text-primary font-bold" onClick={() => setKeyword('')}>
                清除
              </Text>
            )}
          </View>
        </View>

        {loading ? (
          <View className="py-12 items-center">
            <Text className="text-sm text-muted-foreground">加载商品中...</Text>
          </View>
        ) : visibleSkus.length === 0 ? (
          <View className="bg-muted/60 rounded-3xl p-8 items-center">
            <Text className="text-sm text-muted-foreground">暂无商品</Text>
          </View>
        ) : (
          <View className="flex flex-col gap-3 pb-8">
            {visibleSkus
              .sort((a, b) => monthlyOf(b) - monthlyOf(a))
              .map((sku) => (
                <View
                  key={sku.id}
                  className="bg-card rounded-3xl p-4 shadow-card border border-border border-opacity-10">
                  <View className="flex flex-row items-center">
                    {sku.image_url ? (
                      <Image src={sku.image_url} mode="aspectFill" className="w-16 h-16 rounded-xl mr-3" />
                    ) : (
                      <View className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mr-3">
                        <View className="i-mdi-image-outline text-xl text-muted-foreground/50" />
                      </View>
                    )}
                    <View className="flex-1">
                      <View className="flex flex-row items-center">
                        <Text className="text-base font-bold text-foreground flex-1" numberOfLines={1}>
                          {sku.name}
                        </Text>
                        <View
                          className={`rounded-full px-2 py-0.5 ml-2 ${sku.is_active ? 'bg-emerald-50 border border-emerald-200' : 'bg-muted'}`}>
                          <Text
                            className={`text-xs font-bold ${sku.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {sku.is_active ? '已上架' : '已下架'}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-muted-foreground mt-1">
                        {sku.sku_code} · {money(Number(sku.price))} · 库存 {sku.stock_available}
                      </Text>
                      <View className="flex flex-row gap-4 mt-2">
                        <Text className="text-xs text-primary font-bold">月销 {monthlyOf(sku)}</Text>
                        <Text className="text-xs text-muted-foreground">总销 {salesOf(sku)}</Text>
                        <Text className="text-xs text-muted-foreground">
                          额 {money(salesOf(sku) * Number(sku.price || 0))}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="flex flex-row items-center mt-3">
                    <View
                      className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1"
                      onClick={() => Taro.navigateTo({url: '/pages/sku-management/index'})}>
                      <Text className="text-xs text-primary font-bold">SKU资料</Text>
                    </View>
                    <View
                      className={`ml-2 rounded-lg px-3 py-1 ${toggling === sku.id ? 'bg-muted' : sku.is_active ? 'bg-red-50 border border-red-200' : 'bg-primary'}`}
                      onClick={() => handleToggle(sku)}>
                      <Text
                        className={`text-xs font-bold ${sku.is_active ? 'text-red-500' : 'text-primary-foreground'}`}>
                        {toggling === sku.id ? '处理中' : sku.is_active ? '下架' : '上架'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
          </View>
        )}
      </View>
    </View>
  )
}
