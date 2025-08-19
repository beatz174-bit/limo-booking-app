from sqlalchemy import CheckConstraint, Float, String, Boolean, text
from app.db.database import Base
from sqlalchemy.orm import Mapped, mapped_column

class AdminConfig(Base):
    __tablename__ = "admin_config"

    id: Mapped[int] = mapped_column(primary_key=True, server_default=text("1"))
    account_mode: Mapped[bool] = mapped_column(Boolean, nullable=False)
    flagfall: Mapped[float] = mapped_column(Float, nullable=False)
    per_km_rate: Mapped[float] = mapped_column(Float, nullable=False)
    per_minute_rate: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        CheckConstraint("id = 1", name="settings_singleton_id_check"),
    )
