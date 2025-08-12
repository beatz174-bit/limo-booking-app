# app/schemas/users.py
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    # role: str
    # is_approved: bool
    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    model_config = ConfigDict(from_attributes=True, extra="ignore")