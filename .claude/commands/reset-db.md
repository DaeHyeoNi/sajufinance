---
description: SQLite DB 초기화 (테이블 재생성)
allowed-tools: Bash
---

## DB 초기화

SQLite 데이터베이스 파일을 삭제하고 테이블을 재생성합니다.

```bash
rm -f /Users/stark/Desktop/developments/saju-rebalancer/backend/*.db
```

서버 재시작 시 `lifespan`에서 `Base.metadata.create_all()`이 자동으로 테이블을 재생성합니다.

### 테이블 목록
- `saju_cache` — 사주 풀이 캐시
- `ceo_cache` — CEO 생년월일 캐시
- `ceo_feedback` — 잘못된 CEO 정보 신고 내역
- `rebalancing_report` — UUID 기반 리밸런싱 결과 공유
