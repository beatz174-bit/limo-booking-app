# app/schemas/auth.py
"""Pydantic schemas for authentication endpoints."""

from pydantic import BaseModel, EmailStr, ConfigDict


class LoginRequest(BaseModel):
    """User credentials supplied during login."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Response returned on successful login."""
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
    """Payload required to create a new user."""
    email: EmailStr
    full_name: str
    password: str


class TokenResponse(BaseModel):
    """Simple token wrapper."""
    token: str


class OAuth2Token(BaseModel):
    """OAuth2 compliant access token."""
    access_token: str
    token_type: str = "bearer"