import {Button, Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {checkUserPurchased, getProductReviews, getReviewSummary, getSKUDetail, toggleReviewLike} from '@/db/api'
import type {ProductReview, SKU} from '@/db/types'
import {useLanguage} from '@/hooks/useLanguage'
import {DEFAULT_AVATAR, DEFAULT_PRODUCT_IMAGE} from '@/utils/images'
import {formatDateTime} from '@/utils/time'

function fallbackEnglishProductName(name: string) {
  const mappings: Array<[string, string]> = [
    ['根书钥匙扣·福', 'Root Calligraphy Keychain · Fortune'],
    ['根书钥匙扣·喜', 'Root Calligraphy Keychain · Joy'],
    ['根书木质书签套装', 'Root Calligraphy Wooden Bookmark Set'],
    ['根宝数字IP徽章', 'Genbao Digital IP Badge'],
    ['根书艺术摆件·定制款', 'Root Calligraphy Art Ornament · Custom'],
    ['根宝', 'Genbao'],
    ['根书', 'Root Calligraphy']
  ]
  const exact = mappings.find(([zh]) => name.trim() === zh)
  if (exact) return exact[1]
  let result = name
  for (const [zh, en] of mappings.slice(5)) result = result.replaceAll(zh, en)
  return /[\u3400-\u9fff]/.test(result) ? 'Root Culture Product' : result
}

export default function ProductDetail() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
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
  const optionLabel = (value: string) => {
    if (language !== 'en') return value
    const labels: Record<string, string> = {
      朱红: 'Cinnabar',
      玄黑: 'Ink Black',
      琥珀: 'Amber',
      月白: 'Moon White',
      款式一: 'Style 1',
      款式二: 'Style 2',
      按一套购买: 'Buy as a set',
      按张购买: 'Buy by piece'
    }
    return labels[value] || value
  }

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
      Taro.showToast({title: ui('请输入定制文字', 'Please enter the custom text'), icon: 'none'})
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
        <Text className="text-muted-foreground">{ui('加载中...', 'Loading...')}</Text>
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
            <Text className="text-2xl font-bold text-accent">
              {language === 'en' ? product.name_en || fallbackEnglishProductName(product.name) : product.name}
            </Text>
            {product.category === 'premium' && (
              <View className="bg-primary px-3 py-1 rounded">
                <Text className="text-base text-white">{ui('高端定制', 'Premium Custom')}</Text>
              </View>
            )}
          </View>
          <Text className="text-3xl font-bold text-primary mb-4">¥{product.price.toFixed(2)}</Text>

          {/* 明信片购买方式 */}
          {isPostcard && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">{ui('购买方式', 'Purchase option')}</Text>
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
                      {optionLabel(type)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 款式选择（明信片单张、冰箱贴、徽章、DIY材料包） */}
          {((isPostcard && selectedType === '按张购买') || isMagnet || isBadge || isDIY) && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">
                {ui('款式选择（图案/根书字）', 'Style (pattern / Root Calligraphy)')}
              </Text>
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
                      {optionLabel(style)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 颜色/木材颜色选择（徽章及其他常规文创） */}
          {(isBadge || (!isPostcard && !isMagnet && !isDIY && !isStamp)) && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">
                {isBadge ? ui('木材颜色', 'Wood colour') : ui('规格选择', 'Options')}
              </Text>
              <View className="flex flex-wrap gap-3">
                {colors.map((color) => (
                  <View
                    key={optionLabel(color)}
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
                      {optionLabel(color)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isStamp && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">{ui('规格选择', 'Options')}</Text>
              <View className="flex flex-wrap gap-3">
                {colors.map((color) => (
                  <View
                    key={optionLabel(color)}
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
                      {optionLabel(color)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isStamp && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">
                {ui('定制姓名（1-4字）', 'Custom name (1–4 characters)')}
              </Text>
              <View className="bg-muted bg-opacity-50 p-3 rounded-xl border border-border">
                <Input
                  className="text-foreground text-base"
                  placeholder={ui('请输入要刻在印章上的姓名', 'Enter the name to engrave')}
                  maxlength={4}
                  value={customText}
                  onInput={(e) => setCustomText(e.detail.value)}
                />
              </View>
              <Text className="text-base text-muted-foreground mt-2">
                {ui('提示：印章为手工镌刻，建议字数为1-4字。', 'Hand-engraved stamp. We recommend 1–4 characters.')}
              </Text>
            </View>
          )}

          <View className="border-t border-border pt-4 mb-6">
            <Text className="text-base font-bold text-accent mb-3">{ui('商品详情', 'Product details')}</Text>
            <View className="space-y-3">
              <View className="bg-muted bg-opacity-30 p-4 rounded-xl">
                <Text className="text-base text-muted-foreground leading-relaxed">
                  {language === 'en'
                    ? product.description_en ||
                      'Root Culture artwork combining traditional craftsmanship with a contemporary aesthetic.'
                    : product.description || '根书文创精品，融合传统工艺与现代审美。'}
                </Text>
              </View>
              <View className="flex flex-col space-y-2">
                <View className="flex items-center">
                  <View className="i-mdi-check-decagram text-primary mr-2" />
                  <Text className="text-base text-foreground">
                    {ui('非物质文化遗产授权', 'Intangible cultural heritage licensed')}
                  </Text>
                </View>
                <View className="flex items-center">
                  <View className="i-mdi-check-decagram text-primary mr-2" />
                  <Text className="text-base text-foreground">
                    {ui(
                      '全国顺丰包邮（偏远地区除外）',
                      'Free SF Express shipping in mainland China (remote areas excluded)'
                    )}
                  </Text>
                </View>
                <View className="flex items-center">
                  <View className="i-mdi-check-decagram text-primary mr-2" />
                  <Text className="text-base text-foreground">
                    {ui('精美礼盒包装，附赠收藏证书', 'Gift-box packaging with a collector certificate')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 评价反馈板块 */}
          <View className="border-t border-border pt-6 mb-6">
            <View className="flex flex-row items-center justify-between mb-4">
              <View className="flex flex-row items-center gap-2">
                <Text className="text-xl font-bold text-accent">{ui('评论反馈', 'Reviews')}</Text>
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
                  <Text className="text-sm font-bold text-primary">{ui('评价', 'Review')}</Text>
                </View>
              )}
            </View>

            {loadingReviews ? (
              <View className="py-8 text-center">
                <Text className="text-sm text-slate-400">{ui('加载评价中...', 'Loading reviews...')}</Text>
              </View>
            ) : reviews.length === 0 ? (
              <View className="bg-muted bg-opacity-30 rounded-2xl p-8 flex flex-col items-center justify-center border border-dashed border-border">
                <View className="i-mdi-comment-outline text-4xl text-slate-300 mb-2" />
                <Text className="text-sm text-slate-400 font-medium">{ui('暂无评价', 'No reviews yet')}</Text>
                {hasPurchased && (
                  <Text className="text-xs text-primary mt-2 underline" onClick={goToCreateReview}>
                    {ui('成为第一个评价的人吧', 'Be the first to leave a review')}
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
                            {review.is_anonymous
                              ? ui('匿名用户', 'Anonymous')
                              : review.author?.username || ui('用户', 'User')}
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
            <Text className="text-base font-bold text-accent mb-2">{ui('库存状态', 'Stock status')}</Text>
            <View className="flex items-center">
              <View
                className={`w-2 h-2 rounded-full mr-2 ${product.stock_available > 0 ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <Text className="text-base text-muted-foreground">
                {product.stock_available > 0
                  ? ui(`充足 (剩余 ${product.stock_available} 件)`, `In stock (${product.stock_available} remaining)`)
                  : ui('已售罄', 'Sold out')}
              </Text>
            </View>
          </View>

          {product.category !== 'premium' && (
            <View className="border-t border-border pt-4 mb-6">
              <Text className="text-base font-bold text-accent mb-3">{ui('购买数量', 'Quantity')}</Text>
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
          {product.category === 'premium' ? ui('联系定制', 'Request a custom quote') : ui('立即购买', 'Buy now')}
        </Button>
      </View>
    </View>
  )
}
