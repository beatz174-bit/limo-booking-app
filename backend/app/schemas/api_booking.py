"""API schemas for booking creation."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
from app.models.booking import BookingStatus

class Location(BaseModel):
    address: str
    lat: float
    lng: float

class CustomerInfo(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

class BookingCreateRequest(BaseModel):
    customer: CustomerInfo
    pickup_when: datetime
    pickup: Location
    dropoff: Location
    passengers: int
    notes: Optional[str] = None

class BookingPublic(BaseModel):
    id: uuid.UUID
    status: BookingStatus
    public_code: str
    estimated_price_cents: int
    deposit_required_cents: int

    class Config:
        from_attributes = True

class StripeSetupIntent(BaseModel):
    setup_intent_client_secret: str = Field(..., alias="setup_intent_client_secret")

class BookingCreateResponse(BaseModel):
    booking: BookingPublic
    stripe: StripeSetupIntent


class BookingStatusResponse(BaseModel):
    status: BookingStatus
    leave_at: Optional[datetime] = None
    final_price_cents: Optional[int] = None
