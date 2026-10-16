import {Image, Input, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useMemo, useState} from 'react'
import {DEMO_CATALOG} from '@/data/demoCatalog'
import {getSKUList} from '@/db/api'
import type {SKU} from '@/db/types'
import {useLanguage} from '@/hooks/useLanguage'
import {t} from '@/utils/i18n'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

type SortMode = 'featured' | 'sales' | 'monthly' | 'price_desc' | 'price_asc'

const SORT_OPTIONS: Array<{key: SortMode; labelKey: string}> = [
  {key: 'featured', labelKey: 'recommended'},
  {key: 'sales', labelKey: 'sales_high_low'},
  {key: 'monthly', labelKey: 'monthly_high_low'},
  {key: 'price_desc', labelKey: 'price_high_low'},
  {key: 'price_asc', labelKey: 'price_low_high'}
]

const monthlySales = (product: SKU) => Number(product.monthly_sold ?? Math.round(product.stock_sold * 0.35))
const totalSales = (product: SKU) => Number(product.stock_sold || 0)

function fallbackEnglishProductName(name: string) {
  const mappings: Array<[string, string]> = [
    ['根书钥匙扣·福', 'Root Calligraphy Keychain · Fortune'],
    ['根书钥匙扣·喜', 'Root Calligraphy Keychain · Joy'],
    ['根书木质书签套装', 'Root Calligraphy Wooden Bookmark Set'],
    ['根宝数字IP徽章', 'Genbao Digital IP Badge'],
    ['根书艺术摆件·定制款', 'Root Calligraphy Art Ornament · Custom'],
    ['根书文创园', 'Root Culture Park'],
    ['根宝', 'Genbao'],
    ['根书', 'Root Calligraphy']
  ]
  const exact = mappings.find(([zh]) => name.trim() === zh)
  if (exact) return exact[1]
  let result = name
  for (const [zh, en] of mappings.slice(5)) result = result.split(zh).join(en)
  return /[\u3400-\u9fff]/.test(result) ? 'Root Culture Product' : result
}

export default function Products() {
  const language = useLanguage()
  const displayProductName = (product: SKU) => {
    if (language !== 'en') return product.name
    const englishName = (product as SKU & {name_en?: string}).name_en
    return englishName?.trim() || fallbackEnglishProductName(product.name)
  }
  // 先渲染本地目录，避免远端数据库为空、未授权或网络较慢时出现整页空白。
  const [allProducts, setAllProducts] = useState<SKU[]>(DEMO_CATALOG)
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
          <Text className="text-xs tracking-[2px] text-primary font-black">{t('shop_eyebrow')}</Text>
          <Text className="block text-2xl md:text-3xl text-foreground font-black mt-1">{t('products')}</Text>
          <Text className="block text-sm text-muted-foreground mt-2">{t('products_intro')}</Text>
        </View>

        <View className="bg-card rounded-3xl border border-border border-opacity-10 shadow-card p-4 mb-4">
          <View className="flex flex-row items-center rounded-2xl bg-muted/60 px-3 py-2.5">
            <View className="i-mdi-magnify text-xl text-muted-foreground mr-2" />
            <Input
              value={keyword}
              onInput={(event) => setKeyword(event.detail.value)}
              placeholder={t('search_products')}
              className="flex-1 text-sm text-foreground"
            />
            {keyword && (
              <Text className="text-xs text-primary font-bold" onClick={() => setKeyword('')}>
                {t('clear')}
              </Text>
            )}
          </View>
          <View className="flex flex-row gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {[
              {key: '', labelKey: 'all_products'},
              {key: 'regular', labelKey: 'affordable_products'},
              {key: 'premium', labelKey: 'premium_products'}
            ].map((item) => (
              <View
                key={item.key}
                className={`rounded-full px-4 py-2 border ${category === item.key ? 'bg-primary border-primary' : 'bg-background border-border border-opacity-30'}`}
                onClick={() => setCategory(item.key)}>
                <Text
                  className={`text-xs font-bold ${category === item.key ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                  {t(item.labelKey)}
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
                  {t(item.labelKey)}
                </Text>
              </View>
            ))}
          </View>
          <View className="flex flex-row items-center justify-between mt-3">
            <Text className="text-xs text-muted-foreground">
              {t('products_count', {count: filteredProducts.length})}
            </Text>
            <Text className="text-xs text-muted-foreground">{t('sales_confirmed')}</Text>
          </View>
        </View>

        {filteredProducts.length === 0 ? (
          <View className="bg-card rounded-3xl p-10 flex items-center justify-center border border-border border-opacity-10">
            <View className="i-mdi-package-variant-closed-remove text-4xl text-muted-foreground/40 mb-3" />
            <Text className="text-sm text-muted-foreground">{t('no_products')}</Text>
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
                    lazyLoad
                  />
                  <View className="absolute top-2 left-2 rounded-full bg-black/65 px-2 py-1">
                    <Text className="text-[10px] text-white font-bold">
                      {product.category === 'premium' ? t('premium') : t('affordable')}
                    </Text>
                  </View>
                </View>
                <View className="p-3.5">
                  <Text className="text-sm md:text-base font-bold text-foreground mb-2 line-clamp-1 leading-snug block">
                    {displayProductName(product)}
                  </Text>
                  <View className="flex items-center justify-between mb-2">
                    <Text className="text-xl font-black text-primary">
                      {language === 'en' ? 'CNY ' : '¥'}
                      {Number(product.price).toFixed(2)}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {product.stock_available > 0 ? t('in_stock') : t('preorder')}
                    </Text>
                  </View>
                  <View className="flex flex-row items-center justify-between border-t border-border border-opacity-20 pt-2">
                    <Text className="text-[10px] text-muted-foreground">
                      {t('monthly_sales', {count: monthlySales(product)})}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {t('total_sales', {count: totalSales(product)})}
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
