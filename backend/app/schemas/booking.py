# app/schemas/booking.py
from datetime import datetime
from typing import Literal
from pydantic import BaseModel

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
    destination: str
    ride_time: datetime
    status: Status
    created_at: datetime

    model_config= {
        "from_attributes": True
    }

class BookingUpdate(BaseModel):
    status: Status

