import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SajuAnalyzeRequest, SajuAnalyzeResponse } from '../types'
import { api } from '../api/client'

const STORAGE_KEY = 'saju_step1_form'

function loadForm(): SajuAnalyzeRequest {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { birth_year: 1990, birth_month: 1, birth_day: 1, birth_hour: null, gender: '남' }
}

interface Props {
  onComplete: (data: SajuAnalyzeResponse) => void
}

export default function Step1SajuInput({ onComplete }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<SajuAnalyzeRequest>(loadForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  }, [form])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await api.analyzeSaju(form)
      onComplete(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('step1.errorDefault'))
    } finally {
      setLoading(false)
    }
  }

  const genderOptions = [
    { value: '남', label: t('step1.male') },
    { value: '여', label: t('step1.female') },
  ]

  return (
    <div className="step-container">
      <h2>{t('step1.title')}</h2>
      <p className="step-desc">{t('step1.desc')}</p>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>{t('step1.birthDate')}</label>
          <div className="date-inputs">
            <input
              type="number" placeholder={t('step1.birthYear')}
              value={form.birth_year}
              min={1900} max={2025}
              onChange={e => setForm(f => ({ ...f, birth_year: +e.target.value }))}
              required
            />
            <input
              type="number" placeholder={t('step1.birthMonth')}
              value={form.birth_month}
              min={1} max={12}
              onChange={e => setForm(f => ({ ...f, birth_month: +e.target.value }))}
              required
            />
            <input
              type="number" placeholder={t('step1.birthDay')}
              value={form.birth_day}
              min={1} max={31}
              onChange={e => setForm(f => ({ ...f, birth_day: +e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <label>{t('step1.birthHour')}</label>
          <select
            value={form.birth_hour ?? '모름'}
            onChange={e => setForm(f => ({ ...f, birth_hour: e.target.value === '모름' ? null : e.target.value }))}
          >
            <option value="모름">{t('step1.birthHourPlaceholder')}</option>
            {SIJU_OPTIONS.filter(s => s.value !== '모름').map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <span className="hint">{t('step1.birthHourHint')}</span>
        </div>

        <div className="form-row">
          <label>{t('step1.gender')}</label>
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

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t('step1.loadingBtn') : t('step1.submitBtn')}
        </button>
      </form>
    </div>
  )
}
