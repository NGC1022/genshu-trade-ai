import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createTicketOrder, getTicketTypeDetail} from '@/db/api'
import type {TicketType} from '@/db/types'
import {useLanguage} from '@/hooks/useLanguage'
import {getOpenId, requestWechatPay} from '@/utils/payment'

type IdType = 'id_card' | 'hk_mo_pass' | 'tw_pass' | 'passport'

interface VisitorInfo {
  name: string
  idType: IdType
  idNumber: string
}

const ID_TYPES = [
  {value: 'id_card', label: '身份证'},
  {value: 'hk_mo_pass', label: '港澳通行证'},
  {value: 'tw_pass', label: '台胞证'},
  {value: 'passport', label: '外国护照'}
]

export default function TicketConfirm() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const router = useRouter()
  const {user, profile, refreshProfile} = useAuth()
  const {id, quantity, ticketType, unitPrice} = router.params
  const [ticket, setTicket] = useState<TicketType | null>(null)
  const [contactPhone, setContactPhone] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [dateRange, setDateRange] = useState({start: '', end: ''})
  const [visitors, setVisitors] = useState<VisitorInfo[]>([])
  const [loading, setLoading] = useState(false)

  const loadTicket = useCallback(async () => {
    const {data} = await getTicketTypeDetail(id!)
    if (data) {
      setTicket(data)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      loadTicket()
    }
  }, [id, loadTicket])

  useEffect(() => {
    const count = parseInt(quantity || '1', 10)
    const initialVisitors: VisitorInfo[] = []
    for (let i = 0; i < count; i++) {
      initialVisitors.push({
        name: '',
        idType: 'id_card',
        idNumber: ''
      })
    }
    setVisitors(initialVisitors)

    // 计算日期范围：今天到往后第7天（共7天）
    const now = new Date()
    const formatDate = (date: Date) => date.toISOString().split('T')[0]

    const start = formatDate(now)
    const end = new Date(now)
    end.setDate(now.getDate() + 6) // 第7天

    setDateRange({start, end: formatDate(end)})

    // 默认日期避开周一（闭园日）
    const findAvailableDate = (baseDate: Date) => {
      const d = new Date(baseDate)
      // 如果今天是周一，默认选明天
      if (d.getDay() === 1) {
        d.setDate(d.getDate() + 1)
      }
      return formatDate(d)
    }

    setVisitDate(findAvailableDate(now))
  }, [quantity])

  const handleDateChange = (e: any) => {
    const selectedDate = e.detail.value
    const date = new Date(selectedDate)

    // 假设周一闭园
    if (date.getDay() === 1) {
      Taro.showToast({
        title: '每周一闭园，请重新选择日期',
        icon: 'none'
      })
      return
    }

    setVisitDate(selectedDate)
  }

  const updateVisitor = (index: number, field: keyof VisitorInfo, value: string) => {
    const newVisitors = [...visitors]
    newVisitors[index] = {...newVisitors[index], [field]: value}
    setVisitors(newVisitors)
  }

  const handleIdTypeChange = (index: number, e: any) => {
    const selectedIndex = e.detail.value
    const idType = ID_TYPES[selectedIndex].value as IdType
    updateVisitor(index, 'idType', idType)
  }

  const validateIdNumber = (idType: IdType, idNumber: string): boolean => {
    switch (idType) {
      case 'id_card':
        return /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idNumber)
      case 'hk_mo_pass':
        return /^[HMhm]\d{8,10}$/.test(idNumber)
      case 'tw_pass':
        return /^\d{8,10}$/.test(idNumber)
      case 'passport':
        return /^[A-Za-z0-9]{5,20}$/.test(idNumber)
      default:
        return false
    }
  }

  const getIdTypeName = (idType: IdType): string => {
    const names: Record<IdType, [string, string]> = {
      id_card: ['身份证', 'Mainland ID card'],
      hk_mo_pass: ['港澳通行证', 'Hong Kong/Macao permit'],
      tw_pass: ['台胞证', 'Taiwan travel permit'],
      passport: ['外国护照', 'Passport']
    }
    const pair = names[idType]
    return pair ? ui(pair[0], pair[1]) : ''
  }

  const getTicketTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      adult: ui('成人票', 'Adult'),
      child_free: ui('儿童免票', 'Child (free)'),
      teen: ui('青少年票', 'Youth'),
      senior: ui('敬老票', 'Senior'),
      student: ui('大学生票', 'University student'),
      disabled: ui('身心障碍票', 'Accessibility ticket'),
      hmt: ui('港澳台票', 'Hong Kong, Macao & Taiwan'),
      foreigner: ui('外籍人士票', 'International visitor')
    }
    return typeMap[type] || '成人票'
  }

  const handleSubmit = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    if (!ticket) {
      Taro.showToast({title: '门票信息加载中', icon: 'none'})
      return
    }

    if (!visitDate) {
      Taro.showToast({title: '请选择参观日期', icon: 'none'})
      return
    }

    if (!contactPhone.trim()) {
      Taro.showToast({title: '请输入联系电话', icon: 'none'})
      return
    }

    if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
      Taro.showToast({title: '请输入正确的手机号', icon: 'none'})
      return
    }

    for (let i = 0; i < visitors.length; i++) {
      const visitor = visitors[i]
      if (!visitor.name.trim()) {
        Taro.showToast({title: `请输入第${i + 1}位参访人姓名`, icon: 'none'})
        return
      }

      if (!visitor.idNumber.trim()) {
        Taro.showToast({title: `请输入第${i + 1}位参访人证件号码`, icon: 'none'})
        return
      }

      if (!validateIdNumber(visitor.idType, visitor.idNumber)) {
        Taro.showToast({title: `第${i + 1}位参访人证件号码格式不正确`, icon: 'none'})
        return
      }
    }

    setLoading(true)

    try {
      // 1. 获取 OpenID (仅在需要支付时)
      const totalAmount = parseFloat(unitPrice || '0') * parseInt(quantity || '1', 10)
      let openid = ''
      if (totalAmount > 0) {
        openid = (await getOpenId(profile, refreshProfile)) || ''
        if (!openid) {
          throw new Error('支付环境初始化失败，请重试')
        }
      }

      // 2. 创建订单
      const price = parseFloat(unitPrice || '0')
      const {data, error} = await createTicketOrder({
        user_id: user.id,
        openid: openid,
        ticket_type_id: ticket.id,
        quantity: parseInt(quantity || '1', 10),
        unit_price: price,
        total_amount: totalAmount,
        visitor_name: visitors[0].name, // 使用第一位参访人作为主要名称
        visitor_phone: contactPhone,
        visit_date: visitDate,
        buyer_info: {
          contactPhone,
          visitors,
          ticketType: ticketType || 'adult'
        }
      })

      if (error) throw error

      // 3. 发起支付
      if (totalAmount > 0) {
        const success = await requestWechatPay(data.order_no, openid, 'ticket')
        if (!success) {
          // 支付失败，跳转到我的订单页面（门票订单通常不保留待支付状态太久，或者门票订单详情页支持重付）
          Taro.redirectTo({url: '/pages/my-tickets/index'})
          return
        }
      }

      Taro.showToast({title: '购票成功', icon: 'success'})
      setTimeout(() => {
        Taro.redirectTo({url: `/pages/ticket-success/index?orderId=${data.order_no}`})
      }, 1500)
    } catch (error: any) {
      Taro.showToast({title: error.message || '购买失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  if (!ticket) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Text className="text-muted-foreground">{ui('加载中...', 'Loading...')}</Text>
      </View>
    )
  }

  const totalAmount = parseFloat(unitPrice || '0') * parseInt(quantity || '1', 10)
  const ticketTypeName = getTicketTypeName(ticketType || 'adult')

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-24" scrollY>
        <View className="p-4">
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">{ui('门票信息', 'Ticket information')}</Text>
            <View className="flex items-center justify-between py-2">
              <Text className="text-base text-foreground">{ticket.name}</Text>
              <Text className="text-base font-bold text-primary">¥{unitPrice}</Text>
            </View>
            <View className="flex items-center justify-between py-2">
              <Text className="text-base text-muted-foreground">{ui('票种类型', 'Ticket type')}</Text>
              <Text className="text-base text-foreground">{ticketTypeName}</Text>
            </View>
            <View className="flex items-center justify-between py-2">
              <Text className="text-base text-muted-foreground">{ui('购买数量', 'Quantity')}</Text>
              <Text className="text-base text-foreground">{quantity}张</Text>
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">{ui('参观信息', 'Visit information')}</Text>
            <View className="mb-4">
              <Text className="text-base text-muted-foreground mb-2 block">参观日期 *（仅限近7天，周一闭园）</Text>
              <Picker
                mode="date"
                start={dateRange.start}
                end={dateRange.end}
                value={visitDate}
                onChange={handleDateChange}>
                <View className="bg-input rounded-lg border border-border px-3 py-3 flex flex-row items-center justify-between">
                  <Text className="text-foreground">{visitDate || '请选择参观日期'}</Text>
                  <View className="i-mdi-calendar text-primary text-xl" />
                </View>
              </Picker>
            </View>
            <View>
              <Text className="text-base text-muted-foreground mb-2 block">{ui('联系电话 *', 'Contact phone *')}</Text>
              <View className="bg-input rounded-lg border border-border px-3 py-2">
                <Input
                  className="w-full text-foreground"
                  placeholder="请输入11位手机号"
                  type="number"
                  maxlength={11}
                  value={contactPhone}
                  onInput={(e) => setContactPhone(e.detail.value)}
                />
              </View>
            </View>
          </View>

          {visitors.map((visitor, index) => (
            <View key={index} className="bg-card rounded-xl p-4 mb-4 shadow-card">
              <Text className="text-base font-bold text-foreground mb-3">第{index + 1}位参访人信息</Text>
              <View className="space-y-4">
                <View>
                  <Text className="text-base text-muted-foreground mb-2">{ui('姓名 *', 'Name *')}</Text>
                  <View className="bg-input rounded-lg border border-border px-3 py-2">
                    <Input
                      className="w-full text-foreground"
                      placeholder="请输入参访人姓名"
                      value={visitor.name}
                      onInput={(e) => updateVisitor(index, 'name', e.detail.value)}
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-base text-muted-foreground mb-2">{ui('证件类型 *', 'ID type *')}</Text>
                  <Picker
                    mode="selector"
                    range={ID_TYPES.map((type) => getIdTypeName(type.value as IdType))}
                    value={ID_TYPES.findIndex((t) => t.value === visitor.idType)}
                    onChange={(e) => handleIdTypeChange(index, e)}>
                    <View className="bg-input rounded-lg border border-border px-3 py-3">
                      <Text className="text-foreground">{getIdTypeName(visitor.idType)}</Text>
                    </View>
                  </Picker>
                </View>

                <View>
                  <Text className="text-base text-muted-foreground mb-2">{ui('证件号码 *', 'ID number *')}</Text>
                  <View className="bg-input rounded-lg border border-border px-3 py-2">
                    <Input
                      className="w-full text-foreground"
                      placeholder={
                        visitor.idType === 'id_card'
                          ? '18位身份证号'
                          : visitor.idType === 'hk_mo_pass'
                            ? 'H/M开头+8-10位数字'
                            : visitor.idType === 'tw_pass'
                              ? '8-10位数字'
                              : '5-20位字母数字组合'
                      }
                      value={visitor.idNumber}
                      onInput={(e) => updateVisitor(index, 'idNumber', e.detail.value)}
                    />
                  </View>
                  <Text className="text-base text-muted-foreground mt-1">
                    {visitor.idType === 'id_card' && ui('请输入18位身份证号码', 'Enter the 18-digit ID number')}
                    {visitor.idType === 'hk_mo_pass' &&
                      ui('港澳通行证号码，如：H12345678', 'Hong Kong/Macao permit, e.g. H12345678')}
                    {visitor.idType === 'tw_pass' && ui('台胞证号码，8-10位数字', 'Taiwan permit, 8–10 digits')}
                    {visitor.idType === 'passport' &&
                      ui('护照号码，5-20位字母数字组合', 'Passport, 5–20 letters and numbers')}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <View className="bg-card rounded-xl p-4 shadow-card">
            <Text className="text-base font-bold text-foreground mb-3">{ui('费用明细', 'Price breakdown')}</Text>
            <View className="flex items-center justify-between py-2">
              <Text className="text-base text-muted-foreground">{ui('门票费用', 'Ticket price')}</Text>
              <Text className="text-base text-foreground">¥{totalAmount}</Text>
            </View>
            <View className="border-t border-border pt-2 mt-2">
              <View className="flex items-center justify-between">
                <Text className="text-base font-bold text-foreground">{ui('实付金额', 'Amount payable')}</Text>
                <Text className="text-xl font-bold text-primary">{totalAmount === 0 ? '免费' : `¥${totalAmount}`}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card p-4 border-t border-border">
        <View className="flex items-center justify-between mb-3">
          <Text className="text-base text-muted-foreground">{ui('合计：', 'Total:')}</Text>
          <Text className="text-xl font-bold text-primary">{totalAmount === 0 ? '免费' : `¥${totalAmount}`}</Text>
        </View>
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-3 text-base font-bold break-keep"
          onClick={handleSubmit}
          loading={loading}>
          确认购买
        </Button>
      </View>
    </View>
  )
}
