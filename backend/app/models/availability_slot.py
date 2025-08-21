from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AvailabilitySlot(Base):
    """Represents a period when the driver is unavailable."""

    __tablename__ = "availability_slots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    start_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
