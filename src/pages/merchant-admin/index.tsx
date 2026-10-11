// @title 商家运营后台
// 商家运营后台：12模块导航入口，角色权限守卫（merchant/reviewer/admin）
// 使用现有视觉体系，仅业务角色可见

import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {getAccessibleModules, isBusinessRole, toBusinessRole} from '@/utils/roles'

// 角色中文名
const ROLE_LABELS: Record<string, string> = {
  user: '消费者',
  merchant: '商家/运营',
  reviewer: '审核人员',
  admin: '管理员'
}

export default function MerchantAdmin() {
  const {user} = useAuth()
  const [canAccess, setCanAccess] = useState<boolean | null>(null)

  useEffect(() => {
    setCanAccess(isBusinessRole((user as any)?.role))
  }, [user])

  if (canAccess === null) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-sm text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  if (!canAccess) {
    return (
      <View className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <View className="i-mdi-lock-outline text-5xl text-muted-foreground/40 mb-3" />
        <Text className="text-lg font-bold text-foreground mb-2">无访问权限</Text>
        <Text className="text-sm text-muted-foreground text-center leading-relaxed mb-4">
          商家运营后台仅面向商家/运营人员、审核人员与管理员开放。{'\n'}如需体验业务功能，请使用演示商家账号登录。
        </Text>
        <View className="rounded-full bg-primary px-6 py-2.5" onClick={() => Taro.navigateBack()}>
          <Text className="text-base text-primary-foreground font-bold">返回</Text>
        </View>
      </View>
    )
  }

  // 12模块导航（页面路径 + 模块名与roles.ts中保持一致）
  const MODULES: Array<{name: string; path: string; icon: string; desc: string}> = [
    {
      name: '商品管理',
      path: '/pages/merchant-products/index',
      icon: 'i-mdi-storefront-outline',
      desc: '商品上下架管理'
    },
    {
      name: 'SKU库存管理',
      path: '/pages/sku-management/index',
      icon: 'i-mdi-package-variant-closed',
      desc: 'SKU与库存预警'
    },
    {
      name: '订单管理',
      path: '/pages/merchant-orders/index',
      icon: 'i-mdi-order-bool-ascending',
      desc: '订单全生命周期'
    },
    {
      name: '海外客户CRM',
      path: '/pages/ai-trade-customers/index',
      icon: 'i-mdi-account-group-outline',
      desc: '海外客户档案'
    },
    {
      name: '询盘管理',
      path: '/pages/ai-trade-inquiry/index',
      icon: 'i-mdi-email-search-outline',
      desc: '询盘与意向识别'
    },
    {
      name: '报价管理',
      path: '/pages/ai-trade-quote-workbench/index',
      icon: 'i-mdi-cash-multiple',
      desc: '报价审核管理'
    },
    {
      name: '贸易合规',
      path: '/pages/ai-trade-compliance/index',
      icon: 'i-mdi-shield-check-outline',
      desc: '贸易合规检查'
    },
    {
      name: '贸易单证',
      path: '/pages/ai-trade-documents/index',
      icon: 'i-mdi-file-document-outline',
      desc: '贸易单证管理'
    },
    {name: '售后管理', path: '/pages/after-sales/index', icon: 'i-mdi-package-variant-closed-remove', desc: '售后处理'},
    {name: '异常订单', path: '/pages/order-exceptions/index', icon: 'i-mdi-alert-circle-outline', desc: '异常订单处理'},
    {name: 'AI业务记录', path: '/pages/ai-trade-records/index', icon: 'i-mdi-robot-outline', desc: 'AI业务记录'},
    {name: '数据看板', path: '/pages/ai-trade-dashboard/index', icon: 'i-mdi-chart-areaspline', desc: '业务数据看板'},
    {
      name: '运营配置中心',
      path: '/pages/merchant-config/index',
      icon: 'i-mdi-cog-outline',
      desc: '基础参数与演示模式'
    }
  ]

  const accessible = getAccessibleModules((user as any)?.role)

  const handleNav = (m: (typeof MODULES)[number]) => {
    if (!accessible.includes(m.name)) {
      Taro.showToast({title: '当前角色无此模块权限', icon: 'none'})
      return
    }
    Taro.navigateTo({url: m.path})
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      {/* 角色信息头 */}
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-3">
          <View className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
            <View className="i-mdi-account-tie-outline text-xl text-primary" />
          </View>
          <View className="flex flex-col">
            <Text className="text-lg font-bold text-foreground">商家运营后台</Text>
            <Text className="text-xs text-muted-foreground">
              当前角色：{(user as any)?.username || '业务人员'} ·{' '}
              {ROLE_LABELS[toBusinessRole((user as any)?.role)] || '商家/运营'}
            </Text>
          </View>
        </View>
        <View className="bg-muted/60 rounded-xl p-3">
          <Text className="text-xs text-muted-foreground leading-relaxed">
            后台与消费者端共用同一视觉体系与业务数据。权限由服务端RLS策略强制控制，前端提示仅为辅助。
          </Text>
        </View>
      </View>

      {/* 模块导航 */}
      <View className="flex flex-row flex-wrap gap-3 mb-4">
        {MODULES.map((m) => {
          const enabled = accessible.includes(m.name)
          return (
            <View
              key={m.name}
              className={`w-[48%] rounded-2xl p-4 border ${
                enabled ? 'bg-card border-border border-opacity-10 shadow-card' : 'bg-muted/40 border-transparent'
              }`}
              onClick={() => handleNav(m)}>
              <View className={`text-2xl mb-2 ${enabled ? 'text-primary' : 'text-muted-foreground/40'}`}>
                <View className={m.icon} />
              </View>
              <View className="flex flex-row items-center">
                <Text className={`text-base font-bold ${enabled ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                  {m.name}
                </Text>
                {!enabled && <View className="i-mdi-lock-outline text-xs text-muted-foreground/50 ml-1" />}
              </View>
              <Text className={`text-xs mt-1 ${enabled ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                {m.desc}
              </Text>
            </View>
          )
        })}
      </View>

      <View className="bg-muted/60 rounded-2xl p-4 mb-8">
        <View className="flex flex-row items-center mb-1.5">
          <View className="i-mdi-shield-account-variant-outline text-muted-foreground text-lg mr-2" />
          <Text className="text-sm font-bold text-muted-foreground">权限说明</Text>
        </View>
        <Text className="text-xs text-muted-foreground leading-relaxed">
          消费者：购物/订单/物流/售后/客服；商家运营：商品/库存/客户/询盘/报价；审核人员：AI内容/报价/单证审核；管理员：系统数据与权限管理。权限不足的模块置灰提示。
        </Text>
      </View>
    </View>
  )
}
