import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useState} from 'react'
import {getSKUList} from '@/db/api'
import type {SKU} from '@/db/types'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

export default function ProductSelect() {
  const [products, setProducts] = useState<SKU[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  useDidShow(() => {
    loadProducts()
    // 从上一页获取已选商品
    const selected = Taro.getStorageSync('selected_products') || []
    setSelectedProducts(selected)
  })

  const loadProducts = async () => {
    const {data} = await getSKUList()
    setProducts(data)
  }

  const handleToggleProduct = (sku: string) => {
    if (selectedProducts.includes(sku)) {
      setSelectedProducts(selectedProducts.filter((s) => s !== sku))
    } else {
      setSelectedProducts([...selectedProducts, sku])
    }
  }

  const handleConfirm = () => {
    Taro.setStorageSync('selected_products', selectedProducts)
    Taro.navigateBack()
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full h-full" scrollY>
        <View className="p-4">
          <View className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-100">
            <View className="flex flex-row items-center mb-2">
              <View className="i-mdi-information text-lg text-amber-600 mr-2" />
              <Text className="text-sm font-bold text-amber-800">选择要推荐的商品</Text>
            </View>
            <Text className="text-sm text-amber-700 leading-relaxed">
              已选择 {selectedProducts.length}/3 件商品，点击商品卡片进行选择
            </Text>
          </View>

          {products.map((product) => (
            <View
              key={product.sku_code}
              className={`bg-white rounded-xl p-4 mb-3 flex flex-row items-center active:opacity-80 border-2 ${
                selectedProducts.includes(product.sku_code) ? 'border-primary' : 'border-transparent'
              }`}
              onClick={() => handleToggleProduct(product.sku_code)}>
              <Image
                src={product.image_url || DEFAULT_PRODUCT_IMAGE}
                className="w-20 h-20 rounded-lg bg-slate-100 mr-3"
                mode="aspectFill"
              />
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-800 block mb-1">{product.name}</Text>
                <Text className="text-sm text-slate-500 block mb-2 line-clamp-2">{product.description}</Text>
                <Text className="text-lg font-bold text-primary">¥{product.price}</Text>
              </View>
              {selectedProducts.includes(product.sku_code) && (
                <View className="w-6 h-6 bg-primary rounded-full flex items-center justify-center ml-2">
                  <View className="i-mdi-check text-white text-base" />
                </View>
              )}
            </View>
          ))}

          {products.length === 0 && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-package-variant text-6xl text-slate-300 mb-4" />
              <Text className="text-base text-slate-400">暂无可推荐的商品</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View className="bg-white border-t border-slate-100 px-4 py-3 safe-area-bottom">
        <View className="flex flex-row gap-3">
          <View
            className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-4 flex items-center justify-center active:opacity-80"
            onClick={() => Taro.navigateBack()}>
            <Text className="text-base font-bold">取消</Text>
          </View>
          <View
            className="flex-1 bg-primary text-white rounded-xl py-4 flex items-center justify-center active:opacity-80"
            onClick={handleConfirm}>
            <Text className="text-base font-bold text-white">确定({selectedProducts.length})</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
