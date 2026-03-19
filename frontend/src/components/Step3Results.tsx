import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import type { SajuAnalyzeResponse, RebalanceResponse, PortfolioItem } from '../types'

// CommonMark 스펙상 )**한글 패턴에서 닫는 ** 가 right-flanking으로 인식 안 되는 버그 수정.
// ) 와 ** 사이에 ZWNJ(U+200C)를 삽입하면 파서가 정상 인식하며 시각적으로 무해함.
function fixBold(text: string): string {
  return text.replace(/\)\*\*/g, ')\u200C**')
}

interface Props {
  sajuData: SajuAnalyzeResponse
  result: RebalanceResponse
  portfolioItems: PortfolioItem[]
  reportUuid?: string
  onReset: () => void
}

function displayAction(name: string, action: string, t: (key: string) => string): string {
  if (name === '현금') {
    if (action === '매수') return t('step3.actionIncrease')
    if (action === '매도') return t('step3.actionDecrease')
  }
  if (action === '매수') return t('step3.actionBuy')
  if (action === '매도') return t('step3.actionSell')
  if (action === '유지') return t('step3.actionHold')
  return action
}

export default function Step3Results({ sajuData, result, portfolioItems, reportUuid, onReset }: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const shareUrl = reportUuid ? `${window.location.origin}/rebalancing-report/${reportUuid}` : null

  const handleCopy = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const totalBuy = result.rebalance_table
    .filter(r => r.action === '매수' && r.name !== '현금')
    .reduce((s, r) => s + r.amount, 0)
  const totalSell = result.rebalance_table
    .filter(r => r.action === '매도' && r.name !== '현금')
    .reduce((s, r) => s + r.amount, 0)

  const totalCurrentValue = portfolioItems.reduce((s, i) => s + i.current_value, 0)
  const totalTargetValue = result.rebalance_table.reduce((s, r) => s + r.target_value, 0)

  // 종목명 → 수량/현재가치 매핑 (통화 무관하게 KRW 단가 역산에 사용)
  const quantityMap = new Map(portfolioItems.map(i => [i.name, i.quantity ?? null]))
  const currentValueMap = new Map(portfolioItems.map(i => [i.name, i.current_value]))

  const pillarKeys = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'] as const
  const pillarLabels: Record<string, string> = {
    year_pillar: t('step3.pillarYear'),
    month_pillar: t('step3.pillarMonth'),
    day_pillar: t('step3.pillarDay'),
    hour_pillar: t('step3.pillarHour'),
  }

  return (
    <div className="step-container">
      <h2>{t('step3.title')}</h2>

      {/* 사주 풀이 */}
      <section className="result-section">
        <h3>{t('step3.sajuReading')}</h3>
        <div className="pillars">
          {pillarKeys.map(key => {
            const val = sajuData.pillars[key]
            if (!val) return null
            return (
              <div key={key} className="pillar-card">
                <span className="pillar-label">{pillarLabels[key]}{t('step3.pillarSuffix')}</span>
                <span className="pillar-value">{String(val)}</span>
              </div>
            )
          })}
        </div>
        <div className="reading-text">
          <ReactMarkdown>{fixBold(sajuData.reading)}</ReactMarkdown>
        </div>
      </section>

      {/* 리밸런싱 요약 */}
      <section className="result-section">
        <h3>{t('step3.rebalanceSummary')}</h3>
        <div className="summary-badges">
          <span className="badge buy">{t('step3.totalBuy')} {totalBuy.toLocaleString()}{t('step3.currency')}</span>
          <span className="badge sell">{t('step3.totalSell')} {totalSell.toLocaleString()}{t('step3.currency')}</span>
        </div>

        <div className="table-scroll">
          <table className="rebalance-table">
            <thead>
              <tr>
                <th>{t('step3.tableStock')}</th>
                <th>{t('step3.tableAction')}</th>
                <th>{t('step3.tableTradeQty')}</th>
                <th>{t('step3.tableAmount')}</th>
                <th>{t('step3.tableBeforePct')}</th>
                <th>{t('step3.tableAfterPct')}</th>
                <th>{t('step3.tableReason')}</th>
              </tr>
            </thead>
            <tbody>
              {result.rebalance_table.map((row, i) => {
                const quantity = quantityMap.get(row.name)
                const currentValue = currentValueMap.get(row.name) ?? 0
                // 통화 무관하게 KRW 단가 역산: current_value(KRW) / quantity
                // USD 종목도 동일 공식으로 주수 계산 가능
                const impliedKrwPrice = quantity && quantity > 0 ? currentValue / quantity : null
                const tradeQty = impliedKrwPrice && row.action !== '유지' && row.name !== '현금'
                  ? Math.round(row.amount / impliedKrwPrice)
                  : null
                const beforePct = totalCurrentValue > 0
                  ? (currentValue / totalCurrentValue * 100).toFixed(1)
                  : '-'
                const afterPct = totalTargetValue > 0
                  ? (row.target_value / totalTargetValue * 100).toFixed(1)
                  : '-'
                const label = displayAction(row.name, row.action, t)

                const buyLabels = [t('step3.actionBuy'), t('step3.actionIncrease')]
                const sellLabels = [t('step3.actionSell'), t('step3.actionDecrease')]
                const badgeCls = buyLabels.includes(label) ? 'buy'
                  : sellLabels.includes(label) ? 'sell'
                  : 'hold'

                return (
                  <tr key={i}>
                    <td>{row.name}</td>
                    <td>
                      <span className={`action-badge ${badgeCls}`}>{label}</span>
                    </td>
                    <td>{tradeQty != null ? `${tradeQty}${t('step3.tradeQtySuffix')}` : '-'}</td>
                    <td>{row.amount.toLocaleString()}{t('step3.currency')}</td>
                    <td>{beforePct !== '-' ? `${beforePct}%` : '-'}</td>
                    <td>{afterPct !== '-' ? `${afterPct}%` : '-'}</td>
                    <td className="reason-cell">{row.reason}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 종합 해설 */}
      <section className="result-section">
        <h3>{t('step3.narrative')}</h3>
        <div className="narrative-text">
          <ReactMarkdown>{fixBold(result.narrative)}</ReactMarkdown>
        </div>
      </section>

      {shareUrl && (
        <section className="result-section share-section">
          <h3>{t('step3.shareTitle')}</h3>
          <p className="hint">{t('step3.shareHint')}</p>
          <div className="share-url-row">
            <input className="share-url-input" readOnly value={shareUrl} onClick={e => (e.target as HTMLInputElement).select()} />
            <button className="btn-copy" onClick={handleCopy}>
              {copied ? t('step3.copiedBtn') : t('step3.copyBtn')}
            </button>
          </div>
        </section>
      )}

      <button className="btn-secondary" onClick={onReset}>
        {t('step3.resetBtn')}
      </button>
    </div>
  )
}
