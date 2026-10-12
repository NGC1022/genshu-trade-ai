import {Image, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'

export default function Splash() {
  const [countdown, setCountdown] = useState(3)

  const handleSkip = useCallback(() => {
    Taro.switchTab({
      url: '/pages/home/index'
    })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSkip()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [handleSkip])

  return (
    <View className="relative w-screen h-screen overflow-hidden bg-accent flex flex-col items-center justify-between py-24">
      {/* Top Branding Area */}
      <View className="flex flex-col items-center space-y-6 z-10">
        <Text className="text-white text-4xl font-black tracking-[0.4em] drop-shadow-2xl">根书文创</Text>
        <View className="h-[1px] w-24 bg-white/30" />
        <Text className="text-white/80 text-base tracking-[0.2em] font-light">枯木逢春 · 书写自然</Text>
      </View>

      {/* Centered Image Container with Aspect Ratio Protection */}
      <View className="w-[85%] h-[55%] relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <Image
          src="https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_cb0dfa04-cbf4-4823-bb8e-58565f6fe06f.jpg"
          mode="aspectFill"
          className="w-full h-full"
        />
        {/* Decorative Inner Border */}
        <View className="absolute inset-4 border border-white/20 rounded-lg pointer-events-none" />
      </View>

      {/* Bottom Information Area */}
      <View className="flex flex-col items-center space-y-4 z-10">
        <Text className="text-white/70 text-base tracking-[0.3em] uppercase">匠心传承 · 艺术之美</Text>
        <Text className="text-white/40 text-xs tracking-widest font-mono">2026 GENSHU CULTURAL</Text>
      </View>

      {/* Skip Button in Top Right */}
      <View
        className="absolute top-12 right-6 bg-black/30 backdrop-blur-md px-6 py-2.5 rounded-full flex items-center justify-center border border-white/10 active:scale-95 transition-transform"
        onClick={handleSkip}>
        <Text className="text-white text-base font-bold tracking-tight">跳过 {countdown}s</Text>
      </View>
    </View>
  )
}
