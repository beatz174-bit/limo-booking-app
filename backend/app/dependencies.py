"""Shared dependency functions for FastAPI routes."""

import uuid
from typing import AsyncGenerator, Union

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.database import AsyncSessionLocal  # or reuse get_db()
from app.models.user_v2 import User

settings = get_settings()
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# IMPORTANT: point to the new token endpoint, and allow missing header (so we can fall back to cookie)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide an `AsyncSession` for FastAPI dependencies.

    Creates a new session per request, within a transaction context.
    """
    async with AsyncSessionLocal() as session:
        async with session.begin():
            yield session
        # await session.commit()


# async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
#     try:
#         payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
async def get_current_user(
    request: Request = None,  # type: ignore
    token: Union[str, None] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Return the authenticated user based on JWT token or cookie."""
    if not token and request is not None:  # type: ignore
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_sub": False},
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    try:
        if isinstance(user_id, int):
            user_uuid = uuid.UUID(int=user_id)
        else:
            user_uuid = uuid.UUID(str(user_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token: bad subject")

    stmt = select(User).filter(User.id == user_uuid)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


get_current_user_v2 = get_current_user
