"""주식-사주 궁합 라우터."""
from __future__ import annotations

import json
import os
from functools import lru_cache

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import CeoCache, CeoFeedback
from schemas import (
    CeoLookupRequest,
    CeoLookupResponse,
    CompatibilityRequest,
    CompatibilityResponse,
    CeoReportRequest,
)
from services.ceo_search_service import get_or_search_ceo
from services.gemini_service import generate_saju_compatibility
from services.saju_service import _compute_pillars, SIJU_TO_HOUR

router = APIRouter(prefix="/api/compatibility", tags=["compatibility"])

_KOREAN_STOCKS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "korean_stocks.json")


@lru_cache(maxsize=1)
def _load_korean_stocks() -> list[dict]:
    with open(_KOREAN_STOCKS_PATH, encoding="utf-8") as f:
        return json.load(f)


@router.get("/korean-stocks/search")
def search_korean_stocks(q: str = Query(..., min_length=1)) -> list[dict]:
    """한국 상장종목 이름 검색 (자동완성용).

    Returns:
        최대 20개 [{ticker, name, market}]
    """
    q_lower = q.lower()
    results = [
        s for s in _load_korean_stocks()
        if q_lower in s["name"].lower() or q in s["ticker"]
    ]
    return results[:20]


def _parse_ceo_birth(birth_date_str: str) -> tuple[int, int, int]:
    """'YYYY-MM-DD' 또는 'YYYY' 형식 파싱. 일/월 미명시 시 1월 1일로.

    Args:
        birth_date_str: CEO 생년월일 문자열.

    Returns:
        (year, month, day) 정수 튜플.
    """
    parts = birth_date_str.split("-")
    year = int(parts[0])
    month = int(parts[1]) if len(parts) > 1 else 1
    day = int(parts[2]) if len(parts) > 2 else 1
    return year, month, day


@router.post("/lookup", response_model=CeoLookupResponse)
def lookup_ceo(req: CeoLookupRequest, db: Session = Depends(get_db)) -> CeoLookupResponse:
    """ticker에 해당하는 CEO 정보를 조회합니다.

    DB 캐시에 있으면 바로 반환하고, 없으면 DuckDuckGo + Gemini로 검색합니다.
    검색/파싱에 실패해도 예외를 던지지 않고 found=False로 정상 응답합니다.

    Args:
        req: ticker를 포함한 조회 요청.
        db: SQLAlchemy DB 세션 (DI).

    Returns:
        CEO 정보 및 캐시 여부. 찾지 못하면 found=False.
    """
    ticker_upper = req.ticker.upper()

    # 캐시 여부 미리 확인
    already_cached = db.query(CeoCache).filter(CeoCache.ticker == ticker_upper).first()
    from_cache = already_cached is not None

    try:
        entry = get_or_search_ceo(db, ticker_upper, company_name=req.company_name)
    except RuntimeError:
        # 검색/파싱 실패 시 found=False로 정상 응답
        return CeoLookupResponse(
            ticker=ticker_upper,
            found=False,
        )

    return CeoLookupResponse(
        ticker=entry.ticker,
        found=True,
        company_name=entry.company_name,
        ceo_name=entry.ceo_name,
        ceo_birth_date=entry.ceo_birth_date,
        from_cache=from_cache,
    )


