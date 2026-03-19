// ── Step 1 ────────────────────────────────────────────────────────────────────
export interface SajuAnalyzeRequest {
  birth_year: number
  birth_month: number
  birth_day: number
  birth_hour: string | null  // 시진 (예: "자시") 또는 null
  gender: string             // "남" | "여"
}

export interface SajuAnalyzeResponse {
  saju_id: number
  pillars: Record<string, unknown>
  reading: string
}

// ── Step 2 ────────────────────────────────────────────────────────────────────
export interface PortfolioParseRequest {
  raw_text: string
  additional_cash?: number | null
}

export interface PortfolioItem {
  name: string
  currency?: string           // "KRW" | "USD", 기본값 "KRW"
  quantity?: number | null
  purchase_price?: number | null   // 해당 통화 기준 단가
  current_price?: number | null    // 해당 통화 기준 단가
  current_value: number            // 항상 KRW
  return_rate?: number | null
}

export interface PortfolioParseResponse {
  items: PortfolioItem[]
  additional_cash?: number | null
  missing_fields: string[]
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
export interface RebalanceRequest {
  saju_id: number
  portfolio_items: PortfolioItem[]
  additional_cash?: number | null
  user_preference: string
}

export interface RebalanceItem {
  name: string
  action: '매수' | '매도' | '유지'
  amount: number
  target_value: number
  reason: string
}

export interface RebalanceResponse {
  rebalance_table: RebalanceItem[]
  narrative: string
  report_uuid?: string
}

export interface RebalancingReportData {
  saju_data: {
    pillars: Record<string, unknown>
    reading: string
  }
  portfolio_items: PortfolioItem[]
  rebalance_table: RebalanceItem[]
  narrative: string
  created_at: string
}

// ── 궁합: CEO 조회 ────────────────────────────────────────
export interface CeoLookupRequest {
  ticker: string
  company_name?: string | null  // 한국 주식 회사명 (CEO 검색 품질 향상)
}

export interface CeoLookupResponse {
  ticker: string
  found: boolean
  company_name: string
  ceo_name: string
  ceo_birth_date: string  // "YYYY-MM-DD" 또는 "YYYY"
  from_cache: boolean
}

// ── 궁합: 분석 요청 ───────────────────────────────────────
export interface CompatibilityRequest {
  birth_year: number
  birth_month: number
  birth_day: number
  birth_hour: string | null
  gender: string
  ticker: string
  custom_ceo_birth_date?: string | null   // "YYYY-MM-DD"
  custom_ceo_birth_hour?: string | null   // 시진 (예: "자시"), 모르면 null
  custom_ceo_name?: string | null
  custom_company_name?: string | null
}

// ── 궁합: 분석 결과 ───────────────────────────────────────
export interface CompatibilityResponse {
  ticker: string
  company_name: string
  ceo_name: string
  ceo_birth_date: string
  compatibility_score: number  // 1~5
  recommendation: '매수' | '관망' | '주의'
  reading: string  // 마크다운
}

// ── 잘못된 데이터 신고 ────────────────────────────────────
export interface CeoReportRequest {
  ticker: string
  cached_ceo_name: string
  cached_birth_date: string
  correct_birth_date?: string | null
  note?: string | null
}
