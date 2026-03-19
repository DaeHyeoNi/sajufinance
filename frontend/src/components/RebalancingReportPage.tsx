import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { RebalancingReportData } from '../types'
import { api } from '../api/client'
import Step3Results from './Step3Results'

export default function RebalancingReportPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [report, setReport] = useState<RebalancingReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uuid) return
    api.getReport(uuid)
      .then(data => setReport(data))
      .catch(err => setError(err instanceof Error ? err.message : t('step3.reportLoadError')))
      .finally(() => setLoading(false))
  }, [uuid, t])

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>{t('wizard.title')}</h1>
        </header>
        <main className="app-main">
          <div className="step-container">
            <p>{t('step3.loadingReport')}</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>{t('wizard.title')}</h1>
        </header>
        <main className="app-main">
          <div className="step-container">
            <p className="error">{error ?? t('step3.reportNotFound')}</p>
            <button className="btn-secondary" onClick={() => navigate('/')}>{t('step3.homeBtn')}</button>
          </div>
        </main>
      </div>
    )
  }

  const sajuData = {
    saju_id: 0,
    pillars: report.saju_data.pillars,
    reading: report.saju_data.reading,
  }

  const result = {
    rebalance_table: report.rebalance_table,
    narrative: report.narrative,
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('wizard.title')}</h1>
        <p>{t('step3.savedReport')} — {new Date(report.created_at).toLocaleDateString('ko-KR')}</p>
      </header>
      <main className="app-main">
        <Step3Results
          sajuData={sajuData}
          result={result}
          portfolioItems={report.portfolio_items}
          reportUuid={uuid}
          onReset={() => navigate('/')}
        />
      </main>
    </div>
  )
}
