import {Button, Image, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {submitProductReview, uploadImage} from '@/db/api'
import type {UploadFileInput} from '@/db/types'

export default function ProductReviewCreate() {
  const router = useRouter()
  const {skuId, orderId} = router.params
  const {user} = useAuth()
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleChooseImage = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 6 - images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      setIsUploading(true)
      const uploadPromises = res.tempFiles.map(async (file) => {
        const input: UploadFileInput = {
          path: file.path,
          size: file.size || 0,
          name: `product_review_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`,
          originalFileObj: (file as any).originalFileObj
        }
        const result = await uploadImage(input)
        if (result.success && result.url) {
          return result.url
        }
        return null
      })

      const urls = await Promise.all(uploadPromises)
      const validUrls = urls.filter((url): url is string => !!url)
      setImages((prev) => [...prev, ...validUrls])
      setIsUploading(false)
    } catch (_err) {
      setIsUploading(false)
      Taro.showToast({title: '图片上传失败', icon: 'none'})
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }
    if (!skuId) {
      Taro.showToast({title: '参数错误', icon: 'none'})
      return
    }
    if (!content.trim()) {
      Taro.showToast({title: '请填写评价内容', icon: 'none'})
      return
    }

    setLoading(true)
    const {error} = await submitProductReview({
      sku_id: skuId as string,
      user_id: user.id,
      order_id: orderId as string,
      rating,
      content: content.trim(),
      images,
      is_anonymous: isAnonymous
    })
    setLoading(false)

    if (error) {
      Taro.showToast({title: '发布评价失败', icon: 'none'})
    } else {
      Taro.showToast({title: '发布成功，感谢您的评价', icon: 'success'})
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  }

  return (
    <View className="min-h-screen bg-slate-50">
      <ScrollView className="w-full h-full" scrollY>
        <View className="p-4">
          <View className="bg-white rounded-3xl p-6 mb-4 shadow-sm">
            <Text className="text-xl font-bold text-foreground block mb-4">评分</Text>
            <View className="flex flex-row items-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <View
                  key={star}
                  className={`text-4xl transition-all active:scale-125 ${
                    star <= rating ? 'i-mdi-star text-amber-400' : 'i-mdi-star-outline text-slate-200'
                  }`}
                  onClick={() => setRating(star)}
                />
              ))}
              <Text className="text-lg font-bold text-slate-400 ml-2">
                {rating === 5 ? '非常好' : rating === 4 ? '好' : rating === 3 ? '一般' : rating === 2 ? '差' : '非常差'}
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-3xl p-6 mb-4 shadow-sm">
            <Text className="text-xl font-bold text-foreground block mb-4">评价内容</Text>
            <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <Textarea
                className="w-full text-lg text-foreground"
                placeholder="分享您的使用感受，帮助更多小伙伴~"
                value={content}
                onInput={(e) => {
                  const ev = e as any
                  setContent(ev.detail?.value ?? ev.target?.value ?? '')
                }}
                maxlength={500}
                autoHeight
                style={{minHeight: '160px'}}
              />
            </View>
            <Text className="text-sm text-slate-400 mt-2 text-right">{content.length}/500</Text>

            <View className="mt-6">
              <View className="flex flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-foreground">上传图片</Text>
                <Text className="text-sm text-slate-400">{images.length}/6</Text>
              </View>
              <View className="flex flex-row flex-wrap gap-3">
                {images.map((img, index) => (
                  <View key={img} className="relative w-24 h-24">
                    <Image src={img} className="w-full h-full rounded-2xl" mode="aspectFill" />
                    <View
                      className="absolute -top-2 -right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center border border-white"
                      onClick={() => removeImage(index)}>
                      <View className="i-mdi-close text-xs text-white" />
                    </View>
                  </View>
                ))}
                {images.length < 6 && (
                  <View
                    className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center active:bg-slate-100 transition-all"
                    onClick={handleChooseImage}>
                    {isUploading ? (
                      <View className="i-mdi-loading animate-spin text-3xl text-slate-400" />
                    ) : (
                      <>
                        <View className="i-mdi-camera text-3xl text-slate-400" />
                        <Text className="text-xs text-slate-400 mt-1 font-bold">添加图片</Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>

          <View className="bg-white rounded-3xl p-6 mb-8 shadow-sm flex flex-row items-center justify-between">
            <View className="flex flex-row items-center">
              <View
                className={`w-6 h-6 rounded-md border-2 mr-3 flex items-center justify-center transition-all ${
                  isAnonymous ? 'bg-primary border-primary' : 'bg-white border-slate-300'
                }`}
                onClick={() => setIsAnonymous(!isAnonymous)}>
                {isAnonymous && <View className="i-mdi-check text-base text-white font-black" />}
              </View>
              <Text className="text-lg font-bold text-slate-700" onClick={() => setIsAnonymous(!isAnonymous)}>
                匿名评价
              </Text>
            </View>
            <Text className="text-base text-slate-400">勾选后您的头像和昵称将被隐藏</Text>
          </View>

          <Button
            className="w-full bg-primary text-white rounded-full text-xl font-black border-none h-16 flex items-center justify-center shadow-elegant active:scale-95 transition-all"
            onClick={handleSubmit}
            loading={loading}>
            发布评价
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
