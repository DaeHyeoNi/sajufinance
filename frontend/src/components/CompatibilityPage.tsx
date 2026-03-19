import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { api } from '../api/client'
import type {
  CeoLookupResponse,
  CompatibilityResponse,
} from '../types'

type PageStep = 'input' | 'ceo-confirm' | 'result'
type Market = 'KR' | 'US'

const SIJU_OPTIONS: { value: string; label: string }[] = [
  { value: '모름', label: '모름' },
  { value: '자시', label: '자시 (23:30 ~ 01:30)' },
  { value: '축시', label: '축시 (01:30 ~ 03:30)' },
  { value: '인시', label: '인시 (03:30 ~ 05:30)' },
  { value: '묘시', label: '묘시 (05:30 ~ 07:30)' },
  { value: '진시', label: '진시 (07:30 ~ 09:30)' },
  { value: '사시', label: '사시 (09:30 ~ 11:30)' },
  { value: '오시', label: '오시 (11:30 ~ 13:30)' },
  { value: '미시', label: '미시 (13:30 ~ 15:30)' },
  { value: '신시', label: '신시 (15:30 ~ 17:30)' },
  { value: '유시', label: '유시 (17:30 ~ 19:30)' },
  { value: '술시', label: '술시 (19:30 ~ 21:30)' },
  { value: '해시', label: '해시 (21:30 ~ 23:30)' },
]

interface FormState {
  birth_year: number
  birth_month: number
  birth_day: number
  birth_hour: string | null
  gender: string
  ticker: string
}

interface ManualCeoInfo {
  company_name: string
  ceo_name: string
  year: string
  month: string
  day: string
  birth_hour: string  // '모름' or 시진 value
}

function buildDateString(year: string, month: string, day: string): string {
  const mm = (month || '1').padStart(2, '0')
  const dd = (day || '1').padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="score-stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= score ? 'star filled' : 'star empty'}>
          {i <= score ? '★' : '☆'}
        </span>
      ))}
      <span className="score-label">{score} / 5</span>
    </div>
  )
}

function RecommendationBadge({ rec }: { rec: '매수' | '관망' | '주의' }) {
  const cls = rec === '매수' ? 'buy' : rec === '관망' ? 'watch' : 'caution'
  return <span className={`recommendation-badge ${cls}`}>{rec}</span>
}

function LocalTimeInfoBox() {
  return (
    <div className="local-time-infobox">
      <p className="local-time-infobox-title">입력 기준 안내</p>
      <p>
        명리학은 태어난 장소의 현지 시간(Local Time)을 기준으로 사주를 계산합니다.
      </p>
      <p style={{ marginTop: '0.4rem' }}>
        예) 일론 머스크(남아공 출생)의 생년월일·시각은
        한국 시간이 아닌 남아공 현지 시간 기준으로 입력하세요.
      </p>
      <p style={{ marginTop: '0.4rem' }}>
        시진을 모르는 경우 '모름'을 선택하면 일간(日干) 위주로 분석됩니다.
      </p>
    </div>
  )
}

