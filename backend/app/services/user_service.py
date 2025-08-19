"""Service helpers for user CRUD operations."""
"""Service helpers for user CRUD operations."""

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import Optional
from sqlalchemy import select

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserRead
from app.core.security import hash_password


class UserService:
    """Simple wrapper around the DB session."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session


async def create_user(db: AsyncSession, data: UserCreate) -> UserRead:
    """Create a user ensuring the email is unique."""
    result = await db.execute(select(User).where(User.email == data.email))
    existing: Optional[User] = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email exists",
        )
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        default_pickup_address=data.default_pickup_address,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


async def get_user(db: AsyncSession, user_id: int) -> UserRead:
    """Fetch a user by primary key."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserRead.model_validate(user)


async def list_users(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[UserRead]:
    """Return a paginated list of users."""
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return [UserRead.model_validate(u) for u in users]


async def update_user(db: AsyncSession, user_id: int, data: UserUpdate) -> UserRead:
    """Update user fields, hashing password if supplied."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)

    # Handle password specially; everything else set directly
    if "password" in update_data:
        user.hashed_password = hash_password(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


async def delete_user(db: AsyncSession, user_id: int):
    """Remove a user record from the database."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await db.delete(user)
    await db.commit()
