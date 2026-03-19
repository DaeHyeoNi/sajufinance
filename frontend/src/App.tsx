import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import type { SajuAnalyzeResponse, RebalanceResponse, PortfolioItem } from './types'
import Step1SajuInput from './components/Step1SajuInput'
import Step2PortfolioInput from './components/Step2PortfolioInput'
import Step3Results from './components/Step3Results'
import RebalancingReportPage from './components/RebalancingReportPage'
import IntroPage from './components/IntroPage'
import CompatibilityPage from './components/CompatibilityPage'
import './App.css'

type Step = 1 | 2 | 3

function WizardApp() {
  const [step, setStep] = useState<Step>(1)
  const [sajuData, setSajuData] = useState<SajuAnalyzeResponse | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [result, setResult] = useState<RebalanceResponse | null>(null)

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
        <h1>사주 포트폴리오 리밸런서</h1>
        <p>당신의 사주를 기반으로 맞춤형 투자 포트폴리오를 제안합니다</p>
        <div className="step-indicator">
          {([1, 2, 3] as Step[]).map(s => (
            <span key={s} className={`step-dot ${step === s ? 'active' : step > s ? 'done' : ''}`}>
              {s}
            </span>
          ))}
        </div>
      </header>

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