function ManualCeoForm({
  value,
  onChange,
}: {
  value: ManualCeoInfo
  onChange: (v: ManualCeoInfo) => void
}) {
  return (
    <>
      <LocalTimeInfoBox />

      <div className="form-row">
        <label>기업명 (선택)</label>
        <input
          type="text"
          placeholder="예: Tesla, Inc."
          value={value.company_name}
          onChange={e => onChange({ ...value, company_name: e.target.value })}
        />
      </div>

      <div className="form-row">
        <label>CEO 이름 (선택)</label>
        <input
          type="text"
          placeholder="예: Elon Musk"
          value={value.ceo_name}
          onChange={e => onChange({ ...value, ceo_name: e.target.value })}
        />
      </div>

      <div className="form-row">
        <label>CEO 생년월일 (현지 시간 기준)</label>
        <div className="date-inputs">
          <input
            type="number"
            placeholder="년 (예: 1971)"
            value={value.year}
            min={1900}
            max={2025}
            onChange={e => onChange({ ...value, year: e.target.value })}
          />
          <input
            type="number"
            placeholder="월"
            value={value.month}
            min={1}
            max={12}
            onChange={e => onChange({ ...value, month: e.target.value })}
          />
          <input
            type="number"
            placeholder="일"
            value={value.day}
            min={1}
            max={31}
            onChange={e => onChange({ ...value, day: e.target.value })}
          />
        </div>
      </div>

      <div className="form-row">
        <label>CEO 태어난 시 (시진, 선택)</label>
        <select
          value={value.birth_hour}
          onChange={e => onChange({ ...value, birth_hour: e.target.value })}
        >
          {SIJU_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="hint">모르는 경우 '모름' 선택 시 일간(日干) 위주로 분석됩니다.</span>
      </div>
    </>
  )
}

export default function CompatibilityPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<PageStep>('input')
  const [ceoInfo, setCeoInfo] = useState<CeoLookupResponse | null>(null)
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [manualCeo, setManualCeo] = useState<ManualCeoInfo>({
    company_name: '',
    ceo_name: '',
    year: '',
    month: '',
    day: '',
    birth_hour: '모름',
  })
  const [result, setResult] = useState<CompatibilityResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Report form state
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportBirthDate, setReportBirthDate] = useState('')
  const [reportNote, setReportNote] = useState('')
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)

  const [market, setMarket] = useState<Market>('KR')
  const [krSearch, setKrSearch] = useState('')
  const [krSuggestions, setKrSuggestions] = useState<{ticker: string, name: string, market: string}[]>([])
  const [krSelected, setKrSelected] = useState<{ticker: string, name: string} | null>(null)
  const [krLoading, setKrLoading] = useState(false)

  const [form, setForm] = useState<FormState>({
    birth_year: 1990,
    birth_month: 1,
    birth_day: 1,
    birth_hour: null,
    gender: '남',
    ticker: '',
  })

  const handleLookupCeo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (market === 'KR' && !krSelected) {
      setError('종목을 선택해주세요.')
      return
    }
    if (market === 'US' && !form.ticker.trim()) {
      setError('종목 티커를 입력해주세요.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.lookupCeo({
        ticker: form.ticker.trim().toUpperCase(),
        company_name: market === 'KR' && krSelected ? krSelected.name : null,
      })
      setCeoInfo(data)
      setUseCustomDate(!data.found)
      setManualCeo({ company_name: '', ceo_name: '', year: '', month: '', day: '', birth_hour: '모름' })
      setShowReportForm(false)
      setReportSubmitted(false)
      setStep('ceo-confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CEO 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const buildAnalyzePayload = () => {
    if (!ceoInfo) return null

    const needsManual = useCustomDate || !ceoInfo.found

    if (needsManual) {
      if (!manualCeo.year) return null
      return {
        birth_year: form.birth_year,
        birth_month: form.birth_month,
        birth_day: form.birth_day,
        birth_hour: form.birth_hour,
        gender: form.gender,
        ticker: ceoInfo.ticker,
        custom_ceo_birth_date: buildDateString(manualCeo.year, manualCeo.month, manualCeo.day),
        custom_ceo_birth_hour: manualCeo.birth_hour === '모름' ? null : manualCeo.birth_hour,
        custom_ceo_name: manualCeo.ceo_name || null,
        custom_company_name: manualCeo.company_name || null,
      }
    }

    return {
      birth_year: form.birth_year,
      birth_month: form.birth_month,
      birth_day: form.birth_day,
      birth_hour: form.birth_hour,
      gender: form.gender,
      ticker: ceoInfo.ticker,
      custom_ceo_birth_date: null,
      custom_ceo_birth_hour: null,
      custom_ceo_name: null,
      custom_company_name: null,
    }
  }

  const handleAnalyze = async () => {
    const needsManual = useCustomDate || (ceoInfo && !ceoInfo.found)
    if (needsManual && !manualCeo.year) {
      setError('CEO 생년을 입력해 주세요.')
      return
    }

    const payload = buildAnalyzePayload()
    if (!payload) {
      setError('CEO 생년을 입력해 주세요.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.analyzeCompatibility(payload)
      setResult(data)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : '궁합 분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleReport = async () => {
    if (!ceoInfo) return
    setReportLoading(true)
    try {
      await api.reportCeoData({
        ticker: ceoInfo.ticker,
        cached_ceo_name: ceoInfo.ceo_name,
        cached_birth_date: ceoInfo.ceo_birth_date,
        correct_birth_date: reportBirthDate || null,
        note: reportNote || null,
      })
    } catch {
      // 신고 실패해도 완료로 표시
    } finally {
      setReportSubmitted(true)
      setReportLoading(false)
    }
  }

  const handleReset = () => {
    setStep('input')
    setCeoInfo(null)
    setUseCustomDate(false)
    setManualCeo({ company_name: '', ceo_name: '', year: '', month: '', day: '', birth_hour: '모름' })
    setResult(null)
    setError(null)
    setShowReportForm(false)
    setReportSubmitted(false)
    setReportBirthDate('')
    setReportNote('')
    setKrSearch('')
    setKrSuggestions([])
    setKrSelected(null)
    setForm(f => ({ ...f, ticker: '' }))
  }

  return (
    <div className="compatibility-page">
      <div className="app">
        <header className="app-header">
          <button className="btn-back" onClick={() => navigate('/')}>← 홈</button>
          <h1>주식 사주 궁합</h1>
          <p>내 사주와 기업 CEO의 사주 궁합으로 투자 적합도를 분석합니다</p>
        </header>

        <main className="app-main">
          {/* ── Step 1: 입력 ── */}
          {step === 'input' && (
            <div className="step-container">
              <h2>사용자 정보 + 종목 입력</h2>
              <p className="step-desc">생년월일, 성별, 분석할 종목 티커를 입력하세요.</p>

              <form onSubmit={handleLookupCeo}>
                <div className="form-row">
                  <label>생년월일</label>
                  <div className="date-inputs">
                    <input
                      type="number"
                      placeholder="년 (예: 1990)"
                      value={form.birth_year}
                      min={1900}
                      max={2025}
                      onChange={e => setForm(f => ({ ...f, birth_year: +e.target.value }))}
                      required
                    />
                    <input
                      type="number"
                      placeholder="월"
                      value={form.birth_month}
                      min={1}
                      max={12}
                      onChange={e => setForm(f => ({ ...f, birth_month: +e.target.value }))}
                      required
                    />
                    <input
                      type="number"
                      placeholder="일"
                      value={form.birth_day}
                      min={1}
                      max={31}
                      onChange={e => setForm(f => ({ ...f, birth_day: +e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label>태어난 시 (시진)</label>
                  <select
                    value={form.birth_hour ?? '모름'}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        birth_hour: e.target.value === '모름' ? null : e.target.value,
                      }))
                    }
                  >
                    {SIJU_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <span className="hint">모를 경우 정확도가 낮아질 수 있습니다.</span>
                </div>

                <div className="form-row">
                  <label>성별</label>
                  <div className="radio-group">
                    {['남', '여'].map(g => (
                      <label key={g} className="radio-label">
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={form.gender === g}
                          onChange={() => setForm(f => ({ ...f, gender: g }))}
                        />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 시장 선택 탭 */}
                <div className="market-tabs">
                  <button
                    type="button"
                    className={`market-tab ${market === 'KR' ? 'active' : ''}`}
                    onClick={() => { setMarket('KR'); setKrSearch(''); setKrSelected(null); setForm(f => ({ ...f, ticker: '' })) }}
                  >
                    한국 주식
                  </button>
                  <button
                    type="button"
                    className={`market-tab ${market === 'US' ? 'active' : ''}`}
                    onClick={() => { setMarket('US'); setKrSearch(''); setKrSelected(null); setForm(f => ({ ...f, ticker: '' })) }}
                  >
                    미국 주식
                  </button>
                </div>

                {/* 한국 주식 — 종목명 검색 */}
                {market === 'KR' && (
                  <div className="form-row">
                    <label>종목명 검색</label>
                    <div className="kr-search-wrapper">
                      <input
                        type="text"
                        placeholder="예: 삼성전자, 카카오, SK하이닉스"
                        value={krSearch}
                        onChange={async e => {
                          const q = e.target.value
                          setKrSearch(q)
                          setKrSelected(null)
                          setForm(f => ({ ...f, ticker: '' }))
                          if (q.length >= 1) {
                            setKrLoading(true)
                            try {
                              const results = await api.searchKoreanStocks(q)
                              setKrSuggestions(results)
                            } catch {}
                            setKrLoading(false)
                          } else {
                            setKrSuggestions([])
                          }
                        }}
                        autoComplete="off"
                      />
                      {krLoading && <span className="hint">검색 중...</span>}
                      {krSuggestions.length > 0 && !krSelected && (
                        <ul className="kr-suggestions">
                          {krSuggestions.map(s => (
                            <li
                              key={s.ticker}
                              onClick={() => {
                                setKrSelected({ ticker: s.ticker, name: s.name })
                                setKrSearch(s.name)
                                setForm(f => ({ ...f, ticker: s.ticker }))
                                setKrSuggestions([])
                              }}
                            >
                              <span className="kr-suggestion-name">{s.name}</span>
                              <span className="kr-suggestion-meta">{s.ticker} · {s.market}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {krSelected && (
                      <span className="hint">선택됨: {krSelected.name} ({krSelected.ticker})</span>
                    )}
                    <span className="hint">종목명을 입력하면 자동완성 목록이 나타납니다.</span>
                  </div>
                )}

                {/* 미국 주식 — 티커 직접 입력 */}
                {market === 'US' && (
                  <div className="form-row">
                    <label>종목 티커</label>
                    <input
                      type="text"
                      placeholder="예: TSLA, AAPL, NVDA"
                      value={form.ticker}
                      onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                      required
                    />
                    <span className="hint">나스닥·뉴욕증권거래소 상장 종목의 영문 티커를 입력하세요.</span>
                  </div>
                )}

                {error && <p className="error">{error}</p>}

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'CEO 찾는 중…' : 'CEO 찾기'}
                </button>
              </form>
            </div>
          )}

          {/* ── Step 2: CEO 확인 ── */}
          {step === 'ceo-confirm' && ceoInfo && (
            <div className="step-container">
              <h2>CEO 정보 확인</h2>

              {ceoInfo.found && !useCustomDate ? (
                /* 자동 검색 성공 — 정보 카드 표시 */
                <>
                  <p className="step-desc">아래 정보가 맞는지 확인해 주세요.</p>

                  <div className="ceo-confirm-card">
                    <div className="ceo-info-row">
                      <span className="ceo-info-label">기업명</span>
                      <span className="ceo-info-value">{ceoInfo.company_name}</span>
                    </div>
                    <div className="ceo-info-row">
                      <span className="ceo-info-label">CEO</span>
                      <span className="ceo-info-value">{ceoInfo.ceo_name}</span>
                    </div>
                    <div className="ceo-info-row">
                      <span className="ceo-info-label">생년월일</span>
                      <span className="ceo-info-value">{ceoInfo.ceo_birth_date}</span>
                    </div>
                    {ceoInfo.from_cache && (
                      <p className="hint" style={{ marginTop: '0.5rem' }}>캐시된 데이터입니다.</p>
                    )}
                  </div>

                  <LocalTimeInfoBox />

                  <div style={{ margin: '1rem 0' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setUseCustomDate(true)
                        setManualCeo({ company_name: '', ceo_name: '', year: '', month: '', day: '', birth_hour: '모름' })
                        setError(null)
                      }}
                    >
                      정보가 틀렸어요
                    </button>
                  </div>
                </>
              ) : (
                /* 자동 검색 실패 또는 수동 수정 모드 */
                <>
                  {!ceoInfo.found && (
                    <div className="warning">
                      <strong>CEO 정보를 자동으로 찾지 못했습니다.</strong>
                      <p style={{ marginTop: '0.3rem', fontSize: '0.88rem' }}>
                        아래 폼에 CEO 정보를 직접 입력해 주세요.
                      </p>
                    </div>
                  )}

                  <ManualCeoForm value={manualCeo} onChange={setManualCeo} />

                  {ceoInfo.found && (
                    <div style={{ marginBottom: '1rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.85rem' }}
                        onClick={() => {
                          setUseCustomDate(false)
                          setError(null)
                        }}
                      >
                        취소 — 원래 정보로 돌아가기
                      </button>
                    </div>
                  )}
                </>
              )}

              {error && <p className="error">{error}</p>}

              <div className="btn-group">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  {loading
                    ? '분석 중…'
                    : useCustomDate || !ceoInfo.found
                    ? '이 정보로 분석하기'
                    : '정보가 맞습니다 → 궁합 분석'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleReset}>
                  다시 입력
                </button>
              </div>

              {/* 신고 섹션 — found=true일 때만 */}
              {ceoInfo.found && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e8ddd5', paddingTop: '1rem' }}>
                  {!showReportForm && !reportSubmitted && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                      onClick={() => setShowReportForm(true)}
                    >
                      잘못된 데이터 신고하기
                    </button>
                  )}

                  {showReportForm && !reportSubmitted && (
                    <div className="report-form">
                      <p className="report-form-title">잘못된 데이터 신고</p>
                      <div className="form-row">
                        <label>수정된 생년월일 (선택)</label>
                        <input
                          type="date"
                          value={reportBirthDate}
                          onChange={e => setReportBirthDate(e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <label>메모 (선택)</label>
                        <textarea
                          rows={3}
                          placeholder="올바른 정보나 출처를 입력해 주세요"
                          value={reportNote}
                          onChange={e => setReportNote(e.target.value)}
                        />
                      </div>
                      <div className="btn-group">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleReport}
                          disabled={reportLoading}
                          style={{ fontSize: '0.9rem', padding: '0.55rem 1.25rem' }}
                        >
                          {reportLoading ? '제출 중…' : '신고 제출'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setShowReportForm(false)}
                          style={{ fontSize: '0.9rem', padding: '0.55rem 1.25rem' }}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}

                  {reportSubmitted && (
                    <p style={{ color: '#2e7d32', fontSize: '0.9rem', fontWeight: 600 }}>
                      신고가 접수되었습니다. 감사합니다.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: 결과 ── */}
          {step === 'result' && result && (
            <div className="step-container">
              <h2>궁합 분석 결과</h2>

              <div className="compat-result-card">
                <div className="ceo-info-row">
                  <span className="ceo-info-label">기업</span>
                  <span className="ceo-info-value">
                    {result.company_name} ({result.ticker})
                  </span>
                </div>
                <div className="ceo-info-row">
                  <span className="ceo-info-label">CEO</span>
                  <span className="ceo-info-value">{result.ceo_name}</span>
                </div>
                <div className="ceo-info-row">
                  <span className="ceo-info-label">CEO 생년월일</span>
                  <span className="ceo-info-value">{result.ceo_birth_date}</span>
                </div>
              </div>

              <p className="hint" style={{ margin: '0.5rem 0 1rem' }}>
                * CEO 태어난 시각 불명 시 일간(日干) 위주 분석으로 진행됩니다.
              </p>

              <div className="compat-score-section">
                <p className="compat-score-label">궁합 점수</p>
                <StarRating score={result.compatibility_score} />
                <div style={{ marginTop: '0.75rem' }}>
                  <RecommendationBadge rec={result.recommendation} />
                </div>
              </div>

              <div className="result-section" style={{ marginTop: '1.5rem' }}>
                <h3>궁합 풀이</h3>
                <div className="reading-text">
                  <ReactMarkdown>{result.reading}</ReactMarkdown>
                </div>
              </div>

              <div className="btn-group">
                <button type="button" className="btn-primary" onClick={handleReset}>
                  다시 분석하기
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate('/')}
                >
                  홈으로
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
