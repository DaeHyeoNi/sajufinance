"""사주 계산 + DB 캐시 서비스"""
from __future__ import annotations

import json
from datetime import date

from sqlalchemy.orm import Session

from models import SajuCache
from services.gemini_service import generate_saju_reading

try:
    from sajupy import calculate_saju as _sajupy_calculate
    _SAJUPY_AVAILABLE = True
except ImportError:
    _SAJUPY_AVAILABLE = False


# 시진(時辰) 한국어 → 대표 시각(시) 매핑
# sajupy는 0-23 범위의 hour 정수를 받음
SIJU_TO_HOUR: dict[str, int] = {
    "자시": 0,  "축시": 2,  "인시": 4,  "묘시": 6,
    "진시": 8,  "사시": 10, "오시": 12, "미시": 14,
    "신시": 16, "유시": 18, "술시": 20, "해시": 22,
}


def _compute_pillars(
    birth_year: int, birth_month: int, birth_day: int,
    birth_hour: str | None, gender: str,
) -> dict:
    """sajupy calculate_saju()를 호출하여 사주 팔자를 계산."""
    hour_int = SIJU_TO_HOUR.get(birth_hour, 0) if birth_hour else 0

    if not _SAJUPY_AVAILABLE:
        return {
            "year_pillar": "庚午", "month_pillar": "丙戌",
            "day_pillar": "戊申", "hour_pillar": "己未",
            "_mock": True,
        }

    result: dict = _sajupy_calculate(birth_year, birth_month, birth_day, hour_int)
    result["gender"] = gender  # Gemini 프롬프트에서 참조할 수 있도록 포함
    return result


def get_or_create_saju(
    db: Session,
    birth_year: int, birth_month: int, birth_day: int,
    birth_hour: str | None, gender: str,
) -> SajuCache:
    """캐시에서 사주 결과를 가져오거나, 없으면 계산 후 저장."""
    birth_date = date(birth_year, birth_month, birth_day)

    # 캐시 조회
    cached = (
        db.query(SajuCache)
        .filter(
            SajuCache.birth_date == birth_date,
            SajuCache.birth_hour == birth_hour,
            SajuCache.gender == gender,
        )
        .first()
    )
    if cached:
        return cached

    # 캐시 미스 → 계산 + Gemini 풀이
    pillars = _compute_pillars(birth_year, birth_month, birth_day, birth_hour, gender)
    reading = generate_saju_reading(pillars, gender)

    entry = SajuCache(
        birth_date=birth_date,
        birth_hour=birth_hour,
        gender=gender,
        raw_saju_data=json.dumps(pillars, ensure_ascii=False),
        gemini_reading=reading,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
