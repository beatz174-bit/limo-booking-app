"""Pydantic schemas for the new User model."""

import uuid
from datetime import datetime
from typing import Optional

from app.models.user_v2 import UserRole
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.CUSTOMER
    phone: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
