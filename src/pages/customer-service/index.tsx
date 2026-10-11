import {Input, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {formatHourMinute} from '@/utils/time'

interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  content: string
  timestamp: string
}

export default function CustomerService() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'ai',
      content:
        '您好！我是根书文创AI助手。很高兴为您服务！请问有什么我可以帮您的？您可以询问关于商品、门票、定制流程等任何问题。',
      timestamp: formatHourMinute(new Date())
    }
  ])
  const [inputMessage, setInputMessage] = useState('')

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: formatHourMinute(new Date())
    }

    setMessages([...messages, newUserMessage])
    setInputMessage('')

    // 模拟AI回复
    setTimeout(() => {
      let aiResponse =
        '抱歉，我不明白您的问题。您可以尝试换一种方式询问，或者点击下方的"寻求人工客服"按钮，联系我们的专业客服团队。'

      const content = newUserMessage.content.toLowerCase()
      if (content.includes('门票') || content.includes('票')) {
        aiResponse =
          '根书文创园门票目前有联名套票、艺术馆单人票和景区参观门票三种，均可在"文旅门票"板块预订。购票后30天内有效。'
      } else if (content.includes('定制') || content.includes('3d')) {
        aiResponse = '我们的3D打印定制服务支持1-15字定制，建议4-5字效果最佳。制作周期约5-7个工作日。'
      } else if (content.includes('退款') || content.includes('退票')) {
        aiResponse =
          '门票一经售出原则上不予退款，特殊情况如场馆闭馆除外。非定制商品在签收后7天内且不影响二次销售的情况下支持退换。'
      } else if (content.includes('发货') || content.includes('物流')) {
        aiResponse = '普通商品下单后1-2个工作日内发货，顺丰包邮。定制商品需5-15个工作日制作完成后发货。'
      } else if (content.includes('你好') || content.includes('您好')) {
        aiResponse = '您好！请问有什么我可以帮您的？您可以询问关于商品、门票、定制流程等任何问题。'
      }

      const newAiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponse,
        timestamp: formatHourMinute(new Date())
      }
      setMessages((prev) => [...prev, newAiMessage])
    }, 1000)
  }

  const contactHumanAgent = () => {
    Taro.showModal({
      title: '寻求人工客服',
      content: '当前人工客服在线时间为 9:00 - 18:00。是否立即接通人工服务？',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({title: '正在为您接入人工客服，请稍候...', icon: 'none'})
        }
      }
    })
  }

  return (
    <View className="bg-gradient-subtle min-h-screen flex flex-col">
      <View className="bg-card px-4 py-3 border-b border-border shadow-sm flex items-center justify-between">
        <View className="flex items-center">
          <View className="i-mdi-robot text-2xl text-primary mr-2" />
          <View>
            <Text className="text-base font-bold text-accent block">AI在线助手</Text>
            <Text className="text-base text-green-500">在线为您解答问题</Text>
          </View>
        </View>
        <View
          className="bg-accent px-3 py-1 rounded-full border border-accent flex items-center"
          onClick={contactHumanAgent}>
          <View className="i-mdi-headset text-lg text-white mr-1" />
          <Text className="text-base text-white font-medium">寻求人工</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" scrollY>
        <View className="space-y-4">
          <View className="bg-muted bg-opacity-50 rounded-xl p-3 mb-6 text-center mx-auto w-4/5">
            <Text className="text-base text-muted-foreground leading-relaxed">
              人工客服上班时间：09:00 - 18:00 (法定节假日除外)。非工作时间请留言或先咨询AI助手。
            </Text>
          </View>

          {messages.map((msg) => (
            <View key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
              <View className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start`}>
                <View
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-primary ml-2' : 'bg-accent mr-2'
                  }`}>
                  <View
                    className={`${msg.role === 'user' ? 'i-mdi-account text-white' : 'i-mdi-robot text-white'} text-2xl`}
                  />
                </View>
                <View>
                  <View
                    className={`p-3 rounded-2xl shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-card text-foreground rounded-tl-none border border-border'
                    }`}>
                    <Text className="text-base leading-relaxed">{msg.content}</Text>
                  </View>
                  <Text
                    className={`text-xs text-muted-foreground mt-1 block ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                    {msg.timestamp}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="bg-card p-4 border-t border-border pb-safe">
        <View className="flex items-center gap-2">
          <View className="flex-1 bg-muted rounded-full px-4 py-2 border border-border">
            <Input
              className="w-full text-base text-foreground"
              placeholder="请输入您的问题..."
              value={inputMessage}
              onInput={(e) => setInputMessage(e.detail.value)}
              onConfirm={handleSendMessage}
            />
          </View>
          <View
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-elegant transition-transform active:scale-90"
            onClick={handleSendMessage}>
            <View className="i-mdi-send text-xl text-white" />
          </View>
        </View>
      </View>
    </View>
  )
}