@router.post("/analyze", response_model=CompatibilityResponse)
def analyze_compatibility(
    req: CompatibilityRequest,
    x_gemini_api_key: str | None = Header(None),
    db: Session = Depends(get_db),
) -> CompatibilityResponse:
    """투자자 사주와 CEO 사주 궁합을 분석합니다.

    처리 흐름:
    1. custom_ceo_birth_date가 있으면 CEO 조회 없이 그 날짜로 분석 진행.
       이 경우 ceo_name/company_name은 custom 값 → 캐시 순으로 보완.
    2. custom_ceo_birth_date가 없으면 CEO 정보 조회 (캐시 or DuckDuckGo 검색).
       조회 실패 시 422 에러 (수동 입력 필수 안내).
    3. 투자자 사주 계산 (_compute_pillars).
    4. CEO 사주 계산: custom_ceo_birth_hour가 있으면 그 시진 사용, 없으면 None.
    5. Gemini 궁합 분석 생성.

    Args:
        req: 투자자 정보 + ticker + 선택적 CEO 오버라이드 필드 일체.
        db: SQLAlchemy DB 세션 (DI).

    Returns:
        궁합 분석 결과 (점수, 추천, 풀이 텍스트).

    Raises:
        HTTPException 422: CEO 정보를 찾지 못하고 custom_ceo_birth_date도 없을 때.
        HTTPException 502: Gemini 분석 실패 시.
        HTTPException 500: 사주 계산 오류 시.
    """
    ticker_upper = req.ticker.upper()

    ceo_name: str = ticker_upper
    company_name: str = ticker_upper
    ceo_birth_date_str: str

    if req.custom_ceo_birth_date:
        # custom 날짜가 있으면 CEO 조회 없이 진행
        ceo_birth_date_str = req.custom_ceo_birth_date
        # 이름/회사: custom 값 우선 → 캐시 보완 → ticker 폴백
        if req.custom_ceo_name:
            ceo_name = req.custom_ceo_name
        if req.custom_company_name:
            company_name = req.custom_company_name
        if not req.custom_ceo_name or not req.custom_company_name:
            cached = db.query(CeoCache).filter(CeoCache.ticker == ticker_upper).first()
            if cached:
                if not req.custom_ceo_name:
                    ceo_name = cached.ceo_name
                if not req.custom_company_name:
                    company_name = cached.company_name
    else:
        # custom 날짜 없음 → CEO 정보 조회 필수
        try:
            ceo_entry = get_or_search_ceo(db, ticker_upper)
        except RuntimeError as exc:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"'{ticker_upper}' CEO 정보를 자동으로 찾을 수 없습니다. "
                    "custom_ceo_birth_date 필드에 CEO 생년월일을 직접 입력해주세요. "
                    f"(원인: {exc})"
                ),
            )
        ceo_birth_date_str = ceo_entry.ceo_birth_date
        # custom 이름/회사 오버라이드 적용
        ceo_name = req.custom_ceo_name or ceo_entry.ceo_name
        company_name = req.custom_company_name or ceo_entry.company_name

    # 투자자 사주 계산
    try:
        user_pillars = _compute_pillars(
            req.birth_year, req.birth_month, req.birth_day,
            req.birth_hour, req.gender,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"투자자 사주 계산 실패: {exc}")

    # CEO 사주 계산: custom_ceo_birth_hour가 있으면 시진 변환 후 사용, 없으면 None
    ceo_birth_hour: str | None = req.custom_ceo_birth_hour
    if ceo_birth_hour and ceo_birth_hour not in SIJU_TO_HOUR:
        raise HTTPException(
            status_code=422,
            detail=f"유효하지 않은 시진입니다: '{ceo_birth_hour}'. 유효한 값: {list(SIJU_TO_HOUR.keys())}",
        )
    try:
        ceo_year, ceo_month, ceo_day = _parse_ceo_birth(ceo_birth_date_str)
        ceo_pillars = _compute_pillars(ceo_year, ceo_month, ceo_day, ceo_birth_hour, "남")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"CEO 사주 계산 실패: {exc}")

    # Gemini 궁합 분석
    try:
        result = generate_saju_compatibility(
            user_pillars=user_pillars,
            user_gender=req.gender,
            ceo_name=ceo_name,
            ceo_pillars=ceo_pillars,
            company_name=company_name,
            ticker=ticker_upper,
            ceo_birth_hour=ceo_birth_hour,
            api_key=x_gemini_api_key,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"궁합 분석 실패: {exc}")

    return CompatibilityResponse(
        ticker=ticker_upper,
        company_name=company_name,
        ceo_name=ceo_name,
        ceo_birth_date=ceo_birth_date_str,
        compatibility_score=int(result["compatibility_score"]),
        recommendation=result["recommendation"],
        reading=result["reading"],
    )


@router.post("/report", status_code=201)
def report_ceo_data(
    req: CeoReportRequest, db: Session = Depends(get_db)
) -> dict[str, str]:
    """잘못된 CEO 정보를 신고합니다.

    신고 내용을 ceo_feedback 테이블에 저장합니다.
    캐시 데이터는 즉시 수정되지 않으며, 관리자 검토 후 반영됩니다.

    Args:
        req: 신고 내용 (ticker, 기존 정보, 올바른 생년월일, 메모).
        db: SQLAlchemy DB 세션 (DI).

    Returns:
        접수 완료 메시지.
    """
    feedback = CeoFeedback(
        ticker=req.ticker.upper(),
        cached_ceo_name=req.cached_ceo_name,
        cached_birth_date=req.cached_birth_date,
        reported_correct_birth_date=req.correct_birth_date,
        note=req.note,
    )
    db.add(feedback)
    db.commit()

    return {"message": "신고가 접수되었습니다. 검토 후 반영됩니다."}
