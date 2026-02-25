import type {
  SajuAnalyzeRequest, SajuAnalyzeResponse,
  PortfolioParseRequest, PortfolioParseResponse,
  RebalanceRequest, RebalanceResponse,
} from '../types'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? '요청 실패')
  }
  return res.json()
}

export const api = {
  analyzeSaju: (req: SajuAnalyzeRequest) =>
    post<SajuAnalyzeResponse>('/api/saju/analyze', req),

  parsePortfolio: (req: PortfolioParseRequest) =>
    post<PortfolioParseResponse>('/api/portfolio/parse', req),

  analyzeRebalance: (req: RebalanceRequest) =>
    post<RebalanceResponse>('/api/rebalance/analyze', req),
}
