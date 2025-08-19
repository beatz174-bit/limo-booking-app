"""User management API routes."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.services.user_service import (
    create_user, get_user, list_users, update_user, delete_user
)
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.dependencies import get_db, get_current_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def api_create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user in the system."""
    user = await create_user(db, data)
    return user


@router.get("", response_model=List[UserRead])
async def api_list_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return all existing users."""
    users = await list_users(db)
    return users


@router.get("/me", response_model=UserRead)
async def api_get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
async def api_update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow the current user to update their profile."""
    user = await update_user(db, current_user.id, data)
    return user


@router.get("/{user_id}", response_model=UserRead)
async def api_get_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch a single user by ID."""
    user = await get_user(db, user_id)
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def api_update_user(user_id: int, data: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update selected fields of a user."""
    user = await update_user(db, user_id, data)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove a user permanently."""
    await delete_user(db, user_id)
