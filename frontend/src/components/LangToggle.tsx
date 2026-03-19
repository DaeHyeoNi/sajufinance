import { useTranslation } from 'react-i18next'

export default function LangToggle() {
  const { i18n } = useTranslation()
  const isKo = i18n.language.startsWith('ko')

  const toggle = () => {
    const next = isKo ? 'en' : 'ko'
    i18n.changeLanguage(next)
  }

  return (
    <button className="lang-toggle-btn" onClick={toggle} aria-label="Toggle language">
      {isKo ? 'EN' : '한국어'}
    </button>
  )
}
