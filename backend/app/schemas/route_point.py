"""Pydantic schemas for RoutePoint."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RoutePointBase(BaseModel):
    booking_id: uuid.UUID
    ts: datetime
    lat: float
    lng: float
    speed: Optional[float] = None


class RoutePointCreate(RoutePointBase):
    pass


class RoutePointRead(RoutePointBase):
    id: uuid.UUID

    class Config:
        from_attributes = True
