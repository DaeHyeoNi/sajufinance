"""Gemini API 래퍼 — 사주풀이 / 포트폴리오 파싱 / 리밸런싱 분석"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from google import genai

_client: genai.Client | None = None
_MODEL = "gemini-2.5-flash"


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


# ── 1. 사주 풀이 ──────────────────────────────────────────────────────────────

def generate_saju_reading(pillars: dict[str, Any], gender: str) -> str:
    """사주 팔자 데이터를 바탕으로 Gemini가 풀이 텍스트를 생성."""
    prompt = f"""당신은 전문 사주 명리학자입니다.
아래는 사용자의 사주 팔자 데이터입니다.

성별: {gender}
사주 데이터 (JSON):
{json.dumps(pillars, ensure_ascii=False, indent=2)}

위 사주를 바탕으로 다음 항목을 포함하여 상세히 풀이해 주세요:
1. 일간(日干)의 특성과 성향
2. 오행(五行) 균형 분석
3. 용신(用神) 및 기신(忌神)
4. 재물운(財運) — 투자/재테크 관련 성향 중심으로
5. 현재 대운(大運) 및 세운(歲運)의 흐름

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

def generate_rebalancing(
    saju_reading: str,
    portfolio_items: list[dict[str, Any]],
    additional_cash: float | None,
    user_preference: str,
) -> dict[str, Any]:
    """사주풀이 + 포트폴리오 + 사용자 선호를 통합하여 리밸런싱 결과를 생성.

    반환 형식:
    {
      "rebalance_table": [
        {"name": str, "action": "매수"|"매도"|"유지", "amount": float, "target_value": float, "reason": str}
      ],
      "narrative": str
    }
    """
    portfolio_json = json.dumps(portfolio_items, ensure_ascii=False, indent=2)
    cash_str = f"{additional_cash:,.0f}원" if additional_cash else "없음"

    prompt = f"""당신은 사주 명리학과 투자 분석을 결합한 전문가입니다.

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
- 추가 현금이 있다면 리밸런싱에 활용하세요.
- 사용자 선호 전략을 최대한 존중하면서 사주 관점을 더하세요."""
    result = _call(prompt)
    return _extract_json(result)
