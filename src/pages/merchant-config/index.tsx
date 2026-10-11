// @title 运营配置中心
// 运营配置中心：演示模式、物流方案、售后原因、贸易条款等基础配置查看与修改（管理员/商家）
// 真实生产环境后可替换为API或数据库配置

import {ScrollView, Switch, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import DemoBadge from '@/components/DemoBadge'
import {useAuth} from '@/contexts/AuthContext'
import {getAppConfigs, updateAppConfig} from '@/db/api'
import type {AppConfig} from '@/db/types'
import {isAdminRole, isBusinessRole} from '@/utils/roles'

export default function MerchantConfig() {
  const {user} = useAuth()
  const [configs, setConfigs] = useState<AppConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const canView = isBusinessRole((user as any)?.role)
  const canEdit = isAdminRole((user as any)?.role)

  const loadConfigs = useCallback(async () => {
    setLoading(true)
    const {data, error} = await getAppConfigs()
    if (!error) setConfigs(data)
    setLoading(false)
  }, [])

  useDidShow(() => {
    if (canView) loadConfigs()
  })

  const handleToggleDemo = async (cfg: AppConfig) => {
    if (!canEdit || !user) {
      Taro.showToast({title: '仅管理员可修改', icon: 'none'})
      return
    }
    setSavingKey(cfg.config_key)
    const value = cfg.config_value as {enabled?: boolean}
    const next = {...value, enabled: !value.enabled}
    const {error} = await updateAppConfig(cfg.config_key, next, user.id)
    setSavingKey(null)
    if (error) {
      Taro.showToast({title: '保存失败', icon: 'none'})
      return
    }
    Taro.showToast({title: '已保存', icon: 'success'})
    loadConfigs()
  }

  const formatValue = (cfg: AppConfig) => {
    if (cfg.config_key === 'demo_mode_switch') {
      const v = cfg.config_value as {enabled?: boolean}
      return v.enabled !== false ? '已开启' : '已关闭'
    }
    if (Array.isArray(cfg.config_value)) {
      return `共 ${cfg.config_value.length} 项`
    }
    return JSON.stringify(cfg.config_value).slice(0, 80)
  }

  if (!canView) {
    return (
      <View className="min-h-screen bg-background flex flex-col items-center justify-center px-8">
        <View className="i-mdi-lock-outline text-5xl text-muted-foreground/40 mb-3" />
        <Text className="text-lg font-bold text-foreground mb-2">无访问权限</Text>
        <Text className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
          运营配置中心仅面向商家/运营人员与管理员开放。
        </Text>
        <View className="rounded-full bg-primary px-6 py-2.5" onClick={() => Taro.navigateBack()}>
          <Text className="text-base text-primary-foreground font-bold">返回</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-background px-4 py-4">
      <View className="bg-card rounded-3xl p-5 shadow-card border border-border border-opacity-10 mb-4">
        <View className="flex flex-row items-center mb-3">
          <View className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
            <View className="i-mdi-cog-outline text-xl text-primary" />
          </View>
          <View className="flex flex-col">
            <Text className="text-lg font-bold text-foreground">运营配置中心</Text>
            <Text className="text-xs text-muted-foreground">集中管理演示模式、物流、售后、贸易条款等基础参数</Text>
          </View>
        </View>
        <DemoBadge text="配置项默认用于课堂演示，生产环境可替换为真实API" />
      </View>

      <ScrollView scrollY className="flex-1">
        {loading ? (
          <View className="py-12 items-center">
            <Text className="text-base text-muted-foreground">加载配置中...</Text>
          </View>
        ) : configs.length === 0 ? (
          <View className="bg-muted/60 rounded-3xl p-8 items-center">
            <View className="i-mdi-cog-off-outline text-4xl text-muted-foreground/40 mb-2" />
            <Text className="text-base text-muted-foreground">暂无配置项</Text>
          </View>
        ) : (
          <View className="flex flex-col gap-3 mb-8">
            {configs.map((cfg) => (
              <View
                key={cfg.config_key}
                className="bg-card rounded-2xl p-4 shadow-card border border-border border-opacity-10">
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text className="text-base font-bold text-foreground">{cfg.config_key}</Text>
                  {cfg.config_key === 'demo_mode_switch' && canEdit && (
                    <Switch
                      checked={(cfg.config_value as {enabled?: boolean}).enabled !== false}
                      onChange={() => handleToggleDemo(cfg)}
                      disabled={savingKey === cfg.config_key}
                    />
                  )}
                </View>
                {cfg.description ? <Text className="text-sm text-muted-foreground mb-2">{cfg.description}</Text> : null}
                <View className="bg-muted rounded-xl p-3">
                  <Text className="text-sm text-foreground break-all">{formatValue(cfg)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
