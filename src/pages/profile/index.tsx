import {Button, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getUnreadMessageCount} from '@/db/api'
import {useLanguage} from '@/hooks/useLanguage'
import {setLanguage, t} from '@/utils/i18n'
import {isBusinessRole} from '@/utils/roles'

export default function Profile() {
  const {user, profile, signOut} = useAuth()
  const language = useLanguage()
  const [isAdmin, setIsAdmin] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUnreadCount = useCallback(async () => {
    if (user) {
      const {count} = await getUnreadMessageCount(user.id)
      setUnreadCount(count)
    }
  }, [user])

  useDidShow(() => {
    loadUnreadCount()
    if (profile) {
      setIsAdmin(profile.role === 'admin' || profile.role === 'super_admin')
    }
  })

  useEffect(() => {
    // 监听未读数刷新事件
    Taro.eventCenter.on('refreshUnreadCount', loadUnreadCount)
    return () => {
      Taro.eventCenter.off('refreshUnreadCount', loadUnreadCount)
    }
  }, [loadUnreadCount])

  const handleLogout = async () => {
    await signOut()
    Taro.showToast({title: t('logged_out'), icon: 'success'})
    setTimeout(() => {
      Taro.reLaunch({url: '/pages/login/index'})
    }, 1000)
  }

  const navigateTo = (url: string) => {
    if (!user) {
      Taro.navigateTo({url: '/pages/login/index'})
      return
    }
    Taro.navigateTo({url})
  }

  if (!user) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-6">
        <View className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
          <View className="i-mdi-account text-5xl text-white" />
        </View>
        <Text className="text-lg text-foreground mb-6">{t('login_first')}</Text>
        <Button
          className="bg-gradient-primary text-white rounded-full px-8 py-3 text-base font-bold break-keep"
          onClick={() => Taro.navigateTo({url: '/pages/login/index'})}>
          {t('login_now')}
        </Button>
        <View className="bg-card rounded-2xl p-4 mt-6 w-full max-w-sm border border-border border-opacity-10">
          <Text className="text-sm text-muted-foreground font-bold block mb-3 text-center">{t('language')}</Text>
          <View className="flex flex-row gap-3">
            <View
              className={`flex-1 rounded-xl px-3 py-2 border ${language === 'zh' ? 'border-primary bg-primary/5' : 'border-border border-opacity-20'}`}
              onClick={() => {
                setLanguage('zh')
                Taro.showToast({title: t('language_changed_zh'), icon: 'none'})
              }}>
              <Text className={`text-center font-bold ${language === 'zh' ? 'text-primary' : 'text-foreground'}`}>
                简体中文
              </Text>
            </View>
            <View
              className={`flex-1 rounded-xl px-3 py-2 border ${language === 'en' ? 'border-primary bg-primary/5' : 'border-border border-opacity-20'}`}
              onClick={() => {
                setLanguage('en')
                Taro.showToast({title: t('language_changed_en'), icon: 'none'})
              }}>
              <Text className={`text-center font-bold ${language === 'en' ? 'text-primary' : 'text-foreground'}`}>
                English
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <View className="bg-gradient-primary pt-16 pb-12 px-8 rounded-b-[48px] shadow-elegant relative overflow-hidden">
        <View className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <View className="flex items-center justify-between relative z-10">
          <View className="flex items-center">
            <View className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mr-6 border border-white/30 shadow-sm overflow-hidden">
              <View className="i-mdi-account text-5xl text-white/90" />
            </View>
            <View>
              <Text className="text-2xl font-black text-white mb-1 tracking-tight">
                {(profile?.username as string) || t('user_name')}
              </Text>
              <View className="bg-white/20 px-3 py-0.5 rounded-full self-start inline-block">
                <Text className="text-xs text-white font-bold tracking-widest uppercase">
                  {profile?.role === 'super_admin'
                    ? t('super_admin')
                    : profile?.role === 'admin'
                      ? t('admin')
                      : t('member')}
                </Text>
              </View>
            </View>
          </View>
          <View className="flex flex-col gap-2">
            <View
              className="bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-sm rounded-2xl px-5 py-2.5 border border-white/20 transition-all text-center"
              onClick={() => navigateTo('/pages/profile-edit/index')}>
              <Text className="text-base text-white font-bold">{t('profile_settings')}</Text>
            </View>
            <View
              className="bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-sm rounded-2xl px-5 py-2.5 border border-white/20 transition-all text-center"
              onClick={() => user && navigateTo(`/pages/user-profile/index?userId=${user.id}`)}>
              <Text className="text-base text-white font-bold">{t('personal_page')}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="px-6 -mt-6">
        {/* 社交互动板块 */}
        <View className="bg-card rounded-[32px] p-6 mb-6 shadow-card border border-border border-opacity-10">
          <Text className="text-base text-muted-foreground font-black uppercase tracking-widest mb-4 block px-2">
            {t('my_activity')}
          </Text>
          <View className="grid grid-cols-4 gap-3 py-2">
            <View
              className="flex flex-col items-center active:opacity-60"
              onClick={() => navigateTo('/pages/my-notes/index')}>
              <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                <View className="i-mdi-note-text text-2xl text-primary" />
              </View>
              <Text className="text-sm font-bold text-foreground">{t('posts')}</Text>
            </View>
            <View
              className="flex flex-col items-center active:opacity-60"
              onClick={() => navigateTo('/pages/draft-box/index')}>
              <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                <View className="i-mdi-file-document-outline text-2xl text-primary" />
              </View>
              <Text className="text-sm font-bold text-foreground">{t('drafts')}</Text>
            </View>
            <View
              className="flex flex-col items-center active:opacity-60"
              onClick={() => user && navigateTo(`/pages/following-list/index?userId=${user.id}`)}>
              <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                <View className="i-mdi-account-multiple text-2xl text-primary" />
              </View>
              <Text className="text-sm font-bold text-foreground">{t('following')}</Text>
            </View>
            <View
              className="flex flex-col items-center active:opacity-60"
              onClick={() => navigateTo('/pages/messages/index')}>
              <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2 relative">
                <View className="i-mdi-bell text-2xl text-primary" />
                {unreadCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-yellow-500 rounded-full px-1 py-0.5 min-w-[28px] flex items-center justify-center">
                    <Text className="text-xs text-white font-bold leading-none">NEW</Text>
                  </View>
                )}
              </View>
              <Text className="text-sm font-bold text-foreground">{t('messages')}</Text>
            </View>
          </View>
        </View>

        <View className="bg-card rounded-[32px] p-6 mb-6 shadow-card border border-border border-opacity-10">
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/member-center/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-crown text-2xl text-white" />
              </View>
              <View>
                <Text className="text-lg font-black text-foreground tracking-tight block">{t('member_center')}</Text>
                <Text className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                  {t('vip_benefits')}
                </Text>
              </View>
            </View>
            <View className="flex flex-row items-center">
              <View className="bg-primary/10 px-2 py-0.5 rounded mr-2">
                <Text className="text-xs text-primary font-black uppercase tracking-tighter">NEW</Text>
              </View>
              <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
            </View>
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/order-list/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-shopping text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">{t('my_orders')}</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/my-tickets/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-ticket text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">{t('my_tickets')}</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/customization-list/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-palette text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">{t('customization_orders')}</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/after-sales/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-headset text-2xl text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground tracking-tight">{t('after_sales_center')}</Text>
                <Text className="text-xs text-muted-foreground mt-0.5">{t('after_sales_summary')}</Text>
              </View>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/address-list/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-map-marker text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">{t('delivery_address')}</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/ai-trade/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-earth text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">{t('ai_trade_assistant')}</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
        </View>

        {/* 商家业务入口（商家/运营/审核/管理员可见，需求十五/十六） */}
        {isBusinessRole((profile as any)?.role) && (
          <View className="bg-card rounded-[32px] p-6 mb-6 shadow-card border border-secondary border-opacity-20">
            <Text className="text-base text-secondary/70 font-black uppercase tracking-widest mb-4 block px-2">
              {t('merchant_portal')}
            </Text>
            <View
              className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
              onClick={() => navigateTo('/pages/merchant-admin/index')}>
              <View className="flex items-center">
                <View className="w-10 h-10 bg-secondary/10 rounded-2xl flex items-center justify-center mr-4">
                  <View className="i-mdi-storefront-outline text-2xl text-secondary" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-foreground tracking-tight">{t('merchant_admin')}</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">{t('merchant_admin_summary')}</Text>
                </View>
              </View>
              <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
            </View>
          </View>
        )}

        {/* 隐私与数据使用说明（需求二十一） */}
        <View className="bg-muted/60 rounded-[32px] p-6 mb-6">
          <View className="flex flex-row items-center mb-2">
            <View className="i-mdi-shield-lock-outline text-lg text-muted-foreground mr-2" />
            <Text className="text-sm text-muted-foreground font-bold">{t('privacy_data')}</Text>
          </View>
          <Text className="text-xs text-muted-foreground leading-relaxed">{t('privacy_data_summary')}</Text>
        </View>

        {isAdmin && (
          <View className="bg-card rounded-[32px] p-6 mb-6 shadow-card border border-accent border-opacity-10 bg-accent/5">
            <Text className="text-base text-accent/60 font-black uppercase tracking-widest mb-4 block px-2">
              {t('admin_console')}
            </Text>
            <View
              className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
              onClick={() => navigateTo('/pages/admin-orders/index')}>
              <View className="flex items-center">
                <View className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center mr-4">
                  <View className="i-mdi-clipboard-list text-2xl text-accent" />
                </View>
                <Text className="text-lg font-bold text-foreground tracking-tight">{t('order_management')}</Text>
              </View>
              <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
            </View>
            <View
              className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
              onClick={() => navigateTo('/pages/ticket-verify/index')}>
              <View className="flex items-center">
                <View className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center mr-4">
                  <View className="i-mdi-qrcode-scan text-2xl text-accent" />
                </View>
                <Text className="text-lg font-bold text-foreground tracking-tight">{t('ticket_verification')}</Text>
              </View>
              <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
            </View>
            <View
              className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
              onClick={() => navigateTo('/pages/admin-customizations/index')}>
              <View className="flex items-center">
                <View className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center mr-4">
                  <View className="i-mdi-file-document-edit text-2xl text-accent" />
                </View>
                <Text className="text-lg font-bold text-foreground tracking-tight">{t('customization_review')}</Text>
              </View>
              <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
            </View>
            <View
              className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
              onClick={() => navigateTo('/pages/admin-refunds/index')}>
              <View className="flex items-center">
                <View className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center mr-4">
                  <View className="i-mdi-cash-refund text-2xl text-accent" />
                </View>
                <Text className="text-lg font-bold text-foreground tracking-tight">{t('refund_management')}</Text>
              </View>
              <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
            </View>
            <View className="h-[1px] bg-border/10 mx-10" />
            <View
              className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
              onClick={() => navigateTo('/pages/admin-reports/index')}>
              <View className="flex items-center">
                <View className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center mr-4">
                  <View className="i-mdi-shield-alert text-2xl text-accent" />
                </View>
                <Text className="text-lg font-bold text-foreground tracking-tight">{t('report_management')}</Text>
              </View>
              <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
            </View>
          </View>
        )}

        <View className="bg-card rounded-[32px] p-6 mb-6 shadow-card border border-border border-opacity-10">
          <View className="mb-4 px-2">
            <Text className="text-base text-muted-foreground font-black uppercase tracking-widest block">
              {t('language')}
            </Text>
            <Text className="text-xs text-muted-foreground mt-1 block">{t('language_description')}</Text>
          </View>
          <View className="flex flex-row gap-3">
            <View
              className={`flex-1 rounded-2xl px-4 py-3 border ${language === 'zh' ? 'border-primary bg-primary/5' : 'border-border border-opacity-20'}`}
              onClick={() => {
                setLanguage('zh')
                Taro.showToast({title: t('language_changed_zh'), icon: 'none'})
              }}>
              <Text className={`text-center font-bold ${language === 'zh' ? 'text-primary' : 'text-foreground'}`}>
                简体中文
              </Text>
            </View>
            <View
              className={`flex-1 rounded-2xl px-4 py-3 border ${language === 'en' ? 'border-primary bg-primary/5' : 'border-border border-opacity-20'}`}
              onClick={() => {
                setLanguage('en')
                Taro.showToast({title: t('language_changed_en'), icon: 'none'})
              }}>
              <Text className={`text-center font-bold ${language === 'en' ? 'text-primary' : 'text-foreground'}`}>
                English
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-card rounded-[32px] p-6 mb-8 shadow-card border border-border border-opacity-10">
          <Text className="text-base text-muted-foreground font-black uppercase tracking-widest mb-4 block px-2">
            {t('service_support')}
          </Text>
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/privacy-settings/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-muted rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-shield-lock text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">{t('privacy_management')}</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/help/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-muted rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-help-circle text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">{t('help_center')}</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/customer-service/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-muted rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-headset text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">{t('online_support')}</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/ai-trade-support/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-secondary/10 rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-robot-outline text-2xl text-secondary" />
              </View>
              <View className="flex flex-col">
                <Text className="text-lg font-bold text-foreground tracking-tight">{t('ai_trade_support')}</Text>
                <Text className="text-xs text-muted-foreground">{t('ai_trade_support_summary')}</Text>
              </View>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/bug-report/index?type=after_sales')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-muted rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-headset text-2xl text-primary" />
              </View>
              <View>
                <Text className="text-lg font-bold text-foreground tracking-tight">{t('after_sales_service')}</Text>
                <Text className="text-xs text-muted-foreground mt-0.5 block">{t('after_sales_service_summary')}</Text>
              </View>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/bug-report/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-muted rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-bug-outline text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">{t('bug_report')}</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
          <View className="h-[1px] bg-border/10 mx-10" />
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/about-us/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-muted rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-information-outline text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">{t('about_us')}</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
        </View>

        <Button
          className="w-full bg-destructive/10 text-destructive rounded-3xl py-4 text-base font-black border border-destructive/20 active:bg-destructive active:text-white transition-all mb-10"
          onClick={handleLogout}>
          {t('logout')}
        </Button>
      </View>
    </View>
  )
}
