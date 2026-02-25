import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import SajuCache
from schemas import RebalanceRequest, RebalanceResponse, RebalanceItem
from services.gemini_service import generate_rebalancing

router = APIRouter(prefix="/api/rebalance", tags=["rebalance"])


@router.post("/analyze", response_model=RebalanceResponse)
def analyze_rebalance(req: RebalanceRequest, db: Session = Depends(get_db)):
    # 사주 풀이 조회
    entry: SajuCache | None = db.query(SajuCache).filter(SajuCache.id == req.saju_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="사주 데이터를 찾을 수 없습니다. 먼저 사주를 분석해 주세요.")

    portfolio_dicts = [item.model_dump() for item in req.portfolio_items]

    try:
        result = generate_rebalancing(
            saju_reading=entry.gemini_reading,
            portfolio_items=portfolio_dicts,
            additional_cash=req.additional_cash,
            user_preference=req.user_preference,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    rebalance_table = [RebalanceItem(**row) for row in result.get("rebalance_table", [])]

    return RebalanceResponse(
        rebalance_table=rebalance_table,
        narrative=result.get("narrative", ""),
    )
