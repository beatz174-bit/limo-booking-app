"""Pydantic schemas for Notification."""

import uuid
from datetime import datetime
from typing import Any, Dict

from pydantic import BaseModel

from app.models.notification import NotificationRole, NotificationType


class NotificationBase(BaseModel):
    booking_id: uuid.UUID | None = None
    type: NotificationType
    to_role: NotificationRole
    payload: Dict[str, Any] = {}


class NotificationCreate(NotificationBase):
    pass


class NotificationRead(NotificationBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
