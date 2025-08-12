# app/schemas/booking.py
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

Status = Literal["pending", "accepted", "completed", "cancelled"]

class BookingCreate(BaseModel):
    pickup_location: str
    destination: str
    ride_time: datetime

    model_config = {
        "from_attributes": True
    }

class BookingRead(BaseModel):
    id: int
    user_id: int
    pickup_location: str
    destination: str = Field(alias="dropoff_location")
    ride_time: datetime = Field(alias="time")
    status: Status
    created_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,   # ensures aliases are used when serializing
    )

class BookingUpdate(BaseModel):
    status: Status

