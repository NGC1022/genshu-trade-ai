import {Button, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getUnreadMessageCount} from '@/db/api'
import {isBusinessRole} from '@/utils/roles'

export default function Profile() {
  const {user, profile, signOut} = useAuth()
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
    Taro.showToast({title: '已退出登录', icon: 'success'})
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
        <Text className="text-lg text-foreground mb-6">请先登录</Text>
        <Button
          className="bg-gradient-primary text-white rounded-full px-8 py-3 text-base font-bold break-keep"
          onClick={() => Taro.navigateTo({url: '/pages/login/index'})}>
          立即登录
        </Button>
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
                {(profile?.username as string) || '艺术体验者'}
              </Text>
              <View className="bg-white/20 px-3 py-0.5 rounded-full self-start inline-block">
                <Text className="text-xs text-white font-bold tracking-widest uppercase">
                  {profile?.role === 'super_admin' ? '特级管理员' : profile?.role === 'admin' ? '管理员' : '尊享会员'}
                </Text>
              </View>
            </View>
          </View>
          <View className="flex flex-col gap-2">
            <View
              className="bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-sm rounded-2xl px-5 py-2.5 border border-white/20 transition-all text-center"
              onClick={() => navigateTo('/pages/profile-edit/index')}>
              <Text className="text-base text-white font-bold">资料设置</Text>
            </View>
            <View
              className="bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-sm rounded-2xl px-5 py-2.5 border border-white/20 transition-all text-center"
              onClick={() => user && navigateTo(`/pages/user-profile/index?userId=${user.id}`)}>
              <Text className="text-base text-white font-bold">个人页面</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="px-6 -mt-6">
        {/* 社交互动板块 */}
        <View className="bg-card rounded-[32px] p-6 mb-6 shadow-card border border-border border-opacity-10">
          <Text className="text-base text-muted-foreground font-black uppercase tracking-widest mb-4 block px-2">
            我的动态
          </Text>
          <View className="grid grid-cols-4 gap-3 py-2">
            <View
              className="flex flex-col items-center active:opacity-60"
              onClick={() => navigateTo('/pages/my-notes/index')}>
              <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                <View className="i-mdi-note-text text-2xl text-primary" />
              </View>
              <Text className="text-sm font-bold text-foreground">已发文</Text>
            </View>
            <View
              className="flex flex-col items-center active:opacity-60"
              onClick={() => navigateTo('/pages/draft-box/index')}>
              <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                <View className="i-mdi-file-document-outline text-2xl text-primary" />
              </View>
              <Text className="text-sm font-bold text-foreground">草稿箱</Text>
            </View>
            <View
              className="flex flex-col items-center active:opacity-60"
              onClick={() => user && navigateTo(`/pages/following-list/index?userId=${user.id}`)}>
              <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                <View className="i-mdi-account-multiple text-2xl text-primary" />
              </View>
              <Text className="text-sm font-bold text-foreground">已追踪</Text>
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
              <Text className="text-sm font-bold text-foreground">消息</Text>
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
                <Text className="text-lg font-black text-foreground tracking-tight block">会员中心</Text>
                <Text className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                  VIP Benefits & Exclusive Content
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
              <Text className="text-lg font-bold text-foreground tracking-tight">我的订单</Text>
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
              <Text className="text-lg font-bold text-foreground tracking-tight">我的门票</Text>
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
              <Text className="text-lg font-bold text-foreground tracking-tight">定制订单</Text>
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
                <Text className="text-lg font-bold text-foreground tracking-tight">售后中心</Text>
                <Text className="text-xs text-muted-foreground mt-0.5">退货 · 换货 · 退款 · 物流破损申报</Text>
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
              <Text className="text-lg font-bold text-foreground tracking-tight">收货地址</Text>
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
              <Text className="text-lg font-bold text-foreground tracking-tight">AI跨境贸易助手</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
        </View>

        {/* 商家业务入口（商家/运营/审核/管理员可见，需求十五/十六） */}
        {isBusinessRole((profile as any)?.role) && (
          <View className="bg-card rounded-[32px] p-6 mb-6 shadow-card border border-secondary border-opacity-20">
            <Text className="text-base text-secondary/70 font-black uppercase tracking-widest mb-4 block px-2">
              商家业务端
            </Text>
            <View
              className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
              onClick={() => navigateTo('/pages/merchant-admin/index')}>
              <View className="flex items-center">
                <View className="w-10 h-10 bg-secondary/10 rounded-2xl flex items-center justify-center mr-4">
                  <View className="i-mdi-storefront-outline text-2xl text-secondary" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-foreground tracking-tight">商家运营后台</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">商品 · SKU · 订单 · 客户 · 售后 · 看板</Text>
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
            <Text className="text-sm text-muted-foreground font-bold">隐私与数据使用说明</Text>
          </View>
          <Text className="text-xs text-muted-foreground leading-relaxed">
            手机号、邮箱、收货地址与客户联系方式等信息在无权限角色下展示时将进行脱敏处理；客户业务数据按角色（消费者/商家/审核/管理员）控制访问；AI处理业务信息仅用于生成辅助内容，不会在页面中泄露不必要的敏感数据。本项目未声明任何正式安全认证或法律合规资质，正式运营前需完成相应合规评估。
          </Text>
        </View>

        {isAdmin && (
          <View className="bg-card rounded-[32px] p-6 mb-6 shadow-card border border-accent border-opacity-10 bg-accent/5">
            <Text className="text-base text-accent/60 font-black uppercase tracking-widest mb-4 block px-2">
              管理控制台
            </Text>
            <View
              className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
              onClick={() => navigateTo('/pages/admin-orders/index')}>
              <View className="flex items-center">
                <View className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center mr-4">
                  <View className="i-mdi-clipboard-list text-2xl text-accent" />
                </View>
                <Text className="text-lg font-bold text-foreground tracking-tight">订单管理</Text>
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
                <Text className="text-lg font-bold text-foreground tracking-tight">门票核销</Text>
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
                <Text className="text-lg font-bold text-foreground tracking-tight">定制审核</Text>
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
                <Text className="text-lg font-bold text-foreground tracking-tight">退款管理</Text>
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
                <Text className="text-lg font-bold text-foreground tracking-tight">内容举报管理</Text>
              </View>
              <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
            </View>
          </View>
        )}

        <View className="bg-card rounded-[32px] p-6 mb-8 shadow-card border border-border border-opacity-10">
          <Text className="text-base text-muted-foreground font-black uppercase tracking-widest mb-4 block px-2">
            服务与支持
          </Text>
          <View
            className="flex items-center justify-between py-4 active:opacity-60 transition-opacity"
            onClick={() => navigateTo('/pages/privacy-settings/index')}>
            <View className="flex items-center">
              <View className="w-10 h-10 bg-muted rounded-2xl flex items-center justify-center mr-4">
                <View className="i-mdi-shield-lock text-2xl text-primary" />
              </View>
              <Text className="text-lg font-bold text-foreground tracking-tight">隐私管理</Text>
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
              <Text className="text-lg font-bold text-foreground tracking-tight">帮助中心</Text>
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
              <Text className="text-lg font-bold text-foreground tracking-tight">在线客服</Text>
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
                <Text className="text-lg font-bold text-foreground tracking-tight">AI跨境客服</Text>
                <Text className="text-xs text-muted-foreground">跨境贸易业务咨询（演示模式）</Text>
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
                <Text className="text-lg font-bold text-foreground tracking-tight">售后服务</Text>
                <Text className="text-xs text-muted-foreground mt-0.5 block">商品质量 · 物流损坏 · 退换货</Text>
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
              <Text className="text-lg font-bold text-foreground tracking-tight">报错申请</Text>
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
              <Text className="text-lg font-bold text-foreground tracking-tight">关于我们</Text>
            </View>
            <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
          </View>
        </View>

        <Button
          className="w-full bg-destructive/10 text-destructive rounded-3xl py-4 text-base font-black border border-destructive/20 active:bg-destructive active:text-white transition-all mb-10"
          onClick={handleLogout}>
          退出登录
        </Button>
      </View>
    </View>
  )
}
