from sqlalchemy import Column, Integer, Float, String, ForeignKey, Text
from app.db.database import Base
from decimal import Decimal
from typing import Dict, Any, Literal
from sqlalchemy.orm import Mapped, mapped_column


Status = Literal["pending", "accepted", "completed", "cancelled"]

class Booking(Base): # type: ignore[reportUntypedBaseClass]
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    pickup_location = Column(String)
    dropoff_location = Column(String)
    time = Column(String)
    status: Mapped[Status] = mapped_column(Text, default="pending")
    price: Column[Decimal] = Column(Float, nullable=False) 

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