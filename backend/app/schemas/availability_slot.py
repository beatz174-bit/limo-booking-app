"""Pydantic schemas for availability slots."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AvailabilitySlotBase(BaseModel):
    start_dt: datetime
    end_dt: datetime
    reason: Optional[str] = None


class AvailabilitySlotCreate(AvailabilitySlotBase):
    pass


class AvailabilitySlotRead(AvailabilitySlotBase):
    id: int

    class Config:
        from_attributes = True
