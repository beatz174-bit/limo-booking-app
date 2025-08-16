from sqlalchemy import Float, String, Boolean
from app.db.database import Base
from sqlalchemy.orm import Mapped, mapped_column

class AdminConfig(Base): 
    __tablename__ = "admin_config"

    id: Mapped[int] = mapped_column(primary_key=True)
    allow_public_registration: Mapped[bool] = mapped_column(Boolean, nullable=False)
    google_maps_api_key: Mapped[str] = mapped_column(String, nullable=False)
    flagfall: Mapped[float] = mapped_column(Float, nullable=False)
    per_km_rate: Mapped[float] = mapped_column(Float, nullable=False)
    per_min_rate: Mapped[float] = mapped_column(Float, nullable=False)

