from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from typing import AsyncGenerator
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.db.database import AsyncSessionLocal  # or reuse get_db()
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide an `AsyncSession` for FastAPI dependencies.

    Creates a new session per request, within a transaction context.
    """
    async with AsyncSessionLocal() as session:
        async with session.begin():
            yield session
        await session.commit()

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    # user = db.query(User).filter(User.id == user_id).first()
    stmt = select(User).filter(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    # result = await db.execute(stmt)
    # user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user

