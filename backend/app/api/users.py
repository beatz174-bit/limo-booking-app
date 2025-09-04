"""User management API routes."""

import logging
import uuid
from typing import List

from app.dependencies import get_current_user, get_db
from app.models.user_v2 import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.user_service import (
    create_user,
    delete_user,
    get_user,
    list_users,
    update_user,
)
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def api_create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user in the system, optionally capturing a phone number."""
    logger.info("creating user", extra={"email": data.email})
    user = await create_user(db, data)
    return user


@router.get("", response_model=List[UserRead])
async def api_list_users(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Return all existing users."""
    logger.info("listing users", extra={"user_id": current_user.id})
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
    """Allow the current user to update their profile, including phone."""
    user = await update_user(db, current_user.id, data)
    return user


@router.get("/{user_id}", response_model=UserRead)
async def api_get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single user by ID."""
    logger.info(
        "retrieving user",
        extra={"user_id": current_user.id, "target_user_id": user_id},
    )
    user = await get_user(db, user_id)
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def api_update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update selected fields of a user, including phone."""
    logger.info(
        "updating user",
        extra={"user_id": current_user.id, "target_user_id": user_id},
    )
    user = await update_user(db, user_id, data)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a user permanently."""
    logger.info(
        "deleting user",
        extra={"user_id": current_user.id, "target_user_id": user_id},
    )
    await delete_user(db, user_id)
