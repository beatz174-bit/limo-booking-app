# app/schemas/auth.py
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import ClassVar, Dict, Any

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    full_name: str
    email: EmailStr
    id: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "token": "your.jwt.token",
                "full_name": "Naomi Bertrand",
                "email": "naomi@example.com",
                "id": 123,
            }
        }
    )
class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class TokenResponse(BaseModel):
    token: str

