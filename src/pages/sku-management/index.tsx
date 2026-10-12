// @title SKU库存管理
// SKU与库存管理：SKU国际化字段维护 + 库存预警 + 商品国际化完整度检查
// 事实数据（库存/价格/重量等）只能人工修改，AI不修改库存数据

import {Picker, Text, Textarea, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getSKUList, updateSKU} from '@/db/api'
import type {SKU} from '@/db/types'
import {isBusinessRole} from '@/utils/roles'

// 国际化资料完整度检查项（读取SKU字段判断）
const INTL_FIELDS: Array<{key: string; label: string; getValue: (s: SKU) => string}> = [
  {key: 'name_en', label: '英文标题', getValue: (s) => s.name_en || ''},
  {key: 'description_en', label: '英文描述', getValue: (s) => s.description_en || ''},
  {key: 'material', label: '材质', getValue: (s) => s.material || ''},
  {key: 'sellable_countries', label: '可销售国家', getValue: (s) => (s.sellable_countries || []).join('、')},
  {key: 'dimensions', label: '尺寸', getValue: (s) => s.dimensions || ''},
  {key: 'weight_grams', label: '重量', getValue: (s) => (s.weight_grams ? `${s.weight_grams}g` : '')},
  {key: 'packaging', label: '包装方式', getValue: (s) => s.packaging || ''},
  {key: 'origin', label: '原产地', getValue: (s) => s.origin || ''},
  {key: 'lead_time', label: '交货周期', getValue: (s) => (s.lead_time ? `${s.lead_time}天` : '')},
  {key: 'after_sales_policy', label: '售后政策', getValue: (s) => s.after_sales_policy || ''}
]

