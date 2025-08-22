"""Database model definitions for application users."""

# from sqlalchemy import Boolean
from typing import Literal, Union

from sqlalchemy import Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base

Status = Literal["pending", "accepted", "completed", "cancelled"]


class User(Base):
    """ORM model for a registered user."""

    __tablename__ = "users"

    # Primary key for the user record
    id: Mapped[int] = mapped_column(primary_key=True)
    # User's unique email address
    email: Mapped[str] = mapped_column(Text, unique=True, index=True)
    # Full name as entered during signup
    full_name: Mapped[str] = mapped_column(Text)
    # Password hashed with chosen algorithm
    hashed_password: Mapped[str] = mapped_column(Text, name="password_hash")
    # Optional default pickup address for quick bookings
    default_pickup_address: Mapped[Union[str, None]] = mapped_column(
        Text, nullable=True, default=None
    )
    # Firebase Cloud Messaging token for push notifications
    fcm_token: Mapped[Union[str, None]] = mapped_column(
        Text, nullable=True, default=None
    )
    # is_approved:     Mapped[bool]   = mapped_column(Boolean, default=False)
    # role:            Mapped[Status] = mapped_column(Text, default="pending")
