"""Pydantic schemas for the new Booking model."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.booking_v2 import BookingStatus


class BookingBase(BaseModel):
    customer_id: uuid.UUID
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    dropoff_address: str
    dropoff_lat: float
    dropoff_lng: float
    pickup_when: datetime
    notes: Optional[str] = None
    passengers: int
    estimated_price_cents: int
    final_price_cents: Optional[int] = None
    deposit_required_cents: int
    deposit_payment_intent_id: Optional[str] = None
    final_payment_intent_id: Optional[str] = None


class BookingCreate(BookingBase):
    public_code: str


class BookingRead(BookingBase):
    id: uuid.UUID
    public_code: str
    status: BookingStatus
    created_at: datetime
    updated_at: datetime
    leave_at: Optional[datetime] = None

    class Config:
        from_attributes = True
