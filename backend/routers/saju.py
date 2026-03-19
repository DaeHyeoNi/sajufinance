import json
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from schemas import SajuAnalyzeRequest, SajuAnalyzeResponse
from services.saju_service import get_or_create_saju

router = APIRouter(prefix="/api/saju", tags=["saju"])


@router.post("/analyze", response_model=SajuAnalyzeResponse)
def analyze_saju(
    req: SajuAnalyzeRequest,
    x_gemini_api_key: str | None = Header(None),
    db: Session = Depends(get_db),
):
    try:
        entry = get_or_create_saju(
            db,
            req.birth_year, req.birth_month, req.birth_day,
            req.birth_hour, req.gender,
            api_key=x_gemini_api_key,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return SajuAnalyzeResponse(
        saju_id=entry.id,
        pillars=json.loads(entry.raw_saju_data),
        reading=entry.gemini_reading,
    )
