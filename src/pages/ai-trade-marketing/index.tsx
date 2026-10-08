// @title AI跨境营销素材
// AI海外营销素材：商品+目标市场 → 海外标题/卖点/SEO/IG/FB/TikTok脚本/邮件标题
// 规则：内容基于真实商品信息，不虚构功效认证销量；生成后进入待审核状态

import {Picker, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createAiTradeRecord, getSKUList, updateAiTradeRecord} from '@/db/api'
import type {SKU} from '@/db/types'
import {AI_DISCLAIMER, AiServiceError, generateMarketingContent, type MarketingContentResult} from '@/services/aiTrade'
import {createSocialLink, submitSocialPost, validateSocialPost} from '@/services/social/ayrshare'

const MARKETS = ['美国', '日本', '新加坡', '韩国', '英国', '德国']

export default function AiTradeMarketing() {
  const {user} = useAuth()
  const [skus, setSkus] = useState<SKU[]>([])
  const [skuIdx, setSkuIdx] = useState(0)
  const [marketIdx, setMarketIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<MarketingContentResult | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)

  const sku = skus[skuIdx]
  const market = MARKETS[marketIdx]

  const loadData = useCallback(async () => {
    const {data, error} = await getSKUList()
    if (!error && data) {
      setSkus(data)
      const demo = data.find((s) => s.name.includes('根书木质书签'))
      if (demo) setSkuIdx(data.indexOf(demo))
    }
  }, [])

  useDidShow(() => {
    loadData()
  })

  const handleGenerate = async () => {
    if (loading) return
    if (!sku) {
      Taro.showToast({title: '请先选择商品', icon: 'none'})
      return
    }
    setLoading(true)
    setContent(null)
    setSavedId(null)
    setReviewed(false)
    try {
      const res = await generateMarketingContent({
        productName: sku.name,
        market,
        material: sku.material || undefined,
        features: sku.description ? [sku.description.slice(0, 80)] : undefined,
        price: sku.price,
        culturalBackground: '根书（树根书法）非遗技艺'
      })
      setContent(res)
    } catch (err) {
      const msg = err instanceof AiServiceError ? err.message : '营销素材生成失败，请重试'
      Taro.showToast({title: msg, icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const copyText = async (text: string, label: string) => {
    try {
      await Taro.setClipboardData({data: text})
      Taro.showToast({title: `已复制${label}`})
    } catch {
      Taro.showToast({title: '复制失败', icon: 'none'})
    }
  }

  const handleSave = async () => {
    if (!content || !sku) return
    if (!user) {
      Taro.showToast({title: '请先登录后保存', icon: 'none'})
      return
    }
    Taro.showLoading({title: '保存中...'})
    const {data, error} = await createAiTradeRecord({
      user_id: user.id,
      type: 'marketing_content',
      product_id: sku.id,
      product_name: sku.name,
      market,
      input_data: {product_name: sku.name, market},
      ai_result: {...content},
      status: 'draft',
      review_status: 'pending',
      source: 'mock',
      is_demo: sku.name.includes('根书木质书签')
    })
    Taro.hideLoading()
    if (error || !data) {
      Taro.showToast({title: '保存失败，请重试', icon: 'none'})
      return
    }
    setSavedId(data.id)
    Taro.showToast({title: '已保存，状态：待审核'})
  }

  const handleReview = (approve: boolean) => {
    if (!savedId) return
    Taro.showModal({
      title: approve ? '人工审核通过' : '驳回重新生成',
      content: approve
        ? '确认营销素材内容合规、无虚构信息，可以进入发布流程？'
        : '确认驳回此营销素材？驳回后可点击重新生成。',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({title: '处理中...'})
        const {error} = await updateAiTradeRecord(savedId, {
          status: approve ? 'confirmed' : 'draft',
          review_status: approve ? 'approved' : 'rejected'
        })
        Taro.hideLoading()
        if (error) {
          Taro.showToast({title: '操作失败', icon: 'none'})
          return
        }
        setReviewed(true)
        Taro.showToast({title: approve ? '审核通过' : '已驳回'})
      }
    })
  }

  const handleLinkSocial = async () => {
    if (socialLoading) return
    setSocialLoading(true)
    try {
      const result = await createSocialLink()
      await Taro.navigateTo({url: `/pages/social-link/index?url=${encodeURIComponent(result.url)}`})
    } catch (error) {
      Taro.showToast({title: error instanceof Error ? error.message : '社交账号连接失败', icon: 'none'})
    } finally {
      setSocialLoading(false)
    }
  }

  const handleSocialPublish = async () => {
    if (!content || !reviewed || socialLoading) return
    setSocialLoading(true)
    try {
      const post = {instagram: content.instagram_copy, facebook: content.facebook_copy}
      const mediaUrls = sku?.image_url && /^https?:\/\//.test(sku.image_url) ? [sku.image_url] : undefined
      const validation = await validateSocialPost({post, platforms: ['instagram', 'facebook'], mediaUrls})
      if (validation.status === 'error') throw new Error(String(validation.message || '社交内容校验未通过'))
      const confirm = await Taro.showModal({title: '提交社交平台审核', content: '内容将提交到 Ayrshare 待审核队列，不会绕过确认直接公开发布。是否继续？'})
      if (!confirm.confirm) return
      const result = await submitSocialPost({post, platforms: ['instagram', 'facebook'], mediaUrls})
      Taro.showToast({title: result.status === 'error' ? '提交失败' : '已进入社交平台待审核队列', icon: 'none'})
    } catch (error) {
      Taro.showToast({title: error instanceof Error ? error.message : '社交平台提交失败', icon: 'none'})
    } finally {
      setSocialLoading(false)
    }
  }

  const Block = ({
    icon,
    title,
    children,
    copyData
  }: {
    icon: string
    title: string
    children: any
    copyData?: string
  }) => (
    <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
      <View className="flex flex-row items-center justify-between mb-2.5">
        <View className="flex flex-row items-center">
          <View className={`${icon} text-lg text-primary mr-2`} />
          <Text className="text-base font-bold text-foreground">{title}</Text>
        </View>
        {copyData && (
          <View className="bg-muted rounded-full px-2.5 py-1" onClick={() => copyText(copyData, title)}>
            <Text className="text-xs text-primary font-bold">复制</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  )

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 输入 */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-4">
          <View className="w-1 h-5 bg-primary rounded-full mr-2" />
          <Text className="text-xl font-bold text-foreground">营销素材生成</Text>
        </View>
        <View className="flex flex-col gap-3">
          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 block">商品（系统真实数据）</Text>
            <Picker
              mode="selector"
              range={skus.length > 0 ? skus.map((s) => s.name) : ['加载中...']}
              value={skuIdx}
              onChange={(e) => setSkuIdx(Number(e.detail.value))}>
              <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                <Text className="text-base text-foreground flex-1">{sku ? sku.name : '加载中...'}</Text>
                <View className="i-mdi-chevron-down text-muted-foreground" />
              </View>
            </Picker>
          </View>
          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 block">目标市场</Text>
            <Picker
              mode="selector"
              range={MARKETS}
              value={marketIdx}
              onChange={(e) => setMarketIdx(Number(e.detail.value))}>
              <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                <Text className="text-base text-foreground">{market}</Text>
                <View className="i-mdi-chevron-down text-muted-foreground" />
              </View>
            </Picker>
          </View>
        </View>

        {/* 流程说明 */}
        <View className="mt-3 bg-muted/60 rounded-xl p-3">
          <Text className="text-xs text-muted-foreground leading-relaxed">
            流程：AI生成 → AI风险检查 → 人工审核 → 发布。内容基于真实商品信息，不虚构功效、认证、销量、评价或市场数据。
          </Text>
        </View>

        <View
          className={`mt-4 rounded-xl flex items-center justify-center ${loading ? 'bg-primary/50' : 'bg-primary'}`}
          onClick={handleGenerate}>
          <Text className="text-base text-primary-foreground font-bold py-3">
            {loading ? 'AI生成中...' : content ? '重新生成' : '生成营销素材'}
          </Text>
        </View>
      </View>

      {/* 结果 */}
      {content && (
        <View className="flex flex-col gap-4 mb-8">
          <Block icon="i-mdi-format-title" title="海外商品标题" copyData={content.overseas_title}>
            <Text className="text-sm text-foreground leading-relaxed">{content.overseas_title}</Text>
          </Block>

          <Block icon="i-mdi-star-outline" title="商品卖点" copyData={content.selling_points.join('\n')}>
            <View className="flex flex-col gap-1.5">
              {content.selling_points.map((p, i) => (
                <View key={i} className="flex flex-row items-start">
                  <View className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-2 mr-2 flex-shrink-0" />
                  <Text className="text-sm text-muted-foreground leading-relaxed flex-1">{p}</Text>
                </View>
              ))}
            </View>
          </Block>

          <Block icon="i-mdi-magnify" title="SEO关键词" copyData={content.seo_keywords.join(', ')}>
            <View className="flex flex-row flex-wrap gap-2">
              {content.seo_keywords.map((k, i) => (
                <View key={i} className="bg-primary/10 rounded-full px-2.5 py-1">
                  <Text className="text-xs text-primary">{k}</Text>
                </View>
              ))}
            </View>
          </Block>

          <Block icon="i-mdi-instagram" title="Instagram文案" copyData={content.instagram_copy}>
            <Text className="text-sm text-muted-foreground leading-relaxed">{content.instagram_copy}</Text>
          </Block>

          <Block icon="i-mdi-facebook" title="Facebook文案" copyData={content.facebook_copy}>
            <Text className="text-sm text-muted-foreground leading-relaxed">{content.facebook_copy}</Text>
          </Block>

          <Block icon="i-mdi-movie-open-outline" title="TikTok短视频脚本" copyData={content.tiktok_script.join('\n')}>
            <View className="flex flex-col gap-2">
              {content.tiktok_script.map((s, i) => (
                <View key={i} className="bg-muted/60 rounded-xl p-3">
                  <Text className="text-sm text-foreground leading-relaxed">{s}</Text>
                </View>
              ))}
            </View>
          </Block>

          <Block icon="i-mdi-email-outline" title="营销邮件标题" copyData={content.email_subject}>
            <Text className="text-sm text-foreground leading-relaxed">{content.email_subject}</Text>
          </Block>

          {/* 风险检查 */}
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <View className="flex flex-row items-center mb-1.5">
              <View className="i-mdi-shield-alert-outline text-amber-600 text-lg mr-2" />
              <Text className="text-sm font-bold text-amber-700">AI风险检查</Text>
            </View>
            <Text className="text-xs text-amber-700 leading-relaxed">{content.risk_notice}</Text>
          </View>

          {/* 审核操作 */}
          <View className="flex flex-row gap-3">
            {!savedId && (
              <View className="flex-1 bg-primary rounded-xl" onClick={handleSave}>
                <Text className="text-base text-primary-foreground font-bold text-center py-3">保存（进入待审核）</Text>
              </View>
            )}
            {savedId && !reviewed && (
              <>
                <View className="flex-1 bg-card border border-red-200 rounded-xl" onClick={() => handleReview(false)}>
                  <Text className="text-base text-red-500 font-bold text-center py-3">驳回重生成</Text>
                </View>
                <View className="flex-1 bg-primary rounded-xl" onClick={() => handleReview(true)}>
                  <Text className="text-base text-primary-foreground font-bold text-center py-3">审核通过</Text>
                </View>
              </>
            )}
            {reviewed && (
              <View className="flex-1 bg-muted rounded-xl">
                <Text className="text-base text-muted-foreground font-bold text-center py-3">已完成人工审核</Text>
              </View>
            )}
          </View>

          {reviewed && (
            <View className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
              <Text className="text-sm text-violet-800 font-bold block mb-2">Instagram / Facebook 发布</Text>
              <Text className="text-xs text-violet-700 leading-relaxed block mb-3">先连接专业账号，再校验平台格式；提交后进入 Ayrshare 待审核队列，不会未经确认直接公开发布。</Text>
              <View className="flex flex-row gap-2">
                <View className="flex-1 bg-white border border-violet-200 rounded-xl" onClick={handleLinkSocial}>
                  <Text className="text-sm text-violet-700 font-bold text-center py-2.5">{socialLoading ? '处理中…' : '连接账号'}</Text>
                </View>
                <View className="flex-1 bg-violet-600 rounded-xl" onClick={handleSocialPublish}>
                  <Text className="text-sm text-white font-bold text-center py-2.5">校验并提交</Text>
                </View>
              </View>
            </View>
          )}

          <View className="bg-muted/60 rounded-2xl p-4">
            <Text className="text-xs text-muted-foreground leading-relaxed">{AI_DISCLAIMER.marketing}</Text>
          </View>
        </View>
      )}

      {!content && !loading && (
        <View className="bg-muted/60 rounded-3xl p-6 items-center mb-8">
          <View className="i-mdi-bullhorn-outline text-4xl text-muted-foreground/40 mb-2" />
          <Text className="text-sm text-muted-foreground text-center leading-relaxed">
            选择商品和目标市场，生成多渠道海外营销素材。{'\n'}生成内容进入待审核状态，人工确认后方可发布。
          </Text>
        </View>
      )}
    </View>
  )
}
