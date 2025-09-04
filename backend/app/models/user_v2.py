import enum
import uuid
from datetime import datetime
from typing import Optional

from app.db.database import Base
from sqlalchemy import UUID, DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func


class UserRole(str, enum.Enum):
    """Roles a user can have within the system."""

    DRIVER = "DRIVER"
    CUSTOMER = "CUSTOMER"


class User(Base):
    """Revised user model using UUID primary key and explicit role."""

    __tablename__ = "users_v2"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String)
    hashed_password: Mapped[str] = mapped_column(Text, name="password_hash")
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.CUSTOMER)
    fcm_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    stripe_payment_method_id: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
