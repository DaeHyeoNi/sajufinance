# 사주재무연구소

사주 명리학과 AI를 결합한 투자 분석 웹 애플리케이션입니다.

🌐 **Live Demo**: [saju.daehyeoni.dev](https://saju.daehyeoni.dev)

## 미리보기

| 홈 | 사주 리밸런서 | 주식 사주 궁합 |
|:---:|:---:|:---:|
| ![홈](docs/images/intro.png) | ![리밸런서](docs/images/rebalancer.png) | ![궁합](docs/images/compatibility.png) |

---

## 주요 기능

### ☯ 사주 포트폴리오 리밸런서
생년월일·시진·성별을 입력하면 사주 팔자를 분석하고, 보유 포트폴리오를 자유 형식으로 입력하면 Gemini AI가 사주 풀이를 토대로 맞춤형 리밸런싱 전략을 제시합니다.

### 🔮 주식 사주 궁합
내 사주와 기업 CEO의 사주 궁합을 분석하여 투자 적합도를 판단합니다.
- 한국 주식: 종목명 검색으로 선택 (KOSPI·KOSDAQ 2,800여 종목)
- 미국 주식: 티커 직접 입력 (TSLA, AAPL 등)
- CEO 생년월일 자동 조회 (DuckDuckGo + Gemini 파싱)
- 자동 조회 실패 시 수동 입력 + 잘못된 정보 신고 기능

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18, TypeScript, Vite |
| Backend | FastAPI, Python 3.12, uvicorn |
| AI | Google Gemini (`gemini-3.1-flash-lite-preview`) |
| 사주 계산 | sajupy |
| 한국 주식 데이터 | pykrx |
| CEO 검색 | ddgs (DuckDuckGo) + Gemini 파싱 |
| DB | SQLAlchemy + SQLite (MySQL 전환 가능) |
| 패키지 관리 | uv (backend), npm (frontend) |

---

## 시작하기

### 사전 요구사항

- Python 3.12+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/)
- Google Gemini API 키 ([발급](https://aistudio.google.com/apikey))

### 1. 저장소 클론

```bash
git clone https://github.com/DaeHyeoNi/sajufinance.git
cd sajufinance
```

### 2. 백엔드 설정

```bash
cd backend
cp .env.example .env
# .env 파일에 GEMINI_API_KEY 입력

uv run uvicorn main:app --reload
# → http://localhost:8000
```

### 3. 프론트엔드 설정

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Vite 개발 서버는 `/api/*` 요청을 `localhost:8000`으로 자동 프록시합니다.

---

## 사용 방법

### 사주 포트폴리오 리밸런서

1. **Step 1 — 사주 입력**: 생년월일, 태어난 시(시진), 성별 입력
2. **Step 2 — 포트폴리오 입력**: 보유 자산을 자유 형식으로 입력 (예: `삼성전자 100주 8만원, AAPL 10주 $190`) → AI 파싱 확인 → 운영 방안 입력
3. **Step 3 — 결과 확인**: 사주 기둥, AI 풀이, 리밸런싱 표, 종합 해설 → 고유 URL로 공유 가능

### 주식 사주 궁합

1. 생년월일·시진·성별 입력
2. 한국/미국 주식 선택 후 종목 검색 또는 티커 입력
3. CEO 정보 자동 조회 → 확인 또는 수동 수정
4. 궁합 점수(★), 매수/관망/주의 추천, 풀이 텍스트 확인

---

## 프로젝트 구조

```
sajufinance/
├── backend/
│   ├── main.py                   # FastAPI 앱 진입점
│   ├── database.py               # SQLAlchemy 엔진/세션
│   ├── models.py                 # ORM 모델 (SajuCache, CeoCache, CeoFeedback, RebalancingReport)
│   ├── schemas.py                # Pydantic 요청/응답 스키마
│   ├── data/
│   │   └── korean_stocks.json    # KOSPI·KOSDAQ 상장종목 (pykrx로 수집)
│   ├── routers/
│   │   ├── saju.py               # POST /api/saju/analyze
│   │   ├── portfolio.py          # POST /api/portfolio/parse
│   │   ├── rebalance.py          # POST /api/rebalance/analyze
│   │   ├── report.py             # GET  /api/rebalancing-report/{uuid}
│   │   └── compatibility.py      # POST /api/compatibility/*
│   └── services/
│       ├── gemini_service.py     # Gemini API 래퍼
│       ├── saju_service.py       # 사주 계산 + DB 캐시
│       ├── portfolio_service.py  # 포트폴리오 파싱
│       └── ceo_search_service.py # CEO 정보 검색 (DuckDuckGo + Gemini)
└── frontend/src/
    ├── App.tsx                   # 라우팅
    ├── types.ts                  # TypeScript 타입
    ├── api/client.ts             # fetch 래퍼
    └── components/
        ├── IntroPage.tsx         # 홈 (기능 선택)
        ├── Step1SajuInput.tsx
        ├── Step2PortfolioInput.tsx
        ├── Step3Results.tsx
        ├── CompatibilityPage.tsx # 주식 사주 궁합
        └── RebalancingReportPage.tsx
```

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/saju/analyze` | 사주 팔자 계산 + 풀이 (캐싱) |
| POST | `/api/portfolio/parse` | 자유형식 텍스트 → 구조화된 포트폴리오 |
| POST | `/api/rebalance/analyze` | 통합 리밸런싱 분석 |
| GET  | `/api/rebalancing-report/{uuid}` | 저장된 리밸런싱 결과 조회 |
| POST | `/api/compatibility/lookup` | 종목 CEO 정보 조회 |
| POST | `/api/compatibility/analyze` | 사주 궁합 분석 |
| POST | `/api/compatibility/report` | 잘못된 CEO 정보 신고 |
| GET  | `/api/compatibility/korean-stocks/search?q=` | 한국 종목명 검색 |
| GET  | `/health` | 헬스체크 |

---

## 환경변수

`backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here

# SQLite (기본값)
# DATABASE_URL=sqlite:///./saju.db

# MySQL 전환 시
# DATABASE_URL=mysql+pymysql://user:password@host:3306/dbname
```

MySQL 전환 시 `uv add pymysql` 필요.

---

## 개발 명령어

```bash
# 백엔드
cd backend
uv run uvicorn main:app --reload
uv add <package>
uv remove <package>

# 프론트엔드
cd frontend
npm run dev
npm run build
npm run lint
```

---

## 주의사항

- 본 서비스는 엔터테인먼트 목적으로 제공되며 실제 투자 조언이 아닙니다.
- CEO 생년월일 정보는 자동 검색 결과로, 부정확할 수 있습니다. 수동 입력 또는 신고 기능을 활용하세요.
- 사주 분석은 명리학 이론에 기반하며 투자 결과를 보장하지 않습니다.
