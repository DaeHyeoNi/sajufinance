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
}
