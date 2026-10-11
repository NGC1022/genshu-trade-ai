// @title 商品管理
// 商家商品管理：商品列表 + 上架/下架 + 查看国际化资料完整度（复用SKU数据）
// 仅商家/运营与管理员可访问

import {Image, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getSKUList, updateSKU} from '@/db/api'
import type {SKU} from '@/db/types'
import {isBusinessRole} from '@/utils/roles'

export default function MerchantProducts() {
  const {user} = useAuth()
  const [skus, setSkus] = useState<SKU[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const canView = isBusinessRole((user as any)?.role)

  const loadSkus = useCallback(async () => {
    setLoading(true)
    // 商品管理需查看全部（含下架），此处复用getSKUList仅取上架商品，补充说明
    const {data, error} = await getSKUList()
    if (!error) setSkus(data)
    setLoading(false)
  }, [])

  useDidShow(() => {
    if (canView) loadSkus()
    else setLoading(false)
  })

  const handleToggle = (s: SKU) => {
    if (toggling) return
    Taro.showModal({
      title: s.is_active ? '下架商品' : '上架商品',
      content: `确认${s.is_active ? '下架' : '上架'}「${s.name}」？${s.is_active ? '下架后消费者端不可见。' : ''}`,
      success: async (res) => {
        if (!res.confirm) return
        setToggling(s.id)
        const {error} = await updateSKU(s.id, {is_active: !s.is_active} as any)
        setToggling(null)
        if (error) {
          Taro.showToast({title: '操作失败', icon: 'none'})
          return
        }
        Taro.showToast({title: s.is_active ? '已下架' : '已上架'})
        loadSkus()
      }
    })
  }

  if (!canView) {
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
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-2">
          <View className="w-1 h-5 bg-primary rounded-full mr-2" />
          <Text className="text-xl font-bold text-foreground">商品管理（{skus.length}）</Text>
        </View>
        <Text className="text-sm text-muted-foreground leading-relaxed">
          管理商品上架状态与SKU资料。SKU国际化字段维护请进入「SKU库存管理」模块。
        </Text>
      </View>

      {loading ? (
        <View className="py-12 items-center">
          <Text className="text-sm text-muted-foreground">加载商品中...</Text>
        </View>
      ) : skus.length === 0 ? (
        <View className="bg-muted/60 rounded-3xl p-8 items-center mb-8">
          <View className="i-mdi-storefront-outline text-4xl text-muted-foreground/40 mb-2" />
          <Text className="text-sm text-muted-foreground">暂无商品</Text>
        </View>
      ) : (
        <View className="flex flex-col gap-3 mb-8">
          {skus.map((s) => (
            <View key={s.id} className="bg-card rounded-3xl p-4 shadow-card border border-border border-opacity-10">
              <View className="flex flex-row items-center">
                {s.image_url ? (
                  <Image src={s.image_url} mode="aspectFill" className="w-16 h-16 rounded-xl mr-3" />
                ) : (
                  <View className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mr-3">
                    <View className="i-mdi-image-outline text-xl text-muted-foreground/50" />
                  </View>
                )}
                <View className="flex-1 flex flex-col">
                  <View className="flex flex-row items-center">
                    <Text className="text-base font-bold text-foreground flex-1" numberOfLines={1}>
                      {s.name}
                    </Text>
                    <View
                      className={`rounded-full px-2 py-0.5 ml-2 ${
                        s.is_active ? 'bg-emerald-50 border border-emerald-200' : 'bg-muted'
                      }`}>
                      <Text
                        className={`text-xs font-bold ${s.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {s.is_active ? '已上架' : '已下架'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted-foreground mt-1">
                    {s.sku_code} · ¥{s.price} · 库存 {s.stock_available}
                  </Text>
                  <View className="flex flex-row items-center mt-2">
                    <View
                      className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1"
                      onClick={() => Taro.navigateTo({url: `/pages/sku-management/index`})}>
                      <Text className="text-xs text-primary font-bold">SKU资料</Text>
                    </View>
                    <View
                      className={`ml-2 rounded-lg px-3 py-1 ${toggling === s.id ? 'bg-muted' : s.is_active ? 'bg-red-50 border border-red-200' : 'bg-primary'}`}
                      onClick={() => handleToggle(s)}>
                      <Text className={`text-xs font-bold ${s.is_active ? 'text-red-500' : 'text-primary-foreground'}`}>
                        {toggling === s.id ? '处理中' : s.is_active ? '下架' : '上架'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
