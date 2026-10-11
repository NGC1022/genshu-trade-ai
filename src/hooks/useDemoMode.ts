import {useCallback, useEffect, useState} from 'react'
import {getDemoModeConfig} from '@/db/api'

/**
 * 课堂演示模式开关
 * 开启后所有演示数据、演示汇率、演示物流、模拟支付等均显示“演示数据，仅用于课堂展示”
 */
export function useDemoMode() {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const cfg = await getDemoModeConfig()
    setEnabled(cfg)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return {enabled, loading, refresh: load}
}
