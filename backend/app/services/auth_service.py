"""Business logic for authentication and user registration."""

import logging

from app.core.security import create_jwt_token, hash_password, verify_password
from app.dependencies import get_db
from app.models.user_v2 import User as UserV2  # <- ORM model
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest
from app.schemas.user import UserRead  # <- your output schema
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def authenticate_user(db: AsyncSession, data: LoginRequest) -> LoginResponse:
    """Verify credentials and return a JWT token on success."""
    logger.debug("authenticating user", extra={"email": data.email})
    stmt = select(UserV2).where(UserV2.email == data.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user is None or not verify_password(data.password, user.hashed_password):
        logger.warning("invalid login attempt", extra={"email": data.email})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    logger.info("user authenticated", extra={"user_id": user.id})
    return LoginResponse(
        token=create_jwt_token(user.id),
        full_name=user.full_name,
        email=user.email,
        id=user.id,
    )


async def register_user(db: AsyncSession, data: RegisterRequest) -> UserRead:
    """Create a new user after checking email uniqueness."""
    logger.info("registering user", extra={"email": data.email})
    existing = (
        await db.execute(select(UserV2).where(UserV2.email == data.email))
    ).scalar_one_or_none()
    if existing:
        logger.warning("registration failed email exists", extra={"email": data.email})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Build ORM entity (not a Pydantic schema)
    user = UserV2(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
    )

    # Persist to database
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Return a response schema
    return UserRead.model_validate(user, from_attributes=True)
    # If you're on Pydantic v1:
    # return UserRead.from_orm(user)


# If you keep a sync helper, make sure its token signature matches authenticate_user
# or just delete it if unused.


async def generate_token(
    form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    """OAuth2 password grant endpoint for Swagger's Authorize button."""
    # Reuse existing authenticate_user (expects email+password)
    # OAuth2PasswordRequestForm provides 'username' — treat as email.
    logger.debug("token request", extra={"user": form.username})
    res = await authenticate_user(
        db, LoginRequest(email=form.username, password=form.password)
    )
    if not res or not getattr(res, "token", None):
        logger.warning("token generation failed", extra={"user": form.username})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    logger.info("token issued", extra={"user": form.username})
    return {"access_token": res.token, "token_type": "bearer"}
