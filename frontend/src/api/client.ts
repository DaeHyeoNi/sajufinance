import type {
  SajuAnalyzeRequest, SajuAnalyzeResponse,
  PortfolioParseRequest, PortfolioParseResponse,
  RebalanceRequest, RebalanceResponse,
  RebalancingReportData,
  CeoLookupRequest, CeoLookupResponse,
  CompatibilityRequest, CompatibilityResponse,
  CeoReportRequest,
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

export type StreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done'; data: RebalanceResponse }
  | { type: 'error'; detail: string }

async function* streamRebalance(req: RebalanceRequest): AsyncGenerator<StreamEvent> {
  const res = await fetch('/api/rebalance/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? '요청 실패')
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        yield JSON.parse(line.slice(6)) as StreamEvent
      }
    }
  }
}

async function getReport(uuid: string): Promise<RebalancingReportData> {
  const res = await fetch(`/api/rebalancing-report/${uuid}`)
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

  streamRebalance,

  getReport,

  lookupCeo: (req: CeoLookupRequest) =>
    post<CeoLookupResponse>('/api/compatibility/lookup', req),

  analyzeCompatibility: (req: CompatibilityRequest) =>
    post<CompatibilityResponse>('/api/compatibility/analyze', req),

  reportCeoData: (req: CeoReportRequest) =>
    post<{ ok: boolean }>('/api/compatibility/report', req),

  searchKoreanStocks: (q: string) =>
    fetch(`/api/compatibility/korean-stocks/search?q=${encodeURIComponent(q)}`).then(r => r.json()) as Promise<{ticker: string, name: string, market: string}[]>,
}
