"""SQLAlchemy model for ride bookings."""

from sqlalchemy import Integer, Float, String, ForeignKey, Text, DateTime
from app.db.database import Base
from decimal import Decimal
from typing import Dict, Any, Literal
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime


Status = Literal["pending", "accepted", "completed", "cancelled"]


class Booking(Base):
    """Represents a single booking made by a user."""

    __tablename__ = "bookings"
    # Unique identifier for the booking
    id: Mapped[int] = mapped_column(primary_key=True)
    # Reference to the owning user
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    # Starting point of the trip
    pickup_location: Mapped[str] = mapped_column(String, nullable=False)
    # Destination of the trip
    dropoff_location: Mapped[str] = mapped_column(String, nullable=False)
    # When the ride is scheduled
    time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # Current status of the booking
    status: Mapped[Status] = mapped_column(Text, default="pending")
    # Calculated price of the ride
    price: Mapped[Decimal] = mapped_column(Float, nullable=False)

    def as_dict(self) -> Dict[str, Any]:
        """Return a serialized representation of the booking."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "pickup_location": self.pickup_location,
            "dropoff_location": self.dropoff_location,
            "status": self.status,
            "time": self.time,
            "price": self.price,
            # add any other fields you need to expose
        }