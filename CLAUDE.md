# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (FastAPI)
```bash
# 의존성 설치 및 실행 (uv 사용)
cd backend
uv run uvicorn main:app --reload

# 패키지 추가
uv add <package>

# 패키지 제거
uv remove <package>
```

### Frontend (React + Vite)
```bash
cd frontend
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

## Architecture

### Request Flow
```
[React Frontend] → /api/* (Vite proxy) → [FastAPI Backend]
                                               ↓
                              ┌───────────────────────────────┐
                              │  Step 1: sajupy로 사주 계산   │
                              │  → SQLite 캐시 확인           │
                              │  → 캐시 미스 시 Gemini 호출   │
                              └───────────────────────────────┘
                              ┌───────────────────────────────┐
                              │  Step 2: 포트폴리오 텍스트    │
                              │  → Gemini가 JSON 구조화       │
                              └───────────────────────────────┘
                              ┌───────────────────────────────┐
                              │  Step 3: 사주풀이 + 포트폴리오│
                              │  + 사용자 선호 → Gemini 통합  │
                              │  분석 → 리밸런싱 표 + 해설    │
                              └───────────────────────────────┘
```

### Backend Structure (`backend/`)
- **`main.py`** — FastAPI 앱 진입점, lifespan으로 DB 테이블 자동 생성, CORS 설정
- **`database.py`** — SQLAlchemy engine/session. `DATABASE_URL` 환경변수로 SQLite↔MySQL 전환
- **`models.py`** — `SajuCache` ORM 모델. 유니크 키: `(birth_date, birth_hour, gender)`
- **`schemas.py`** — Pydantic 요청/응답 스키마 (Step별로 구분)
- **`services/gemini_service.py`** — Gemini API 래퍼. 3개 메서드: `generate_saju_reading`, `parse_portfolio_text`, `generate_rebalancing`
- **`services/saju_service.py`** — `get_or_create_saju()`: sajupy 계산 + DB 캐시 로직
- **`services/portfolio_service.py`** — `parse_portfolio()`: Gemini 호출 후 Pydantic 유효성 검사

### Frontend Structure (`frontend/src/`)
- **`App.tsx`** — 스텝 상태(`step: 1|2|3`)와 공유 데이터(`sajuData`, `result`) 관리
- **`components/Step1SajuInput.tsx`** — 생년월일/시진/성별 입력 → `/api/saju/analyze`
- **`components/Step2PortfolioInput.tsx`** — 포트폴리오 텍스트 + 추가현금 입력 → 파싱 확인 → 운영방안 입력 → `/api/rebalance/analyze`
- **`components/Step3Results.tsx`** — 사주 기둥, 사주풀이 텍스트, 리밸런싱 표, 종합 해설 출력
- **`api/client.ts`** — fetch 래퍼. Vite dev proxy(`/api` → `localhost:8000`) 사용
- **`types.ts`** — 백엔드 스키마와 1:1 대응하는 TypeScript 타입

### API Endpoints
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/saju/analyze` | 사주 팔자 계산 + 풀이 (캐시됨) |
| POST | `/api/portfolio/parse` | 자유형식 텍스트 → 구조화된 포트폴리오 |
| POST | `/api/rebalance/analyze` | 통합 리밸런싱 분석 |
| GET  | `/health` | 헬스체크 |

### Database
`SajuCache` 테이블에 사주 풀이 결과를 캐싱. 동일한 `(birth_date, birth_hour, gender)` 조합이면 Gemini 호출 없이 캐시에서 반환.

MySQL 전환 시 `.env`의 `DATABASE_URL`만 변경:
```
DATABASE_URL=mysql+pymysql://user:password@host:3306/dbname
```
PyMySQL 추가 필요: `uv add pymysql`

### Environment Setup
```bash
cd backend
cp .env.example .env
# .env에 GEMINI_API_KEY 입력
```

### sajupy
`calculate_saju(year, month, day, hour, minute=0)` 함수 사용. `hour`는 0-23 정수. 시진(자시/축시 등)은 `saju_service.py`의 `SIJU_TO_HOUR` 딕셔너리로 변환.
