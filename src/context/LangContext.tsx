import { createContext, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Lang = 'he' | 'en'

interface LangContextValue {
  lang: Lang
  toggleLang: () => void
}

const LangContext = createContext<LangContextValue>({ lang: 'he', toggleLang: () => {} })

export function LangProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const [lang, setLang] = useState<Lang>((localStorage.getItem('lang') as Lang) ?? 'he')

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
  }, [lang])

  function toggleLang() {
    const next: Lang = lang === 'he' ? 'en' : 'he'
    setLang(next)
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
