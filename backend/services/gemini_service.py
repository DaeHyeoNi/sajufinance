"""Gemini API 래퍼 — 사주풀이 / 포트폴리오 파싱 / 리밸런싱 분석"""
from __future__ import annotations

import json
import os
import re
from datetime import date
from typing import Any

from google import genai

_client: genai.Client | None = None
_MODEL = "gemini-3.1-flash-lite-preview"


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")
        _client = genai.Client(api_key=api_key)
    return _client


def _call(prompt: str) -> str:
    response = _get_client().models.generate_content(model=_MODEL, contents=prompt)
    return response.text


def _extract_json(text: str) -> Any:
    """LLM 응답에서 JSON 블록을 추출."""
    match = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    raw = match.group(1) if match else text
    return json.loads(raw.strip())


_SIJU_LABEL: dict[str, str] = {
    "자시": "자시(23:30~01:30)", "축시": "축시(01:30~03:30)",
    "인시": "인시(03:30~05:30)", "묘시": "묘시(05:30~07:30)",
    "진시": "진시(07:30~09:30)", "사시": "사시(09:30~11:30)",
    "오시": "오시(11:30~13:30)", "미시": "미시(13:30~15:30)",
    "신시": "신시(15:30~17:30)", "유시": "유시(17:30~19:30)",
    "술시": "술시(19:30~21:30)", "해시": "해시(21:30~23:30)",
}

# ── 1. 사주 풀이 ──────────────────────────────────────────────────────────────

def generate_saju_reading(pillars: dict[str, Any], gender: str, birth_hour: str | None = None) -> str:
    """사주 팔자 데이터를 바탕으로 Gemini가 풀이 텍스트를 생성."""
    today = date.today().strftime("%Y년 %m월 %d일")
    hour_str = _SIJU_LABEL.get(birth_hour, "미상") if birth_hour else "미상"
    prompt = f"""당신은 전문 사주 명리학자입니다.
아래는 사용자의 사주 팔자 데이터입니다.

오늘 날짜: {today}
성별: {gender}
태어난 시: {hour_str}
사주 데이터 (JSON):
{json.dumps(pillars, ensure_ascii=False, indent=2)}

위 사주를 바탕으로 다음 항목을 포함하여 상세히 풀이해 주세요:
1. 일간(日干)의 특성과 성향
2. 오행(五行) 균형 분석
3. 용신(用神) 및 기신(忌神)
4. 재물운(財運) — 투자/재테크 관련 성향 중심으로
5. 현재 대운(大運) 및 세운(歲運)의 흐름 (오늘 날짜 기준)

풀이 작성 시 출생 시각을 언급할 때는 "{hour_str}" 형식으로 표기하세요. "18:00" 같은 시각 숫자 형식은 사용하지 마세요.
풀이는 한국어로 작성하고, 투자 성향 분석에 특히 집중해 주세요."""
    return _call(prompt)


# ── 2. 포트폴리오 텍스트 파싱 ─────────────────────────────────────────────────

