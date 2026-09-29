// @title AI贸易单证中心
// AI贸易单证中心：基于真实业务数据生成贸易单证草稿（PI/CI/装箱单/确认单/装运指示）
// 规则：只读取业务数据，缺失显示"待填写"；单证为草稿待人工审核；禁止AI编造数据

import {Picker, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createTradeDocumentRecord, getOverseasCustomers, getQuotes, updateTradeDocumentRecord} from '@/db/api'
import type {OverseasCustomer, QuoteRecord} from '@/db/types'
import {
  AI_DISCLAIMER,
  AiServiceError,
  generateTradeDocument,
  type TradeDocField,
  type TradeDocumentResult
} from '@/services/aiTrade'

const DOC_TYPES = [
  {key: 'proforma_invoice', label: '形式发票'},
  {key: 'commercial_invoice', label: '商业发票'},
  {key: 'packing_list', label: '装箱单'},
  {key: 'order_confirmation', label: '订单确认单'},
  {key: 'shipping_instruction', label: '装运指示'}
] as const

export default function AiTradeDocuments() {
  const {user} = useAuth()
  const [docTypeIdx, setDocTypeIdx] = useState(0)
  const [customers, setCustomers] = useState<OverseasCustomer[]>([])
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])
  const [customerIdx, setCustomerIdx] = useState(-1)
  const [quoteIdx, setQuoteIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [doc, setDoc] = useState<TradeDocumentResult | null>(null)
  const [editField, setEditField] = useState<{key: string; value: string} | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const docType = DOC_TYPES[docTypeIdx].key

  const loadData = useCallback(async () => {
    if (!user) return
    const [cRes, qRes] = await Promise.all([getOverseasCustomers(user.id), getQuotes(user.id, {status: 'confirmed'})])
    if (!cRes.error) setCustomers(cRes.data)
    if (!qRes.error) setQuotes(qRes.data)
  }, [user])

  useDidShow(() => {
    loadData()
  })

  const handleGenerate = async () => {
    if (loading) return
    const customer = customerIdx >= 0 ? customers[customerIdx] : null
    const quote = quoteIdx >= 0 ? quotes[quoteIdx] : null
    if (!customer && !quote) {
      Taro.showToast({title: '请先选择客户或已确认报价（业务数据来源）', icon: 'none'})
      return
    }
    setLoading(true)
    setDoc(null)
    setSavedId(null)
    try {
      const res = await generateTradeDocument({
        docType,
        orderNo: quote?.quote_no,
        quoteNo: quote?.quote_no,
        customerName: customer?.name || quote?.customer_name || undefined,
        customerCountry: customer?.country || undefined,
        productName: quote?.product_name || customer?.intent_product || undefined,
        quantity: quote?.quantity,
        unitPrice: quote?.unit_price,
        currency: quote?.currency,
        totalAmount: quote?.total_cost
      })
      setDoc(res)
    } catch (err) {
      const msg = err instanceof AiServiceError ? err.message : '单证生成失败，请重试'
      Taro.showToast({title: msg, icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  // 字段编辑（人工补充"待填写"内容）
  const handleFieldTap = (f: TradeDocField) => {
    setEditField({key: f.key, value: f.value})
  }

  const handleFieldSave = () => {
    if (!doc || !editField) return
    const fields = doc.fields.map((f) =>
      f.key === editField.key
        ? {...f, value: editField.value || '待填写', filled: editField.value.trim().length > 0}
        : f
    )
    setDoc({...doc, fields})
    setEditField(null)
    Taro.showToast({title: '字段已更新'})
  }

  const handleCopyDoc = async () => {
    if (!doc) return
    const text = doc.fields.map((f) => `${f.label}: ${f.value}`).join('\n')
    try {
      await Taro.setClipboardData({data: `${doc.title}\n${text}`})
      Taro.showToast({title: '已复制单证内容'})
    } catch {
      Taro.showToast({title: '复制失败', icon: 'none'})
    }
  }

  const handleSave = async () => {
    if (!doc) return
    if (!user) {
      Taro.showToast({title: '请先登录后保存', icon: 'none'})
      return
    }
    const customer = customerIdx >= 0 ? customers[customerIdx] : null
    const quote = quoteIdx >= 0 ? quotes[quoteIdx] : null
    Taro.showLoading({title: '保存中...'})
    const {data, error} = await createTradeDocumentRecord({
      user_id: user.id,
      doc_type: doc.doc_type,
      order_no: quote?.quote_no || null,
      customer_name: customer?.name || quote?.customer_name || null,
      content: {title: doc.title, fields: doc.fields},
      missing_fields: doc.missing_fields,
      status: 'pending_review',
      is_demo: (quote?.is_demo ?? customer?.is_demo ?? false) || quote?.product_name === '根书木质书签'
    })
    Taro.hideLoading()
    if (error || !data) {
      Taro.showToast({title: '保存失败，请重试', icon: 'none'})
      return
    }
    setSavedId(data.id)
    Taro.showToast({title: '草稿已保存'})
  }

  const handleConfirm = async () => {
    if (!savedId || !doc) return
    if (doc.missing_fields.some((m) => m !== '无缺失字段')) {
      Taro.showToast({title: '仍有待填写字段，请先补全', icon: 'none'})
      return
    }
    Taro.showModal({
      title: '人工确认单证',
      content: '确认单证所有字段已核对无误，可作为正式单证使用？',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({title: '确认中...'})
        const {error} = await updateTradeDocumentRecord(savedId, {status: 'confirmed'})
        Taro.hideLoading()
        if (error) {
          Taro.showToast({title: '操作失败', icon: 'none'})
          return
        }
        Taro.showToast({title: '单证已人工确认'})
      }
    })
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 数据来源选择 */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-4">
          <View className="w-1 h-5 bg-primary rounded-full mr-2" />
          <Text className="text-xl font-bold text-foreground">单证生成（读取真实业务数据）</Text>
        </View>

        <View className="flex flex-col gap-3">
          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 block">单证类型</Text>
            <Picker
              mode="selector"
              range={DOC_TYPES.map((d) => d.label)}
              value={docTypeIdx}
              onChange={(e) => setDocTypeIdx(Number(e.detail.value))}>
              <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                <Text className="text-base text-foreground">{DOC_TYPES[docTypeIdx].label}</Text>
                <View className="i-mdi-chevron-down text-muted-foreground" />
              </View>
            </Picker>
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 block">业务数据来源（客户 / 已确认报价）</Text>
            <Picker
              mode="selector"
              range={
                customers.length > 0
                  ? customers.map((c) => `${c.name}${c.country ? `（${c.country}）` : ''}`)
                  : ['暂无客户档案，请先在客户CRM中添加']
              }
              value={customerIdx >= 0 ? customerIdx : 0}
              onChange={(e) => setCustomerIdx(Number(e.detail.value))}>
              <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                <Text className={`text-base ${customers.length > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {customerIdx >= 0 && customers[customerIdx]
                    ? `${customers[customerIdx].name}${customers[customerIdx].country ? `（${customers[customerIdx].country}）` : ''}`
                    : '选择客户（可选）'}
                </Text>
                <View className="i-mdi-chevron-down text-muted-foreground" />
              </View>
            </Picker>
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 block">关联报价（已确认状态）</Text>
            <Picker
              mode="selector"
              range={
                quotes.length > 0
                  ? quotes.map((q) => `${q.quote_no} V${q.version} · ${q.product_name || ''} ×${q.quantity}`)
                  : ['暂无已确认报价，请先在报价工作台确认']
              }
              value={quoteIdx >= 0 ? quoteIdx : 0}
              onChange={(e) => setQuoteIdx(Number(e.detail.value))}>
              <View className="bg-muted rounded-xl px-3 py-2.5 flex flex-row items-center justify-between">
                <Text className={`text-base ${quotes.length > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {quoteIdx >= 0 && quotes[quoteIdx]
                    ? `${quotes[quoteIdx].quote_no} V${quotes[quoteIdx].version} · ${quotes[quoteIdx].product_name || '商品'}`
                    : '选择报价（可选）'}
                </Text>
                <View className="i-mdi-chevron-down text-muted-foreground" />
              </View>
            </Picker>
          </View>
        </View>

        <View
          className={`mt-4 rounded-xl flex items-center justify-center ${loading ? 'bg-primary/50' : 'bg-primary'}`}
          onClick={handleGenerate}>
          <Text className="text-base text-primary-foreground font-bold py-3">
            {loading ? '生成中...' : '生成单证草稿'}
          </Text>
        </View>
      </View>

      {/* 单证草稿 */}
      {doc && (
        <View className="flex flex-col gap-4 mb-8">
          <View className="bg-card rounded-3xl border border-border border-opacity-10 overflow-hidden">
            <View className="bg-muted/60 px-5 py-4 border-b border-border border-opacity-10 flex flex-row items-center justify-between">
              <Text className="text-lg font-black text-foreground">{doc.title}</Text>
              <View className="bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Text className="text-xs text-amber-700">草稿 · 待人工审核</Text>
              </View>
            </View>
            <View className="p-5 flex flex-col gap-2.5">
              {doc.fields.map((f) => (
                <View
                  key={f.key}
                  className="flex flex-row items-start py-1.5 border-b border-border border-opacity-5 last:border-0"
                  onClick={() => handleFieldTap(f)}>
                  <Text className="text-sm text-muted-foreground w-44 flex-shrink-0">{f.label}</Text>
                  <Text className={`text-sm flex-1 text-right ${f.filled ? 'text-foreground' : 'text-amber-600'}`}>
                    {f.value}
                  </Text>
                  <View className="i-mdi-pencil-outline text-muted-foreground/50 text-sm ml-1 mt-0.5" />
                </View>
              ))}
            </View>
          </View>

          {/* 缺失字段提示 */}
          {doc.missing_fields.some((m) => m !== '无缺失字段') && (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <View className="flex flex-row items-center mb-1.5">
                <View className="i-mdi-alert-outline text-amber-600 text-lg mr-2" />
                <Text className="text-sm font-bold text-amber-700">
                  待填写字段（{doc.missing_fields.filter((m) => m !== '无缺失字段').length}项）
                </Text>
              </View>
              <Text className="text-xs text-amber-700 leading-relaxed">
                {doc.missing_fields.filter((m) => m !== '无缺失字段').join('；')}
              </Text>
              <Text className="text-xs text-amber-700 leading-relaxed mt-1">
                点击单证字段可人工编辑补充。AI不编造数据，缺失内容须人工确认。
              </Text>
            </View>
          )}

          {/* 操作按钮 */}
          <View className="flex flex-row gap-3">
            <View className="flex-1 bg-card border border-primary rounded-xl" onClick={handleCopyDoc}>
              <Text className="text-base text-primary font-bold text-center py-3">复制</Text>
            </View>
            <View className="flex-1 bg-card border border-primary rounded-xl" onClick={handleSave}>
              <Text className="text-base text-primary font-bold text-center py-3">
                {savedId ? '已保存' : '保存草稿'}
              </Text>
            </View>
            {savedId && (
              <View className="flex-1 bg-primary rounded-xl" onClick={handleConfirm}>
                <Text className="text-base text-primary-foreground font-bold text-center py-3">人工确认</Text>
              </View>
            )}
          </View>

          <View className="bg-muted/60 rounded-2xl p-4">
            <Text className="text-xs text-muted-foreground leading-relaxed">{AI_DISCLAIMER.document}</Text>
          </View>
        </View>
      )}

      {/* 空状态 */}
      {!doc && !loading && (
        <View className="bg-muted/60 rounded-3xl p-6 items-center mb-8">
          <View className="i-mdi-file-document-plus-outline text-4xl text-muted-foreground/40 mb-2" />
          <Text className="text-sm text-muted-foreground text-center leading-relaxed">
            单证基于已确认订单、客户、商品等真实业务数据生成。{'\n'}缺失字段显示"待填写"，由人工补充确认。
          </Text>
        </View>
      )}

      {/* 字段编辑弹层 */}
      {editField && (
        <View className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setEditField(null)}>
          <View
            className="bg-background rounded-t-3xl p-5 w-full"
            onClick={(e) => e.stopPropagation()}
            style={{maxHeight: '70vh'}}>
            <Text className="text-lg font-bold text-foreground mb-3">编辑字段</Text>
            <View className="bg-muted rounded-xl px-3 py-2.5 mb-4">
              <input
                className="w-full text-base text-foreground"
                value={editField.value}
                placeholder="输入内容（留空则显示待填写）"
                onInput={(e) =>
                  setEditField({
                    ...editField,
                    value: ((e as any).detail?.value ?? (e as any).target?.value ?? '') as string
                  })
                }
              />
            </View>
            <View className="flex flex-row gap-3">
              <View className="flex-1 bg-card border border-border rounded-xl" onClick={() => setEditField(null)}>
                <Text className="text-base text-foreground font-bold text-center py-3">取消</Text>
              </View>
              <View className="flex-1 bg-primary rounded-xl" onClick={handleFieldSave}>
                <Text className="text-base text-primary-foreground font-bold text-center py-3">保存</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
