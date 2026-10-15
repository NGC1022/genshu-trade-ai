import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useLanguage} from '@/hooks/useLanguage'
import {t} from '@/utils/i18n'

export default function Customization() {
  useLanguage()
  const navigate3D = () => {
    Taro.navigateTo({url: '/pages/3d-customization/index'})
  }

  const navigatePremium = () => {
    Taro.navigateTo({url: '/pages/premium-customization/index'})
  }

  const navigateOrders = () => {
    Taro.navigateTo({url: '/pages/customization-list/index'})
  }

  return (
    <View className="bg-gradient-subtle min-h-screen px-4 py-8">
      <View className="bg-gradient-primary rounded-3xl p-8 mb-8 shadow-elegant relative overflow-hidden">
        <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <Text className="text-3xl font-black text-white block mb-6 tracking-wide">{t('customization_service')}</Text>
        <Text className="text-base text-white/90 font-medium tracking-tight block">{t('customization_tagline')}</Text>
      </View>

      <View
        className="bg-card rounded-[32px] p-8 mb-6 shadow-card border border-border border-opacity-10 active:scale-[0.98] transition-all"
        onClick={navigate3D}>
        <View className="flex items-start">
          <View className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mr-6 shadow-sm">
            <View className="i-mdi-printer-3d text-4xl text-white" />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground block mb-4 tracking-tight">{t('custom_3d')}</Text>
            <Text className="text-base text-muted-foreground leading-relaxed opacity-80 block">
              {t('custom_3d_desc')}
            </Text>

            <View className="flex items-center mt-4">
              <Text className="text-base text-primary font-black uppercase tracking-widest mr-1">{t('try_now')}</Text>
              <View className="i-mdi-chevron-right text-primary text-xl" />
            </View>
          </View>
        </View>
      </View>

      <View
        className="bg-card rounded-[32px] p-8 mb-6 shadow-card border border-border border-opacity-10 active:scale-[0.98] transition-all"
        onClick={navigatePremium}>
        <View className="flex items-start">
          <View className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mr-6 shadow-sm">
            <View className="i-mdi-diamond text-4xl text-foreground" />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground block mb-4 tracking-tight">{t('premium_custom')}</Text>
            <Text className="text-base text-muted-foreground leading-relaxed opacity-80 block">
              {t('premium_custom_desc')}
            </Text>

            <View className="flex items-center mt-4">
              <Text className="text-base text-primary font-black uppercase tracking-widest mr-1">
                {t('submit_request')}
              </Text>
              <View className="i-mdi-chevron-right text-primary text-xl" />
            </View>
          </View>
        </View>
      </View>

      <View
        className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 active:opacity-60 transition-all mt-4"
        onClick={navigateOrders}>
        <View className="flex items-center justify-between">
          <View className="flex items-center">
            <View className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center mr-4">
              <View className="i-mdi-format-list-bulleted text-2xl text-primary" />
            </View>
            <Text className="text-base font-bold text-foreground tracking-tight">{t('view_custom_orders')}</Text>
          </View>
          <View className="i-mdi-chevron-right text-xl text-muted-foreground" />
        </View>
      </View>
    </View>
  )
}
