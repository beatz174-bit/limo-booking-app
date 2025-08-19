"""Authentication API endpoints."""

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import LoginRequest, RegisterRequest, OAuth2Token
from app.services.auth_service import authenticate_user, register_user, generate_token
from app.dependencies import get_db

# Router managing login, token and registration endpoints
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Validate user credentials and return an access token."""
    return await authenticate_user(db, data)

@router.post("/token", response_model=OAuth2Token, tags=["auth"])
async def token(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """Exchange a username/password for an OAuth2 token."""
    return await generate_token(form, db)


@router.post("/register")
async def endpoint_register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user account."""
    return await register_user(db, data)
