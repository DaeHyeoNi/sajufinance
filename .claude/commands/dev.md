---
description: 백엔드 + 프론트엔드 개발 서버 실행
allowed-tools: Bash
---

## 개발 서버 실행

백엔드와 프론트엔드를 각각 실행합니다.

### 백엔드 (FastAPI)
```bash
cd /Users/stark/Desktop/developments/saju-rebalancer/backend
uv run uvicorn main:app --reload
```
→ http://localhost:8000

### 프론트엔드 (React + Vite)
```bash
cd /Users/stark/Desktop/developments/saju-rebalancer/frontend
npm run dev
```
→ http://localhost:5173

### 환경변수 확인
```bash
cat /Users/stark/Desktop/developments/saju-rebalancer/backend/.env
```
`GEMINI_API_KEY`가 설정되어 있어야 합니다.