def parse_portfolio_text(raw_text: str) -> list[dict[str, Any]]:
    """자유형식 포트폴리오 텍스트를 구조화된 JSON 배열로 변환.

    반환 형식 (항목당):
    {
      "name": str,
      "currency": "KRW" | "USD",
      "quantity": float | null,
      "purchase_price": float | null,   <- 해당 통화 기준 숫자
      "current_price": float | null,    <- 해당 통화 기준 숫자
      "current_value": float,           <- 필수, 항상 KRW
      "return_rate": float | null
    }
    """
    prompt = f"""아래는 사용자가 입력한 포트폴리오 정보입니다. 자유 형식의 텍스트에서 각 자산의 정보를 추출하여 JSON 배열로 반환하세요.

입력 텍스트:
{raw_text}

반환 형식 (JSON 배열, 마크다운 코드블록으로 감싸기):
```json
[
  {{
    "name": "종목명 또는 자산명",
    "currency": "KRW 또는 USD",
    "quantity": 보유수량 또는 null,
    "purchase_price": 매입가(주당, 해당 통화의 숫자만) 또는 null,
    "current_price": 현재가(주당, 해당 통화의 숫자만) 또는 null,
    "current_value": 현재 평가금액(필수, 반드시 원화(KRW) 기준으로 환산),
    "return_rate": 수익률(%) 또는 null
  }}
]
```

통화 처리 규칙:
- 가격에 $ 기호가 있거나 명백히 미국 주식(NASDAQ/NYSE 상장 종목)이면 currency를 "USD"로 설정하세요.
- 가격에 $ 기호가 없고 한국 주식이면 currency를 "KRW"로 설정하세요.
- purchase_price, current_price는 해당 통화의 숫자만 저장하세요 ($ 기호 제외, 원화 변환 불필요).
- current_value(현재 평가금액)는 반드시 원화(KRW)로 저장하세요.
  - USD 종목이면: quantity × current_price(USD) × 1400 으로 환산하세요 (기준환율: 1 USD = 1,400 KRW).
  - KRW 종목이면: quantity × current_price(KRW) 로 계산하세요.
  - 텍스트에 이미 평가금액이 원화로 명시된 경우 그 값을 사용하고, 달러로 명시된 경우 × 1400 환산하세요.
- 텍스트에서 읽을 수 없는 필드는 null로 표기하세요."""
    result = _call(prompt)
    return _extract_json(result)


# ── 3. 리밸런싱 분석 ──────────────────────────────────────────────────────────

def _build_rebalancing_prompt(
    saju_reading: str,
    portfolio_items: list[dict[str, Any]],
    additional_cash: float | None,
    user_preference: str,
) -> str:
    portfolio_json = json.dumps(portfolio_items, ensure_ascii=False, indent=2)
    cash_str = f"{additional_cash:,.0f}원" if additional_cash else "없음"
    return f"""당신은 사주 명리학과 투자 분석을 결합한 전문가입니다.

## 사주 풀이
{saju_reading}

## 현재 포트폴리오
{portfolio_json}

## 투입 가능한 추가 현금
{cash_str}

## 사용자 운영 방안 / 선호 전략
{user_preference}

위 정보를 종합하여 포트폴리오 리밸런싱 분석을 수행하세요.
포트폴리오의 current_value 및 모든 금액은 원화(KRW) 기준입니다.
포트폴리오에 "현금" 항목이 있다면 이를 리밸런싱에 반드시 포함하세요.

응답은 반드시 아래 JSON 형식으로 작성하고, 마크다운 코드블록으로 감싸세요:
```json
{{
  "rebalance_table": [
    {{
      "name": "종목명",
      "action": "매수 또는 매도 또는 유지",
      "amount": 거래금액(원, 양수),
      "target_value": 목표 평가금액(원),
      "reason": "이 종목을 이렇게 처리하는 이유 (사주 관점 포함)"
    }}
  ],
  "narrative": "사주 풀이와 포트폴리오를 종합한 전체 분석 해설 (3~5문단, 한국어)"
}}
```

주의사항:
- 사주의 용신/기신을 투자 성향에 반영하세요.
- 사용자 선호 전략을 최대한 존중하면서 사주 관점을 더하세요."""


def generate_rebalancing(
    saju_reading: str,
    portfolio_items: list[dict[str, Any]],
    additional_cash: float | None,
    user_preference: str,
) -> dict[str, Any]:
    """사주풀이 + 포트폴리오 + 사용자 선호를 통합하여 리밸런싱 결과를 생성."""
    prompt = _build_rebalancing_prompt(saju_reading, portfolio_items, additional_cash, user_preference)
    result = _call(prompt)
    return _extract_json(result)


