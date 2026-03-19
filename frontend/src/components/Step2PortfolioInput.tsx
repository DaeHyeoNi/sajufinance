import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SajuAnalyzeResponse, PortfolioParseResponse, RebalanceResponse, RebalanceRequest, PortfolioItem } from '../types'
import { api } from '../api/client'

interface Props {
  sajuData: SajuAnalyzeResponse
  onComplete: (result: RebalanceResponse, portfolioItems: PortfolioItem[]) => void
}

export default function Step2PortfolioInput({ sajuData, onComplete }: Props) {
  const { t } = useTranslation()
  const [rawText, setRawText] = useState('')
  const [additionalCash, setAdditionalCash] = useState('')
  const [preference, setPreference] = useState('')
  const [parsedPortfolio, setParsedPortfolio] = useState<PortfolioParseResponse | null>(null)
  const [missingWarning, setMissingWarning] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'input' | 'confirm'>('input')
  const [streamText, setStreamText] = useState('')
  const streamBoxRef = useRef<HTMLDivElement>(null)

  // 스트리밍 텍스트가 추가될 때 자동 스크롤
  useEffect(() => {
    if (streamBoxRef.current) {
      streamBoxRef.current.scrollTop = streamBoxRef.current.scrollHeight
    }
  }, [streamText])

  const numericCash = additionalCash ? parseFloat(additionalCash) : 0

  const cashItem: PortfolioItem = {
    name: '현금',
    currency: 'KRW',
    quantity: null,
    purchase_price: null,
    current_price: null,
    current_value: numericCash,
    return_rate: null,
  }

  const handleParsePortfolio = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await api.parsePortfolio({
        raw_text: rawText,
        additional_cash: numericCash || null,
      })
      setParsedPortfolio(result)
      setMissingWarning(result.missing_fields)
      setStep('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('step2.parseError'))
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!parsedPortfolio) return
    if (!preference.trim()) {
      setError(t('step2.preferenceRequired'))
      return
    }
    setLoading(true)
    setStreamText('')
    setError(null)

    // 현금 항목을 포함한 전체 포트폴리오
    const allItems: PortfolioItem[] = [...parsedPortfolio.items, cashItem]

    try {
      const req: RebalanceRequest = {
        saju_id: sajuData.saju_id,
        portfolio_items: allItems,
        additional_cash: null,   // 현금이 portfolio_items에 포함되므로 별도 전달 안 함
        user_preference: preference,
      }

      for await (const event of api.streamRebalance(req)) {
        if (event.type === 'chunk') {
          setStreamText(prev => prev + event.text)
        } else if (event.type === 'done') {
          onComplete(event.data, allItems)
          return
        } else if (event.type === 'error') {
          throw new Error(event.detail)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('step2.analyzeError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="step-container">
      <h2>{t('step2.title')}</h2>

      {step === 'input' && (
        <form onSubmit={handleParsePortfolio}>
          <div className="form-section">
            <label>{t('step2.portfolioLabel')}</label>
            <p className="hint">
              {t('step2.portfolioHint')}<br />
              <strong>{t('step2.portfolioHintRequired')}</strong>
            </p>
            <textarea
              rows={8}
              placeholder={t('step2.portfolioPlaceholder')}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <label>{t('step2.cashLabel')}</label>
            <input
              type="number"
              placeholder={t('step2.cashPlaceholder')}
              value={additionalCash}
              min={0}
              onChange={e => setAdditionalCash(e.target.value)}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('step2.parseBtnLoading') : t('step2.parseBtn')}
          </button>
        </form>
      )}

      {step === 'confirm' && parsedPortfolio && (
        <div>
          {missingWarning.length > 0 && (
            <div className="warning">
              <strong>{t('step2.missingWarning')}</strong>
              <ul>{missingWarning.map((w, i) => <li key={i}>{w}</li>)}</ul>
              <p>{t('step2.missingHint')}</p>
            </div>
          )}

          <p className="confirm-section-title">{t('step2.confirmedTitle')}</p>
          <div className="table-scroll">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>{t('step2.tableStock')}</th>
                <th>{t('step2.tableQty')}</th>
                <th>{t('step2.tablePurchase')}</th>
                <th>{t('step2.tableCurrent')}</th>
                <th>{t('step2.tableValue')}</th>
                <th>{t('step2.tableReturn')}</th>
              </tr>
            </thead>
            <tbody>
              {parsedPortfolio.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td>{item.quantity ?? '-'}</td>
                  <td>{item.purchase_price != null
                    ? item.currency === 'USD' ? `$${item.purchase_price.toLocaleString()}` : `${item.purchase_price.toLocaleString()}원`
                    : '-'}</td>
                  <td>{item.current_price != null
                    ? item.currency === 'USD' ? `$${item.current_price.toLocaleString()}` : `${item.current_price.toLocaleString()}원`
                    : '-'}</td>
                  <td>{item.current_value.toLocaleString()}원{item.currency === 'USD' ? t('step2.tableUsdSuffix') : ''}</td>
                  <td>{item.return_rate != null ? `${item.return_rate > 0 ? '+' : ''}${item.return_rate}%` : '-'}</td>
                </tr>
              ))}
              {/* 현금 행 */}
              <tr className="cash-row">
                <td>{t('step2.tableCashName')}</td>
                <td>-</td><td>-</td><td>-</td>
                <td>{numericCash.toLocaleString()}원</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
          </div>

          <div className="portfolio-section-divider" />

          <div className="form-section" style={{ marginTop: '0' }}>
            <label>{t('step2.preferenceLabel')}</label>
            <p className="hint">{t('step2.preferenceHint')}</p>
            <textarea
              rows={4}
              placeholder={t('step2.preferencePlaceholder')}
              value={preference}
              onChange={e => setPreference(e.target.value)}
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          {/* 스트리밍 미리보기 */}
          {loading && (
            <div className="stream-preview">
              <p className="stream-label">
                {t('step2.streamLabel')} {streamText ? t('step2.streamGenerating') : t('step2.streamConnecting')}
              </p>
              {streamText && (
                <div className="stream-box" ref={streamBoxRef}>
                  {streamText}
                </div>
              )}
            </div>
          )}

          <div className="btn-group">
            <button
              type="button"
              className="btn-secondary"
              disabled={loading}
              onClick={() => { setStep('input'); setParsedPortfolio(null) }}
            >
              {t('step2.editBtn')}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={handleAnalyze}
            >
              {loading ? t('step2.analyzingBtn') : t('step2.analyzeBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
