from contextlib import asynccontextmanager
import logging
import logging.handlers
import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import Base, engine
from routers import saju, portfolio, rebalance, report, compatibility

# ── 로깅 설정 ──────────────────────────────────────────────────────────────
_LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(_LOG_DIR, exist_ok=True)

_handler = logging.handlers.TimedRotatingFileHandler(
    filename=os.path.join(_LOG_DIR, "app.log"),
    when="midnight",
    backupCount=14,
    encoding="utf-8",
)
_handler.setFormatter(logging.Formatter(
    "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
))

# 루트 로거 + uvicorn 로거에 핸들러 연결
for _name in ("", "uvicorn", "uvicorn.access", "uvicorn.error"):
    _log = logging.getLogger(_name)
    _log.addHandler(_handler)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("서버 시작 — DB 테이블 준비 완료")
    yield
    logger.info("서버 종료")


app = FastAPI(title="Saju Rebalancer API", lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled 500: %s %s → %s: %s",
        request.method, request.url.path,
        type(exc).__name__, exc,
        exc_info=True,
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(saju.router)
app.include_router(portfolio.router)
app.include_router(rebalance.router)
app.include_router(report.router)
app.include_router(compatibility.router)


@app.get("/health")
def health():
    return {"status": "ok"}
