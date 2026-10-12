/**
 * @file Taro application entry file
 */

import type React from 'react'
import type {PropsWithChildren} from 'react'
import {AuthProvider} from '@/contexts/AuthContext'
import {useMessageBadge} from '@/hooks/useMessageBadge'
import {useTabBarPageClass} from '@/hooks/useTabBarPageClass'

import './app.scss'

const AppContent: React.FC<PropsWithChildren<unknown>> = ({children}) => {
  useMessageBadge()
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
