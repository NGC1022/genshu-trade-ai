import {Button, Image, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import DemoBadge from '@/components/DemoBadge'
import {useAuth} from '@/contexts/AuthContext'
import {DEMO_PICKUP_LOCATIONS} from '@/data/demoCatalog'
import {createOrder, getDefaultAddress, getLogisticsPlans, getPickupLocations, getTradeTermsInfo} from '@/db/api'
import type {Address, LogisticsPlanConfig, SKU} from '@/db/types'
import {useDemoMode} from '@/hooks/useDemoMode'
import {type CurrencyCode, convertFromCny, getDemoRateInfo} from '@/utils/currency'
import {t} from '@/utils/i18n'
import {getOpenId, requestDemoPayment, requestWechatPay} from '@/utils/payment'
import {getCountryTariff, getMinShippingDays} from '@/utils/shippingPlans'

export default function OrderConfirm() {
  const router = useRouter()
  const {items} = router.params
  const {user, profile, refreshProfile} = useAuth()
  const {enabled: demoMode} = useDemoMode()
  const [cartItems, setCartItems] = useState<{sku: SKU; quantity: number}[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<'express' | 'pickup'>('express')
  const [pickupLocations, setPickupLocations] = useState<any[]>(DEMO_PICKUP_LOCATIONS)
  const [selectedPickupIndex, setSelectedPickupIndex] = useState(0)
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [orderType, setOrderType] = useState<'b2c' | 'b2b'>('b2c')
  const [logisticsPlans, setLogisticsPlans] = useState<LogisticsPlanConfig[]>([])
  const [selectedLogisticsIdx, setSelectedLogisticsIdx] = useState(0)
  const [tradeTerms, setTradeTerms] = useState<{code: string; name: string; responsibility: string}[]>([])
  const [selectedTradeTermIdx, setSelectedTradeTermIdx] = useState(0)
  const [loading, setLoading] = useState(false)

  // 实时汇率：仅海外订单启用
  const [exchangeRates, setExchangeRates] = useState<Record<string, {rate: string; name: string; updatetime: string}>>(
    {}
  )
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState('')
  const [rateUpdateTime, setRateUpdateTime] = useState('')
  const isOverseas = deliveryMethod === 'express' && !!selectedAddress?.is_overseas
  const overseasCountry = selectedAddress?.country || ''
  const tariff = useMemo(() => getCountryTariff(overseasCountry), [overseasCountry])
  const minDays = useMemo(() => getMinShippingDays(overseasCountry), [overseasCountry])

  // 倒计时：预计送达时间 = 下单时刻 + minDays 天
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (!isOverseas) {
      setCountdown('')
      return
    }
    const target = Date.now() + minDays * 24 * 60 * 60 * 1000
    const tick = () => {
      const diff = Math.max(0, target - Date.now())
      const d = Math.floor(diff / (24 * 60 * 60 * 1000))
      const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
      const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
      const s = Math.floor((diff % (60 * 1000)) / 1000)
      setCountdown(
        `${d}天 ${h.toString().padStart(2, '0')}时 ${m.toString().padStart(2, '0')}分 ${s.toString().padStart(2, '0')}秒`
      )
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [isOverseas, minDays])

  // 生成时间段 (9:30-17:30, 10分钟间隔)
  const timeSlots = useMemo(() => {
    const slots: string[] = []
    let hour = 9
    let minute = 30
    while (hour < 17 || (hour === 17 && minute <= 30)) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
      minute += 10
      if (minute >= 60) {
        hour += 1
        minute = 0
      }
    }
    return slots
  }, [])

  useEffect(() => {
    if (items) {
      try {
        const decodedItems = JSON.parse(decodeURIComponent(items))
        setCartItems(decodedItems)
      } catch (e) {
        console.error('解析订单项失败', e)
      }
    }

    // 默认明天
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setPickupDate(tomorrow.toISOString().split('T')[0])
    setPickupTime('10:00')

    // 加载演示物流方案与贸易条款
    getLogisticsPlans().then(({data}) => {
      if (data.length > 0) setLogisticsPlans(data)
    })
    getTradeTermsInfo().then((terms) => {
      if (terms.length > 0) setTradeTerms(terms)
    })
  }, [items])

  // ===== 跨境结算明细（多币种） =====
  const CURRENCY_OPTIONS = [
    {code: 'CNY' as const, label: '人民币 CNY'},
    {code: 'USD' as const, label: '美元 USD'},
    {code: 'EUR' as const, label: '欧元 EUR'},
    {code: 'JPY' as const, label: '日元 JPY'},
    {code: 'GBP' as const, label: '英镑 GBP'},
    {code: 'SGD' as const, label: '新加坡元 SGD'}
  ]
  const [currencyIdx, setCurrencyIdx] = useState(0)
  const cur = CURRENCY_OPTIONS[currencyIdx]

  // 优先实时汇率；查询失败或未返回时自动降级为课堂演示汇率（明确标记演示数据）
  const getRate = useCallback(
    (code: string) => {
      if (code === 'CNY') return {rate: 1, source: '基准货币', updatetime: '', isRealtime: true}
      const real = exchangeRates[code]
      const parsed = real ? Number(real.rate) : 0
      if (parsed > 0) {
        return {rate: parsed, source: '实时汇率', updatetime: real.updatetime, isRealtime: true}
      }
      const demo = getDemoRateInfo(code as CurrencyCode)
      if (demo.rate > 0) {
        return {rate: demo.rate, source: '演示汇率（降级）', updatetime: demo.updatedAt, isRealtime: false}
      }
      return {rate: 0, source: '', updatetime: '', isRealtime: false}
    },
    [exchangeRates]
  )

  const fmtMult = useCallback(
    (cny: number) => {
      const amount = Number.isFinite(cny) ? cny : 0
      if (cur.code === 'CNY') return `CNY ${amount.toFixed(2)}`
      const {rate} = getRate(cur.code)
      if (rate > 0) return `${cur.code} ${convertFromCny(amount, rate).toFixed(2)}`
      return `${cur.code} --`
    },
    [cur, getRate]
  )

  // 查询实时汇率（接口计费：60 秒内仅允许刷新一次，首次进入自动查询）
  const lastRateFetchRef = useRef(0)
  const fetchExchangeRates = useCallback(
    async (force = false) => {
      const now = Date.now()
      if (!force && Object.keys(exchangeRates).length > 0) return
      if (now - lastRateFetchRef.current < 60_000) {
        if (force) Taro.showToast({title: '刚刚已刷新，请稍后再试', icon: 'none'})
        return
      }
      lastRateFetchRef.current = now
      setRateLoading(true)
      setRateError('')
      try {
        const {data, error} = await supabase.functions.invoke('currency-exchange-rate', {
          body: {fromCode: 'CNY'}
        })
        if (error) throw error
        if (data?.code !== 200) throw new Error(data?.msg || '汇率查询失败')
        const list = data?.data?.list || {}
        setExchangeRates(list)
        setRateUpdateTime(list?.[cur.code]?.updatetime || '')
      } catch (err: any) {
        console.error('实时汇率查询失败，已降级演示汇率', err)
        setRateError(err?.message || '实时汇率查询失败，已降级为演示汇率')
      } finally {
        setRateLoading(false)
      }
    },
    [cur.code, exchangeRates]
  )

  const loadData = useCallback(async () => {
    if (!user) return
    const {data: address} = await getDefaultAddress(user.id)
    if (address) {
      setSelectedAddress(address)
    }

    const {data: locations} = await getPickupLocations()
    if (locations?.length) setPickupLocations(locations)
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 海外订单自动加载实时汇率
  useEffect(() => {
    if (isOverseas) {
      fetchExchangeRates()
    }
  }, [isOverseas, fetchExchangeRates])

  // 币种切换时刷新更新时间展示
  useEffect(() => {
    if (exchangeRates[cur.code]) {
      setRateUpdateTime(exchangeRates[cur.code].updatetime)
      setRateError('')
    }
  }, [cur.code, exchangeRates])

  const subtotal = cartItems.reduce((sum, item) => sum + item.sku.price * item.quantity, 0)
  // 海外订单使用所选物流方案费用（USD→CNY：实时汇率需取倒数；不可用时降级演示汇率 1/0.14≈7.14）
  const selectedPlan = logisticsPlans[selectedLogisticsIdx]
  const usdToCnyRate = useMemo(() => {
    const real = exchangeRates.USD
    const parsed = real ? Number(real.rate) : 0
    if (parsed > 0) return Number((1 / parsed).toFixed(4)) // rate 为 1 CNY 兑 USD，换算 USD→CNY 需取倒数
    const demo = getDemoRateInfo('USD').rate
    return demo > 0 ? Number((1 / demo).toFixed(4)) : 7.2
  }, [exchangeRates])
  const shippingFee = useMemo(() => {
    if (!isOverseas) return 0
    if (!selectedPlan) return 0
    return Number((selectedPlan.cost * usdToCnyRate).toFixed(2))
  }, [isOverseas, selectedPlan, usdToCnyRate])
  const totalAmount = subtotal + shippingFee
  const tariffMin = useMemo(() => Math.round((subtotal * tariff.rateMin) / 100), [subtotal, tariff])
  const tariffMax = useMemo(() => Math.round((subtotal * tariff.rateMax) / 100), [subtotal, tariff])
  // 保险费 = 商品金额 × 0.5%（课堂演示规则）
  const insuranceFee = useMemo(() => Number((subtotal * 0.005).toFixed(2)), [subtotal])
  const payableMin = useMemo(
    () => Number((subtotal + shippingFee + insuranceFee + tariffMin).toFixed(2)),
    [subtotal, shippingFee, insuranceFee, tariffMin]
  )
  const payableMax = useMemo(
    () => Number((subtotal + shippingFee + insuranceFee + tariffMax).toFixed(2)),
    [subtotal, shippingFee, insuranceFee, tariffMax]
  )

  const selectAddress = () => {
    Taro.navigateTo({
      url: '/pages/address-list/index?select=true&target=order'
    })
  }

  // 每次从地址列表返回时重新读取选择结果
  useDidShow(() => {
    const pendingAddress = Taro.getStorageSync('pendingSelectedAddress:order') as Address | undefined
    if (pendingAddress) {
      setSelectedAddress(pendingAddress)
      Taro.removeStorageSync('pendingSelectedAddress:order')
    }
  })

  const openLocation = (location: any) => {
    Taro.openLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
      address: location.address
    })
  }

  const handleSubmit = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    if (deliveryMethod === 'express' && !selectedAddress) {
      Taro.showToast({title: '请选择收货地址', icon: 'none'})
      return
    }

    if (deliveryMethod === 'pickup') {
      if (!pickupDate || !pickupTime) {
        Taro.showToast({title: '请选择自提时间', icon: 'none'})
        return
      }
    }

    setLoading(true)

    try {
      // 1. 获取 OpenID
      const openid = await getOpenId(profile, refreshProfile)
      if (!openid) {
        throw new Error('支付环境初始化失败，请重试')
      }

      // 2. 创建订单
      const orderItems = cartItems.map((item) => ({
        sku_code: item.sku.sku_code,
        sku_id: item.sku.id,
        sku_snapshot: item.sku,
        quantity: item.quantity,
        unit_price: item.sku.price,
        subtotal: item.sku.price * item.quantity
      }))

      const productSnapshot = cartItems.map((item) => ({
        sku_id: item.sku.id,
        sku_code: item.sku.sku_code,
        name: item.sku.name,
        name_en: item.sku.name_en ?? null,
        image_url: item.sku.image_url ?? null,
        unit_price: item.sku.price,
        quantity: item.quantity,
        currency: 'CNY'
      }))

      const costBreakdown = {
        currency: 'CNY',
        subtotal,
        shipping_cost: shippingFee,
        insurance_cost: insuranceFee,
        estimated_tariff: tariffMin,
        tariff_rate: tariff.rateMin,
        other_cost: 0,
        other_cost_note: '无',
        total: payableMin,
        is_estimate: true,
        data_source: '课堂演示规则'
      }

      const {data: order, error} = await createOrder({
        user_id: user.id,
        openid: openid,
        items: orderItems,
        delivery_method: deliveryMethod,
        address_id: deliveryMethod === 'express' ? selectedAddress?.id : null,
        pickup_location: deliveryMethod === 'pickup' ? pickupLocations[selectedPickupIndex]?.name : null,
        pickup_date: deliveryMethod === 'pickup' ? pickupDate : null,
        pickup_time: deliveryMethod === 'pickup' ? pickupTime : null,
        total_amount: payableMin,
        remark: '',
        payment_status: 'pending',
        order_type: orderType,
        trade_term: isOverseas ? tradeTerms[selectedTradeTermIdx]?.code || 'EXW' : null,
        logistics_plan:
          isOverseas && selectedPlan
            ? {
                id: selectedPlan.id,
                name: selectedPlan.name,
                cost: selectedPlan.cost,
                estimated_days: `${selectedPlan.minDays}-${selectedPlan.maxDays}`
              }
            : null,
        address_snapshot: selectedAddress || null,
        product_snapshot: productSnapshot,
        cost_breakdown: costBreakdown
      })

      if (error) throw error

      // 3. 发起支付：微信环境走真实支付，其他环境走课堂演示支付
      let success = false
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        success = await requestWechatPay(order.order_no, openid, 'goods')
      } else {
        Taro.showLoading({title: '课堂演示支付中...'})
        success = await requestDemoPayment(order.order_no, totalAmount)
        Taro.hideLoading()
      }

      if (success) {
        Taro.showToast({title: '支付成功', icon: 'success'})
        setTimeout(() => {
          Taro.redirectTo({url: `/pages/order-detail/index?orderNo=${order.order_no}`})
        }, 1500)
      } else {
        // 支付取消或失败，跳转到订单列表（待支付状态）
        Taro.redirectTo({url: '/pages/order-list/index?status=pending'})
      }
    } catch (error: any) {
      Taro.showToast({title: error.message || '下单失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-24" scrollY>
        <View className="p-5">
          {/* 交易类型选择 */}
          <View className="bg-card rounded-xl p-5 mb-4 shadow-card">
            <View className="flex flex-row items-center mb-3">
              <View className="i-mdi-account-switch-outline text-xl text-primary mr-2" />
              <Text className="text-lg font-bold text-foreground">交易类型</Text>
            </View>
            <View className="flex flex-row bg-muted rounded-xl p-1.5">
              <View
                className={`flex-1 py-3 text-center rounded-lg ${orderType === 'b2c' ? 'bg-primary text-white font-bold' : 'text-foreground'}`}
                onClick={() => setOrderType('b2c')}>
                <Text className="text-base">B2C 个人购买</Text>
              </View>
              <View
                className={`flex-1 py-3 text-center rounded-lg ${orderType === 'b2b' ? 'bg-primary text-white font-bold' : 'text-foreground'}`}
                onClick={() => setOrderType('b2b')}>
                <Text className="text-base">B2B 批量采购</Text>
              </View>
            </View>
            <Text className="text-sm text-muted-foreground mt-2">
              {orderType === 'b2c'
                ? '个人消费者下单，按零售价结算。'
                : 'B2B批量采购可关联报价单与阶梯价格，最终价格以人工确认或系统规则为准。'}
            </Text>
          </View>

          <View className="flex flex-row bg-card rounded-xl p-1.5 mb-4 shadow-sm">
            <View
              className={`flex-1 py-3 text-center rounded-lg ${deliveryMethod === 'express' ? 'bg-primary text-white font-bold' : 'text-foreground'}`}
              onClick={() => setDeliveryMethod('express')}>
              <Text className="text-base">快速配送</Text>
            </View>
            <View
              className={`flex-1 py-3 text-center rounded-lg ${deliveryMethod === 'pickup' ? 'bg-primary text-white font-bold' : 'text-foreground'}`}
              onClick={() => setDeliveryMethod('pickup')}>
              <Text className="text-base">线下自提</Text>
            </View>
          </View>

          {deliveryMethod === 'express' ? (
            <View className="bg-card rounded-xl p-5 mb-4 shadow-card" onClick={selectAddress}>
              {selectedAddress ? (
                <View>
                  <View className="flex items-center justify-between mb-3">
                    <Text className="text-base font-bold text-foreground">
                      {selectedAddress.receiver_name} {selectedAddress.phone}
                    </Text>
                    <View className="i-mdi-chevron-right text-muted-foreground" />
                  </View>
                  <Text className="text-base text-muted-foreground leading-relaxed">
                    {selectedAddress.province} {selectedAddress.city} {selectedAddress.district}{' '}
                    {selectedAddress.detail}
                  </Text>
                </View>
              ) : (
                <View className="flex items-center justify-between">
                  <Text className="text-base text-muted-foreground">{t('select_address')}</Text>
                  <View className="i-mdi-chevron-right text-muted-foreground" />
                </View>
              )}
            </View>
          ) : (
            <View className="bg-card rounded-xl p-5 mb-4 shadow-card">
              <View className="mb-4">
                <Text className="text-base text-muted-foreground mb-3 block">{t('pickup_location')}</Text>
                <Picker
                  mode="selector"
                  range={pickupLocations.map((l) => l.name)}
                  value={selectedPickupIndex}
                  onChange={(e) => setSelectedPickupIndex(Number(e.detail.value))}>
                  <View className="flex items-center justify-between bg-muted rounded-lg p-3">
                    <Text className="text-base font-medium">
                      {pickupLocations[selectedPickupIndex]?.name || '加载中...'}
                    </Text>
                    <View className="i-mdi-chevron-down text-muted-foreground" />
                  </View>
                </Picker>
                {pickupLocations[selectedPickupIndex] && (
                  <View className="mt-3 flex items-center justify-between">
                    <Text className="text-base text-muted-foreground">
                      {pickupLocations[selectedPickupIndex].address}
                    </Text>
                    <View
                      className="flex items-center text-primary text-base"
                      onClick={() => openLocation(pickupLocations[selectedPickupIndex])}>
                      <View className="i-mdi-map-marker text-base mr-1" />
                      <Text>{t('navigation')}</Text>
                    </View>
                  </View>
                )}
              </View>

              <View className="grid grid-cols-2 gap-4">
                <View>
                  <Text className="text-base text-muted-foreground mb-3 block">{t('pickup_date')}</Text>
                  <Picker mode="date" value={pickupDate} onChange={(e) => setPickupDate(e.detail.value)}>
                    <View className="bg-muted rounded-lg p-3 text-center">
                      <Text className="text-base font-medium">{pickupDate || '选择日期'}</Text>
                    </View>
                  </Picker>
                </View>
                <View>
                  <Text className="text-base text-muted-foreground mb-3 block">{t('pickup_time')}</Text>
                  <Picker
                    mode="selector"
                    range={timeSlots}
                    onChange={(e) => setPickupTime(timeSlots[Number(e.detail.value)])}
                    value={timeSlots.indexOf(pickupTime)}>
                    <View className="bg-muted rounded-lg p-3 text-center">
                      <Text className="text-base font-medium">{pickupTime || '选择时间'}</Text>
                    </View>
                  </Picker>
                </View>
              </View>
            </View>
          )}

          {/* 海外地址：跨境结算明细 + 时效倒计时 */}
          {isOverseas ? (
            <View className="mb-4">
              <View className="bg-card rounded-xl p-5 mb-3 shadow-card border border-primary/15">
                <View className="flex flex-row items-center justify-between mb-4">
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-cash-multiple text-xl text-primary mr-2" />
                    <Text className="text-lg font-bold text-foreground">跨境结算明细</Text>
                    {demoMode && <DemoBadge className="ml-2" />}
                  </View>
                  {/* 币种切换 */}
                  <Picker
                    mode="selector"
                    range={CURRENCY_OPTIONS.map((c) => c.label)}
                    onChange={(e) => setCurrencyIdx(Number((e as any).detail.value))}>
                    <View className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 flex flex-row items-center">
                      <Text className="text-sm text-primary font-bold">{CURRENCY_OPTIONS[currencyIdx].label}</Text>
                      <View className="i-mdi-chevron-down text-sm text-primary ml-1" />
                    </View>
                  </Picker>
                </View>

                {/* 物流方案选择 */}
                {logisticsPlans.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-base text-muted-foreground mb-2 block">
                      物流方案{demoMode ? '（演示数据）' : ''}
                    </Text>
                    <View className="flex flex-col gap-2">
                      {logisticsPlans.map((plan, idx) => (
                        <View
                          key={plan.id || idx}
                          className={`rounded-xl border px-4 py-3.5 ${selectedLogisticsIdx === idx ? 'border-primary bg-primary/5' : 'border-border bg-muted'}`}
                          onClick={() => setSelectedLogisticsIdx(idx)}>
                          <View className="flex flex-row items-center justify-between">
                            <Text className="text-base font-bold text-foreground">{plan.name}</Text>
                            <Text className="text-sm text-primary font-bold">
                              ${plan.cost.toFixed(2)} / {plan.minDays}-{plan.maxDays}天
                            </Text>
                          </View>
                          <Text className="text-sm text-muted-foreground mt-1">{plan.scenario}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 贸易条款选择 */}
                {tradeTerms.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-base text-muted-foreground mb-2 block">
                      贸易条款{demoMode ? '（演示说明）' : ''}
                    </Text>
                    <Picker
                      mode="selector"
                      range={tradeTerms.map((t) => `${t.code} - ${t.name}`)}
                      value={selectedTradeTermIdx}
                      onChange={(e) => setSelectedTradeTermIdx(Number(e.detail.value))}>
                      <View className="bg-muted rounded-xl px-4 py-3 flex flex-row items-center justify-between">
                        <Text className="text-base text-foreground">
                          {tradeTerms[selectedTradeTermIdx]?.code} - {tradeTerms[selectedTradeTermIdx]?.name}
                        </Text>
                        <View className="i-mdi-chevron-down text-muted-foreground" />
                      </View>
                    </Picker>
                    <Text className="text-sm text-muted-foreground mt-2">
                      责任范围：{tradeTerms[selectedTradeTermIdx]?.responsibility}
                    </Text>
                  </View>
                )}

                {/* 实时汇率状态（含刷新与演示降级标记） */}
                <View className="bg-muted rounded-xl px-4 py-4 mb-4">
                  <View className="flex flex-row items-center justify-between">
                    <View className="flex flex-row items-center">
                      <Text className="text-base text-muted-foreground">
                        {cur.code === 'CNY' ? '基准货币' : `汇率 ${cur.code}/CNY`}
                      </Text>
                      {rateLoading ? null : (
                        <View className={`rounded-md px-2 py-0.5 ml-2 ${rateError ? 'bg-amber-100' : 'bg-primary/10'}`}>
                          <Text className={`text-xs ${rateError ? 'text-amber-600' : 'text-primary'}`}>
                            {rateError ? '演示数据' : '实时'}
                          </Text>
                        </View>
                      )}
                    </View>
                    {rateLoading ? (
                      <Text className="text-base text-primary">查询中...</Text>
                    ) : (
                      <View className="flex flex-row items-center gap-3">
                        <Text className="text-base font-medium text-foreground">
                          {cur.code === 'CNY' ? '1.00' : getRate(cur.code).rate.toFixed(4)}
                        </Text>
                        <View
                          className="flex flex-row items-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5"
                          onClick={() => fetchExchangeRates(true)}>
                          <View className="i-mdi-refresh text-base text-primary mr-1" />
                          <Text className="text-sm text-primary">刷新</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  {rateLoading ? null : (
                    <Text className="text-xs text-muted-foreground block mt-2">
                      {rateError
                        ? `实时汇率查询失败，已降级为演示汇率 · ${rateError}`
                        : rateUpdateTime
                          ? `更新于 ${rateUpdateTime}`
                          : '当前为演示汇率，仅用于课堂展示'}
                    </Text>
                  )}
                </View>

                {/* 结算明细行 */}
                <View className="flex flex-row items-center justify-between py-3">
                  <Text className="text-base text-muted-foreground">商品金额</Text>
                  <Text className="text-base text-foreground font-medium">
                    {fmtMult(subtotal)}（¥{subtotal.toFixed(2)}）
                  </Text>
                </View>
                <View className="flex flex-row items-center justify-between py-3">
                  <Text className="text-base text-muted-foreground">国际物流费</Text>
                  <Text className="text-base text-foreground font-medium">
                    {fmtMult(shippingFee)}（¥{shippingFee.toFixed(2)}）
                  </Text>
                </View>
                <View className="flex flex-row items-center justify-between py-3">
                  <Text className="text-base text-muted-foreground">保险费</Text>
                  <Text className="text-base text-foreground font-medium">
                    {fmtMult(insuranceFee)}（¥{insuranceFee.toFixed(2)}）
                  </Text>
                </View>
                <View className="flex flex-row items-center justify-between py-3">
                  <Text className="text-base text-muted-foreground">预估关税</Text>
                  <Text className="text-base text-foreground font-medium">
                    {fmtMult(tariffMin)} ~ {fmtMult(tariffMax)}（¥{tariffMin} - ¥{tariffMax}）
                  </Text>
                </View>
                <View className="flex flex-row items-center justify-between py-3">
                  <Text className="text-base text-muted-foreground">其他费用</Text>
                  <Text className="text-base text-muted-foreground">¥0.00（无）</Text>
                </View>
                <View className="flex flex-row items-center justify-between py-4 border-t border-border mt-2">
                  <Text className="text-lg font-bold text-foreground">预计应付金额</Text>
                  <Text className="text-xl font-bold text-primary">
                    {fmtMult(payableMin)} ~ {fmtMult(payableMax)}
                  </Text>
                </View>
                <View className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-4 mt-3">
                  <Text className="text-xs text-amber-700 leading-relaxed">
                    所有税费均为预估值，最终税费以实际清关结果为准；多币种金额为汇率换算参考值，结算以实际支付为准。
                    {rateError ? '当前汇率数据为演示数据（非实时），仅用于课堂展示。' : ''}
                  </Text>
                </View>
                <Text className="text-xs text-muted-foreground mt-3 mb-1 block">
                  汇率来源：{rateError ? '演示汇率（降级）' : rateUpdateTime ? '实时汇率' : '演示汇率'} · 币种{' '}
                  {cur.label}
                </Text>
              </View>

              <View className="bg-gradient-primary rounded-xl p-5 shadow-card">
                <View className="flex flex-row items-center mb-3">
                  <View className="i-mdi-timer-sand text-xl text-white mr-2" />
                  <Text className="text-lg font-bold text-white">快递时效倒计时</Text>
                </View>
                <Text className="text-base text-white opacity-90 mb-4 block">
                  预计送达区间：{minDays} - {minDays + 5} 天（配送至 {overseasCountry}）
                </Text>
                <View className="bg-white/15 rounded-xl py-4 flex items-center justify-center">
                  <Text className="text-xl font-black text-white tracking-wider">{countdown || '计算中...'}</Text>
                </View>
                <Text className="text-xs text-white opacity-70 mt-3 block">
                  时效为参考区间，非保证送达时间；实际以承运商与清关进度为准（演示数据）
                </Text>
              </View>
            </View>
          ) : null}

          <View className="bg-card rounded-xl p-5 mb-4 shadow-card">
            <Text className="text-lg font-bold text-foreground mb-4">商品信息</Text>
            {cartItems.map((item) => (
              <View key={item.sku.id} className="flex items-center py-4 border-t border-border first:border-t-0">
                <View className="w-16 h-16 bg-muted rounded-lg mr-4 overflow-hidden">
                  {item.sku.image_url && (
                    <Image className="w-full h-full object-cover" src={item.sku.image_url} mode="aspectFill" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-lg text-foreground font-medium mb-2">{item.sku.name}</Text>
                  <Text className="text-base text-muted-foreground">
                    ¥{item.sku.price.toFixed(2)} × {item.quantity}
                  </Text>
                </View>
                <Text className="text-lg font-bold text-primary">¥{(item.sku.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View className="bg-card rounded-xl p-5 shadow-card">
            <Text className="text-lg font-bold text-foreground mb-4">费用明细</Text>
            <View className="flex items-center justify-between py-3">
              <Text className="text-base text-muted-foreground">商品总额</Text>
              <Text className="text-base text-foreground font-medium">¥{subtotal.toFixed(2)}</Text>
            </View>
            <View className="flex items-center justify-between py-3">
              <Text className="text-base text-muted-foreground">运费</Text>
              <Text className="text-base text-foreground font-medium">¥{shippingFee.toFixed(2)}</Text>
            </View>
            <View className="border-t border-border pt-4 mt-2">
              <View className="flex items-center justify-between">
                <Text className="text-lg font-bold text-foreground">实付金额</Text>
                <Text className="text-xl font-bold text-primary">¥{totalAmount.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card px-5 pt-5 pb-6 border-t border-border">
        <View className="flex items-center justify-between mb-4">
          <Text className="text-base text-muted-foreground">实付金额：</Text>
          <Text className="text-xl font-bold text-primary">¥{totalAmount.toFixed(2)}</Text>
        </View>
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-4 text-lg font-bold break-keep"
          onClick={handleSubmit}
          loading={loading}>
          提交订单
        </Button>
      </View>
    </View>
  )
}
