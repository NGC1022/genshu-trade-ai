import {useEffect, useState} from 'react'
import {getLanguage, type Language, subscribeLanguage} from '@/utils/i18n'

export function useLanguage(): Language {
  const [language, setCurrentLanguage] = useState<Language>(() => getLanguage())

  useEffect(() => subscribeLanguage(setCurrentLanguage), [])

  return language
}
