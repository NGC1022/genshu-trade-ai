import {Button, Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {checkUserPurchased, getProductReviews, getReviewSummary, getSKUDetail, toggleReviewLike} from '@/db/api'
import type {ProductReview, SKU} from '@/db/types'
import {DEFAULT_AVATAR, DEFAULT_PRODUCT_IMAGE} from '@/utils/images'
import {formatDateTime} from '@/utils/time'

export default function ProductDetail() {
  const router = useRouter()
  const {skuCode, sku} = router.params
  const {user} = useAuth()
  const [product, setProduct] = useState<SKU | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedColor, setSelectedColor] = useState('朱红')
  const [selectedStyle, setSelectedStyle] = useState('')
  const [selectedType, setSelectedType] = useState('单张') // For postcards: '一套' or '单张'
  const [customText, setCustomText] = useState('')

  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewSummary, setReviewSummary] = useState({average: 0, count: 0})
  const [hasPurchased, setHasPurchased] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(false)

  const colors = ['朱红', '玄黑', '琥珀', '月白']
  const styles = ['款式一', '款式二']
  const postcardTypes = ['按一套购买', '按张购买']

  const loadProduct = useCallback(async () => {
    const code = skuCode || sku
    if (!code) return
    const {data} = await getSKUDetail(code)
    if (data) {
      setProduct(data)
      // Set default style for relevant products
      if (
        data.name.includes('明信片') ||
        data.name.includes('冰箱贴') ||
        data.name.includes('徽章') ||
        data.name.includes('DIY')
      ) {
        setSelectedStyle('款式一')
      }
      if (data.name.includes('明信片')) {
        setSelectedType('按张购买')
      }
    }
  }, [skuCode, sku])

  const loadReviews = useCallback(async (skuId: string) => {
    setLoadingReviews(true)
    const [reviewsRes, summaryRes] = await Promise.all([getProductReviews(skuId), getReviewSummary(skuId)])
    if (reviewsRes.data) setReviews(reviewsRes.data)
    if (summaryRes.data) setReviewSummary(summaryRes.data)
    setLoadingReviews(false)
  }, [])

  const checkPurchaseStatus = useCallback(
    async (skuId: string) => {
      if (!user) return
      const {data} = await checkUserPurchased(user.id, skuId)
      setHasPurchased(!!data)
    },
    [user]
  )

  useDidShow(() => {
    if (product?.id) {
      loadReviews(product.id)
    }
  })

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  useEffect(() => {
    if (product?.id) {
      loadReviews(product.id)
      checkPurchaseStatus(product.id)
    }
  }, [product?.id, loadReviews, checkPurchaseStatus])

  const handleToggleLike = async (reviewId: string, isLiked: boolean) => {
    if (!user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }
    const {error} = await toggleReviewLike(reviewId, user.id, isLiked)
    if (!error) {
      if (product?.id) loadReviews(product.id)
    }
  }

  const goToCreateReview = () => {
    if (!product) return
    Taro.navigateTo({
      url: `/pages/product-review-create/index?skuId=${product.id}`
    })
  }

  const handleBuy = () => {
    if (!product) return

    if (product.name.includes('印章') && !customText.trim()) {
      Taro.showToast({title: '请输入定制文字', icon: 'none'})
      return
    }

    const orderItems = [
      {
        sku: {
          ...product,
          selected_color: selectedColor,
          selected_style: selectedStyle,
          selected_type: selectedType,
          custom_text: customText
        },
        quantity
      }
    ]

    if (product.category === 'premium') {
      Taro.navigateTo({url: '/pages/premium-customization/index'})
      return
    }

    Taro.navigateTo({
      url: `/pages/order-confirm/index?items=${encodeURIComponent(JSON.stringify(orderItems))}`
    })
  }

  if (!product) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  const isStamp = product.name.includes('印章')
  const isPostcard = product.name.includes('明信片')
  const isMagnet = product.name.includes('冰箱贴')
  const isBadge = product.name.includes('徽章')
  const isDIY = product.name.includes('DIY')

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1" scrollY>
        <Image src={product.image_url || DEFAULT_PRODUCT_IMAGE} className="w-full h-96" mode="aspectFill" />

        <View className="bg-card rounded-t-3xl p-6 mt--4 shadow-card">
          <View className="flex justify-between items-start mb-2">
            <Text className="text-2xl font-bold text-accent">{product.name}</Text>
            {product.category === 'premium' && (
              <View className="bg-primary px-3 py-1 rounded">
                <Text className="text-base text-white">高端定制</Text>
              </View>
            )}
          </View>
          <Text className="text-3xl font-bold text-primary mb-4">¥{product.price.toFixed(2)}</Text>

          {/* 明信片购买方式 */}
          {isPostcard && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">购买方式</Text>
              <View className="flex flex-wrap gap-3">
                {postcardTypes.map((type) => (
                  <View
                    key={type}
                    className={`px-6 py-2 rounded-full border-2 transition-all ${
                      selectedType === type
                        ? 'border-selected-bg bg-selected-bg'
                        : 'border-border bg-muted bg-opacity-50'
                    }`}
                    onClick={() => setSelectedType(type)}>
                    <Text
                      className={`text-base font-medium ${
                        selectedType === type ? 'text-selected-text' : 'text-muted-foreground'
                      }`}>
                      {type}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 款式选择（明信片单张、冰箱贴、徽章、DIY材料包） */}
          {((isPostcard && selectedType === '按张购买') || isMagnet || isBadge || isDIY) && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">款式选择 (图案/根书字)</Text>
              <View className="flex flex-wrap gap-3">
                {styles.map((style) => (
                  <View
                    key={style}
                    className={`px-6 py-2 rounded-full border-2 transition-all ${
                      selectedStyle === style
                        ? 'border-selected-bg bg-selected-bg'
                        : 'border-border bg-muted bg-opacity-50'
                    }`}
                    onClick={() => setSelectedStyle(style)}>
                    <Text
                      className={`text-base font-medium ${
                        selectedStyle === style ? 'text-selected-text' : 'text-muted-foreground'
                      }`}>
                      {style}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 颜色/木材颜色选择（徽章及其他常规文创） */}
          {(isBadge || (!isPostcard && !isMagnet && !isDIY && !isStamp)) && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">{isBadge ? '木材颜色' : '规格选择'}</Text>
              <View className="flex flex-wrap gap-3">
                {colors.map((color) => (
                  <View
                    key={color}
                    className={`px-6 py-2 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? 'border-selected-bg bg-selected-bg'
                        : 'border-border bg-muted bg-opacity-50'
                    }`}
                    onClick={() => setSelectedColor(color)}>
                    <Text
                      className={`text-base font-medium ${
                        selectedColor === color ? 'text-selected-text' : 'text-muted-foreground'
                      }`}>
                      {color}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isStamp && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">规格选择</Text>
              <View className="flex flex-wrap gap-3">
                {colors.map((color) => (
                  <View
                    key={color}
                    className={`px-6 py-2 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? 'border-selected-bg bg-selected-bg'
                        : 'border-border bg-muted bg-opacity-50'
                    }`}
                    onClick={() => setSelectedColor(color)}>
                    <Text
                      className={`text-base font-medium ${
                        selectedColor === color ? 'text-selected-text' : 'text-muted-foreground'
                      }`}>
                      {color}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isStamp && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">定制姓名 (1-4字)</Text>
              <View className="bg-muted bg-opacity-50 p-3 rounded-xl border border-border">
                <Input
                  className="text-foreground text-base"
                  placeholder="请输入要刻在印章上的姓名"
                  maxlength={4}
                  value={customText}
                  onInput={(e) => setCustomText(e.detail.value)}
                />
              </View>
              <Text className="text-base text-muted-foreground mt-2">提示：印章为手工镌刻，建议字数为1-4字。</Text>
            </View>
          )}

          <View className="border-t border-border pt-4 mb-6">
            <Text className="text-base font-bold text-accent mb-3">商品详情</Text>
            <View className="space-y-3">
              <View className="bg-muted bg-opacity-30 p-4 rounded-xl">
                <Text className="text-base text-muted-foreground leading-relaxed">
                  {product.description || '根书文创精品，融合传统工艺与现代审美。'}
                </Text>
              </View>
              <View className="flex flex-col space-y-2">
                <View className="flex items-center">
                  <View className="i-mdi-check-decagram text-primary mr-2" />
                  <Text className="text-base text-foreground">非物质文化遗产授权</Text>
                </View>
                <View className="flex items-center">
                  <View className="i-mdi-check-decagram text-primary mr-2" />
                  <Text className="text-base text-foreground">全国顺丰包邮（偏远地区除外）</Text>
                </View>
                <View className="flex items-center">
                  <View className="i-mdi-check-decagram text-primary mr-2" />
                  <Text className="text-base text-foreground">精美礼盒包装，附赠收藏证书</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 评价反馈板块 */}
          <View className="border-t border-border pt-6 mb-6">
            <View className="flex flex-row items-center justify-between mb-4">
              <View className="flex flex-row items-center gap-2">
                <Text className="text-xl font-bold text-accent">评论反馈</Text>
                {reviewSummary.count > 0 && (
                  <View className="flex flex-row items-center bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                    <View className="i-mdi-star text-amber-500 text-sm mr-1" />
                    <Text className="text-sm font-bold text-amber-700">{reviewSummary.average}</Text>
                    <Text className="text-xs text-amber-500 ml-1">({reviewSummary.count})</Text>
                  </View>
                )}
              </View>
              {hasPurchased && (
                <View
                  className="flex flex-row items-center bg-primary/10 px-3 py-1.5 rounded-full active:opacity-60"
                  onClick={goToCreateReview}>
                  <View className="i-mdi-square-edit-outline text-lg text-primary mr-1" />
                  <Text className="text-sm font-bold text-primary">评价</Text>
                </View>
              )}
            </View>

            {loadingReviews ? (
              <View className="py-8 text-center">
                <Text className="text-sm text-slate-400">加载评价中...</Text>
              </View>
            ) : reviews.length === 0 ? (
              <View className="bg-muted bg-opacity-30 rounded-2xl p-8 flex flex-col items-center justify-center border border-dashed border-border">
                <View className="i-mdi-comment-outline text-4xl text-slate-300 mb-2" />
                <Text className="text-sm text-slate-400 font-medium">暂无评价</Text>
                {hasPurchased && (
                  <Text className="text-xs text-primary mt-2 underline" onClick={goToCreateReview}>
                    成为第一个评价的人吧
                  </Text>
                )}
              </View>
            ) : (
              <View className="space-y-6">
                {reviews.slice(0, 3).map((review) => (
                  <View key={review.id} className="border-b border-border border-opacity-30 pb-6 last:border-0">
                    <View className="flex flex-row items-center justify-between mb-3">
                      <View className="flex flex-row items-center">
                        <Image
                          src={review.is_anonymous ? DEFAULT_AVATAR : review.author?.avatar_url || DEFAULT_AVATAR}
                          className="w-10 h-10 rounded-full mr-3 border-2 border-white shadow-sm"
                        />
                        <View>
                          <Text className="text-sm font-black text-foreground block">
                            {review.is_anonymous ? '匿名用户' : review.author?.username || '用户'}
                          </Text>
                          <View className="flex flex-row items-center">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <View
                                key={s}
                                className={`text-xs ${
                                  s <= review.rating ? 'i-mdi-star text-amber-400' : 'i-mdi-star-outline text-slate-200'
                                }`}
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                      <Text className="text-xs text-slate-400">{formatDateTime(review.created_at)}</Text>
                    </View>
                    <Text className="text-base text-slate-700 leading-relaxed mb-3 block px-1">{review.content}</Text>
                    {review.images && review.images.length > 0 && (
                      <View className="flex flex-row flex-wrap gap-2 mb-4 px-1">
                        {review.images.map((img) => (
                          <Image
                            key={img}
                            src={img}
                            className="w-20 h-20 rounded-lg"
                            mode="aspectFill"
                            onClick={() => Taro.previewImage({urls: review.images, current: img})}
                          />
                        ))}
                      </View>
                    )}

                    {review.follow_up_content && (
                      <View className="bg-slate-50 rounded-xl p-3 border-l-4 border-primary/30 mb-4">
                        <View className="flex flex-row items-center justify-between mb-1">
                          <Text className="text-xs font-black text-primary">[追评]</Text>
                          <Text className="text-xs text-slate-400">{formatDateTime(review.follow_up_at)}</Text>
                        </View>
                        <Text className="text-sm text-slate-600 leading-relaxed">{review.follow_up_content}</Text>
                      </View>
                    )}

                    <View className="flex flex-row items-center justify-end">
                      <View
                        className="flex flex-row items-center bg-slate-50 px-3 py-1 rounded-full border border-slate-100 active:scale-95 transition-all"
                        onClick={() => handleToggleLike(review.id, false)}>
                        <View className="i-mdi-thumb-up-outline text-sm text-slate-400 mr-1.5" />
                        <Text className="text-xs font-bold text-slate-500">{review.likes_count || 0}</Text>
                      </View>
                    </View>
                  </View>
                ))}

                {reviews.length > 3 && (
                  <View className="pt-2 flex justify-center">
                    <Text className="text-sm font-bold text-primary active:opacity-60">
                      查看全部 {reviews.length} 条评价
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View className="border-t border-border pt-4 mb-6">
            <Text className="text-base font-bold text-accent mb-2">库存状态</Text>
            <View className="flex items-center">
              <View
                className={`w-2 h-2 rounded-full mr-2 ${product.stock_available > 0 ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <Text className="text-base text-muted-foreground">
                {product.stock_available > 0 ? `充足 (剩余 ${product.stock_available} 件)` : '已售罄'}
              </Text>
            </View>
          </View>

          {product.category !== 'premium' && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">购买数量</Text>
              <View className="flex items-center">
                <View
                  className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center border border-border"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <View className="i-mdi-minus text-xl text-foreground" />
                </View>
                <Text className="text-lg font-bold text-accent mx-6">{quantity}</Text>
                <View
                  className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center border border-border"
                  onClick={() => setQuantity(Math.min(product.stock_available, quantity + 1))}>
                  <View className="i-mdi-plus text-xl text-foreground" />
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View className="bg-card p-4 border-t border-border">
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-3 text-lg font-bold shadow-elegant break-keep"
          onClick={handleBuy}>
          {product.category === 'premium' ? '联系定制' : '立即购买'}
        </Button>
      </View>
    </View>
  )
}
