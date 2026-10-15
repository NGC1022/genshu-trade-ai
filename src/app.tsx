/**
 * @file Taro application entry file
 */

import type React from 'react'
import type {PropsWithChildren} from 'react'
import {useEffect} from 'react'
import {AuthProvider} from '@/contexts/AuthContext'
import {useMessageBadge} from '@/hooks/useMessageBadge'
import {useTabBarPageClass} from '@/hooks/useTabBarPageClass'
import {applyTabBarLanguage, getLanguage} from '@/utils/i18n'

import './app.scss'

const AppContent: React.FC<PropsWithChildren<unknown>> = ({children}) => {
  useMessageBadge()
  useEffect(() => {
    applyTabBarLanguage(getLanguage())
    const runtime = globalThis as any
    const document = runtime.document
    const location = runtime.location
    if (!document || !location) return
    const mode = new URLSearchParams(location.search).get('preview')
    if (mode === 'desktop' || mode === 'mobile') document.documentElement.dataset.preview = mode
    return () => {
      delete document.documentElement.dataset.preview
    }
  }, [])
  return <>{children}</>
}

const App: React.FC = ({children}: PropsWithChildren<unknown>) => {
  useTabBarPageClass()

  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  )
}

export default App
