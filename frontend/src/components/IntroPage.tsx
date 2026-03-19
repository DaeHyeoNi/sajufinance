import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LangToggle from './LangToggle'
import ApiKeyModal from './ApiKeyModal'
import { FourPillarsInfoBox } from './FourPillarsTooltip'
import { usePageMeta } from '../hooks/usePageMeta'

export default function IntroPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  usePageMeta('사주재무연구소', 'Four Pillars Finance Lab')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)

  return (
    <div className="intro-page" style={{ position: 'relative' }}>
      <ApiKeyModal isOpen={showApiKeyModal} onClose={() => setShowApiKeyModal(false)} />
      <LangToggle />

      <div className="intro-header">
        <div className="intro-logo">{t('intro.logo')}</div>
        <h1 className="intro-title">{t('intro.title')}</h1>
        <p className="intro-subtitle">{t('intro.subtitle')}</p>

        {/* 영어 모드에서만 표시되는 "Four Pillars란?" 인포박스 */}
        <FourPillarsInfoBox />
      </div>

      <div className="intro-cards">
        <div className="intro-card" onClick={() => navigate('/rebalancer')}>
          <div className="intro-card-icon">☯</div>
          <h2 className="intro-card-title">{t('intro.rebalancer.title')}</h2>
          <p className="intro-card-desc">{t('intro.rebalancer.desc')}</p>
          <button
            className="btn-primary intro-card-btn"
            onClick={e => { e.stopPropagation(); navigate('/rebalancer') }}
          >
            {t('intro.rebalancer.btn')}
          </button>
        </div>

        <div className="intro-card" onClick={() => navigate('/compatibility')}>
          <div className="intro-card-icon">🔮</div>
          <h2 className="intro-card-title">{t('intro.compatibility.title')}</h2>
          <p className="intro-card-desc">{t('intro.compatibility.desc')}</p>
          <button
            className="btn-primary intro-card-btn"
            onClick={e => { e.stopPropagation(); navigate('/compatibility') }}
          >
            {t('intro.compatibility.btn')}
          </button>
        </div>
      </div>

      <div className="api-key-banner">
        <div className="api-key-banner-content">
          <span className="api-key-banner-title">🔑 {t('apiKey.introBannerTitle')}</span>
          <span className="api-key-banner-desc">{t('apiKey.introBannerDesc')}</span>
        </div>
        <button className="btn-secondary api-key-banner-btn" onClick={() => setShowApiKeyModal(true)}>
          {t('apiKey.introBannerBtn')}
        </button>
      </div>

      <p className="intro-disclaimer">{t('intro.disclaimer')}</p>
    </div>
  )
}
