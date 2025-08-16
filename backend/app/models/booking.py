from sqlalchemy import Integer, Float, String, ForeignKey, Text, DateTime
from app.db.database import Base
from decimal import Decimal
from typing import Dict, Any, Literal
from sqlalchemy.orm import Mapped, mapped_column
from  datetime import datetime


Status = Literal["pending", "accepted", "completed", "cancelled"]

class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    pickup_location: Mapped[str] = mapped_column(String, nullable=False)
    dropoff_location: Mapped[str] = mapped_column(String, nullable=False)
    time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[Status] = mapped_column(Text, default="pending")
    price: Mapped[Decimal] = mapped_column(Float, nullable=False) 

    def as_dict(self) -> Dict[str, Any]:
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