from fastapi import APIRouter, Header, HTTPException

from schemas import PortfolioParseRequest, PortfolioParseResponse
from services.portfolio_service import parse_portfolio

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.post("/parse", response_model=PortfolioParseResponse)
def parse_portfolio_endpoint(
    req: PortfolioParseRequest,
    x_gemini_api_key: str | None = Header(None),
):
    try:
        items, missing = parse_portfolio(req.raw_text, req.additional_cash, api_key=x_gemini_api_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not items:
        raise HTTPException(
            status_code=400,
            detail=f"포트폴리오를 파싱할 수 없습니다. 누락 필드: {missing}",
        )

    return PortfolioParseResponse(
        items=items,
        additional_cash=req.additional_cash,
        missing_fields=missing,
    )