export default function SkuManagement() {
  const {user} = useAuth()
  const [skus, setSkus] = useState<SKU[]>([])
  const [loading, setLoading] = useState(true)
  const [filterIdx, setFilterIdx] = useState(0)
  const [editing, setEditing] = useState<SKU | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const canView = isBusinessRole((user as any)?.role)

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

  // 完整度计算（程序确定性计算）
  const getCompleteness = (s: SKU) => {
    const filled = INTL_FIELDS.filter((f) => f.getValue(s)).length
    return Math.round((filled / INTL_FIELDS.length) * 100)
  }

  // 筛选：0全部 1库存预警 2完整度不足50%
  const filtered = skus.filter((s) => {
    if (filterIdx === 1) return (s.stock_available || 0) <= (s.stock_warning_threshold ?? 20)
    if (filterIdx === 2) return getCompleteness(s) < 50
    return true
  })

  const handleEdit = (s: SKU) => {
    setEditing(s)
    setEditValues({
      name_en: s.name_en || '',
      description_en: s.description_en || '',
      material: s.material || '',
      dimensions: s.dimensions || '',
      weight_grams: s.weight_grams ? String(s.weight_grams) : '',
      packaging: s.packaging || '',
      origin: s.origin || '',
      lead_time: s.lead_time ? String(s.lead_time) : '',
      after_sales_policy: s.after_sales_policy || '',
      stock_available: String(s.stock_available || 0)
    })
  }

  const handleSave = async () => {
    if (!editing || saving) return
    setSaving(true)
    Taro.showLoading({title: '保存中...'})
    const {error} = await updateSKU(editing.id, {
      name_en: editValues.name_en || null,
      description_en: editValues.description_en || null,
      material: editValues.material || null,
      sellable_countries: editValues.sellable_countries
        ? editValues.sellable_countries.split(/[,，、\s]+/).filter(Boolean)
        : null,
      dimensions: editValues.dimensions || null,
      weight_grams: editValues.weight_grams ? Number(editValues.weight_grams) : null,
      packaging: editValues.packaging || null,
      origin: editValues.origin || null,
      lead_time: editValues.lead_time || null,
      after_sales_policy: editValues.after_sales_policy || null,
      stock_available: Number(editValues.stock_available || 0)
    })
    Taro.hideLoading()
    setSaving(false)
    if (error) {
      Taro.showToast({title: '保存失败', icon: 'none'})
      return
    }
    Taro.showToast({title: 'SKU资料已更新'})
    setEditing(null)
    loadSkus()
  }

  if (!canView) {
    return (
      <View className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <View className="i-mdi-lock-outline text-5xl text-muted-foreground/40 mb-3" />
        <Text className="text-lg font-bold text-foreground mb-2">无访问权限</Text>
        <Text className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
          SKU库存管理仅面向商家/运营人员、审核人员与管理员开放。
        </Text>
        <View className="rounded-full bg-primary px-6 py-2.5" onClick={() => Taro.navigateBack()}>
          <Text className="text-base text-primary-foreground font-bold">返回</Text>
        </View>
      </View>
    )
  }

  const Field = ({
    label,
    fieldKey,
    placeholder,
    textarea
  }: {
    label: string
    fieldKey: string
    placeholder: string
    textarea?: boolean
  }) => (
    <View>
      <Text className="text-sm text-muted-foreground mb-1.5 block">{label}</Text>
      <View className="bg-muted rounded-xl px-3 py-2.5">
        {textarea ? (
          <Textarea
            className="w-full text-base text-foreground"
            value={editValues[fieldKey] || ''}
            maxlength={500}
            placeholder={placeholder}
            onInput={(e) =>
              setEditValues({
                ...editValues,
                [fieldKey]: ((e as any).detail?.value ?? (e as any).target?.value ?? '') as string
              })
            }
            style={{height: '100rpx'}}
          />
        ) : (
          <input
            className="w-full text-base text-foreground"
            value={editValues[fieldKey] || ''}
            placeholder={placeholder}
            onInput={(e) =>
              setEditValues({
                ...editValues,
                [fieldKey]: ((e as any).detail?.value ?? (e as any).target?.value ?? '') as string
              })
            }
          />
        )}
      </View>
    </View>
  )

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 筛选 */}
      <View className="bg-card rounded-3xl p-4 shadow-card border border-border border-opacity-10 mb-4">
        <Picker
          mode="selector"
          range={['全部SKU', '库存预警', '国际化完整度不足50%']}
          value={filterIdx}
          onChange={(e) => setFilterIdx(Number(e.detail.value))}>
          <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
            <Text className="text-base text-foreground">
              {['全部SKU', '库存预警', '国际化完整度不足50%'][filterIdx]}（{filtered.length}）
            </Text>
            <View className="i-mdi-chevron-down text-muted-foreground" />
          </View>
        </Picker>
      </View>

      {/* SKU列表 */}
      {loading ? (
        <View className="py-12 items-center">
          <Text className="text-sm text-muted-foreground">加载SKU数据中...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View className="bg-muted/60 rounded-3xl p-8 items-center mb-8">
          <View className="i-mdi-package-variant-closed text-4xl text-muted-foreground/40 mb-2" />
          <Text className="text-sm text-muted-foreground">当前筛选条件下暂无SKU</Text>
        </View>
      ) : (
        <View className="flex flex-col gap-3 mb-8">
          {filtered.map((s) => {
            const completeness = getCompleteness(s)
            const stockLow = (s.stock_available || 0) <= (s.stock_warning_threshold ?? 20)
            return (
              <View key={s.id} className="bg-card rounded-3xl p-4 shadow-card border border-border border-opacity-10">
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text className="text-base font-bold text-foreground flex-1">{s.name}</Text>
                  {stockLow ? (
                    <View className="bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                      <Text className="text-xs font-bold text-red-500">库存预警</Text>
                    </View>
                  ) : (
                    <View className="bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                      <Text className="text-xs font-bold text-emerald-600">库存正常</Text>
                    </View>
                  )}
                </View>

                <View className="flex flex-row flex-wrap gap-2 mb-3">
                  <View className="bg-muted rounded-full px-2 py-0.5">
                    <Text className="text-xs text-muted-foreground">库存 {s.stock_available}</Text>
                  </View>
                  <View className="bg-muted rounded-full px-2 py-0.5">
                    <Text className="text-xs text-muted-foreground">预警阈值 {s.stock_warning_threshold ?? 20}</Text>
                  </View>
                  <View className="bg-muted rounded-full px-2 py-0.5">
                    <Text className="text-xs text-muted-foreground">¥{s.price}</Text>
                  </View>
                </View>

                {/* 完整度 */}
                <View className="mb-3">
                  <View className="flex flex-row items-center justify-between mb-1">
                    <Text className="text-xs text-muted-foreground">国际化资料完整度</Text>
                    <Text
                      className={`text-sm font-bold ${completeness >= 80 ? 'text-emerald-600' : completeness >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                      {completeness}%
                    </Text>
                  </View>
                  <View className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <View
                      className={`h-full rounded-full ${completeness >= 80 ? 'bg-emerald-500' : completeness >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                      style={{width: `${completeness}%`}}
                    />
                  </View>
                  <View className="flex flex-row flex-wrap gap-1.5 mt-2">
                    {INTL_FIELDS.filter((f) => !f.getValue(s)).map((f) => (
                      <View key={f.key} className="bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                        <Text className="text-xs text-amber-700">缺{f.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View
                  className="bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center"
                  onClick={() => handleEdit(s)}>
                  <Text className="text-sm text-primary font-bold py-2.5">编辑SKU资料</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* 编辑弹层 */}
      {editing && (
        <View className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setEditing(null)}>
          <View
            className="bg-background rounded-t-3xl p-5 w-full"
            onClick={(e) => e.stopPropagation()}
            style={{maxHeight: '85vh'}}>
            <View className="flex flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-foreground">编辑SKU资料</Text>
              <View className="i-mdi-close text-muted-foreground text-xl" onClick={() => setEditing(null)} />
            </View>
            <Text className="text-xs text-muted-foreground mb-3">
              {editing.name} · {editing.sku_code}（真实数据须人工录入，AI不修改事实数据）
            </Text>

            <View className="flex flex-col gap-3">
              <Field label="库存数量" fieldKey="stock_available" placeholder="库存数量（人工确认）" />
              <Field label="英文标题" fieldKey="name_en" placeholder="English title" />
              <Field label="英文描述" fieldKey="description_en" placeholder="English description" textarea />
              <View className="flex flex-row gap-3">
                <View className="flex-1">
                  <Field label="材质（中文）" fieldKey="material" placeholder="如：木质" />
                </View>
                <View className="flex-1">
                  <Field label="可销售国家" fieldKey="sellable_countries" placeholder="如：中国、美国" />
                </View>
              </View>
              <View className="flex flex-row gap-3">
                <View className="flex-1">
                  <Field label="尺寸" fieldKey="dimensions" placeholder="如：15×4cm" />
                </View>
                <View className="flex-1">
                  <Field label="重量（克）" fieldKey="weight_grams" placeholder="如：35" />
                </View>
              </View>
              <View className="flex flex-row gap-3">
                <View className="flex-1">
                  <Field label="包装方式" fieldKey="packaging" placeholder="如：纸盒装" />
                </View>
                <View className="flex-1">
                  <Field label="原产地" fieldKey="origin" placeholder="如：中国" />
                </View>
              </View>
              <Field label="交货周期（天）" fieldKey="lead_time" placeholder="如：15" />
              <Field label="售后政策" fieldKey="after_sales_policy" placeholder="售后政策说明" textarea />
            </View>

            <View className="flex flex-row gap-3 mt-4 mb-8">
              <View className="flex-1 bg-card border border-border rounded-xl" onClick={() => setEditing(null)}>
                <Text className="text-base text-foreground font-bold text-center py-3">取消</Text>
              </View>
              <View
                className={`flex-1 rounded-xl flex items-center justify-center ${saving ? 'bg-primary/50' : 'bg-primary'}`}
                onClick={handleSave}>
                <Text className="text-base text-primary-foreground font-bold text-center py-3">
                  {saving ? '保存中...' : '保存'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
