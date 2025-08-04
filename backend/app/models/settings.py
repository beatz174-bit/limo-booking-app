from sqlalchemy import Column, Integer, Float, String, Boolean
from app.db.database import Base


class AdminConfig(Base): # type: ignore[reportUntypedBaseClass]
    __tablename__ = "admin_config"
    id = Column(Integer, primary_key=True, index=True)
    allow_public_registration = Column(Boolean, default=False)
    google_maps_api_key = Column(String, default="")
    flagfall = Column(Float, default=10.0) # type: ignore
    per_km_rate = Column(Float, default=2.0) # type: ignore
    per_min_rate = Column(Float, default=1.0) # type: ignore