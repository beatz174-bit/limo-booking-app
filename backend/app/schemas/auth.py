# app/schemas/auth.py
from pydantic import BaseModel, EmailStr
from typing import ClassVar, Dict, Any

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    role: str
    full_name: str
    email: EmailStr
    id: int
    is_approved: bool

    class Config:
        json_schema_extra: ClassVar[Dict[str, Any]] = {
            "example": {
                "token": "your.jwt.token",
                "role": "driver",
                "full_name": "Naomi Bertrand",
                "email": "naomi@example.com",
                "id": 123,
                "is_approved": True
            }
        }

class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class TokenResponse(BaseModel):
    token: str

