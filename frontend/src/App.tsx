import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SajuAnalyzeResponse, RebalanceResponse, PortfolioItem } from './types'
import Step1SajuInput from './components/Step1SajuInput'
import Step2PortfolioInput from './components/Step2PortfolioInput'
import Step3Results from './components/Step3Results'
import RebalancingReportPage from './components/RebalancingReportPage'
import IntroPage from './components/IntroPage'
import CompatibilityPage from './components/CompatibilityPage'
import LangToggle from './components/LangToggle'
import ApiKeyModal, { getStoredApiKey } from './components/ApiKeyModal'
import { usePageMeta } from './hooks/usePageMeta'
import './App.css'

type Step = 1 | 2 | 3

function WizardApp() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  usePageMeta('사주 리밸런서', 'Four Pillars Rebalancer')
  const [step, setStep] = useState<Step>(1)
  const [sajuData, setSajuData] = useState<SajuAnalyzeResponse | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [result, setResult] = useState<RebalanceResponse | null>(null)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const hasApiKey = !!getStoredApiKey()

  const handleSajuComplete = (data: SajuAnalyzeResponse) => {
    setSajuData(data)
    setStep(2)
  }

  const handleRebalanceComplete = (data: RebalanceResponse, items: PortfolioItem[]) => {
    setPortfolioItems(items)
    setResult(data)
    setStep(3)
  }

  const handleReset = () => {
    setSajuData(null)
    setPortfolioItems([])
    setResult(null)
    setStep(1)
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="btn-back" onClick={() => navigate('/')}>{t('common.back')}</button>
        <div className="header-nav-right">
          <button
            className={`btn-api-key ${hasApiKey ? 'active' : ''}`}
            onClick={() => setShowApiKeyModal(true)}
            title={t('apiKey.navBtn')}
          >
            🔑 {hasApiKey ? t('apiKey.savedBadge') : t('apiKey.navBtn')}
          </button>
          <LangToggle />
        </div>
        <h1>{t('wizard.title')}</h1>
        <p>{t('wizard.subtitle')}</p>
        <div className="step-indicator">
          {([1, 2, 3] as Step[]).map(s => (
            <span key={s} className={`step-dot ${step === s ? 'active' : step > s ? 'done' : ''}`}>
              {s}
            </span>
          ))}
        </div>
      </header>

      <ApiKeyModal isOpen={showApiKeyModal} onClose={() => setShowApiKeyModal(false)} />

      <main className="app-main">
        {step === 1 && <Step1SajuInput onComplete={handleSajuComplete} />}
        {step === 2 && sajuData && (
          <Step2PortfolioInput sajuData={sajuData} onComplete={handleRebalanceComplete} />
        )}
        {step === 3 && sajuData && result && (
          <Step3Results
            sajuData={sajuData}
            result={result}
            portfolioItems={portfolioItems}
            reportUuid={result.report_uuid}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IntroPage />} />
      <Route path="/rebalancer" element={<WizardApp />} />
      <Route path="/compatibility" element={<CompatibilityPage />} />
      <Route path="/rebalancing-report/:uuid" element={<RebalancingReportPage />} />
    </Routes>
  )
}
