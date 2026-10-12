import {Image, Input, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useMemo, useState} from 'react'
import {getSKUList} from '@/db/api'
import type {SKU} from '@/db/types'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

type SortMode = 'featured' | 'sales' | 'monthly' | 'price_desc' | 'price_asc'

const SORT_OPTIONS: Array<{key: SortMode; label: string}> = [
  {key: 'featured', label: '综合推荐'},
  {key: 'sales', label: '总销量高→低'},
  {key: 'monthly', label: '月销量高→低'},
  {key: 'price_desc', label: '价格高→低'},
  {key: 'price_asc', label: '价格低→高'}
]

const monthlySales = (product: SKU) => Number(product.monthly_sold ?? Math.round(product.stock_sold * 0.35))
const totalSales = (product: SKU) => Number(product.stock_sold || 0)

export default function Products() {
  const [allProducts, setAllProducts] = useState<SKU[]>([])
  const [category, setCategory] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('featured')

  const loadData = useCallback(async () => {
    const {data} = await getSKUList()
    setAllProducts(data)
  }, [])

  useDidShow(() => {
    loadData()
  })

  const filteredProducts = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    const result = allProducts.filter((product) => {
      const matchesCategory = !category || product.category === category
      const searchable =
        `${product.name} ${product.sku_code} ${product.description || ''} ${product.material || ''}`.toLowerCase()
      return matchesCategory && (!normalized || searchable.includes(normalized))
    })

    return [...result].sort((a, b) => {
      if (sortMode === 'sales') return totalSales(b) - totalSales(a)
      if (sortMode === 'monthly') return monthlySales(b) - monthlySales(a)
      if (sortMode === 'price_desc') return Number(b.price) - Number(a.price)
      if (sortMode === 'price_asc') return Number(a.price) - Number(b.price)
      return (
        Number(b.monthly_sold || 0) - Number(a.monthly_sold || 0) ||
        Number(b.stock_sold || 0) - Number(a.stock_sold || 0)
      )
    })
  }, [allProducts, category, keyword, sortMode])

  const navigateToDetail = (skuCode: string) => {
    Taro.navigateTo({url: `/pages/product-detail/index?skuCode=${skuCode}`})
  }

  return (
    <View className="min-h-screen bg-gradient-subtle preview-products-page">
      <View className="mx-auto max-w-[1180px] px-4 py-5 md:px-8 md:py-8">
        <View className="mb-5">
          <Text className="text-xs tracking-[2px] text-primary font-black">ROOT CULTURE / SHOP</Text>
          <Text className="block text-2xl md:text-3xl text-foreground font-black mt-1">文创商品</Text>
          <Text className="block text-sm text-muted-foreground mt-2">
            按价格、销量和商品关键词找到适合自用或文化礼赠的作品。
          </Text>
        </View>

        <View className="bg-card rounded-3xl border border-border border-opacity-10 shadow-card p-4 mb-4">
          <View className="flex flex-row items-center rounded-2xl bg-muted/60 px-3 py-2.5">
            <View className="i-mdi-magnify text-xl text-muted-foreground mr-2" />
            <Input
              value={keyword}
              onInput={(event) => setKeyword(event.detail.value)}
              placeholder="搜索商品名称、SKU、材质或用途"
              className="flex-1 text-sm text-foreground"
            />
            {keyword && (
              <Text className="text-xs text-primary font-bold" onClick={() => setKeyword('')}>
                清除
              </Text>
            )}
          </View>
          <View className="flex flex-row gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {[
              {key: '', label: '全部商品'},
              {key: 'regular', label: '平价文创'},
              {key: 'premium', label: '高端文创'}
            ].map((item) => (
              <View
                key={item.key}
                className={`rounded-full px-4 py-2 border ${category === item.key ? 'bg-primary border-primary' : 'bg-background border-border border-opacity-30'}`}
                onClick={() => setCategory(item.key)}>
                <Text
                  className={`text-xs font-bold ${category === item.key ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
          <View className="flex flex-row gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {SORT_OPTIONS.map((item) => (
              <View
                key={item.key}
                className={`rounded-xl px-3 py-2 ${sortMode === item.key ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'}`}
                onClick={() => setSortMode(item.key)}>
                <Text
                  className={`text-xs font-bold ${sortMode === item.key ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
          <View className="flex flex-row items-center justify-between mt-3">
            <Text className="text-xs text-muted-foreground">共 {filteredProducts.length} 件商品</Text>
            <Text className="text-xs text-muted-foreground">销量数据来自已确认订单</Text>
          </View>
        </View>

        {filteredProducts.length === 0 ? (
          <View className="bg-card rounded-3xl p-10 flex items-center justify-center border border-border border-opacity-10">
            <View className="i-mdi-package-variant-closed-remove text-4xl text-muted-foreground/40 mb-3" />
            <Text className="text-sm text-muted-foreground">没有找到匹配的商品</Text>
          </View>
        ) : (
          <View className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 pb-10 product-grid">
            {filteredProducts.map((product) => (
              <View
                key={product.id}
                className="bg-card rounded-3xl overflow-hidden shadow-card border border-border border-opacity-10 active:scale-[0.98] transition-all"
                onClick={() => navigateToDetail(product.sku_code)}>
                <View className="relative">
                  <Image
                    src={product.image_url || DEFAULT_PRODUCT_IMAGE}
                    className="w-full h-40 md:h-52"
                    mode="aspectFill"
                  />
                  <View className="absolute top-2 left-2 rounded-full bg-black/65 px-2 py-1">
                    <Text className="text-[10px] text-white font-bold">
                      {product.category === 'premium' ? '高端' : '平价'}
                    </Text>
                  </View>
                </View>
                <View className="p-3.5">
                  <Text className="text-sm md:text-base font-bold text-foreground mb-2 line-clamp-1 leading-snug block">
                    {product.name}
                  </Text>
                  <View className="flex items-center justify-between mb-2">
                    <Text className="text-xl font-black text-primary">¥{Number(product.price).toFixed(2)}</Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {product.stock_available > 0 ? '有库存' : '可预订'}
                    </Text>
                  </View>
                  <View className="flex flex-row items-center justify-between border-t border-border border-opacity-20 pt-2">
                    <Text className="text-[10px] text-muted-foreground">月销 {monthlySales(product)}</Text>
                    <Text className="text-[10px] text-muted-foreground">总销 {totalSales(product)}</Text>
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
