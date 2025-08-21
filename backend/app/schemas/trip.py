"""Pydantic schemas for Trip."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TripBase(BaseModel):
    booking_id: uuid.UUID
    started_at: datetime
    ended_at: Optional[datetime] = None
    distance_meters: int = 0
    duration_seconds: int = 0


class TripCreate(TripBase):
    pass


class TripRead(TripBase):
    id: uuid.UUID

    class Config:
        from_attributes = True
