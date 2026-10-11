import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {
  claimCoupon,
  getAvailableCoupons,
  getExclusiveContentList,
  getProfile,
  getUserCoupons,
  registerMember
} from '@/db/api'
import type {Coupon, ExclusiveContent, Profile, UserCoupon} from '@/db/types'
import {DEFAULT_AVATAR, DEFAULT_PRODUCT_IMAGE} from '@/utils/images'

export default function MemberCenter() {
  const {user} = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [contents, setContents] = useState<ExclusiveContent[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [pRes, cRes, couponRes, uCouponRes] = await Promise.all([
      getProfile(user.id),
      getExclusiveContentList(),
      getAvailableCoupons(),
      getUserCoupons(user.id)
    ])
    setProfile(pRes.data)
    setContents(cRes.data)
    setCoupons(couponRes.data)
    setUserCoupons(uCouponRes.data)
    setLoading(false)
  }, [user])

  useDidShow(() => {
    loadData()
  })

  const handleRegister = async () => {
    if (!user) return
    Taro.showLoading({title: '注册中...'})
    const {data, error} = await registerMember(user.id)
    Taro.hideLoading()
    if (error) {
      Taro.showToast({title: '注册失败', icon: 'none'})
    } else {
      setProfile(data)
      Taro.showToast({title: '欢迎加入会员', icon: 'success'})
    }
  }

  const handleClaim = async (couponId: string) => {
    if (!user) return
    if (!profile?.is_member) {
      Taro.showToast({title: '请先注册会员', icon: 'none'})
      return
    }
    const {error} = await claimCoupon(user.id, couponId)
    if (error) {
      Taro.showToast({title: error.message, icon: 'none'})
    } else {
      Taro.showToast({title: '领取成功', icon: 'success'})
      loadData()
    }
  }

  const isClaimed = (couponId: string) => {
    return userCoupons.some((uc) => uc.coupon_id === couponId)
  }

  if (loading) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-xl text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full h-full" scrollY>
        <View className="p-6">
          {/* 会员卡片 */}
          <View className="bg-gradient-primary rounded-[32px] p-8 mb-8 shadow-elegant relative overflow-hidden">
            <View className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full" />
            <View className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-white/5 rounded-full" />

            <View className="relative z-10">
              <View className="flex flex-row items-center justify-between mb-8">
                <View className="flex flex-row items-center">
                  <Image
                    src={profile?.avatar_url || DEFAULT_AVATAR}
                    className="w-16 h-16 rounded-full border-2 border-white/50 mr-4 shadow-sm"
                  />
                  <View>
                    <Text className="text-2xl font-black text-white block mb-1">{profile?.username || '根书挚友'}</Text>
                    <View className="bg-white/20 px-2 py-0.5 rounded flex flex-row items-center">
                      <View className="i-mdi-crown text-sm text-yellow-400 mr-1" />
                      <Text className="text-xs text-white font-bold tracking-wider">
                        {profile?.is_member
                          ? `等级: ${profile.member_level === 'normal' ? '普通会员' : profile.member_level}`
                          : '非会员'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="i-mdi-diamond-stone text-4xl text-white/30" />
              </View>

              {!profile?.is_member ? (
                <View
                  className="bg-white rounded-2xl py-4 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                  onClick={handleRegister}>
                  <Text className="text-lg font-black text-primary">立即开启会员权益</Text>
                </View>
              ) : (
                <View className="flex flex-row justify-between items-end">
                  <View>
                    <Text className="text-sm text-white/70 block mb-1 font-medium">账户积分</Text>
                    <Text className="text-4xl font-black text-white">{profile.member_points || 0}</Text>
                  </View>
                  <View className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                    <Text className="text-sm text-white font-bold">权益详情</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 会员权益 */}
          <View className="mb-10">
            <View className="flex flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-black text-foreground">会员专属权益</Text>
              <Text className="text-base text-primary font-bold">查看全部</Text>
            </View>
            <View className="grid grid-cols-2 gap-4">
              <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10">
                <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <View className="i-mdi-ticket-percent text-2xl text-primary" />
                </View>
                <Text className="text-lg font-black text-foreground mb-1 block">购物礼券</Text>
                <Text className="text-sm text-muted-foreground font-medium">定期发放专享优惠券</Text>
              </View>
              <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10">
                <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <View className="i-mdi-star-face text-2xl text-primary" />
                </View>
                <Text className="text-lg font-black text-foreground mb-1 block">专属内容</Text>
                <Text className="text-sm text-muted-foreground font-medium">获取根书幕后故事</Text>
              </View>
              <View
                className="bg-gradient-primary rounded-3xl p-6 shadow-elegant border border-primary/20 active:scale-95 transition-transform"
                onClick={() => Taro.navigateTo({url: '/pages/quiz/index'})}>
                <View className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                  <View className="i-mdi-gamepad-variant text-2xl text-white" />
                </View>
                <Text className="text-lg font-black text-white mb-1 block">知识问答</Text>
                <Text className="text-sm text-white/80 font-medium">答题赢积分</Text>
              </View>
              <View className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10">
                <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <View className="i-mdi-gift-outline text-2xl text-primary" />
                </View>
                <Text className="text-lg font-black text-foreground mb-1 block">积分兑换</Text>
                <Text className="text-sm text-muted-foreground font-medium">更多好礼等你来</Text>
              </View>
            </View>
          </View>

          {/* 优惠券领取 */}
          <View className="mb-10">
            <View className="flex flex-row items-center mb-6">
              <View className="i-mdi-gift text-2xl text-primary mr-2" />
              <Text className="text-2xl font-black text-foreground">会员好礼领取</Text>
            </View>
            <View className="space-y-4">
              {coupons.map((coupon) => (
                <View
                  key={coupon.id}
                  className="bg-card rounded-3xl p-6 shadow-card border border-border border-opacity-10 flex flex-row items-center justify-between relative overflow-hidden">
                  <View className="absolute left-0 top-0 w-2 h-full bg-primary" />
                  <View className="flex-1 mr-4">
                    <Text className="text-xl font-black text-foreground block mb-1">{coupon.title}</Text>
                    <Text className="text-sm text-muted-foreground font-medium block mb-2">{coupon.description}</Text>
                    <View className="flex flex-row items-baseline">
                      <Text className="text-3xl font-black text-primary mr-1">¥{coupon.discount_amount}</Text>
                      <Text className="text-sm text-muted-foreground font-bold">满{coupon.min_order_amount}可用</Text>
                    </View>
                  </View>
                  <View
                    className={`px-6 py-3 rounded-2xl flex items-center justify-center ${isClaimed(coupon.id) ? 'bg-muted opacity-50' : 'bg-gradient-primary shadow-elegant active:scale-95 transition-transform'}`}
                    onClick={() => !isClaimed(coupon.id) && handleClaim(coupon.id)}>
                    <Text className="text-base font-black text-white">
                      {isClaimed(coupon.id) ? '已领取' : '立即领取'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 会员专属内容推送 */}
          <View className="mb-10">
            <View className="flex flex-row items-center justify-between mb-6">
              <View className="flex flex-row items-center">
                <View className="i-mdi-newspaper-variant-outline text-2xl text-primary mr-2" />
                <Text className="text-2xl font-black text-foreground">专属内容推荐</Text>
              </View>
              <Text className="text-base text-primary font-bold">查看更多</Text>
            </View>
            <View className="space-y-6">
              {contents.map((item) => (
                <View
                  key={item.id}
                  className="bg-card rounded-3xl overflow-hidden shadow-card border border-border border-opacity-10 active:opacity-90 transition-opacity"
                  onClick={() => Taro.navigateTo({url: `/pages/exclusive-content/index?id=${item.id}`})}>
                  <Image src={item.cover_image || DEFAULT_PRODUCT_IMAGE} className="w-full h-48" mode="aspectFill" />
                  <View className="p-6">
                    <View className="bg-primary/10 self-start px-2 py-0.5 rounded mb-3">
                      <Text className="text-xs text-primary font-black uppercase tracking-widest">{item.category}</Text>
                    </View>
                    <Text className="text-xl font-black text-foreground block mb-2 leading-snug">{item.title}</Text>
                    <Text className="text-base text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.content.substring(0, 100)}...
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 底部版权 */}
          <View className="text-center pb-10">
            <Text className="text-sm text-muted-foreground font-medium block mb-1">© 2026 根书文创艺术有限公司</Text>
            <Text className="text-xs text-muted-foreground/40 font-bold tracking-widest uppercase">
              VIP Membership Rights Reserved
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
