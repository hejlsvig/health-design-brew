import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import da from './locales/da.json'
import se from './locales/se.json'
import en from './locales/en.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      da: { translation: da },
      se: { translation: se },
      en: { translation: en },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Detect language from: URL path → browser setting → default
      order: ['path', 'navigator', 'htmlTag'],
      lookupFromPathIndex: 0,
      // Map browser languages to our supported ones
      convertDetectedLanguage: (lng: string) => {
        if (lng.startsWith('da')) return 'da'
        if (lng.startsWith('sv') || lng.startsWith('se')) return 'se'
        return 'en'
      },
    },
  })

export default i18n
