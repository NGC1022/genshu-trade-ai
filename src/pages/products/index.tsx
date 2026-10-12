import {Image, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useMemo, useState} from 'react'
import {getSKUList} from '@/db/api'
import type {SKU} from '@/db/types'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

export default function Products() {
  const [allProducts, setAllProducts] = useState<SKU[]>([])
  const [category, setCategory] = useState<string>('')

  const loadData = useCallback(async () => {
    const {data} = await getSKUList()
    setAllProducts(data)
  }, [])

  useDidShow(() => {
    loadData()
  })

  // 使用useMemo缓存过滤结果，避免每次渲染都重新计算
  const filteredProducts = useMemo(() => {
    if (!category) return allProducts
    return allProducts.filter((p) => p.category === category)
  }, [allProducts, category])

  const navigateToDetail = (skuCode: string) => {
    Taro.navigateTo({url: `/pages/product-detail/index?skuCode=${skuCode}`})
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <View className="px-4 py-6">
        <View className="flex flex-row gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <View
            className={`px-6 py-2 rounded-full transition-all shadow-sm ${!category ? 'bg-gradient-primary scale-105' : 'bg-card border border-border border-opacity-30'}`}
            onClick={() => setCategory('')}>
            <Text className={`text-base ${!category ? 'text-white font-bold' : 'text-muted-foreground font-bold'}`}>
              全部
            </Text>
          </View>
          <View
            className={`px-6 py-2 rounded-full transition-all shadow-sm ${category === 'regular' ? 'bg-gradient-primary scale-105' : 'bg-card border border-border border-opacity-30'}`}
            onClick={() => setCategory('regular')}>
            <Text
              className={`text-base ${category === 'regular' ? 'text-white font-bold' : 'text-muted-foreground font-bold'}`}>
              平价文创
            </Text>
          </View>
          <View
            className={`px-6 py-2 rounded-full transition-all shadow-sm ${category === 'premium' ? 'bg-gradient-primary scale-105' : 'bg-card border border-border border-opacity-30'}`}
            onClick={() => setCategory('premium')}>
            <Text
              className={`text-base ${category === 'premium' ? 'text-white font-bold' : 'text-muted-foreground font-bold'}`}>
              高端文创
            </Text>
          </View>
        </View>

        <View className="grid grid-cols-2 gap-4 pb-10">
          {filteredProducts.map((product) => (
            <View
              key={product.id}
              className="bg-card rounded-[24px] overflow-hidden shadow-card border border-border border-opacity-10 active:scale-[0.98] transition-all"
              onClick={() => navigateToDetail(product.sku_code)}>
              <Image src={product.image_url || DEFAULT_PRODUCT_IMAGE} className="w-full h-44" mode="aspectFill" />
              <View className="p-4">
                <Text className="text-base font-bold text-foreground mb-2 line-clamp-1 leading-snug">
                  {product.name}
                </Text>

                <View className="flex items-center justify-between">
                  <Text className="text-xl font-black text-primary">¥{product.price}</Text>
                  {product.category === 'premium' && (
                    <View className="bg-secondary/10 px-2 py-0.5 rounded-lg border border-secondary/20">
                      <Text className="text-xs text-accent font-bold">高端</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        <View className="flex flex-col items-center justify-center py-12 opacity-30">
          <View className="h-[1px] w-24 bg-muted-foreground mb-4" />
          <Text className="text-base text-muted-foreground font-bold tracking-[0.2em]">更多文创设计ing</Text>
        </View>
      </View>
    </View>
  )
}
