"""Shared dependency functions for FastAPI routes."""

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from typing import AsyncGenerator, Union
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.db.database import AsyncSessionLocal  # or reuse get_db()
from app.core.config import get_settings

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
    request: Request = None, # type: ignore
    token: Union[str, None] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts OAuth2 Bearer header via Swagger/clients, or falls back to an HttpOnly cookie.
    """
    if not token and request is not None: # type: ignore
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])

        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    stmt = select(User).filter(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user

