# app/api/users.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.services.user_service import (
    create_user, get_user, list_users, update_user, delete_user
)
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.dependencies import get_db, get_current_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])

@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def api_create_user(data: UserCreate, db: Session = Depends(get_db)):
    return create_user(db, data)

@router.get("", response_model=List[UserRead])
def api_list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_users(db)

@router.get("/{user_id}", response_model=UserRead)
def api_get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_user(db, user_id)

@router.patch("/{user_id}", response_model=UserRead)
def api_update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_user(db, user_id, data)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    delete_user(db, user_id)
