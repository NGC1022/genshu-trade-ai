import {Button, Image, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useEffect, useMemo, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {submitSystemReport, uploadImage} from '@/db/api'
import type {UploadFileInput} from '@/db/types'

type ReportType =
  | 'system_error'
  | 'ui_issue'
  | 'feature_request'
  | 'other'
  | 'product_quality'
  | 'logistics_damage'
  | 'return_exchange'

export default function BugReport() {
  const router = useRouter()
  const {user} = useAuth()
  const [type, setType] = useState<ReportType>('system_error')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // 从路由参数预设类型（售后服务入口跳转时传入 type=after_sales）
  useEffect(() => {
    const t = router.params.type
    if (t === 'after_sales') setType('product_quality')
  }, [router.params.type])

  const isAfterSales = useMemo(
    () => type === 'product_quality' || type === 'logistics_damage' || type === 'return_exchange',
    [type]
  )

  const systemTypes = [
    {value: 'system_error', label: '系统错误'},
    {value: 'ui_issue', label: '界面异常'},
    {value: 'feature_request', label: '功能建议'},
    {value: 'other', label: '其他问题'}
  ]

  const afterSalesTypes = [
    {value: 'product_quality', label: '商品质量'},
    {value: 'logistics_damage', label: '物流损坏'},
    {value: 'return_exchange', label: '退换货'}
  ]

  const handleChooseImage = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 3 - images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      setIsUploading(true)
      const uploadPromises = res.tempFiles.map(async (file) => {
        const input: UploadFileInput = {
          path: file.path,
          size: file.size || 0,
          name: `bug_report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`,
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
    if (!description.trim()) {
      Taro.showToast({title: '请填写问题描述', icon: 'none'})
      return
    }

    setLoading(true)
    const {error} = await submitSystemReport({
      user_id: user.id,
      type,
      description: description.trim(),
      images
    })
    setLoading(false)

    if (error) {
      Taro.showToast({title: '提交失败', icon: 'none'})
    } else {
      Taro.showToast({title: '提交成功，我们会尽快处理', icon: 'success'})
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  }

  const renderTypeGroup = (title: string, items: {value: string; label: string}[]) => (
    <View className="mb-4">
      <Text className="text-sm text-muted-foreground mb-2 block">{title}</Text>
      <View className="flex flex-wrap gap-2">
        {items.map((t) => {
          const isSelected = type === t.value
          return (
            <View
              key={t.value}
              className={`px-4 py-2 rounded-full border-2 transition-all active:opacity-80 ${
                isSelected ? 'bg-primary border-primary' : 'bg-slate-50 border-transparent'
              }`}
              onClick={() => setType(t.value as ReportType)}>
              <Text className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-600'}`}>{t.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )

  return (
    <View className="min-h-screen bg-white">
      <ScrollView className="w-full h-full" scrollY>
        <View className="p-4">
          <View
            className={`rounded-2xl p-4 mb-6 border ${isAfterSales ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
            <View className="flex flex-row items-start">
              <View
                className={`i-mdi-information-outline text-xl mr-2 mt-0.5 ${isAfterSales ? 'text-orange-600' : 'text-blue-600'}`}
              />
              <View className="flex-1">
                <Text
                  className={`text-base font-bold block mb-1 ${isAfterSales ? 'text-orange-800' : 'text-blue-800'}`}>
                  {isAfterSales ? '售后服务须知' : '报错须知'}
                </Text>
                <Text className={`text-sm leading-relaxed ${isAfterSales ? 'text-orange-700' : 'text-blue-700'}`}>
                  {isAfterSales
                    ? '如遇商品质量问题、物流运输损坏或需要退换货，请选择对应类型并详细描述，上传相关照片凭证，我们将尽快为您处理售后申请。'
                    : '如果您在使用过程中遇到系统错误、功能异常或界面显示问题，请在此提交，我们将尽快为您解决。'}
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-slate-800 block mb-3">问题类型</Text>
            {renderTypeGroup('系统与功能', systemTypes)}
            {renderTypeGroup('商品售后', afterSalesTypes)}
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-slate-800 block mb-3">问题描述</Text>
            <View className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <Textarea
                className="w-full text-base"
                placeholder={
                  isAfterSales
                    ? '请详细描述售后问题，如商品瑕疵、损坏情况、退换货原因等...'
                    : '请详细描述您遇到的问题...'
                }
                value={description}
                onInput={(e) => {
                  const ev = e as any
                  setDescription(ev.detail?.value ?? ev.target?.value ?? '')
                }}
                maxlength={500}
                autoHeight
                style={{minHeight: '120px'}}
              />
            </View>
            <Text className="text-sm text-slate-400 mt-2 text-right">{description.length}/500</Text>
          </View>

          <View className="mb-8">
            <View className="flex flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-slate-800">上传截图（最多3张）</Text>
              <Text className="text-sm text-slate-400">{images.length}/3</Text>
            </View>
            <View className="flex flex-row flex-wrap gap-2">
              {images.map((img, index) => (
                <View key={img} className="relative w-20 h-20">
                  <Image src={img} className="w-full h-full rounded-lg" mode="aspectFill" />
                  <View
                    className="absolute -top-1 -right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                    onClick={() => removeImage(index)}>
                    <View className="i-mdi-close text-xs text-white" />
                  </View>
                </View>
              ))}
              {images.length < 3 && (
                <View
                  className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center active:bg-slate-100"
                  onClick={handleChooseImage}>
                  {isUploading ? (
                    <View className="i-mdi-loading animate-spin text-2xl text-slate-400" />
                  ) : (
                    <>
                      <View className="i-mdi-plus text-2xl text-slate-400" />
                      <Text className="text-xs text-slate-400 mt-1">添加截图</Text>
                    </>
                  )}
                </View>
              )}
            </View>
          </View>

          <Button
            className="w-full bg-primary text-white rounded-2xl text-base font-bold border-none h-12 flex items-center justify-center"
            onClick={handleSubmit}
            loading={loading}>
            {isAfterSales ? '提交售后申请' : '提交报错'}
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
