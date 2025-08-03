# models.py
from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey
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

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
#    customer_name = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))
    pickup_location = Column(String)
    dropoff_location = Column(String)
    time = Column(String)
    status = Column(String, default="pending")
    price: Column[float] = Column(Float, nullable=False) 

    def as_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "pickup_location": self.pickup_location,
            "dropoff_location": self.dropoff_location,
            "status": self.status,
            "time": self.time,
            "price": self.price
            # add any other fields you need to expose
        }