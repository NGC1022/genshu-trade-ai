// @title AI贸易合规助手
// AI贸易合规助手：商品合规初步检查（HS编码建议/进口要求/风险提示/人工确认清单）
// 规则：HS编码仅为AI初步建议；不虚构法规、税率、认证要求；页面显示合规免责声明

import {Picker, Text, Textarea, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createAiTradeRecord, updateAiTradeRecord} from '@/db/api'
import {AI_DISCLAIMER, AiServiceError, type ComplianceResult, checkTradeCompliance} from '@/services/aiTrade'

const MARKETS = ['美国', '日本', '新加坡', '韩国', '英国', '德国', '法国', '澳大利亚', '加拿大']
const USAGES = ['个人礼品', '文化活动采购', '门店零售', '博物馆文创', '教育机构', '企业礼品']
const TRADE_MODES = ['一般贸易 (B2B)', '跨境电商零售 (B2C)', '样品寄送', '展会展览']
const MATERIALS = ['木质', '竹质', '陶瓷', '织物', '纸质', '金属', '复合材料']

export default function AiTradeCompliance() {
  const {user} = useAuth()
  const [productName, setProductName] = useState('根书木质书签')
  const [marketIdx, setMarketIdx] = useState(0)
  const [materialIdx, setMaterialIdx] = useState(0)
  const [usageIdx, setUsageIdx] = useState(0)
  const [tradeModeIdx, setTradeModeIdx] = useState(0)
  const [extraInfo, setExtraInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComplianceResult | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const market = MARKETS[marketIdx]
  const material = MATERIALS[materialIdx]
  const usage = USAGES[usageIdx]
  const tradeMode = TRADE_MODES[tradeModeIdx]

  const handleCheck = async () => {
    if (loading) return
    if (!productName.trim()) {
      Taro.showToast({title: '请输入商品名称', icon: 'none'})
      return
    }
    setLoading(true)
    setResult(null)
    setSavedId(null)
    try {
      const res = await checkTradeCompliance({
        productName: productName.trim(),
        market,
        material,
        usage,
        tradeMode,
        additionalInfo: extraInfo.trim() || undefined
      })
      setResult(res)
    } catch (err) {
      const msg = err instanceof AiServiceError ? err.message : 'AI合规检查失败，请重试'
      Taro.showToast({title: msg, icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    if (!user) {
      Taro.showToast({title: '请先登录后保存', icon: 'none'})
      return
    }
    Taro.showLoading({title: '保存中...'})
    const {data, error} = await createAiTradeRecord({
      user_id: user.id,
      type: 'trade_compliance',
      product_name: productName.trim(),
      market,
      input_data: {product_name: productName.trim(), market, material, usage, trade_mode: tradeMode},
      ai_result: {...result},
      status: 'draft',
      review_status: 'pending',
      source: 'mock',
      is_demo: productName.includes('根书木质书签')
    })
    Taro.hideLoading()
    if (error || !data) {
      Taro.showToast({title: '保存失败，请重试', icon: 'none'})
      return
    }
    setSavedId(data.id)
    Taro.showToast({title: '已保存至业务记录'})
  }

  const handleConfirm = async () => {
    if (!savedId) return
    Taro.showModal({
      title: '人工确认',
      content: '确认已核对合规检查结果，可作为业务参考使用？',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({title: '确认中...'})
        const {error} = await updateAiTradeRecord(savedId, {status: 'confirmed', review_status: 'approved'})
        Taro.hideLoading()
        if (error) {
          Taro.showToast({title: '操作失败', icon: 'none'})
          return
        }
        Taro.showToast({title: '已人工确认'})
      }
    })
  }

  const Section = ({title, icon, items}: {title: string; icon: string; items: string[]}) => (
    <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
      <View className="flex flex-row items-center mb-3">
        <View className={`${icon} text-lg text-primary mr-2`} />
        <Text className="text-base font-bold text-foreground">{title}</Text>
      </View>
      <View className="flex flex-col gap-2">
        {items.map((item, i) => (
          <View key={i} className="flex flex-row items-start">
            <View className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-2 mr-2 flex-shrink-0" />
            <Text className="text-sm text-muted-foreground leading-relaxed flex-1">{item}</Text>
          </View>
        ))}
      </View>
    </View>
  )

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 输入区 */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-4">
          <View className="w-1 h-5 bg-primary rounded-full mr-2" />
          <Text className="text-xl font-bold text-foreground">合规检查输入</Text>
        </View>

        <View className="flex flex-col gap-3">
          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 block">商品名称</Text>
            <View className="bg-muted rounded-xl px-3 py-2.5">
              <input
                className="w-full text-base text-foreground"
                value={productName}
                placeholder="输入商品名称"
                onInput={(e) => setProductName(((e as any).detail?.value ?? (e as any).target?.value ?? '') as string)}
              />
            </View>
          </View>

          <View className="flex flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm text-muted-foreground mb-1.5 block">目的国/地区</Text>
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
            <View className="flex-1">
              <Text className="text-sm text-muted-foreground mb-1.5 block">商品材质</Text>
              <Picker
                mode="selector"
                range={MATERIALS}
                value={materialIdx}
                onChange={(e) => setMaterialIdx(Number(e.detail.value))}>
                <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                  <Text className="text-base text-foreground">{material}</Text>
                  <View className="i-mdi-chevron-down text-muted-foreground" />
                </View>
              </Picker>
            </View>
          </View>

          <View className="flex flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm text-muted-foreground mb-1.5 block">商品用途</Text>
              <Picker
                mode="selector"
                range={USAGES}
                value={usageIdx}
                onChange={(e) => setUsageIdx(Number(e.detail.value))}>
                <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                  <Text className="text-base text-foreground">{usage}</Text>
                  <View className="i-mdi-chevron-down text-muted-foreground" />
                </View>
              </Picker>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-muted-foreground mb-1.5 block">交易方式</Text>
              <Picker
                mode="selector"
                range={TRADE_MODES}
                value={tradeModeIdx}
                onChange={(e) => setTradeModeIdx(Number(e.detail.value))}>
                <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                  <Text className="text-base text-foreground">{tradeMode}</Text>
                  <View className="i-mdi-chevron-down text-muted-foreground" />
                </View>
              </Picker>
            </View>
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 block">补充信息（可选）</Text>
            <View className="bg-muted rounded-xl p-3">
              <Textarea
                className="w-full text-base text-foreground"
                value={extraInfo}
                maxlength={300}
                placeholder="例如：含木制包装、需要贴标、含电池等特殊情况"
                onInput={(e) => setExtraInfo(((e as any).detail?.value ?? (e as any).target?.value ?? '') as string)}
                style={{height: '120rpx'}}
              />
            </View>
          </View>
        </View>

        <View
          className={`mt-4 rounded-xl flex items-center justify-center ${loading ? 'bg-primary/50' : 'bg-primary'}`}
          onClick={handleCheck}>
          <Text className="text-base text-primary-foreground font-bold py-3">
            {loading ? 'AI检查中...' : '开始合规检查'}
          </Text>
        </View>
      </View>

      {/* 结果区 */}
      {result && (
        <View className="flex flex-col gap-4 mb-8">
          {/* 完整度 */}
          <View className="bg-card rounded-2xl p-4 border border-border border-opacity-10">
            <View className="flex flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-foreground">商品信息完整度</Text>
              <Text className="text-xl font-black text-primary">{result.completeness_score}%</Text>
            </View>
            <View className="h-2 bg-muted rounded-full overflow-hidden">
              <View className="h-full bg-primary rounded-full" style={{width: `${result.completeness_score}%`}} />
            </View>
            {result.missing_fields.some((f) => f !== '无缺失字段') && (
              <View className="mt-3 flex flex-col gap-1">
                {result.missing_fields.map((f, i) => (
                  <Text key={i} className="text-xs text-amber-600">
                    缺失：{f}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* HS编码建议 */}
          <View className="bg-card rounded-2xl p-4 border border-primary/30">
            <View className="flex flex-row items-center mb-2">
              <View className="i-mdi-barcode text-lg text-primary mr-2" />
              <Text className="text-base font-bold text-foreground">HS编码初步建议</Text>
              <View className="ml-auto bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Text className="text-xs text-amber-700">AI初步建议</Text>
              </View>
            </View>
            <Text className="text-sm text-foreground leading-relaxed mb-2">{result.hs_code_suggestion}</Text>
            <View className="bg-amber-50 rounded-xl p-3">
              <Text className="text-xs text-amber-700 leading-relaxed">{result.hs_code_note}</Text>
            </View>
          </View>

          <Section title="可能涉及的进口要求" icon="i-mdi-import" items={result.import_requirements} />
          <Section
            title="包装/标签信息检查"
            icon="i-mdi-package-variant-closed"
            items={result.packaging_label_checks}
          />
          <Section title="原产地信息检查" icon="i-mdi-map-marker" items={result.origin_checks} />
          <Section title="可能存在的贸易风险" icon="i-mdi-alert-outline" items={result.trade_risks} />

          {/* 人工确认 */}
          <View className="bg-muted/60 rounded-2xl p-4">
            <View className="flex flex-row items-center mb-2">
              <View className="i-mdi-account-check-outline text-lg text-muted-foreground mr-2" />
              <Text className="text-base font-bold text-foreground">需要人工确认的信息</Text>
            </View>
            <View className="flex flex-col gap-1.5">
              {result.manual_confirmation.map((item, i) => (
                <View key={i} className="flex flex-row items-start">
                  <View className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-2 mr-2 flex-shrink-0" />
                  <Text className="text-sm text-muted-foreground leading-relaxed flex-1">{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 免责声明 */}
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <View className="flex flex-row items-center mb-1.5">
              <View className="i-mdi-information-outline text-amber-600 text-lg mr-2" />
              <Text className="text-sm font-bold text-amber-700">合规声明</Text>
            </View>
            <Text className="text-xs text-amber-700 leading-relaxed">{AI_DISCLAIMER.compliance}</Text>
          </View>

          {/* 操作按钮 */}
          <View className="flex flex-row gap-3">
            <View className="flex-1 bg-card border border-primary rounded-xl" onClick={handleSave}>
              <Text className="text-base text-primary font-bold text-center py-3">
                {savedId ? '已保存' : '保存至业务记录'}
              </Text>
            </View>
            {savedId && (
              <View className="flex-1 bg-primary rounded-xl" onClick={handleConfirm}>
                <Text className="text-base text-primary-foreground font-bold text-center py-3">人工确认</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {!result && !loading && (
        <View className="bg-muted/60 rounded-3xl p-6 items-center mb-8">
          <View className="i-mdi-shield-search-outline text-4xl text-muted-foreground/40 mb-2" />
          <Text className="text-sm text-muted-foreground text-center leading-relaxed">
            输入商品信息后开始检查。{'\n'}HS编码仅为AI初步建议，正式归类需报关行或专业机构确认。
          </Text>
        </View>
      )}
    </View>
  )
}
