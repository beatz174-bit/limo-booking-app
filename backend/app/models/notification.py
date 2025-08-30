import enum
import uuid
from datetime import datetime
from typing import Any, Dict

from sqlalchemy import JSON, UUID, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class NotificationType(str, enum.Enum):
    NEW_BOOKING = "NEW_BOOKING"
    CONFIRMATION = "CONFIRMATION"
    LEAVE_NOW = "LEAVE_NOW"
    ON_THE_WAY = "ON_THE_WAY"
    ARRIVED_PICKUP = "ARRIVED_PICKUP"
    STARTED = "STARTED"
    ARRIVED_DROPOFF = "ARRIVED_DROPOFF"
    COMPLETED = "COMPLETED"


class NotificationRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    DRIVER = "DRIVER"


class Notification(Base):
    """Notification records for audit or debugging."""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings_v2.id"), nullable=True
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False
    )
    to_role: Mapped[NotificationRole] = mapped_column(
        Enum(NotificationRole), nullable=False
    )
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
