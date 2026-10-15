// AI商品国际化：选择现有商品 → AI生成英文商品信息（演示模式）

import {Image, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createAiTradeRecord, getSKUList} from '@/db/api'
import type {SKU} from '@/db/types'
import {useLanguage} from '@/hooks/useLanguage'
import {
  AiServiceError,
  DEMO_BADGE_TEXT,
  DEMO_PRODUCT,
  generateProductInternationalization,
  type ProductIntlInput,
  type ProductIntlResult
} from '@/services/aiTrade'
import {DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

export default function AiTradeTranslate() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const {user} = useAuth()
  const [products, setProducts] = useState<SKU[]>([])
  const [selected, setSelected] = useState<SKU | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ProductIntlResult | null>(null)

  useEffect(() => {
    getSKUList().then(({data}) => setProducts(data))
  }, [])

  // 基于SKU构造AI输入（SKU无材质/规格/文化背景字段时置undefined，页面显示"待确认"）
  const buildInput = useCallback((sku: SKU): ProductIntlInput => {
    return {
      productId: sku.sku_code,
      name: sku.name,
      description: sku.description || undefined,
      category: sku.category,
      price: sku.price,
      imageUrl: sku.image_url || undefined
    }
  }, [])

  const handleSelect = (sku: SKU) => {
    setSelected(sku)
    setIsDemo(false)
    setResult(null)
  }

  const handleLoadDemo = () => {
    setSelected(null)
    setIsDemo(true)
    setResult(null)
  }

  const handleGenerate = async () => {
    if (loading) return
    const input = isDemo ? DEMO_PRODUCT : selected ? buildInput(selected) : null
    if (!input) {
      Taro.showToast({title: ui('请先选择商品', 'Please select a product first'), icon: 'none'})
      return
    }
    setLoading(true)
    try {
      const res = await generateProductInternationalization(input)
      setResult(res)
    } catch (err) {
      const msg =
        language === 'en'
          ? 'AI generation failed. Please retry.'
          : err instanceof AiServiceError
            ? err.message
            : 'AI生成失败，请重试'
      Taro.showToast({title: msg, icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    const text = [
      `Title: ${result.title}`,
      `Description: ${result.description}`,
      `Features:\n- ${result.features.join('\n- ')}`,
      `Keywords: ${result.keywords.join(', ')}`,
      `Cultural Background: ${result.cultural_background}`,
      `Material: ${result.material}`,
      `Specification: ${result.specification}`,
      `Notice: ${result.notice}`
    ].join('\n\n')
    try {
      await Taro.setClipboardData({data: text})
      Taro.showToast({title: ui('已复制到剪贴板', 'Copied to clipboard')})
    } catch {
      Taro.showToast({title: ui('复制失败', 'Copy failed'), icon: 'none'})
    }
  }

  const handleSave = async () => {
    if (!result) return
    if (!user) {
      Taro.showToast({title: ui('请先登录后保存', 'Please sign in to save this result'), icon: 'none'})
      return
    }
    const input = isDemo ? DEMO_PRODUCT : selected ? buildInput(selected) : null
    if (!input) return
    Taro.showLoading({title: ui('保存中...', 'Saving...')})
    const {error} = await createAiTradeRecord({
      user_id: user.id,
      type: 'product_translate',
      product_id: input.productId,
      product_name: isDemo ? DEMO_PRODUCT.name : selected?.name,
      market: 'English',
      input_data: {...input},
      ai_result: {...result},
      status: 'draft',
      is_demo: isDemo
    })
    Taro.hideLoading()
    if (error) {
      Taro.showToast({title: ui('保存失败，请重试', 'Save failed. Please retry.'), icon: 'none'})
      return
    }
    Taro.showToast({title: ui('已保存至业务记录', 'Saved to AI trade records')})
  }

  const InfoRow = ({label, value}: {label: string; value: string}) => (
    <View className="flex flex-col mb-3">
      <Text className="text-sm text-muted-foreground mb-1">{label}</Text>
      <Text className="text-base text-foreground leading-relaxed">{value}</Text>
    </View>
  )

  // ===== 需求九：国际化资料完整度检查（基于系统真实SKU字段） =====
  const INTL_CHECK_FIELDS: Array<{key: string; label: string; get: (s: SKU) => string}> = [
    {key: 'name_en', label: ui('英文标题', 'English Title'), get: (s) => s.name_en || ''},
    {key: 'description_en', label: ui('英文描述', 'English Description'), get: (s) => s.description_en || ''},
    {key: 'material', label: ui('材质', 'Material'), get: (s) => s.material || ''},
    {key: 'dimensions', label: ui('尺寸', 'Dimensions'), get: (s) => s.dimensions || ''},
    {key: 'weight_grams', label: ui('重量', 'Weight'), get: (s) => (s.weight_grams ? `${s.weight_grams}g` : '')},
    {key: 'packaging', label: ui('包装方式', 'Packaging'), get: (s) => s.packaging || ''},
    {key: 'origin', label: ui('原产地', 'Country of Origin'), get: (s) => s.origin || ''},
    {key: 'lead_time', label: ui('交货周期', 'Lead Time'), get: (s) => s.lead_time || ''},
    {key: 'after_sales_policy', label: ui('售后政策', 'After-Sales Policy'), get: (s) => s.after_sales_policy || ''},
    {
      key: 'sellable_countries',
      label: ui('可销售国家', 'Eligible Markets'),
      get: (s) => (s.sellable_countries || []).join('、')
    }
  ]

  const checkTarget = isDemo ? null : selected
  const completeness = useMemo(() => {
    if (!checkTarget) return null
    const missing = INTL_CHECK_FIELDS.filter((f) => !f.get(checkTarget).trim())
    const filled = INTL_CHECK_FIELDS.length - missing.length
    return {percent: Math.round((filled / INTL_CHECK_FIELDS.length) * 100), missing: missing.map((m) => m.label)}
  }, [checkTarget, INTL_CHECK_FIELDS.length, INTL_CHECK_FIELDS.filter])

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 商品选择 */}
      <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-foreground">{ui('选择现有商品', 'Select a Product')}</Text>
          <View
            className="bg-amber-50 border border-amber-200 rounded-full px-3 py-1 active:scale-95 transition-all"
            onClick={handleLoadDemo}>
            <Text className="text-sm text-amber-700 font-bold">
              {isDemo ? ui(`已加载${DEMO_BADGE_TEXT}`, 'Demo Loaded') : ui('加载演示案例', 'Load Demo')}
            </Text>
          </View>
        </View>
        <View className="flex flex-col gap-3 max-h-[480px] overflow-y-auto">
          {products.map((p) => {
            const active = !isDemo && selected?.id === p.id
            return (
              <View
                key={p.id}
                className={`flex flex-row items-center rounded-2xl border-2 p-3 active:scale-[0.98] transition-all ${active ? 'border-selected-bg bg-selected-bg' : 'border-border border-opacity-20'}`}
                onClick={() => handleSelect(p)}>
                <Image
                  src={p.image_url || DEFAULT_PRODUCT_IMAGE}
                  mode="aspectFill"
                  className="w-14 h-14 rounded-xl mr-3"
                />
                <View className="flex-1 min-w-0">
                  <Text className="text-base text-foreground font-bold truncate block">{p.name}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {language === 'en' ? 'CNY ' : '¥'}
                    {p.price?.toFixed(2)} · {p.sku_code}
                  </Text>
                </View>
                {active && <View className="i-mdi-check-circle text-primary text-xl ml-2" />}
              </View>
            )
          })}
          {isDemo && (
            <View className="flex flex-row items-center rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
              <View className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mr-3">
                <View className="i-mdi-bookmark-outline text-2xl text-amber-500" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base text-foreground font-bold truncate block">
                  {ui('来源商品', 'Source Product')}:{' '}
                  {language === 'en' ? 'Root Calligraphy Bookmark Set' : DEMO_PRODUCT.name} (
                  {language === 'en' ? 'Demo' : DEMO_BADGE_TEXT})
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {language === 'en' ? 'CNY ' : '¥'}
                  {DEMO_PRODUCT.price?.toFixed(2)} · {ui('5枚装 · 天然木材', 'Set of 5 · Natural wood')}
                </Text>
              </View>
              <View className="i-mdi-check-circle text-amber-500 text-xl ml-2" />
            </View>
          )}
        </View>
      </View>

      {/* 国际化资料完整度检查（需求九） */}
      {completeness && (
        <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-foreground">
              {ui('国际化资料完整度', 'Localization Readiness')}
            </Text>
            <Text
              className={`text-2xl font-black ${
                completeness.percent >= 80
                  ? 'text-emerald-600'
                  : completeness.percent >= 50
                    ? 'text-amber-500'
                    : 'text-red-500'
              }`}>
              {completeness.percent}%
            </Text>
          </View>
          <View className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-3">
            <View
              className={`h-full rounded-full ${
                completeness.percent >= 80
                  ? 'bg-emerald-500'
                  : completeness.percent >= 50
                    ? 'bg-amber-400'
                    : 'bg-red-400'
              }`}
              style={{width: `${completeness.percent}%`}}
            />
          </View>
          {completeness.missing.length > 0 ? (
            <View>
              <Text className="text-sm text-muted-foreground mb-2">
                {ui(
                  '缺失字段（显示“待确认”，AI不代填事实数据）',
                  'Missing fields (shown as “To be confirmed”; AI will not invent facts)'
                )}
              </Text>
              <View className="flex flex-row flex-wrap gap-2">
                {completeness.missing.map((m) => (
                  <View key={m} className="bg-red-50 border border-red-200 rounded-full px-3 py-1">
                    <Text className="text-xs text-red-600">
                      {m} · {ui('待确认', 'To be confirmed')}
                    </Text>
                  </View>
                ))}
              </View>
              <Text className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {ui(
                  '真实尺寸、重量、库存、价格、交货周期等事实数据须由系统或人工输入；AI仅辅助生成语言内容。',
                  'Facts such as dimensions, weight, inventory, price, and lead time must be entered by the system or a person; AI only assists with language content.'
                )}
              </Text>
            </View>
          ) : (
            <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex flex-row items-center">
              <View className="i-mdi-check-circle text-emerald-500 text-base mr-2" />
              <Text className="text-sm text-emerald-700">
                {ui(
                  '国际化资料完整，可进行AI英文内容生成',
                  'Localization data is complete and ready for English copy generation'
                )}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 原始商品信息 */}
      {(selected || isDemo) && (
        <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
          <Text className="text-lg font-bold text-foreground mb-3">
            {ui('原始商品信息', 'Original Source Product Information')}
          </Text>
          <InfoRow
            label={ui('商品名称', 'Source Product Name')}
            value={isDemo ? DEMO_PRODUCT.name : selected?.name || ui('待确认', 'Not provided')}
          />
          <InfoRow
            label={ui('价格', 'Price')}
            value={`${language === 'en' ? 'CNY ' : '¥'}${(isDemo ? DEMO_PRODUCT.price : selected?.price)?.toFixed(2)}`}
          />
          <InfoRow
            label={ui('材质', 'Material')}
            value={
              isDemo
                ? DEMO_PRODUCT.material || ui('待确认', 'Not provided')
                : selected?.material || ui('待确认', 'Not provided')
            }
          />
          <InfoRow
            label={ui('规格', 'Specification')}
            value={
              isDemo
                ? DEMO_PRODUCT.specification || ui('待确认', 'Not provided')
                : selected?.dimensions || ui('待确认', 'Not provided')
            }
          />
          <InfoRow
            label={ui('描述', 'Description')}
            value={
              isDemo
                ? DEMO_PRODUCT.description || ui('待确认', 'Not provided')
                : selected?.description || ui('待确认', 'Not provided')
            }
          />
          <InfoRow
            label={ui('文化背景', 'Cultural Background')}
            value={
              isDemo
                ? DEMO_PRODUCT.culturalBackground || ui('待确认', 'Not provided')
                : ui('待确认（SKU未提供）', 'Not provided by SKU')
            }
          />
        </View>
      )}

      {/* 生成按钮 */}
      <View
        className={`rounded-full flex items-center justify-center py-4 mb-4 shadow-elegant active:scale-[0.98] transition-all ${loading ? 'bg-primary/50' : 'bg-primary'}`}
        onClick={handleGenerate}>
        <Text className="text-lg text-primary-foreground font-black">
          {loading
            ? ui('AI生成中，请稍候...', 'Generating English copy...')
            : ui('AI生成海外商品信息', 'Generate English Product Copy')}
        </Text>
      </View>

      {/* AI结果 */}
      {result && (
        <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 mb-4">
          <View className="flex flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">
              {ui('英文商品信息（English）', 'English Product Copy')}
            </Text>
            {isDemo && (
              <View className="bg-amber-100 rounded-full px-2 py-0.5">
                <Text className="text-xs text-amber-700 font-bold">{language === 'en' ? 'Demo' : DEMO_BADGE_TEXT}</Text>
              </View>
            )}
          </View>
          <InfoRow label="Title" value={result.title} />
          <InfoRow label="Description" value={result.description} />
          <View className="flex flex-col mb-3">
            <Text className="text-sm text-muted-foreground mb-1">Features</Text>
            {result.features.map((f, i) => (
              <View key={i} className="flex flex-row items-start mb-1">
                <View className="i-mdi-check text-primary text-base mr-1.5 mt-0.5" />
                <Text className="text-base text-foreground leading-relaxed flex-1">{f}</Text>
              </View>
            ))}
          </View>
          <View className="flex flex-col mb-3">
            <Text className="text-sm text-muted-foreground mb-1">Keywords</Text>
            <View className="flex flex-row flex-wrap gap-2">
              {result.keywords.map((k, i) => (
                <View key={i} className="bg-primary/10 rounded-full px-3 py-1">
                  <Text className="text-sm text-primary font-medium">{k}</Text>
                </View>
              ))}
            </View>
          </View>
          <InfoRow label="Cultural Background" value={result.cultural_background} />
          <InfoRow label="Material" value={result.material} />
          <InfoRow label="Specification" value={result.specification} />
          <InfoRow label="Notice" value={result.notice} />

          {/* 操作 */}
          <View className="flex flex-row gap-3 mt-5">
            <View
              className="flex-1 rounded-full bg-muted flex items-center justify-center py-3 active:scale-95 transition-all"
              onClick={handleGenerate}>
              <Text className="text-base text-foreground font-bold">{ui('重新生成', 'Regenerate')}</Text>
            </View>
            <View
              className="flex-1 rounded-full bg-muted flex items-center justify-center py-3 active:scale-95 transition-all"
              onClick={handleCopy}>
              <Text className="text-base text-foreground font-bold">{ui('复制', 'Copy')}</Text>
            </View>
            <View
              className="flex-1 rounded-full bg-primary flex items-center justify-center py-3 active:scale-95 transition-all"
              onClick={handleSave}>
              <Text className="text-base text-primary-foreground font-bold">{ui('保存', 'Save')}</Text>
            </View>
          </View>
          <Text className="text-xs text-muted-foreground mt-3">
            {ui(
              '保存后可在「AI业务记录」中查看；正式使用前须经人工确认。',
              'Saved results are available in AI Trade Records. Review all content before production use.'
            )}
          </Text>
        </View>
      )}
    </View>
  )
}
