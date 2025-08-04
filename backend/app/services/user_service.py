# app/services/user_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
from sqlalchemy import select

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserRead
from app.core.security import hash_password


def create_user(db: Session, data: UserCreate) -> UserRead:
    stmt = select(User).where(User.email == data.email)
    existing: Optional[User] = db.scalars(stmt).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email exists"
        )
    user = User(
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role="rider",
        is_approved=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)

def get_user(db: Session, user_id: int) -> UserRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserRead.model_validate(user)

def list_users(db: Session, skip: int = 0, limit: int = 100) -> list[UserRead]:
    stmt = select(User).offset(skip).limit(limit)
    users = db.scalars(stmt).all()
    return [UserRead.model_validate(u) for u in users]

def update_user(db: Session, user_id: int, data: UserUpdate) -> UserRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)

def delete_user(db: Session, user_id: int):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()