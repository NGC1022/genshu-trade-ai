// @title 售后中心
// 售后中心：退货/换货/退款/物流破损申报，5态流程（提交→审核→处理→物流→完成/驳回）
// 支持上传商品照片与破损照片；个人中心与订单详情均有入口

import {Image, Picker, Text, Textarea, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createAfterSale, getAfterSaleReasons, getAfterSales, uploadImage} from '@/db/api'
import type {AfterSaleRecord, AfterSaleType} from '@/db/types'
import {AFTER_SALE_FLOW_STEPS, AFTER_SALE_STATUS_LABELS, AFTER_SALE_TYPE_LABELS} from '@/db/types'

const TYPE_KEYS: AfterSaleType[] = ['return', 'exchange', 'refund', 'damage']

export default function AfterSales() {
  const {user} = useAuth()
  const [records, setRecords] = useState<AfterSaleRecord[]>([])
  const [loading, setLoading] = useState(true)

  // 申请表单
  const [orderNo, setOrderNo] = useState('')
  const [typeIdx, setTypeIdx] = useState(0)
  const [reasons, setReasons] = useState<{key: string; name: string; need_photo: boolean; need_video: boolean}[]>([])
  const [reasonIdx, setReasonIdx] = useState(0)
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const loadRecords = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [{data, error}, cfgReasons] = await Promise.all([getAfterSales(user.id), getAfterSaleReasons()])
    if (!error) setRecords(data)
    if (cfgReasons.length > 0) {
      setReasons(cfgReasons)
    } else {
      setReasons([
        {key: 'quality', name: '商品质量', need_photo: false, need_video: false},
        {key: 'damage', name: '物流破损', need_photo: true, need_video: false},
        {key: 'description_mismatch', name: '商品与描述不符', need_photo: true, need_video: false},
        {key: 'quantity_error', name: '数量错误', need_photo: true, need_video: false},
        {key: 'delivery_issue', name: '配送问题', need_photo: false, need_video: false},
        {key: 'other', name: '其他', need_photo: false, need_video: false}
      ])
    }
    setLoading(false)
  }, [user])

  useDidShow(() => {
    loadRecords()
  })

  const handleChooseImage = () => {
    if (uploading || images.length >= 6) {
      if (images.length >= 6) Taro.showToast({title: '最多上传6张照片', icon: 'none'})
      return
    }
    Taro.chooseImage({
      count: 6 - images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        setUploading(true)
        Taro.showLoading({title: '上传照片中...'})
        const uploaded: string[] = []
        for (const path of res.tempFilePaths) {
          const result = await uploadImage({
            path,
            size: 0,
            name: `aftersale_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`,
            originalFileObj: {tempFilePath: path} as any
          })
          if (result.success && result.url) uploaded.push(result.url)
        }
        Taro.hideLoading()
        setUploading(false)
        if (uploaded.length === 0) {
          Taro.showToast({title: '照片上传失败', icon: 'none'})
          return
        }
        setImages([...images, ...uploaded])
        Taro.showToast({title: `已上传${uploaded.length}张`})
      }
    })
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }
    if (!orderNo.trim()) {
      Taro.showToast({title: '请输入售后订单号', icon: 'none'})
      return
    }
    if (!description.trim()) {
      Taro.showToast({title: '请填写问题描述', icon: 'none'})
      return
    }
    const selectedReason = reasons[reasonIdx]
    if (selectedReason?.need_photo && images.length === 0) {
      Taro.showToast({title: `「${selectedReason.name}」需上传照片凭证`, icon: 'none'})
      return
    }
    Taro.showModal({
      title: '提交售后申请',
      content: `确认提交「${AFTER_SALE_TYPE_LABELS[TYPE_KEYS[typeIdx]]}」申请？提交后进入平台审核流程。`,
      success: async (res) => {
        if (!res.confirm) return
        setSubmitting(true)
        Taro.showLoading({title: '提交中...'})
        const requiredMaterials: string[] = []
        if (selectedReason?.need_photo) requiredMaterials.push('照片凭证')
        if (selectedReason?.need_video) requiredMaterials.push('视频凭证')
        const {error} = await createAfterSale({
          user_id: user.id,
          order_no: orderNo.trim(),
          type: TYPE_KEYS[typeIdx],
          reason: selectedReason?.name || '',
          reason_category: selectedReason?.key || '',
          required_materials: requiredMaterials,
          description: description.trim(),
          images,
          evidence_urls: images,
          status: 'submitted'
        })
        Taro.hideLoading()
        setSubmitting(false)
        if (error) {
          Taro.showToast({title: '提交失败，请重试', icon: 'none'})
          return
        }
        Taro.showToast({title: '申请已提交'})
        setShowForm(false)
        setOrderNo('')
        setDescription('')
        setImages([])
        loadRecords()
      }
    })
  }

  const statusColor = (s: AfterSaleRecord['status']) => {
    if (s === 'completed') return 'bg-emerald-50 text-emerald-600 border border-emerald-200'
    if (s === 'rejected') return 'bg-red-50 text-red-500 border border-red-200'
    return 'bg-amber-50 text-amber-700 border border-amber-200'
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 顶部说明 */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-2">
          <View className="w-1 h-5 bg-primary rounded-full mr-2" />
          <Text className="text-xl font-bold text-foreground">售后中心</Text>
        </View>
        <Text className="text-sm text-muted-foreground leading-relaxed">
          支持退货、换货、退款、物流破损申报。流程：提交申请 → 平台审核 → 处理中 → 物流处理 →
          完成/驳回。破损申报请上传照片凭证。
        </Text>
        <View
          className="mt-3 bg-primary rounded-xl flex items-center justify-center"
          onClick={() => setShowForm(!showForm)}>
          <Text className="text-base text-primary-foreground font-bold py-3">
            {showForm ? '收起申请表' : '申请售后'}
          </Text>
        </View>
      </View>

      {/* 申请表单 */}
      {showForm && (
        <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
          <View className="flex flex-col gap-3">
            <View>
              <Text className="text-sm text-muted-foreground mb-1.5 block">售后订单号</Text>
              <View className="bg-muted rounded-xl px-3 py-2.5">
                <input
                  className="w-full text-base text-foreground"
                  value={orderNo}
                  placeholder="输入订单号（可在订单详情查看）"
                  onInput={(e) => setOrderNo(((e as any).detail?.value ?? (e as any).target?.value ?? '') as string)}
                />
              </View>
            </View>

            <View className="flex flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground mb-1.5 block">售后类型</Text>
                <Picker
                  mode="selector"
                  range={TYPE_KEYS.map((t) => AFTER_SALE_TYPE_LABELS[t])}
                  value={typeIdx}
                  onChange={(e) => setTypeIdx(Number(e.detail.value))}>
                  <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                    <Text className="text-base text-foreground">{AFTER_SALE_TYPE_LABELS[TYPE_KEYS[typeIdx]]}</Text>
                    <View className="i-mdi-chevron-down text-muted-foreground" />
                  </View>
                </Picker>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground mb-1.5 block">问题原因</Text>
                <Picker
                  mode="selector"
                  range={reasons.map((r) => r.name)}
                  value={reasonIdx}
                  onChange={(e) => setReasonIdx(Number(e.detail.value))}>
                  <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                    <Text className="text-base text-foreground">{reasons[reasonIdx]?.name || '加载中...'}</Text>
                    <View className="i-mdi-chevron-down text-muted-foreground" />
                  </View>
                </Picker>
              </View>
            </View>

            <View>
              <Text className="text-sm text-muted-foreground mb-1.5 block">问题描述</Text>
              <View className="bg-muted rounded-xl p-3">
                <Textarea
                  className="w-full text-base text-foreground"
                  value={description}
                  maxlength={500}
                  placeholder="详细描述遇到的问题（如破损情况、商品问题等）"
                  onInput={(e) =>
                    setDescription(((e as any).detail?.value ?? (e as any).target?.value ?? '') as string)
                  }
                  style={{height: '140rpx'}}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm text-muted-foreground mb-1.5 block">
                上传凭证照片
                {reasons[reasonIdx]?.need_photo ? '（当前原因需上传照片）' : '（可选，最多6张）'}
              </Text>
              <View className="flex flex-row flex-wrap gap-2">
                {images.map((img, i) => (
                  <View key={i} className="w-20 h-20 rounded-xl overflow-hidden relative">
                    <Image src={img} mode="aspectFill" className="w-full h-full" />
                    <View
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                      onClick={() => setImages(images.filter((_, idx) => idx !== i))}>
                      <View className="i-mdi-close text-white text-xs" />
                    </View>
                  </View>
                ))}
                {images.length < 6 && (
                  <View
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center"
                    onClick={handleChooseImage}>
                    <View className="i-mdi-camera-outline text-xl text-muted-foreground" />
                    <Text className="text-xs text-muted-foreground mt-0.5">{uploading ? '上传中' : '添加'}</Text>
                  </View>
                )}
              </View>
            </View>

            <View
              className={`rounded-xl flex items-center justify-center ${submitting ? 'bg-primary/50' : 'bg-primary'}`}
              onClick={handleSubmit}>
              <Text className="text-base text-primary-foreground font-bold py-3">
                {submitting ? '提交中...' : '提交申请'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 售后记录列表 */}
      {loading ? (
        <View className="py-12 items-center">
          <Text className="text-sm text-muted-foreground">加载售后记录中...</Text>
        </View>
      ) : records.length === 0 ? (
        <View className="bg-muted/60 rounded-3xl p-8 items-center mb-8">
          <View className="i-mdi-package-variant-closed-remove text-4xl text-muted-foreground/40 mb-2" />
          <Text className="text-sm text-muted-foreground text-center leading-relaxed">
            暂无售后记录{'\n'}如需退货/换货/退款/破损申报，请点击上方"申请售后"
          </Text>
        </View>
      ) : (
        <View className="flex flex-col gap-3 mb-8">
          {records.map((r) => (
            <View key={r.id} className="bg-card rounded-3xl p-4 shadow-card border border-border border-opacity-10">
              <View className="flex flex-row items-center justify-between mb-2.5">
                <Text className="text-base font-bold text-foreground">{AFTER_SALE_TYPE_LABELS[r.type]}</Text>
                <View className={`rounded-full px-2.5 py-1 ${statusColor(r.status)}`}>
                  <Text className="text-xs font-bold">{AFTER_SALE_STATUS_LABELS[r.status]}</Text>
                </View>
              </View>
              <View className="flex flex-row items-center mb-2">
                <Text className="text-xs text-muted-foreground">订单号：{r.order_no}</Text>
              </View>

              {/* 流程步骤 */}
              {r.status !== 'rejected' ? (
                <View className="flex flex-row items-center mb-2">
                  {AFTER_SALE_FLOW_STEPS.map((step, i) => {
                    const stepOrder = ['submitted', 'reviewing', 'processing', 'logistics', 'completed']
                    const currentIdx = stepOrder.indexOf(r.status)
                    const done = i <= currentIdx
                    return (
                      <View key={step.key} className="flex flex-row items-center flex-1">
                        <View
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            done ? 'bg-primary' : 'bg-muted'
                          }`}>
                          {done ? (
                            <View className="i-mdi-check text-white text-xs" />
                          ) : (
                            <View className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                          )}
                        </View>
                        {i < AFTER_SALE_FLOW_STEPS.length - 1 && (
                          <View className={`flex-1 h-0.5 ${i < currentIdx ? 'bg-primary' : 'bg-muted'} mx-0.5`} />
                        )}
                      </View>
                    )
                  })}
                </View>
              ) : null}
              <View className="flex flex-row items-center justify-between mb-2">
                {AFTER_SALE_FLOW_STEPS.map((s, i) => (
                  <Text
                    key={s.key}
                    className={`text-xs flex-1 text-center ${i === 0 ? 'text-left' : i === 4 ? 'text-right' : ''} text-muted-foreground`}>
                    {s.label}
                  </Text>
                ))}
              </View>

              {r.reason && <Text className="text-xs text-muted-foreground mb-1">原因：{r.reason}</Text>}
              <Text className="text-sm text-foreground leading-relaxed mb-2" numberOfLines={2}>
                {r.description}
              </Text>
              {r.images.length > 0 && (
                <View className="flex flex-row flex-wrap gap-1.5">
                  {r.images.slice(0, 4).map((img, i) => (
                    <Image key={i} src={img} mode="aspectFill" className="w-14 h-14 rounded-lg" />
                  ))}
                </View>
              )}
              {r.status === 'rejected' && r.admin_note && (
                <View className="bg-red-50 border border-red-200 rounded-xl p-2.5 mt-2">
                  <Text className="text-xs text-red-500 leading-relaxed">驳回原因：{r.admin_note}</Text>
                </View>
              )}
              <Text className="text-xs text-muted-foreground mt-2">{r.created_at?.slice(0, 16).replace('T', ' ')}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
