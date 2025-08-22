"""Authentication API endpoints."""

import logging

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.auth import LoginRequest, OAuth2Token, RegisterRequest
from app.services.auth_service import authenticate_user, generate_token, register_user

logger = logging.getLogger(__name__)

# Router managing login, token and registration endpoints
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Validate user credentials and return an access token."""
    logger.info("login attempt", extra={"email": data.email})
    return await authenticate_user(db, data)


@router.post("/token", response_model=OAuth2Token, tags=["auth"])
async def token(
    form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    """Exchange a username/password for an OAuth2 token."""
    logger.info("token exchange", extra={"user": form.username})
    return await generate_token(form, db)


@router.post("/register")
async def endpoint_register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user account."""
    logger.info("registering user", extra={"email": data.email})
    return await register_user(db, data)
