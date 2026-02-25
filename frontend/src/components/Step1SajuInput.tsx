import { useState } from 'react'
import type { SajuAnalyzeRequest, SajuAnalyzeResponse } from '../types'
import { api } from '../api/client'

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

interface Props {
  onComplete: (data: SajuAnalyzeResponse) => void
}

export default function Step1SajuInput({ onComplete }: Props) {
  const [form, setForm] = useState<SajuAnalyzeRequest>({
    birth_year: 1990,
    birth_month: 1,
    birth_day: 1,
    birth_hour: null,
    gender: '남',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await api.analyzeSaju(form)
      onComplete(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="step-container">
      <h2>Step 1 — 사주 정보 입력</h2>
      <p className="step-desc">생년월일과 성별을 입력하면 사주 풀이를 제공합니다.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>생년월일</label>
          <div className="date-inputs">
            <input
              type="number" placeholder="년 (예: 1990)"
              value={form.birth_year}
              min={1900} max={2025}
              onChange={e => setForm(f => ({ ...f, birth_year: +e.target.value }))}
              required
            />
            <input
              type="number" placeholder="월"
              value={form.birth_month}
              min={1} max={12}
              onChange={e => setForm(f => ({ ...f, birth_month: +e.target.value }))}
              required
            />
            <input
              type="number" placeholder="일"
              value={form.birth_day}
              min={1} max={31}
              onChange={e => setForm(f => ({ ...f, birth_day: +e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <label>태어난 시 (시진)</label>
          <select
            value={form.birth_hour ?? '모름'}
            onChange={e => setForm(f => ({ ...f, birth_hour: e.target.value === '모름' ? null : e.target.value }))}
          >
            {SIJU_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <span className="hint">모를 경우 정확도가 낮아질 수 있습니다.</span>
        </div>

        <div className="form-row">
          <label>성별</label>
          <div className="radio-group">
            {['남', '여'].map(g => (
              <label key={g} className="radio-label">
                <input
                  type="radio" name="gender" value={g}
                  checked={form.gender === g}
                  onChange={() => setForm(f => ({ ...f, gender: g }))}
                />
                {g}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? '사주 분석 중…' : '사주 분석하기'}
        </button>
      </form>
    </div>
  )
}
