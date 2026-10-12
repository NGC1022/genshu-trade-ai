import {Image, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import QRCode from 'qrcode'
import {useState} from 'react'
import {getTicketDetail} from '@/db/api'
import type {Ticket} from '@/db/types'
import {formatDateTime} from '@/utils/time'

export default function TicketQr() {
  const router = useRouter()
  const ticketNo = router.params.ticketNo || ''
  const [ticket, setTicket] = useState<(Ticket & {ticket_type_snapshot?: any}) | null>(null)
  const [qrImage, setQrImage] = useState('')
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    if (!ticketNo) {
      setLoading(false)
      return
    }
    setLoading(true)
    getTicketDetail(ticketNo)
      .then(({data}) => {
        setTicket(data)
        return QRCode.toDataURL(data?.qr_code || ticketNo, {
          width: 320,
          margin: 2,
          color: {dark: '#520B0F', light: '#FFFFFF'}
        })
      })
      .then((url) => setQrImage(url))
      .catch(() => {
        Taro.showToast({title: '票券读取失败，请稍后重试', icon: 'none'})
      })
      .finally(() => setLoading(false))
  })

  const ticketType = ticket?.ticket_type_snapshot
  const valid = ticket ? new Date(ticket.valid_until).getTime() >= Date.now() && ticket.status === 'unused' : false

  if (loading) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Text className="text-muted-foreground">正在加载电子票券…</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gradient-subtle px-4 py-5">
      <View className="mx-auto w-full max-w-[560px]">
        <View className="mb-5">
          <Text className="text-xs text-primary font-black tracking-[2px]">GENSHU TICKET / QR</Text>
          <Text className="text-2xl text-foreground font-black block mt-1">电子门票</Text>
          <Text className="text-sm text-muted-foreground mt-1 block">
            入园时向工作人员出示此二维码，由核销端扫码确认。
          </Text>
        </View>

        <View className="bg-card rounded-[32px] overflow-hidden shadow-card border border-border border-opacity-10">
          <View className="bg-gradient-primary px-5 py-5">
            <View className="flex flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-white/70 block">根书文创园</Text>
                <Text className="text-xl text-white font-black block mt-1">{ticketType?.name || '根书文旅体验票'}</Text>
              </View>
              <View className={`rounded-full px-3 py-1 ${valid ? 'bg-white/20' : 'bg-black/20'}`}>
                <Text className="text-xs text-white font-bold">
                  {valid ? '待核销' : ticket?.status === 'used' ? '已使用' : '已失效'}
                </Text>
              </View>
            </View>
          </View>

          <View className="px-5 py-6 flex flex-col items-center">
            {qrImage ? (
              <View className="bg-white rounded-2xl p-4 shadow-sm border border-border border-opacity-20">
                <Image src={qrImage} className="w-56 h-56" mode="aspectFit" />
              </View>
            ) : (
              <View className="w-64 h-64 rounded-2xl bg-muted flex items-center justify-center">
                <Text className="text-sm text-muted-foreground">二维码生成中</Text>
              </View>
            )}
            <Text className="text-xs text-muted-foreground mt-4">请勿截图转发，二维码仅限本人使用</Text>
          </View>

          <View className="mx-5 border-t border-dashed border-border border-opacity-40" />
          <View className="px-5 py-5">
            <View className="flex flex-row justify-between py-2">
              <Text className="text-sm text-muted-foreground">票号</Text>
              <Text className="text-sm text-foreground font-bold font-mono">
                {ticket?.ticket_no || ticketNo || '未获取'}
              </Text>
            </View>
            <View className="flex flex-row justify-between py-2">
              <Text className="text-sm text-muted-foreground">有效期至</Text>
              <Text className="text-sm text-foreground font-bold">
                {ticket ? formatDateTime(new Date(ticket.valid_until)) : '关联数据库后显示'}
              </Text>
            </View>
            <View className="flex flex-row justify-between py-2">
              <Text className="text-sm text-muted-foreground">核销方式</Text>
              <Text className="text-sm text-foreground font-bold">工作人员扫码</Text>
            </View>
          </View>
        </View>

        <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4">
          <Text className="text-xs text-amber-800 leading-relaxed">
            提示：核销端会检查票号、有效期和“未使用”状态，并在成功后写入核销时间和工作人员账号，避免重复入园。
          </Text>
        </View>
      </View>
    </View>
  )
}