async def stream_rebalancing(
    saju_reading: str,
    portfolio_items: list[dict[str, Any]],
    additional_cash: float | None,
    user_preference: str,
):
    """Gemini 스트리밍: ('chunk', 텍스트) 를 yield하다가 마지막에 ('done', 파싱된 dict) yield."""
    prompt = _build_rebalancing_prompt(saju_reading, portfolio_items, additional_cash, user_preference)
    collected: list[str] = []
    response_stream = await _get_client().aio.models.generate_content_stream(model=_MODEL, contents=prompt)
    async for chunk in response_stream:
        if chunk.text:
            collected.append(chunk.text)
            yield "chunk", chunk.text
    yield "done", _extract_json("".join(collected))


# ── 4. 사주 궁합 분석 ──────────────────────────────────────────────────────────

def generate_saju_compatibility(
    user_pillars: dict[str, Any],
    user_gender: str,
    ceo_name: str,
    ceo_pillars: dict[str, Any],
    company_name: str,
    ticker: str,
    ceo_birth_hour: str | None = None,
) -> dict[str, Any]:
    """사용자 사주 + CEO 사주 궁합 분석.

    Args:
        user_pillars: 투자자의 사주 팔자 데이터 (sajupy 계산 결과).
        user_gender: 투자자 성별 ("남" / "여").
        ceo_name: CEO 이름.
        ceo_pillars: CEO의 사주 팔자 데이터 (sajupy 계산 결과).
        company_name: 기업명.
        ticker: 종목 코드.
        ceo_birth_hour: CEO 시진 (예: "자시"). None이면 시각 불명으로 처리.

    Returns:
        {
            "compatibility_score": 1~5 (정수),
            "recommendation": "매수" | "관망" | "주의",
            "reading": "마크다운 풀이 텍스트"
        }
    """
    today = date.today().strftime("%Y년 %m월 %d일")

    # CEO 시진 유무에 따라 프롬프트 문구 분기
    if ceo_birth_hour:
        ceo_hour_line = f"CEO 태어난 시: {_SIJU_LABEL.get(ceo_birth_hour, ceo_birth_hour)}"
        ceo_hour_note = "CEO 시주(時柱)까지 포함하여 분석합니다."
    else:
        ceo_hour_line = "CEO 태어난 시각 불명 — 일간(日干) 위주 분석"
        ceo_hour_note = "CEO의 태어난 시각은 불명이므로 일간(日干) 위주로 분석합니다."

    prompt = f"""당신은 사주 명리학과 투자 분석을 결합한 전문가입니다.
오늘 날짜: {today}

아래는 투자자(사용자)와 투자 대상 기업 CEO의 사주 팔자 데이터입니다.
사용자의 사주와 CEO의 사주 궁합을 분석하여 이 주식에 대한 투자 적합도를 판단해주세요.

## 투자자 정보
성별: {user_gender}
사주 데이터 (JSON):
{json.dumps(user_pillars, ensure_ascii=False, indent=2)}

## CEO 정보
기업: {company_name} ({ticker})
CEO: {ceo_name}
{ceo_hour_line}
사주 데이터 (JSON):
{json.dumps(ceo_pillars, ensure_ascii=False, indent=2)}

## 분석 기준
1. 투자자의 일간(日干)과 CEO 일간의 오행 상생/상극 관계
2. 투자자의 재성(財星) 흐름 — 이 CEO가 이끄는 기업이 투자자에게 재물을 가져다주는가
3. 음양 균형 및 사주 조화
4. 투자자의 현재 운세 흐름과 이 투자의 타이밍

## 분석 시 주의사항
- {ceo_hour_note}
- CEO 생년월일은 현지(출생지) 기준입니다.

응답은 반드시 아래 JSON 형식으로, 마크다운 코드블록으로 감싸세요:
```json
{{
  "compatibility_score": 1에서 5 사이의 정수 (5가 최고 궁합),
  "recommendation": "매수 또는 관망 또는 주의",
  "reading": "사주 궁합 풀이 텍스트 (마크다운, 3~5문단, 한국어)"
}}
```

주의: 오늘 날짜({today}) 기준 정보만 사용하세요. 추측이나 창작 금지."""

    result = _call(prompt)
    return _extract_json(result)
