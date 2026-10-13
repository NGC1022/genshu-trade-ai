import {Button, Image, Input, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createDraft, createNote, getDraftDetail, getSKUList, updateDraft, uploadNoteImage} from '@/db/api'
import type {SKU} from '@/db/types'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'
import {checkNoteSafety} from '@/utils/security'

const NOTE_LOCATION_OPTIONS = [
  {
    name: '根书文创园游客中心',
    address: '北京市房山区青龙湖镇根书文创园游客中心',
    latitude: 39.7256,
    longitude: 116.0147
  },
  {name: '根书艺术馆', address: '北京市房山区青龙湖镇根书文创园艺术馆', latitude: 39.7245, longitude: 116.0135},
  {name: '根书文创园纪念品店', address: '北京市房山区青龙湖镇根书文创园1号楼', latitude: 39.7234, longitude: 116.0123}
]

export default function NoteCreate() {
  const router = useRouter()
  const {draftId} = router.params
  const {user} = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [topics, setTopics] = useState<string[]>([])
  const [currentTopic, setCurrentTopic] = useState('')
  const [location, setLocation] = useState<{latitude: number; longitude: number; address: string} | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<string[]>([])
  const [recommendedSKUs, setRecommendedSKUs] = useState<SKU[]>([])
  const [loading, setLoading] = useState(false)
  const [showLocationTools, setShowLocationTools] = useState(false)
  const [locationKeyword, setLocationKeyword] = useState('')

  const loadRecommendedSKUs = useCallback(async (skus: string[]) => {
    if (skus.length === 0) {
      setRecommendedSKUs([])
      return
    }
    const {data: allSKUs} = await getSKUList()
    const filtered = allSKUs.filter((sku) => skus.includes(sku.sku_code))
    setRecommendedSKUs(filtered)
  }, [])

  const loadDraft = useCallback(async () => {
    if (!draftId) return
    const {data} = await getDraftDetail(draftId)
    if (data) {
      setTitle(data.title || '')
      setContent(data.content || '')
      setImages(data.images || [])
      setTopics(data.topics || [])
      setLocation(data.location || null)
      setRecommendedProducts(data.recommended_products || [])
      if (data.recommended_products && data.recommended_products.length > 0) {
        loadRecommendedSKUs(data.recommended_products)
      }
    }
  }, [draftId, loadRecommendedSKUs])

  useDidShow(() => {
    // 加载草稿
    if (draftId) {
      loadDraft()
    }

    // 从商品选择页面返回时获取选中的商品
    const selected = Taro.getStorageSync('selected_products')
    if (selected && Array.isArray(selected)) {
      setRecommendedProducts(selected)
      // 清除缓存防止干扰下次进入
      Taro.removeStorageSync('selected_products')
      // 加载选中商品的详细信息用于预览
      loadRecommendedSKUs(selected)
    }
  })

  const handleChooseImage = async () => {
    const remainingSlots = 9 - images.length
    if (remainingSlots <= 0) {
      Taro.showToast({title: '最多只能上传9张图片', icon: 'none'})
      return
    }

    try {
      const res = await Taro.chooseImage({
        count: remainingSlots,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      const tempFilePaths = res.tempFilePaths

      Taro.showLoading({title: '上传中...'})
      const uploadPromises = tempFilePaths.map((path) => uploadNoteImage({path, size: 0}))
      const results = await Promise.all(uploadPromises)

      const newImages = results.filter((r) => r.success && r.url).map((r) => r.url as string)

      setImages([...images, ...newImages])
      Taro.hideLoading()
    } catch (_e) {
      Taro.showToast({title: '选择图片失败', icon: 'none'})
    }
  }

  const handleRemoveImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    setImages(newImages)
    if (coverIndex >= newImages.length) {
      setCoverIndex(Math.max(0, newImages.length - 1))
    }
  }

  const handleSetCover = (index: number) => {
    setCoverIndex(index)
    Taro.showToast({title: '已设为封面', icon: 'success', duration: 1000})
  }

  const handleLongPressImage = (index: number) => {
    const itemList = ['设为封面', '向前移动', '向后移动', '删除图片']
    Taro.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === 0) {
          // 设为封面
          handleSetCover(index)
        } else if (res.tapIndex === 1) {
          // 向前移动
          if (index > 0) {
            const newImages = [...images]
            const temp = newImages[index]
            newImages[index] = newImages[index - 1]
            newImages[index - 1] = temp
            setImages(newImages)
            // 更新封面索引
            if (coverIndex === index) {
              setCoverIndex(index - 1)
            } else if (coverIndex === index - 1) {
              setCoverIndex(index)
            }
            Taro.showToast({title: '已向前移动', icon: 'success', duration: 1000})
          } else {
            Taro.showToast({title: '已经是第一张了', icon: 'none'})
          }
        } else if (res.tapIndex === 2) {
          // 向后移动
          if (index < images.length - 1) {
            const newImages = [...images]
            const temp = newImages[index]
            newImages[index] = newImages[index + 1]
            newImages[index + 1] = temp
            setImages(newImages)
            // 更新封面索引
            if (coverIndex === index) {
              setCoverIndex(index + 1)
            } else if (coverIndex === index + 1) {
              setCoverIndex(index)
            }
            Taro.showToast({title: '已向后移动', icon: 'success', duration: 1000})
          } else {
            Taro.showToast({title: '已经是最后一张了', icon: 'none'})
          }
        } else if (res.tapIndex === 3) {
          // 删除图片
          handleRemoveImage(index)
        }
      }
    })
  }

  const handleChooseLocation = async () => {
    try {
      const res = await Taro.chooseLocation({})
      setLocation({
        latitude: res.latitude,
        longitude: res.longitude,
        address: res.name || res.address
      })
      Taro.showToast({title: '位置已添加', icon: 'success'})
    } catch (e: any) {
      console.error('选择位置失败:', e)
      if (e.errMsg?.includes('auth deny')) {
        Taro.showModal({
          title: '需要位置权限',
          content: '请在设置中允许小程序访问您的位置信息',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              Taro.openSetting()
            }
          }
        })
      } else {
        Taro.showToast({title: '未选择位置', icon: 'none'})
      }
    }
  }

  const handleUseCurrentLocation = async () => {
    try {
      const res = await Taro.getLocation({type: 'gcj02'})
      setLocation({
        latitude: res.latitude,
        longitude: res.longitude,
        address: `我的当前位置（${res.latitude.toFixed(5)}, ${res.longitude.toFixed(5)}）`
      })
      setShowLocationTools(false)
      Taro.showToast({title: '已获取当前位置', icon: 'success'})
    } catch (e: any) {
      Taro.showToast({
        title: e?.errMsg?.includes('auth deny') ? '请在设置中允许定位权限' : '暂时无法获取当前位置',
        icon: 'none'
      })
    }
  }

  const filteredLocationOptions = NOTE_LOCATION_OPTIONS.filter((item) =>
    `${item.name}${item.address}`.includes(locationKeyword.trim())
  )

  const handleAddProduct = () => {
    // 将已选商品存入缓存供选择页初始化
    Taro.setStorageSync('selected_products', recommendedProducts)
    Taro.navigateTo({url: '/pages/product-select/index'})
  }

  const handleRemoveProduct = (sku: string) => {
    const newList = recommendedProducts.filter((s) => s !== sku)
    setRecommendedProducts(newList)
    setRecommendedSKUs(recommendedSKUs.filter((s) => s.sku_code !== sku))
  }

  const handleSubmit = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }
    if (!title.trim() || !content.trim()) {
      Taro.showToast({title: '请填写标题和内容', icon: 'none'})
      return
    }

    // 内容安全审核
    const safetyCheck = checkNoteSafety(title, content)
    if (!safetyCheck.isSafe) {
      Taro.showModal({
        title: '发布失败',
        content: `内容未通过安全审核：${safetyCheck.reason}。请修改后重试。`,
        showCancel: false
      })
      return
    }

    setLoading(true)
    const {error} = await createNote({
      user_id: user.id,
      title,
      content,
      images,
      cover_image: images.length > 0 ? images[coverIndex] : undefined,
      topics: topics.length > 0 ? topics : [],
      location: location || undefined,
      recommended_products: recommendedProducts.length > 0 ? recommendedProducts : undefined
    })
    setLoading(false)

    if (error) {
      Taro.showToast({title: `发布失败: ${error.message}`, icon: 'none'})
    } else {
      Taro.showToast({title: '发布成功', icon: 'success'})
      // 如果是从草稿编辑的，删除草稿
      if (draftId) {
        await import('@/db/api').then((m) => m.deleteDraft(draftId))
      }
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  }

  const handleSaveDraft = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    // 内容安全审核 (草稿也需要审核，防止恶意内容)
    const safetyCheck = checkNoteSafety(title, content)
    if (!safetyCheck.isSafe) {
      Taro.showModal({
        title: '保存失败',
        content: `内容未通过安全审核：${safetyCheck.reason}。请修改后重试。`,
        showCancel: false
      })
      return
    }

    const draftData = {
      user_id: user.id,
      title,
      content,
      images,
      topics: topics.length > 0 ? topics : [],
      location: location || undefined,
      recommended_products: recommendedProducts.length > 0 ? recommendedProducts : undefined
    }

    setLoading(true)
    if (draftId) {
      // 更新现有草稿
      const {error} = await updateDraft(draftId, draftData)
      setLoading(false)
      if (!error) {
        Taro.showToast({title: '草稿已更新', icon: 'success'})
        setTimeout(() => Taro.navigateBack(), 1500)
      } else {
        Taro.showToast({title: '保存失败', icon: 'none'})
      }
    } else {
      // 创建新草稿
      const {error} = await createDraft(draftData)
      setLoading(false)
      if (!error) {
        Taro.showToast({title: '已保存到草稿箱', icon: 'success'})
        setTimeout(() => Taro.navigateBack(), 1500)
      } else {
        Taro.showToast({title: '保存失败', icon: 'none'})
      }
    }
  }

  return (
    <View className="min-h-screen bg-white flex flex-col">
      <ScrollView className="flex-1" scrollY>
        <View className="p-4">
          {/* 正文输入 - 朋友圈风格 */}
          <View className="mb-6">
            <Textarea
              className="w-full text-base leading-relaxed"
              placeholder="这一刻的想法..."
              value={content}
              onInput={(e) => setContent(e.detail.value)}
              maxlength={2000}
              autoHeight
              style={{minHeight: '120px'}}
            />
          </View>

          {/* 图片选择区域 - 支持长按调整顺序 */}
          <View className="flex flex-wrap gap-2 mb-6">
            {images.map((src, index) => (
              <View
                key={index}
                className="relative w-[30%] aspect-square rounded-lg overflow-hidden bg-slate-100"
                onLongPress={() => handleLongPressImage(index)}>
                <Image src={src} className="w-full h-full" mode="aspectFill" />
                {coverIndex === index && (
                  <View className="absolute top-1 left-1 bg-primary px-2 py-0.5 rounded">
                    <Text className="text-white text-xs font-bold">封面</Text>
                  </View>
                )}
                <View
                  className="absolute top-1 right-1 w-6 h-6 bg-black bg-opacity-60 rounded-full flex items-center justify-center"
                  onClick={() => handleRemoveImage(index)}>
                  <View className="i-mdi-close text-sm text-white" />
                </View>
              </View>
            ))}
            {images.length < 9 && (
              <View
                className="w-[30%] aspect-square border border-slate-200 rounded-lg flex flex-col items-center justify-center bg-slate-50 active:bg-slate-100"
                onClick={handleChooseImage}>
                <View className="i-mdi-image-plus text-3xl text-slate-400" />
                <Text className="text-xs text-slate-400 mt-1">{images.length}/9</Text>
              </View>
            )}
          </View>

          {/* 标题输入 */}
          <View className="border-t border-slate-100 pt-4 mb-4">
            <View className="flex flex-row items-center mb-2">
              <View className="i-mdi-format-title text-xl text-slate-600 mr-2" />
              <Text className="text-sm text-slate-500">标题（可选）</Text>
            </View>
            <Input
              className="text-lg font-medium w-full bg-slate-50 rounded-lg px-3 py-2"
              placeholder="给你的笔记起个标题"
              value={title}
              onInput={(e) => setTitle(e.detail.value)}
              maxlength={50}
            />
          </View>

          {/* 话题 */}
          <View className="border-t border-slate-100 py-4 mb-4">
            <View className="flex flex-row items-center mb-3">
              <View className="i-mdi-pound text-xl text-primary mr-2" />
              <Text className="text-base text-slate-700 font-semibold">话题（最多3个）</Text>
            </View>

            {/* 已添加的话题 */}
            {topics.length > 0 && (
              <View className="flex flex-row flex-wrap gap-2 mb-3">
                {topics.map((t, idx) => (
                  <View key={idx} className="flex flex-row items-center bg-primary/10 rounded-full px-3 py-1">
                    <Text className="text-sm text-primary mr-2">#{t}</Text>
                    <View
                      className="i-mdi-close text-base text-primary"
                      onClick={() => setTopics(topics.filter((_, i) => i !== idx))}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* 添加新话题 */}
            {topics.length < 3 && (
              <View className="flex flex-row items-center">
                <Input
                  className="flex-1 text-base bg-slate-50 rounded-lg px-3 py-2"
                  placeholder="输入话题名称"
                  value={currentTopic}
                  onInput={(e) => setCurrentTopic(e.detail.value)}
                />
                <View
                  className={`ml-2 w-8 h-8 rounded-full flex items-center justify-center ${currentTopic.trim() ? 'bg-primary' : 'bg-slate-200'}`}
                  onClick={() => {
                    if (currentTopic.trim() && topics.length < 3) {
                      setTopics([...topics, currentTopic.trim()])
                      setCurrentTopic('')
                    }
                  }}>
                  <View className={`i-mdi-plus text-xl ${currentTopic.trim() ? 'text-white' : 'text-slate-400'}`} />
                </View>
              </View>
            )}
          </View>

          {/* 位置 */}
          <View
            className="flex flex-row items-center border-t border-slate-100 py-4 mb-4 active:bg-slate-50"
            onClick={() => setShowLocationTools((current) => !current)}>
            <View className="i-mdi-map-marker text-xl text-blue-500 mr-2" />
            <Text className="flex-1 text-base text-slate-700">{location ? location.address : '添加位置'}</Text>
            {location && (
              <View
                className="i-mdi-close-circle text-lg text-slate-400"
                onClick={(e) => {
                  e.stopPropagation()
                  setLocation(null)
                }}
              />
            )}
          </View>

          {showLocationTools && (
            <View className="bg-blue-50 rounded-xl p-3 mb-4 border border-blue-100">
              <View className="flex flex-row gap-2 mb-3">
                <View className="flex-1 bg-white rounded-lg px-3 py-2" onClick={handleUseCurrentLocation}>
                  <Text className="text-sm text-blue-700 font-bold">使用当前位置</Text>
                </View>
                <View className="flex-1 bg-white rounded-lg px-3 py-2" onClick={handleChooseLocation}>
                  <Text className="text-sm text-blue-700 font-bold">打开地图选择</Text>
                </View>
              </View>
              <Input
                className="bg-white rounded-lg px-3 py-2 text-sm"
                placeholder="搜索园区、艺术馆或店铺"
                value={locationKeyword}
                onInput={(e) => setLocationKeyword(e.detail.value)}
              />
              {filteredLocationOptions.map((item) => (
                <View
                  key={item.name}
                  className="bg-white rounded-lg p-3 mt-2"
                  onClick={() => {
                    setLocation(item)
                    setShowLocationTools(false)
                  }}>
                  <Text className="text-sm font-bold text-slate-700 block">{item.name}</Text>
                  <Text className="text-xs text-slate-500 block mt-1">{item.address}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 产品推荐 */}
          <View className="border-t border-slate-100 py-4 mb-4">
            <View className="flex flex-row items-center mb-3 active:opacity-60" onClick={handleAddProduct}>
              <View className="i-mdi-cart-plus text-xl text-amber-600 mr-2" />
              <Text className="text-base font-medium text-slate-700">推荐相关商品（最多3件）</Text>
              <View className="i-mdi-chevron-right text-lg text-slate-400 ml-auto" />
            </View>
            {recommendedSKUs.length > 0 && (
              <View className="flex flex-col gap-2">
                {recommendedSKUs.map((sku) => (
                  <View
                    key={sku.sku_code}
                    className="flex flex-row items-center bg-amber-50 rounded-lg p-2 border border-amber-100 relative">
                    <Image
                      src={sku.image_url || DEFAULT_PRODUCT_IMAGE}
                      className="w-12 h-12 rounded bg-slate-100 mr-2"
                      mode="aspectFill"
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-slate-800 block truncate">{sku.name}</Text>
                      <Text className="text-xs text-primary font-bold">¥{sku.price}</Text>
                    </View>
                    <View
                      className="i-mdi-close-circle text-lg text-amber-600 ml-2 p-1 active:opacity-60"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveProduct(sku.sku_code)
                      }}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 底部按钮区域 */}
      <View className="bg-white border-t border-slate-100 px-4 py-3 safe-area-bottom">
        <View className="flex flex-row gap-3">
          <Button
            className="flex-1 bg-slate-100 text-slate-700 rounded-xl text-base font-bold border-0"
            onClick={handleSaveDraft}
            loading={loading}>
            <View className="py-3">
              <Text className="text-slate-700">保存草稿</Text>
            </View>
          </Button>
          <Button
            className="flex-1 bg-primary text-white rounded-xl text-base font-bold border-0"
            onClick={handleSubmit}
            loading={loading}>
            <View className="py-3">
              <Text className="text-white">发布</Text>
            </View>
          </Button>
        </View>
      </View>
    </View>
  )
}
