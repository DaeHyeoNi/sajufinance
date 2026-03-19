import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LangToggle from './LangToggle'

export default function IntroPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="intro-page" style={{ position: 'relative' }}>
      <LangToggle />

      <div className="intro-header">
        <div className="intro-logo">{t('intro.logo')}</div>
        <h1 className="intro-title">{t('intro.title')}</h1>
        <p className="intro-subtitle">{t('intro.subtitle')}</p>
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

      <p className="intro-disclaimer">{t('intro.disclaimer')}</p>
    </div>
  )
}
