import ReactMarkdown from 'react-markdown'
import type { SajuAnalyzeResponse, RebalanceResponse, PortfolioItem } from '../types'

interface Props {
  sajuData: SajuAnalyzeResponse
  result: RebalanceResponse
  portfolioItems: PortfolioItem[]
  onReset: () => void
}

const ACTION_COLOR: Record<string, string> = {
  '매수': '#2e7d32',
  '매도': '#c62828',
  '유지': '#1565c0',
}

export default function Step3Results({ sajuData, result, portfolioItems, onReset }: Props) {
  const totalBuy = result.rebalance_table
    .filter(r => r.action === '매수')
    .reduce((s, r) => s + r.amount, 0)
  const totalSell = result.rebalance_table
    .filter(r => r.action === '매도')
    .reduce((s, r) => s + r.amount, 0)

  const totalCurrentValue = portfolioItems.reduce((s, i) => s + i.current_value, 0)
  const totalTargetValue = result.rebalance_table.reduce((s, r) => s + r.target_value, 0)

  // 종목명 → 현재가/현재가치/통화 매핑
  const priceMap = new Map(portfolioItems.map(i => [i.name, i.current_price ?? null]))
  const currencyMap = new Map(portfolioItems.map(i => [i.name, i.currency ?? 'KRW']))
  const currentValueMap = new Map(portfolioItems.map(i => [i.name, i.current_value]))

  return (
    <div className="step-container">
      <h2>분석 결과</h2>

      {/* 사주 풀이 */}
      <section className="result-section">
        <h3>사주 풀이</h3>
        <div className="pillars">
          {(['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'] as const).map(key => {
            const val = sajuData.pillars[key]
            if (!val) return null
            const labels: Record<string, string> = {
              year_pillar: '년', month_pillar: '월',
              day_pillar: '일', hour_pillar: '시',
            }
            return (
              <div key={key} className="pillar-card">
                <span className="pillar-label">{labels[key]}주</span>
                <span className="pillar-value">{String(val)}</span>
              </div>
            )
          })}
        </div>
        <div className="reading-text">
          <ReactMarkdown>{sajuData.reading}</ReactMarkdown>
        </div>
      </section>

      {/* 리밸런싱 요약 */}
      <section className="result-section">
        <h3>리밸런싱 요약</h3>
        <div className="summary-badges">
          <span className="badge buy">매수 총액 {totalBuy.toLocaleString()}원</span>
          <span className="badge sell">매도 총액 {totalSell.toLocaleString()}원</span>
        </div>

        <div className="table-scroll">
          <table className="rebalance-table">
            <thead>
              <tr>
                <th>종목</th>
                <th>액션</th>
                <th>거래 주수</th>
                <th>거래금액</th>
                <th>변경 전 비중</th>
                <th>변경 후 비중</th>
                <th>이유</th>
              </tr>
            </thead>
            <tbody>
              {result.rebalance_table.map((row, i) => {
                const currentPrice = priceMap.get(row.name)
                const isUSD = currencyMap.get(row.name) === 'USD'
                // USD 종목은 단가가 달러라 원화 거래금액으로 주수 계산 불가
                const tradeQty = !isUSD && currentPrice && currentPrice > 0
                  ? Math.round(row.amount / currentPrice)
                  : null
                const beforePct = totalCurrentValue > 0
                  ? ((currentValueMap.get(row.name) ?? 0) / totalCurrentValue * 100).toFixed(1)
                  : '-'
                const afterPct = totalTargetValue > 0
                  ? (row.target_value / totalTargetValue * 100).toFixed(1)
                  : '-'

                return (
                  <tr key={i}>
                    <td>{row.name}</td>
                    <td style={{ color: ACTION_COLOR[row.action] ?? '#333', fontWeight: 700 }}>
                      {row.action}
                    </td>
                    <td>{tradeQty != null ? `${tradeQty}주` : '-'}</td>
                    <td>{row.amount.toLocaleString()}원</td>
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
        <h3>종합 해설</h3>
        <div className="narrative-text">
          <ReactMarkdown>{result.narrative}</ReactMarkdown>
        </div>
      </section>

      <button className="btn-secondary" onClick={onReset}>
        처음부터 다시 하기
      </button>
    </div>
  )
}
