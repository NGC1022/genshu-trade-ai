// @title AI跨境客服
// AI跨境客服：远端 MiniMax 或规则演示模式，不虚构事实数据
// 支持发送文创商品图片，由 MiniMax-M3 多模态模型识别并解答
import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {isSupabaseConfigured, supabase} from '@/client/supabase'
import {useAuth} from '@/contexts/AuthContext'
import {useLanguage} from '@/hooks/useLanguage'
import type {SupportMessage} from '@/services/aiTrade'
import {analyzeProductImage, generateSupportReply, getProviderInfo} from '@/services/aiTrade'
import {translateText} from '@/utils/translate'
import {selectMediaFiles, uploadToSupabase} from '@/utils/upload'

// 预置快捷问题（演示流程引导）
interface ChatItem extends SupportMessage {
  suggestions?: string[]
  imageResult?: string // 图片识别后的结构化描述（AI消息）
  translation?: string // AI回复的英文翻译
  translating?: boolean // 是否正在翻译
  translateError?: boolean // 翻译失败
}

const IMAGE_BUCKET = 'support_images'

export default function AiTradeSupport() {
  const language = useLanguage()
  const ui = useCallback((zh: string, en: string) => (language === 'en' ? en : zh), [language])
  const quickQuestions = useMemo(
    () =>
      language === 'en'
        ? [
            'What is Root Calligraphy?',
            'How should I handle an English inquiry?',
            'How do I quote for overseas buyers?',
            'I want to sell in the United States'
          ]
        : ['根书是什么技艺？', '如何处理海外英文询盘？', '如何给海外客户报价？', '我想把产品卖到美国'],
    [language]
  )
  const {user} = useAuth()
  const providerInfo = getProviderInfo()
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      role: 'assistant',
      content: ui(
        '您好！我是“根生万象”AI跨境客服，可以解答非遗文创跨境贸易相关咨询（商品国际化、市场分析、询盘处理、智能报价、个性定制合作）。您也可以发送文创商品图片，我会为您识别并分析。请问有什么可以帮您？',
        'Hello! I am the Genshu AI Trade Support assistant. I can help with product localization, market research, inquiries, smart quotes, and custom collaborations for heritage products. You can also send a product image for analysis. How can I help?'
      ),
      suggestions: quickQuestions
    }
  ])
  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0].role !== 'assistant') return current
      return [
        {
          ...current[0],
          content: ui(
            '您好！我是“根生万象”AI跨境客服，可以解答非遗文创跨境贸易相关咨询（商品国际化、市场分析、询盘处理、智能报价、个性定制合作）。您也可以发送文创商品图片，我会为您识别并分析。请问有什么可以帮您？',
            'Hello! I am the Genshu AI Trade Support assistant. I can help with product localization, market research, inquiries, smart quotes, and custom collaborations for heritage products. You can also send a product image for analysis. How can I help?'
          ),
          suggestions: quickQuestions
        }
      ]
    })
  }, [quickQuestions, ui])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  // 双锚点交替：每次对话更新改变 scrollIntoView 属性值，触发 ScrollView 滚动到底部
  // （不通过 ref 调用方法：Taro ScrollView 实例无 scrollIntoView 方法，仅有同名 prop）
  const [scrollAnchor, setScrollAnchor] = useState('chat-bottom-a')
  const scrollBottom = useCallback(() => {
    setScrollAnchor((prev) => (prev === 'chat-bottom-a' ? 'chat-bottom-b' : 'chat-bottom-a'))
  }, [])

  // messages/sending 镜像 ref：send 回调读取最新值而不产生依赖
  const messagesRef = useRef<ChatItem[]>(messages)
  messagesRef.current = messages
  const sendingRef = useRef(false)
  sendingRef.current = sending

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || sendingRef.current) return
      const nextMessages: ChatItem[] = [...messagesRef.current, {role: 'user', content}]
      setMessages(nextMessages)
      setInput('')
      setSending(true)
      scrollBottom()
      try {
        const result = await generateSupportReply(nextMessages)
        setMessages([...nextMessages, {role: 'assistant', content: result.reply, suggestions: result.suggestions}])
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'AI客服暂时不可用，请稍后再试'
        setMessages([...nextMessages, {role: 'assistant', content: `抱歉，${msg}`}])
      } finally {
        setSending(false)
        scrollBottom()
      }
    },
    [scrollBottom]
  )

  // 发送文创商品图片：选图 → 上传Storage → MiniMax-M3多模态识别 → 展示结果
  const sendImage = useCallback(async () => {
    if (sendingRef.current || uploading) return
    if (!isSupabaseConfigured) {
      Taro.showToast({
        title: ui('图片识别尚未配置服务器连接', 'Image analysis is not configured on the server yet'),
        icon: 'none'
      })
      return
    }
    if (!user) {
      Taro.showToast({title: ui('请登录后再上传图片', 'Please sign in before uploading an image'), icon: 'none'})
      return
    }
    try {
      const files = await selectMediaFiles({mediaType: ['image'], count: 1})
      if (!files || files.length === 0) return
      const file = files[0]
      setUploading(true)
      const res = await uploadToSupabase(file, {bucket: IMAGE_BUCKET, userId: user.id})
      if (!res.success || !res.data?.path) {
        Taro.showToast({title: ui('图片上传失败', 'Image upload failed'), icon: 'none'})
        return
      }
      const publicUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(res.data.path).data.publicUrl

      const userMsg: ChatItem = {role: 'user', content: '请识别这张文创商品图片', imageUrl: publicUrl}
      const nextMessages: ChatItem[] = [...messagesRef.current, userMsg]
      setMessages(nextMessages)
      scrollBottom()
      setSending(true)

      try {
        const result = await analyzeProductImage(publicUrl)
        const desc = [
          `【商品识别】${result.name}（${result.category}）`,
          result.material && result.material !== '待确认' ? `材质：${result.material}` : '',
          result.features.length > 0 ? `外观特征：${result.features.join('、')}` : '',
          result.cultural_elements.length > 0 ? `文化元素：${result.cultural_elements.join('、')}` : '',
          result.description
        ]
          .filter(Boolean)
          .join('\n')
        setMessages([
          ...nextMessages,
          {role: 'assistant', content: desc, suggestions: result.suggestions, imageResult: '1'}
        ])
      } catch (e) {
        const msg = e instanceof Error ? e.message : '图片识别失败'
        setMessages([...nextMessages, {role: 'assistant', content: `抱歉，${msg}，请重试或改用文字提问`}])
      } finally {
        setSending(false)
        scrollBottom()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!message.toLowerCase().includes('cancel')) {
        Taro.showToast({title: message || '图片选择失败，请重试', icon: 'none'})
      }
    } finally {
      setUploading(false)
    }
  }, [uploading, user, scrollBottom, ui])

  // 保存客服对话记录（登录用户，type=inquiry 不合适，此处仅本地体验，不入库）
  // 说明：客服会话为即时咨询，不写入 ai_trade_records 业务记录，避免污染真实业务数据

  // 翻译某条AI消息为英文（中英双语实时翻译）
  const translateMessage = useCallback(
    async (index: number) => {
      const msg = messagesRef.current[index]
      if (msg?.role !== 'assistant' || msg.translating || msg.translation) return
      setMessages((prev) => prev.map((m, i) => (i === index ? {...m, translating: true, translateError: false} : m)))
      try {
        const en = await translateText(msg.content, 'zh', 'en')
        setMessages((prev) => prev.map((m, i) => (i === index ? {...m, translation: en, translating: false} : m)))
        scrollBottom()
      } catch (_e) {
        setMessages((prev) => prev.map((m, i) => (i === index ? {...m, translating: false, translateError: true} : m)))
      }
    },
    [scrollBottom]
  )

  return (
    <View className="h-screen flex flex-col bg-background">
      <View
        className={`border-b px-4 py-2 flex flex-row items-center ${
          providerInfo.supportIsMock ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
        <View
          className={`i-mdi-information-outline text-base mr-1.5 ${
            providerInfo.supportIsMock ? 'text-amber-700' : 'text-emerald-700'
          }`}
        />
        <Text className={`text-xs flex-1 ${providerInfo.supportIsMock ? 'text-amber-700' : 'text-emerald-700'}`}>
          {providerInfo.supportIsMock
            ? ui(
                '课堂演示模式：客服回复使用规则模拟；图片识别需配置服务端模型。',
                'Classroom demo mode: replies use rules; server-side model setup is required for image analysis.'
              )
            : language === 'en'
              ? `Remote support: ${providerInfo.supportProviderName} · image analysis uses the same model; verify trade facts manually.`
              : `远端客服：${providerInfo.supportProviderName} · 图片识别使用同一模型服务，交易事实仍需人工确认。`}
        </Text>
      </View>

      {/* 多语言能力说明（需求二十二：中英实时互译已启用，日/西语预留） */}
      <View className="bg-muted/60 border-b border-border border-opacity-10 px-4 py-2 flex flex-row items-center">
        <View className="i-mdi-translate text-base text-muted-foreground mr-1.5" />
        <Text className="text-xs text-muted-foreground flex-1">
          {ui(
            '客服语言：中文/English（已启用互译）· 日本語/Español（扩展预留）· 原文与翻译分开展示，不覆盖原文',
            'Support languages: Chinese / English (translation enabled) · Japanese / Spanish (planned). Original text is preserved.'
          )}
        </Text>
      </View>

      {/* 消息列表 */}
      <ScrollView className="flex-1" scrollY scrollIntoView={scrollAnchor} scrollWithAnimation>
        <View className="px-4 py-4">
          {messages.map((m, i) => (
            <View key={i} className="mb-4">
              {m.role === 'user' ? (
                <View className="flex flex-row justify-end">
                  <View className="flex flex-col items-end max-w-[80%]">
                    {m.imageUrl ? (
                      <Image
                        className="w-44 h-44 rounded-[20px] rounded-tr-lg mb-2"
                        src={m.imageUrl}
                        mode="aspectFill"
                      />
                    ) : null}
                    {m.content ? (
                      <View className="bg-primary rounded-[24px] rounded-tr-lg px-4 py-3 active:scale-[0.98] transition-all">
                        <Text className="text-base text-primary-foreground leading-relaxed">{m.content}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                    <View className="i-mdi-account text-xl text-primary" />
                  </View>
                </View>
              ) : (
                <View className="flex flex-row">
                  <View className="w-9 h-9 bg-secondary/10 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    <View className="i-mdi-robot-outline text-xl text-secondary" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="bg-card rounded-[24px] rounded-tl-lg px-4 py-3 border border-border border-opacity-10">
                      <Text className="text-base text-foreground leading-relaxed whitespace-pre-line">{m.content}</Text>
                    </View>
                    {/* 中英双语翻译 */}
                    {m.translation ? (
                      <View className="bg-secondary/5 rounded-2xl px-4 py-2 mt-2 border border-secondary/15">
                        <View className="flex flex-row items-center mb-1">
                          <View className="i-mdi-translate text-base text-secondary mr-1.5" />
                          <Text className="text-xs text-secondary font-bold">English</Text>
                        </View>
                        <Text className="text-sm text-muted-foreground leading-relaxed">{m.translation}</Text>
                      </View>
                    ) : (
                      <View
                        className="flex flex-row items-center mt-2 active:opacity-70 transition-opacity"
                        onClick={() => translateMessage(i)}>
                        {m.translating ? (
                          <>
                            <View className="i-mdi-loading animate-spin text-base text-secondary mr-1.5" />
                            <Text className="text-xs text-secondary">{ui('翻译中...', 'Translating...')}</Text>
                          </>
                        ) : m.translateError ? (
                          <>
                            <View className="i-mdi-refresh text-base text-destructive mr-1.5" />
                            <Text className="text-xs text-destructive">
                              {ui('翻译加载失败，点击重试', 'Translation failed. Tap to retry.')}
                            </Text>
                          </>
                        ) : (
                          <>
                            <View className="i-mdi-translate text-base text-secondary mr-1.5" />
                            <Text className="text-xs text-secondary">
                              {ui('查看英文翻译', 'View English translation')}
                            </Text>
                          </>
                        )}
                      </View>
                    )}
                    {m.suggestions && m.suggestions.length > 0 && !sending ? (
                      <View className="flex flex-row flex-wrap gap-2 mt-2">
                        {m.suggestions.map((s, si) => (
                          <View
                            key={si}
                            className="bg-secondary/10 border border-secondary/20 rounded-full px-3 py-1.5 active:scale-95 transition-all"
                            onClick={() => send(s)}>
                            <Text className="text-sm text-secondary font-bold">{s}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
          ))}
          {sending ? (
            <View className="flex flex-row items-center mb-4">
              <View className="w-9 h-9 bg-secondary/10 rounded-full flex items-center justify-center mr-2">
                <View className="i-mdi-robot-outline text-xl text-secondary" />
              </View>
              <View className="bg-card rounded-[24px] rounded-tl-lg px-4 py-3 border border-border border-opacity-10">
                <Text className="text-base text-muted-foreground">
                  {uploading
                    ? ui('正在上传图片...', 'Uploading image...')
                    : ui('AI正在分析，请稍候...', 'AI is analysing. Please wait...')}
                </Text>
              </View>
            </View>
          ) : null}
          <View id="chat-bottom-a" />
          <View id="chat-bottom-b" />
        </View>
      </ScrollView>

      {/* 输入区 */}
      <View className="bg-card border-t border-border border-opacity-10 px-3 py-3 pb-safe">
        <View className="flex flex-row items-center gap-2">
          <View
            className={`w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all flex-shrink-0 ${
              sending || uploading ? 'bg-muted' : 'bg-secondary/10'
            }`}
            onClick={sendImage}>
            <View
              className={`i-mdi-image-multiple-outline text-xl ${sending || uploading ? 'text-muted-foreground' : 'text-secondary'}`}
            />
          </View>
          <View className="flex-1 min-w-0 bg-muted/60 rounded-full border border-border border-opacity-20 px-4 py-2 flex flex-row items-center overflow-hidden">
            <input
              className="flex-1 min-w-0 text-base text-foreground bg-transparent outline-none"
              placeholder={ui('输入跨境业务问题...', 'Ask a cross-border trade question...')}
              value={input}
              onInput={(e) => {
                const ev = e as any
                setInput(ev.detail?.value ?? ev.target?.value ?? '')
              }}
              onKeyUp={(e) => {
                if ((e as any).key === 'Enter') send(input)
              }}
            />
          </View>
          <View
            className={`rounded-full px-5 py-2.5 flex flex-row items-center justify-center active:scale-95 transition-all ${
              sending || !input.trim() ? 'bg-primary/50' : 'bg-primary'
            }`}
            onClick={() => send(input)}>
            <Text className="text-base text-primary-foreground font-bold">{sending ? '...' : ui('发送', 'Send')}</Text>
          </View>
        </View>
        <Text className="text-xs text-muted-foreground mt-2 px-2 block">
          {ui(
            '支持发送文创商品图片识别 · AI回复仅作业务参考，具体信息请以人工确认为准',
            'Product images are supported · AI replies are for reference only; verify final details with a person.'
          )}
        </Text>
      </View>
    </View>
  )
}
