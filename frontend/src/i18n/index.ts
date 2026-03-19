import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ko from './ko'
import en from './en'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
    },
    // 브라우저 감지 → 영어(en, en-US 등)면 'en', 그 외엔 'ko'
    fallbackLng: (detectedLng) => {
      if (!detectedLng) return 'ko'
      const lng = Array.isArray(detectedLng) ? detectedLng[0] : detectedLng
      return lng.startsWith('en') ? 'en' : 'ko'
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18n_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
