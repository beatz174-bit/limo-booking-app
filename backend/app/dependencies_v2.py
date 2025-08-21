"""Dependencies for v2 models."""
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from typing import Union
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_async_session
from app.models.user_v2 import User
from app.core.config import get_settings
import uuid

settings = get_settings()

oauth2_scheme_v2 = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)

async def get_current_user_v2(
    request: Request,
    token: Union[str, None] = Depends(oauth2_scheme_v2),
    db: AsyncSession = Depends(get_async_session),
) -> User:
    if not token:
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
    try:
        user_uuid = uuid.UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token: bad subject")
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
