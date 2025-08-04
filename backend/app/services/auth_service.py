# app/services/auth_service.py
from sqlalchemy.orm import Session, Query
from fastapi import HTTPException, status
from typing import Optional, Any
from sqlalchemy import select
from sqlalchemy.sql import Select

from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, LoginResponse
from app.schemas.user import UserRead
from app.models.user import User
from app.core.security import hash_password, verify_password, create_jwt_token


def authenticate_user(
    db: Session,
    data: LoginRequest
) -> LoginResponse:
    # Explicit generic annotation helps Pylance infer types:
    query: Query[User] = db.query(User) # type: ignore[reportUnknownMemberType]

    # And this narrows `.filter(...)` and `.first()` to Optional[User]
    user: Optional[User] = (
        query.filter(User.email == data.email) # type: ignore
             .first()
    )

    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved yet",
        )

    return LoginResponse(
        token=create_jwt_token(user.id, user.role),
        role=user.role,
        full_name=user.full_name,
        email=user.email,
        id=user.id,
        is_approved=user.is_approved,
    )

def register_user( db: Session, data: RegisterRequest ) -> UserRead:
    stmt: Select = select(User).where(User.email == data.email) # type: ignore
    result: Any = db.scalars(stmt) # type: ignore
    existing: Optional[User] = result.first() # type: ignore

    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Email already registered")

    hashed = hash_password(data.password)
    user = User(
        email=data.email,
        full_name=data.full_name,
        hash_password=hashed,
        role="rider",
        is_approved=False
    )
    db.add(user) # type: ignore
    db.commit()
    db.refresh(user) # type: ignore

    return UserRead.model_validate(user)

def login_user(db: Session, data: LoginRequest) -> TokenResponse:
    stmt: Select = select(User).where(User.email == data.email) # type: ignore
    result: Any = db.execute(stmt) # type: ignore
    user: Optional[User] = result.scalars().one_or_none() # type: ignore

    if user is None or not verify_password(data.password, user.hashed_password): # type: ignore
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_approved: # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not approved yet",
        )

    token: str = create_jwt_token(user_id=user.id, role=user.role) # type: ignore
    return TokenResponse(token=token)