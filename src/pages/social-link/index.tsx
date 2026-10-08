import {Text, View, WebView} from '@tarojs/components'
import {useLoad} from '@tarojs/taro'
import {useState} from 'react'

export default function SocialLinkPage() {
  const [url, setUrl] = useState('')
  useLoad((options) => {
    setUrl(options?.url ? decodeURIComponent(options.url) : '')
  })
  if (!url) {
    return <View className="min-h-screen bg-background p-5"><Text className="text-sm text-muted-foreground">授权链接加载中，请返回营销素材页重试。</Text></View>
  }
  return <WebView src={url} />
}
