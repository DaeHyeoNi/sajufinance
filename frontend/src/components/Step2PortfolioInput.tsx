import { useState } from 'react'
import type { SajuAnalyzeResponse, PortfolioParseResponse, RebalanceResponse, RebalanceRequest, PortfolioItem } from '../types'
import { api } from '../api/client'

interface Props {
  sajuData: SajuAnalyzeResponse
  onComplete: (result: RebalanceResponse, portfolioItems: PortfolioItem[]) => void
}

export default function Step2PortfolioInput({ sajuData, onComplete }: Props) {
  const [rawText, setRawText] = useState('')
  const [additionalCash, setAdditionalCash] = useState('')
  const [preference, setPreference] = useState('')
  const [parsedPortfolio, setParsedPortfolio] = useState<PortfolioParseResponse | null>(null)
  const [missingWarning, setMissingWarning] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'input' | 'confirm'>('input')

  const handleParsePortfolio = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await api.parsePortfolio({
        raw_text: rawText,
        additional_cash: additionalCash ? parseFloat(additionalCash) : null,
      })
      setParsedPortfolio(result)
      setMissingWarning(result.missing_fields)
      setStep('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : '포트폴리오 파싱에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!parsedPortfolio) return
    if (!preference.trim()) {
      setError('운영 방안 / 선호 전략을 입력해 주세요.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const req: RebalanceRequest = {
        saju_id: sajuData.saju_id,
        portfolio_items: parsedPortfolio.items,
        additional_cash: parsedPortfolio.additional_cash,
        user_preference: preference,
      }
      const result = await api.analyzeRebalance(req)
      onComplete(result, parsedPortfolio.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '리밸런싱 분석에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="step-container">
      <h2>Step 2 — 포트폴리오 & 운영 방안 입력</h2>

      {step === 'input' && (
        <form onSubmit={handleParsePortfolio}>
          <div className="form-section">
            <label>현재 포트폴리오</label>
            <p className="hint">
              보유 자산(종목명, 수량, 매입가, 현재가/수익률 등)을 자유롭게 텍스트로 입력하세요.<br />
              <strong>현재 평가금액</strong>은 반드시 포함되어야 합니다.
            </p>
            <textarea
              rows={8}
              placeholder={`예시:\n삼성전자 100주, 매입가 60,000원, 현재가 72,000원\nSK하이닉스 50주, 수익률 +15%, 현재 평가금액 8,500,000원\n애플 10주, 현재가 $185, 현재가치 2,500,000원`}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <label>추가 투입 가능 현금 (원, 선택)</label>
            <input
              type="number"
              placeholder="예: 1000000"
              value={additionalCash}
              min={0}
              onChange={e => setAdditionalCash(e.target.value)}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '포트폴리오 파싱 중…' : '포트폴리오 파싱하기'}
          </button>
        </form>
      )}

      {step === 'confirm' && parsedPortfolio && (
        <div>
          {missingWarning.length > 0 && (
            <div className="warning">
              <strong>누락된 정보가 있습니다:</strong>
              <ul>{missingWarning.map((w, i) => <li key={i}>{w}</li>)}</ul>
              <p>포트폴리오를 수정하려면 아래 버튼을 누르세요.</p>
            </div>
          )}

          <h3>파싱된 포트폴리오</h3>
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>종목</th><th>수량</th><th>매입가</th><th>현재가</th>
                <th>평가금액</th><th>수익률</th>
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
                  <td>{item.current_value.toLocaleString()}원{item.currency === 'USD' ? ' (환산)' : ''}</td>
                  <td>{item.return_rate != null ? `${item.return_rate > 0 ? '+' : ''}${item.return_rate}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {parsedPortfolio.additional_cash && (
            <p>추가 현금: <strong>{parsedPortfolio.additional_cash.toLocaleString()}원</strong></p>
          )}

          <div className="form-section" style={{ marginTop: '1.5rem' }}>
            <label>운영 방안 / 투자 선호 전략</label>
            <p className="hint">어떤 방식으로 포트폴리오를 운영하고 싶은지 자유롭게 입력하세요.</p>
            <textarea
              rows={4}
              placeholder={`예시:\n- 리스크를 줄이고 안정적인 배당주 비중을 높이고 싶다\n- 성장주 중심으로 공격적으로 운용하고 싶다\n- 반도체 섹터 비중을 줄이고 싶다`}
              value={preference}
              onChange={e => setPreference(e.target.value)}
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <div className="btn-group">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setStep('input'); setParsedPortfolio(null) }}
            >
              포트폴리오 수정
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={handleAnalyze}
            >
              {loading ? '리밸런싱 분석 중…' : '리밸런싱 분석하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
