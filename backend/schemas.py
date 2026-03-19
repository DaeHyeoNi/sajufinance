from __future__ import annotations
from typing import Any
from pydantic import BaseModel


# ── Step 1: 사주 분석 ─────────────────────────────────────────────────────────

class SajuAnalyzeRequest(BaseModel):
    birth_year: int
    birth_month: int
    birth_day: int
    birth_hour: str | None = None  # 시진 (예: "자시", "축시") — 모를 경우 None
    gender: str  # "남" / "여"


class SajuAnalyzeResponse(BaseModel):
    saju_id: int
    pillars: dict[str, Any]  # sajupy 원본 데이터 (년/월/일/시 기둥)
    reading: str              # Gemini가 생성한 사주 풀이 텍스트


# ── Step 2: 포트폴리오 파싱 ───────────────────────────────────────────────────

class PortfolioParseRequest(BaseModel):
    raw_text: str
    additional_cash: float | None = None  # 투입 가능한 추가 현금 (원)


class PortfolioItem(BaseModel):
    name: str
    currency: str = "KRW"                 # "KRW" 또는 "USD"
    quantity: float | None = None
    purchase_price: float | None = None   # 매입가 (주당, 해당 통화 기준)
    current_price: float | None = None    # 현재가 (주당, 해당 통화 기준)
    current_value: float                  # 현재 평가금액 (필수, 항상 KRW)
    return_rate: float | None = None      # 수익률 (%)


class PortfolioParseResponse(BaseModel):
    items: list[PortfolioItem]
    additional_cash: float | None = None
    missing_fields: list[str] = []       # 파싱 불가 필드 목록 (있으면 프론트에서 안내)


# ── Step 3: 리밸런싱 분석 ─────────────────────────────────────────────────────

class RebalanceRequest(BaseModel):
    saju_id: int
    portfolio_items: list[PortfolioItem]
    additional_cash: float | None = None
    user_preference: str  # 사용자의 운영 방안 / 선호 전략 (자유 텍스트)


class RebalanceItem(BaseModel):
    name: str
    action: str        # "매수" / "매도" / "유지"
    amount: float      # 금액 기준 (원)
    target_value: float
    reason: str        # 해당 종목에 대한 간략 이유


class RebalanceResponse(BaseModel):
    rebalance_table: list[RebalanceItem]
    narrative: str     # 전체 분석 해설 (사주 + 포트폴리오 통합)
    report_uuid: str = ""


class RebalancingReportData(BaseModel):
    saju_data: dict[str, Any]        # {pillars, reading}
    portfolio_items: list[PortfolioItem]
    rebalance_table: list[RebalanceItem]
    narrative: str
    created_at: str


# ── 궁합: CEO 조회 ─────────────────────────────────────────

class CeoLookupRequest(BaseModel):
    ticker: str                        # 예: "TSLA", "005930"
    company_name: str | None = None    # 한국 주식 회사명 (검색 품질 향상용)


class CeoLookupResponse(BaseModel):
    ticker: str
    found: bool
    company_name: str = ""
    ceo_name: str = ""
    ceo_birth_date: str = ""   # "YYYY-MM-DD" 또는 "YYYY"
    from_cache: bool = False


# ── 궁합: 분석 요청 ────────────────────────────────────────

class CompatibilityRequest(BaseModel):
    birth_year: int
    birth_month: int
    birth_day: int
    birth_hour: str | None = None  # 시진
    gender: str                    # "남" / "여"
    ticker: str
    # 사용자가 수동으로 수정한 CEO 정보 (None이면 캐시/검색 결과 사용)
    custom_ceo_birth_date: str | None = None   # "YYYY-MM-DD"
    custom_ceo_birth_hour: str | None = None   # 시진 (예: "자시"), 모르면 None
    custom_ceo_name: str | None = None
    custom_company_name: str | None = None


# ── 궁합: 분석 결과 ────────────────────────────────────────

class TermScore(BaseModel):
    score: int   # 1~100
    recommendation: str  # "매수" | "관망" | "주의"

class CompatibilityResponse(BaseModel):
    ticker: str
    company_name: str
    ceo_name: str
    ceo_birth_date: str
    short_term: TermScore
    mid_term: TermScore
    long_term: TermScore
    reading: str               # 궁합 풀이 (마크다운)


# ── 잘못된 데이터 신고 ─────────────────────────────────────

class CeoReportRequest(BaseModel):
    ticker: str
    cached_ceo_name: str
    cached_birth_date: str
    correct_birth_date: str | None = None
    note: str | None = None
