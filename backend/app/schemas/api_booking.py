"""API schemas for booking creation."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from app.models.booking import BookingStatus
from pydantic import BaseModel, field_validator


class Location(BaseModel):
    address: str
    lat: float
    lng: float


class BookingCreateRequest(BaseModel):
    pickup_when: datetime
    pickup: Location
    dropoff: Location
    passengers: int
    notes: Optional[str] = None

    @field_validator("pickup_when")
    @classmethod
    def ensure_pickup_when_has_tz(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("pickup_when must include timezone information")
        return value.astimezone(timezone.utc)


class BookingPublic(BaseModel):
    id: uuid.UUID
    status: BookingStatus
    public_code: str
    estimated_price_cents: int
    deposit_required_cents: int

    class Config:
        from_attributes = True


class StripePaymentMethod(BaseModel):
    brand: str
    last4: str


class BookingCreateResponse(BaseModel):
    booking: BookingPublic


class BookingStatusResponse(BaseModel):
    status: BookingStatus
    leave_at: Optional[datetime] = None
    final_price_cents: Optional[int] = None
