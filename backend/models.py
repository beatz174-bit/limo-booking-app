# models.py
from sqlalchemy import Column, Integer, String, Boolean, Float
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(String, default="customer")  # 'customer' or 'driver'
    is_approved = Column(Boolean, default=False)

class AdminConfig(Base):
    __tablename__ = "admin_config"
    id = Column(Integer, primary_key=True, index=True)
    allow_public_registration = Column(Boolean, default=False)
    google_maps_api_key = Column(String, default="")
    flagfall = Column(Float, default=10.0)
    per_km_rate = Column(Float, default=2.0)
    per_min_rate = Column(Float, default=1.0)