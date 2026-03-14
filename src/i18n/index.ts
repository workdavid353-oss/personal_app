import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import he from './he'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    lng: localStorage.getItem('lang') ?? 'he',
    fallbackLng: 'he',
    interpolation: { escapeValue: false },
  })

export default i18n
