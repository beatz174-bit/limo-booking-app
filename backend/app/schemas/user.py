"""User-related Pydantic models."""

from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    """Shared fields for user representations."""
    email: EmailStr
    full_name: str
    default_pickup_address: Optional[str] = None


class UserCreate(UserBase):
    """Fields required when creating a user."""
    password: str


class UserRead(UserBase):
    """User data returned from the API."""
    id: int
    # role: str
    # is_approved: bool
    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    """Optional fields for updating a user."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    default_pickup_address: Optional[str] = None
    model_config = ConfigDict(from_attributes=True, extra="ignore")