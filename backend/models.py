from datetime import datetime, date
from sqlalchemy import Date, String, Text, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class SajuCache(Base):
    __tablename__ = "saju_cache"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    birth_hour: Mapped[str | None] = mapped_column(String(10), nullable=True)  # 시진 (e.g. 자시, 축시)
    gender: Mapped[str] = mapped_column(String(5), nullable=False)  # 남 / 여
    raw_saju_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string
    gemini_reading: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("birth_date", "birth_hour", "gender", name="uq_saju_key"),
    )
