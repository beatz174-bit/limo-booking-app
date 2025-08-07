# app/schemas/users.py
# from typing import Optional
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
    ...
#     role: Optional[str]
#     is_approved: Optional[bool]
