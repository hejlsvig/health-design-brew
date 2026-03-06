import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import da from './locales/da.json'
import en from './locales/en.json'
import se from './locales/se.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      da: { translation: da },
      en: { translation: en },
      se: { translation: se },
    },
    fallbackLng: 'da',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'crm_language',
      caches: ['localStorage'],
      convertDetectedLanguage: (lng: string) => {
        if (lng.startsWith('da')) return 'da'
        if (lng.startsWith('sv') || lng.startsWith('se')) return 'se'
        return 'en'
      },
    },
  })

export default i18n
