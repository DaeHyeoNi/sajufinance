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
