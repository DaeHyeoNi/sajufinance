import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import { api } from '../api/client'
import type {
  CeoLookupResponse,
  CompatibilityResponse,
} from '../types'
import LangToggle from './LangToggle'
import ApiKeyModal, { getStoredApiKey } from './ApiKeyModal'
import { usePageMeta } from '../hooks/usePageMeta'

type PageStep = 'input' | 'ceo-confirm' | 'result'
type Market = 'KR' | 'US'

const BIRTH_STORAGE_KEY = 'saju_step1_form'

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
  birth_hour: string
}

function loadBirthInfo(): Pick<FormState, 'birth_year' | 'birth_month' | 'birth_day' | 'birth_hour' | 'gender'> {
  try {
    const saved = sessionStorage.getItem(BIRTH_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        birth_year: parsed.birth_year ?? 1990,
        birth_month: parsed.birth_month ?? 1,
        birth_day: parsed.birth_day ?? 1,
        birth_hour: parsed.birth_hour ?? null,
        gender: parsed.gender ?? '남',
      }
    }
  } catch {}
  return { birth_year: 1990, birth_month: 1, birth_day: 1, birth_hour: null, gender: '남' }
}

function buildDateString(year: string, month: string, day: string): string {
  if (!month && !day) return year
  const mm = (month || '1').padStart(2, '0')
  const dd = (day || '1').padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function ScoreDisplay({ score }: { score: number }) {
  const { t } = useTranslation()
  const grade =
    score >= 80 ? t('compatibility.scoreGreat') :
    score >= 60 ? t('compatibility.scoreGood') :
    score >= 40 ? t('compatibility.scoreNeutral') :
    t('compatibility.scorePoor')
  const colorClass =
    score >= 80 ? 'score-great' :
    score >= 60 ? 'score-good' :
    score >= 40 ? 'score-neutral' :
    'score-poor'

  return (
    <div className="score-display-wrap">
      <div className={`score-circle ${colorClass}`}>
        <span className="score-number">{score}</span>
        <span className="score-denom">/ 100</span>
      </div>
      <span className={`score-grade ${colorClass}`}>{grade}</span>
    </div>
  )
}

function RecommendationBadge({ rec }: { rec: '매수' | '관망' | '주의' }) {
  const { t } = useTranslation()
  const cls = rec === '매수' ? 'buy' : rec === '관망' ? 'watch' : 'caution'
  const emoji = rec === '매수' ? '📈' : rec === '관망' ? '🔭' : '⚠️'
  const label = rec === '매수' ? t('compatibility.recBuy')
    : rec === '관망' ? t('compatibility.recWatch')
    : t('compatibility.recCaution')
  return <span className={`recommendation-badge ${cls}`}>{emoji} {label}</span>
}

function LocalTimeInfoBox() {
  const { t } = useTranslation()
  return (
    <div className="local-time-infobox">
      <p className="local-time-infobox-title">{t('compatibility.localTimeTitle')}</p>
      <p>{t('compatibility.localTimeDesc')}</p>
      <p style={{ marginTop: '0.4rem' }}>{t('compatibility.localTimeExample')}</p>
      <p style={{ marginTop: '0.4rem' }}>{t('compatibility.localTimeNoHour')}</p>
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
  const { t } = useTranslation()

  const SIJU_OPTIONS: { value: string; label: string }[] = [
    { value: '모름', label: t('siju.unknown') },
    { value: '자시', label: t('siju.ja') },
    { value: '축시', label: t('siju.chuk') },
    { value: '인시', label: t('siju.in') },
    { value: '묘시', label: t('siju.myo') },
    { value: '진시', label: t('siju.jin') },
    { value: '사시', label: t('siju.sa') },
    { value: '오시', label: t('siju.o') },
    { value: '미시', label: t('siju.mi') },
    { value: '신시', label: t('siju.sin') },
    { value: '유시', label: t('siju.yu') },
    { value: '술시', label: t('siju.sul') },
    { value: '해시', label: t('siju.hae') },
  ]

  return (
    <>
      <LocalTimeInfoBox />

      <div className="form-row">
        <label>{t('compatibility.manualCompanyLabel')}</label>
        <input
          type="text"
          placeholder={t('compatibility.manualCompanyPlaceholder')}
          value={value.company_name}
          onChange={e => onChange({ ...value, company_name: e.target.value })}
        />
      </div>

      <div className="form-row">
        <label>{t('compatibility.manualCeoNameLabel')}</label>
        <input
          type="text"
          placeholder={t('compatibility.manualCeoNamePlaceholder')}
          value={value.ceo_name}
          onChange={e => onChange({ ...value, ceo_name: e.target.value })}
        />
      </div>

      <div className="form-row">
        <label>{t('compatibility.manualBirthLabel')}</label>
        <div className="date-inputs">
          <input
            type="number"
            placeholder={t('compatibility.manualBirthYear')}
            value={value.year}
            min={1900}
            max={2025}
            onChange={e => onChange({ ...value, year: e.target.value })}
          />
          <input
            type="number"
            placeholder={t('compatibility.manualBirthMonth')}
            value={value.month}
            min={1}
            max={12}
            onChange={e => onChange({ ...value, month: e.target.value })}
          />
          <input
            type="number"
            placeholder={t('compatibility.manualBirthDay')}
            value={value.day}
            min={1}
            max={31}
            onChange={e => onChange({ ...value, day: e.target.value })}
          />
        </div>
        <span className="hint">{t('compatibility.manualBirthHint')}</span>
      </div>

      <div className="form-row">
        <label>{t('compatibility.manualSijuLabel')}</label>
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
        <span className="hint">{t('compatibility.manualSijuHint')}</span>
      </div>
    </>
  )
}

export default function CompatibilityPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  usePageMeta('주식 사주 궁합', 'Stock Compatibility')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const hasApiKey = !!getStoredApiKey()
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

  // 신고 폼
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

  const [form, setForm] = useState<FormState>(() => ({
    ...loadBirthInfo(),
    ticker: '',
  }))

  const SIJU_OPTIONS: { value: string; label: string }[] = [
    { value: '모름', label: t('siju.unknown') },
    { value: '자시', label: t('siju.ja') },
    { value: '축시', label: t('siju.chuk') },
    { value: '인시', label: t('siju.in') },
    { value: '묘시', label: t('siju.myo') },
    { value: '진시', label: t('siju.jin') },
    { value: '사시', label: t('siju.sa') },
    { value: '오시', label: t('siju.o') },
    { value: '미시', label: t('siju.mi') },
    { value: '신시', label: t('siju.sin') },
    { value: '유시', label: t('siju.yu') },
    { value: '술시', label: t('siju.sul') },
    { value: '해시', label: t('siju.hae') },
  ]

  // 생년월일·시진·성별 변경 시 세션 스토리지에 저장 (Step1과 공유)
  useEffect(() => {
    const { birth_year, birth_month, birth_day, birth_hour, gender } = form
    try {
      const current = sessionStorage.getItem(BIRTH_STORAGE_KEY)
      const parsed = current ? JSON.parse(current) : {}
      sessionStorage.setItem(BIRTH_STORAGE_KEY, JSON.stringify({
        ...parsed,
        birth_year,
        birth_month,
        birth_day,
        birth_hour,
        gender,
      }))
    } catch {}
  }, [form.birth_year, form.birth_month, form.birth_day, form.birth_hour, form.gender])

  const handleLookupCeo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (market === 'KR' && !krSelected) {
      setError(t('compatibility.selectStockError'))
      return
    }
    if (market === 'US' && !form.ticker.trim()) {
      setError(t('compatibility.tickerRequired'))
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
      setError(err instanceof Error ? err.message : t('compatibility.lookupError'))
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
      setError(t('compatibility.ceoEnterYearError'))
      return
    }

    const payload = buildAnalyzePayload()
    if (!payload) {
      setError(t('compatibility.ceoEnterYearError'))
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.analyzeCompatibility(payload)
      setResult(data)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('compatibility.analyzeError'))
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

  const genderOptions = [
    { value: '남', label: t('compatibility.male') },
    { value: '여', label: t('compatibility.female') },
  ]

  return (
    <div className="compatibility-page">
      <ApiKeyModal isOpen={showApiKeyModal} onClose={() => setShowApiKeyModal(false)} />
      <div className="app">
        <header className="app-header">
          <button className="btn-back" onClick={() => navigate('/')}>{t('common.back')}</button>
          <div className="header-nav-right">
            <button
              className={`btn-api-key ${hasApiKey ? 'active' : ''}`}
              onClick={() => setShowApiKeyModal(true)}
            >
              🔑 {hasApiKey ? t('apiKey.savedBadge') : t('apiKey.navBtn')}
            </button>
            <LangToggle />
          </div>
          <h1>🔮 {t('compatibility.pageTitle')}</h1>
          <p>{t('compatibility.pageSubtitle')}</p>
        </header>

        <main className="app-main">
          {/* ── Step 1: 입력 ── */}
          {step === 'input' && (
            <div className="step-container">
              <h2>{t('compatibility.inputTitle')}</h2>
              <p className="step-desc">
                {t('compatibility.inputDesc')}<br />
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{t('compatibility.inputDescAccent')}</span>
              </p>

              <form onSubmit={handleLookupCeo}>
                <div className="compat-section-label">{t('compatibility.mySajuLabel')}</div>

                <div className="form-row">
                  <label>{t('compatibility.birthDate')}</label>
                  <div className="date-inputs">
                    <input
                      type="number"
                      placeholder={t('compatibility.birthYear')}
                      value={form.birth_year}
                      min={1900}
                      max={2025}
                      onChange={e => setForm(f => ({ ...f, birth_year: +e.target.value }))}
                      required
                    />
                    <input
                      type="number"
                      placeholder={t('compatibility.birthMonth')}
                      value={form.birth_month}
                      min={1}
                      max={12}
                      onChange={e => setForm(f => ({ ...f, birth_month: +e.target.value }))}
                      required
                    />
                    <input
                      type="number"
                      placeholder={t('compatibility.birthDay')}
                      value={form.birth_day}
                      min={1}
                      max={31}
                      onChange={e => setForm(f => ({ ...f, birth_day: +e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label>{t('compatibility.birthHour')}</label>
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
                  <span className="hint">{t('compatibility.birthHourHint')}</span>
                </div>

                <div className="form-row">
                  <label>{t('compatibility.gender')}</label>
                  <div className="gender-toggle">
                    {genderOptions.map(g => (
                      <button
                        key={g.value}
                        type="button"
                        className={`gender-btn${form.gender === g.value ? ' selected' : ''}`}
                        onClick={() => setForm(f => ({ ...f, gender: g.value }))}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="compat-mystic-divider">
                  <span>☯</span>
                </div>

                <div className="compat-section-label">{t('compatibility.stockLabel')}</div>

                {/* 시장 선택 탭 */}
                <div className="market-tabs">
                  <button
                    type="button"
                    className={`market-tab ${market === 'KR' ? 'active' : ''}`}
                    onClick={() => { setMarket('KR'); setKrSearch(''); setKrSelected(null); setForm(f => ({ ...f, ticker: '' })) }}
                  >
                    {t('compatibility.marketKR')}
                  </button>
                  <button
                    type="button"
                    className={`market-tab ${market === 'US' ? 'active' : ''}`}
                    onClick={() => { setMarket('US'); setKrSearch(''); setKrSelected(null); setForm(f => ({ ...f, ticker: '' })) }}
                  >
                    {t('compatibility.marketUS')}
                  </button>
                </div>

                {/* 한국 주식 — 종목명 검색 */}
                {market === 'KR' && (
                  <div className="form-row">
                    <label>{t('compatibility.krSearchLabel')}</label>
                    <div className="kr-search-wrapper">
                      <input
                        type="text"
                        placeholder={t('compatibility.krSearchPlaceholder')}
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
                      {krLoading && <span className="hint">{t('common.searching')}</span>}
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
                      <span className="hint">{t('compatibility.krSelected')} {krSelected.name} ({krSelected.ticker})</span>
                    )}
                    <span className="hint">{t('compatibility.krSearchHint')}</span>
                  </div>
                )}

                {/* 미국 주식 — 티커 직접 입력 */}
                {market === 'US' && (
                  <div className="form-row">
                    <label>{t('compatibility.tickerLabel')}</label>
                    <input
                      type="text"
                      placeholder={t('compatibility.tickerPlaceholder')}
                      value={form.ticker}
                      onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                      required
                    />
                    <span className="hint">{t('compatibility.tickerHint')}</span>
                  </div>
                )}

                {error && <p className="error">{error}</p>}

                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                  {loading ? t('compatibility.lookupLoadingBtn') : t('compatibility.lookupBtn')}
                </button>
              </form>
            </div>
          )}

          {/* ── Step 2: CEO 확인 ── */}
          {step === 'ceo-confirm' && ceoInfo && (
            <div className="step-container">
              <h2>{t('compatibility.ceoConfirmTitle')}</h2>

              {ceoInfo.found && !useCustomDate ? (
                <>
                  <p className="step-desc">{t('compatibility.ceoConfirmDesc')}</p>

                  <div className="ceo-confirm-card">
                    <div className="ceo-info-row">
                      <span className="ceo-info-label">{t('compatibility.ceoCompany')}</span>
                      <span className="ceo-info-value">{ceoInfo.company_name}</span>
                    </div>
                    <div className="ceo-info-row">
                      <span className="ceo-info-label">{t('compatibility.ceoCeo')}</span>
                      <span className="ceo-info-value">{ceoInfo.ceo_name}</span>
                    </div>
                    <div className="ceo-info-row ceo-info-row--birth">
                      <span className="ceo-info-label">{t('compatibility.ceoBirth')}</span>
                      <span className="ceo-info-value">
                        {ceoInfo.ceo_birth_date}
                        {!ceoInfo.ceo_birth_date.includes('-') && (
                          <span className="ceo-birth-year-only"> ({t('compatibility.birthYearOnly')})</span>
                        )}
                      </span>
                      <button
                        type="button"
                        className="btn-edit-birth"
                        onClick={() => {
                          setUseCustomDate(true)
                          const parts = ceoInfo.ceo_birth_date.split('-')
                          setManualCeo({
                            company_name: ceoInfo.company_name || '',
                            ceo_name: ceoInfo.ceo_name || '',
                            year: parts[0] || '',
                            month: parts[1] || '',
                            day: parts[2] || '',
                            birth_hour: '모름',
                          })
                          setError(null)
                        }}
                      >
                        ✏️ {t('compatibility.ceoWrongBtn')}
                      </button>
                    </div>
                    {ceoInfo.from_cache && (
                      <p className="hint" style={{ marginTop: '0.5rem' }}>{t('compatibility.ceoCached')}</p>
                    )}
                  </div>

                  <LocalTimeInfoBox />
                </>
              ) : (
                <>
                  {!ceoInfo.found && (
                    <div className="warning">
                      <strong>{t('compatibility.ceoNotFound')}</strong>
                      <p style={{ marginTop: '0.3rem', fontSize: '0.88rem' }}>
                        {t('compatibility.ceoNotFoundDesc')}
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
                        {t('compatibility.ceoCancelBtn')}
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
                    ? t('compatibility.analyzingBtn')
                    : useCustomDate || !ceoInfo.found
                    ? t('compatibility.analyzeBtn')
                    : t('compatibility.analyzeConfirmBtn')}
                </button>
                <button type="button" className="btn-secondary" onClick={handleReset}>
                  {t('compatibility.reInputBtn')}
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
                      {t('compatibility.reportBtn')}
                    </button>
                  )}

                  {showReportForm && !reportSubmitted && (
                    <div className="report-form">
                      <p className="report-form-title">{t('compatibility.reportTitle')}</p>
                      <div className="form-row">
                        <label>{t('compatibility.reportBirthLabel')}</label>
                        <input
                          type="date"
                          value={reportBirthDate}
                          onChange={e => setReportBirthDate(e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <label>{t('compatibility.reportNoteLabel')}</label>
                        <textarea
                          rows={3}
                          placeholder={t('compatibility.reportNotePlaceholder')}
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
                          {reportLoading ? t('compatibility.reportSubmittingBtn') : t('compatibility.reportSubmitBtn')}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setShowReportForm(false)}
                          style={{ fontSize: '0.9rem', padding: '0.55rem 1.25rem' }}
                        >
                          {t('compatibility.reportCancelBtn')}
                        </button>
                      </div>
                    </div>
                  )}

                  {reportSubmitted && (
                    <p style={{ color: '#2e7d32', fontSize: '0.9rem', fontWeight: 600 }}>
                      {t('compatibility.reportSuccess')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: 결과 ── */}
          {step === 'result' && result && (
            <div className="step-container">
              <h2>{t('compatibility.resultTitle')}</h2>

              <div className="compat-result-card">
                <div className="ceo-info-row">
                  <span className="ceo-info-label">{t('compatibility.resultCompany')}</span>
                  <span className="ceo-info-value">
                    {result.company_name} ({result.ticker})
                  </span>
                </div>
                <div className="ceo-info-row">
                  <span className="ceo-info-label">{t('compatibility.resultCeo')}</span>
                  <span className="ceo-info-value">{result.ceo_name}</span>
                </div>
                <div className="ceo-info-row">
                  <span className="ceo-info-label">{t('compatibility.resultCeoBirth')}</span>
                  <span className="ceo-info-value">{result.ceo_birth_date}</span>
                </div>
              </div>

              <p className="hint" style={{ margin: '0.5rem 0 1rem' }}>
                {t('compatibility.resultHint')}
              </p>

              <div className="compat-score-section">
                <p className="compat-score-label">{t('compatibility.scoreLabel')}</p>
                <div className="compat-term-grid">
                  {([
                    { key: 'short_term', labelKey: 'termShort', descKey: 'termShortDesc' },
                    { key: 'mid_term',   labelKey: 'termMid',   descKey: 'termMidDesc'   },
                    { key: 'long_term',  labelKey: 'termLong',  descKey: 'termLongDesc'  },
                  ] as const).map(({ key, labelKey, descKey }) => (
                    <div className="compat-term-card" key={key}>
                      <span className="compat-term-label">{t(`compatibility.${labelKey}`)}</span>
                      <span className="compat-term-desc">{t(`compatibility.${descKey}`)}</span>
                      <ScoreDisplay score={result[key].score} />
                      <div style={{ marginTop: '0.6rem' }}>
                        <RecommendationBadge rec={result[key].recommendation} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="result-section" style={{ marginTop: '1.5rem' }}>
                <h3>{t('compatibility.readingTitle')}</h3>
                <div className="reading-text">
                  <ReactMarkdown>{result.reading}</ReactMarkdown>
                </div>
              </div>

              <div className="btn-group">
                <button type="button" className="btn-primary" onClick={handleReset}>
                  {t('compatibility.reAnalyzeBtn')}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate('/')}
                >
                  {t('compatibility.homeBtn')}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
