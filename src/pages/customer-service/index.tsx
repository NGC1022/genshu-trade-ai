import {Input, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {formatHourMinute} from '@/utils/time'
import {useLanguage} from '@/hooks/useLanguage'

interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  content: string
  timestamp: string
}

export default function CustomerService() {
  const language = useLanguage()
  const ui = (zh: string, en: string) => (language === 'en' ? en : zh)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'ai',
      content: ui(
        '您好！我是根书文创AI助手。很高兴为您服务！请问有什么我可以帮您的？您可以询问关于商品、门票、定制流程等任何问题。',
        'Hello! I am the Root Culture AI assistant. I can help with products, tickets, and customization. How may I help you?'
      ),
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
      let aiResponse = ui(
        '抱歉，我不明白您的问题。您可以尝试换一种方式询问，或者点击下方的"寻求人工客服"按钮，联系我们的专业客服团队。',
        'Sorry, I did not understand. Please rephrase your question or contact a human agent below.'
      )

      const content = newUserMessage.content.toLowerCase()
      if (content.includes('门票') || content.includes('票')) {
        aiResponse = ui(
          '根书文创园门票目前有联名套票、艺术馆单人票和景区参观门票三种，均可在"文旅门票"板块预订。购票后30天内有效。',
          'Root Culture Park currently offers a combo ticket, a museum admission ticket, and a scenic-area ticket. You can book them in Cultural Experience Tickets. Tickets are valid for 30 days after purchase.'
        )
      } else if (content.includes('定制') || content.includes('3d')) {
        aiResponse = ui(
          '我们的3D打印定制服务支持1-15字定制，建议4-5字效果最佳。制作周期约5-7个工作日。',
          'Our 3D-printed customization service supports 1–15 characters. We recommend 4–5 characters for the best result. Production usually takes about 5–7 business days.'
        )
      } else if (content.includes('退款') || content.includes('退票')) {
        aiResponse = ui(
          '门票一经售出原则上不予退款，特殊情况如场馆闭馆除外。非定制商品在签收后7天内且不影响二次销售的情况下支持退换。',
          'Tickets are generally non-refundable after purchase, except in special cases such as venue closure. Non-custom products may be returned or exchanged within 7 days of receipt if they remain in resalable condition.'
        )
      } else if (content.includes('发货') || content.includes('物流')) {
        aiResponse = ui(
          '普通商品下单后1-2个工作日内发货，顺丰包邮。定制商品需5-15个工作日制作完成后发货。',
          'Regular products usually ship within 1–2 business days with complimentary SF Express shipping. Custom products ship after 5–15 business days of production.'
        )
      } else if (content.includes('你好') || content.includes('您好')) {
        aiResponse = ui(
          '您好！请问有什么我可以帮您的？您可以询问关于商品、门票、定制流程等任何问题。',
          'Hello! How may I help? You can ask about products, tickets, or customization.'
        )
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
      title: ui('寻求人工客服', 'Contact a human agent'),
      content: ui(
        '当前人工客服在线时间为 9:00 - 18:00。是否立即接通人工服务？',
        'Human support is available from 9:00 to 18:00. Connect to an agent now?'
      ),
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({
            title: ui('正在为您接入人工客服，请稍候...', 'Connecting you to a human agent...'),
            icon: 'none'
          })
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
