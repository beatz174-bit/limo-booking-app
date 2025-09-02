import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import UUID, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base
from app.models.user_v2 import User


class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    DEPOSIT_FAILED = "DEPOSIT_FAILED"
    DRIVER_CONFIRMED = "DRIVER_CONFIRMED"
    DECLINED = "DECLINED"
    ON_THE_WAY = "ON_THE_WAY"
    ARRIVED_PICKUP = "ARRIVED_PICKUP"
    IN_PROGRESS = "IN_PROGRESS"
    ARRIVED_DROPOFF = "ARRIVED_DROPOFF"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Booking(Base):
    """Core booking information."""

    __tablename__ = "bookings_v2"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    public_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus), default=BookingStatus.PENDING
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users_v2.id"), nullable=False
    )
    pickup_address: Mapped[str] = mapped_column(String, nullable=False)
    pickup_lat: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lng: Mapped[float] = mapped_column(Float, nullable=False)
    dropoff_address: Mapped[str] = mapped_column(String, nullable=False)
    dropoff_lat: Mapped[float] = mapped_column(Float, nullable=False)
    dropoff_lng: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_when: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    passengers: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    final_price_cents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    deposit_required_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    deposit_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )
    final_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
