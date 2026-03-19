"""포트폴리오 텍스트 파싱 서비스"""
from __future__ import annotations

from schemas import PortfolioItem
from services.gemini_service import parse_portfolio_text


def parse_portfolio(raw_text: str, additional_cash: float | None, api_key: str | None = None) -> tuple[list[PortfolioItem], list[str]]:
    """자유형식 텍스트를 파싱하여 PortfolioItem 목록과 누락 필드 목록을 반환."""
    raw_items = parse_portfolio_text(raw_text, api_key=api_key)

    items: list[PortfolioItem] = []
    missing: list[str] = []

    for raw in raw_items:
        # current_value가 없으면 quantity * current_price로 보완
        if raw.get("current_value") is None:
            qty = raw.get("quantity")
            price = raw.get("current_price")
            if qty is not None and price is not None:
                raw["current_value"] = qty * price
            else:
                missing.append(f"{raw.get('name', '?')}: current_value(현재 평가금액) 필수")
                continue

        items.append(PortfolioItem(**raw))

    return items, missing
