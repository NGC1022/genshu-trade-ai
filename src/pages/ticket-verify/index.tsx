import {Button, Input, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {verifyTicket} from '@/db/api'
import {formatDateTime} from '@/utils/time'

export default function TicketVerify() {
  const [ticketNo, setTicketNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyResult, setVerifyResult] = useState<any>(null)

  const handleScan = () => {
    Taro.scanCode({
      success: (res) => {
        setTicketNo(res.result)
        handleVerify(res.result)
      },
      fail: () => {
        Taro.showToast({title: '扫码失败', icon: 'none'})
      }
    })
  }

  const handleVerify = async (no?: string) => {
    const ticketNumber = no || ticketNo
    if (!ticketNumber) {
      Taro.showToast({title: '请输入票号', icon: 'none'})
      return
    }

    setLoading(true)
    setVerifyResult(null)

    try {
      const {data, error} = await verifyTicket(ticketNumber, 'admin')

      if (error) throw error

      setVerifyResult(data)
      Taro.showToast({title: '核销成功', icon: 'success'})
    } catch (error: any) {
      Taro.showToast({title: error.message || '核销失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="bg-gradient-subtle min-h-screen p-4">
      <View className="bg-card rounded-xl p-6 mb-4 shadow-card">
        <Text className="text-xl font-bold text-foreground mb-4 text-center">门票核销</Text>

        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-4 text-lg font-bold break-keep mb-4"
          onClick={handleScan}>
          <View className="flex items-center justify-center">
            <View className="i-mdi-qrcode-scan text-2xl mr-2" />
            <Text className="text-white">扫描二维码</Text>
          </View>
        </Button>

        <View className="border-t border-border pt-4">
          <Text className="text-base text-muted-foreground mb-2">或手动输入票号</Text>
          <View className="bg-input rounded-lg border border-border px-3 py-2 mb-3">
            <Input
              className="w-full text-foreground"
              placeholder="请输入票号"
              value={ticketNo}
              onInput={(e) => setTicketNo(e.detail.value)}
            />
          </View>
          <Button
            className="w-full bg-muted text-foreground rounded-full py-3 text-base font-bold break-keep"
            onClick={() => handleVerify()}
            loading={loading}>
            确认核销
          </Button>
        </View>
      </View>

      {verifyResult && (
        <View className="bg-card rounded-xl p-6 shadow-card">
          <View className="text-center mb-4">
            <View className="i-mdi-check-circle text-6xl text-green-600 mb-2" />
            <Text className="text-xl font-bold text-foreground">核销成功</Text>
          </View>

          <View className="space-y-3">
            <View className="flex items-center justify-between py-2 border-b border-border">
              <Text className="text-base text-muted-foreground">门票名称</Text>
              <Text className="text-base text-foreground font-bold">{verifyResult.ticket_type_snapshot.name}</Text>
            </View>
            <View className="flex items-center justify-between py-2 border-b border-border">
              <Text className="text-base text-muted-foreground">票号</Text>
              <Text className="text-base text-foreground font-mono">{verifyResult.ticket_no}</Text>
            </View>
            <View className="flex items-center justify-between py-2 border-b border-border">
              <Text className="text-base text-muted-foreground">核销时间</Text>
              <Text className="text-base text-foreground">{formatDateTime(new Date())}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
