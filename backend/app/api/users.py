# app/api/users.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
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
    user = await create_user(db, data)
    return user

@router.get("", response_model=List[UserRead])
async def api_list_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = await list_users(db)
    return users

@router.get("/{user_id}", response_model=UserRead)
async def api_get_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = await get_user(db, user_id)
    return user

@router.patch("/{user_id}", response_model=UserRead)
async def api_update_user(user_id: int, data: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = await update_user(db, user_id, data)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await delete_user(db, user_id)
