"""API schemas for availability endpoints."""
import uuid
from datetime import datetime
from pydantic import BaseModel

from app.schemas.availability_slot import AvailabilitySlotRead


class BookingSlot(BaseModel):
    id: uuid.UUID
    pickup_when: datetime

    class Config:
        from_attributes = True


class AvailabilityResponse(BaseModel):
    slots: list[AvailabilitySlotRead]
    bookings: list[BookingSlot]
