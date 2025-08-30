"""Administrative configuration stored in the database."""

import uuid

from sqlalchemy import UUID, Boolean, CheckConstraint, Float, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AdminConfig(Base):
    """Singleton table holding pricing and mode settings."""

    __tablename__ = "admin_config"

    # Force a single row using a constant primary key
    id: Mapped[int] = mapped_column(primary_key=True, server_default=text("1"))
    # Whether bookings require approval
    account_mode: Mapped[bool] = mapped_column(Boolean, nullable=False)
    # Base fare applied to every trip
    flagfall: Mapped[float] = mapped_column(Float, nullable=False)
    # Cost charged per kilometer
    per_km_rate: Mapped[float] = mapped_column(Float, nullable=False)
    # Cost charged per minute
    per_minute_rate: Mapped[float] = mapped_column(Float, nullable=False)
    admin_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users_v2.id"), nullable=True
    )

    __table_args__ = (CheckConstraint("id = 1", name="settings_singleton_id_check"),)
