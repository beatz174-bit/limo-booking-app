# app/services/auth_service.py
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import Optional, Any
from sqlalchemy import select
from sqlalchemy.sql import Select

from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, LoginResponse
from app.schemas.user import UserCreate
from app.models.user import User
from app.core.security import verify_password, create_jwt_token


async def authenticate_user(
    db: AsyncSession,
    data: LoginRequest
) -> LoginResponse:
    stmt = select(User).filter(User.email == data.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # if not user.is_approved:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="User not approved yet",
    #     )

    return LoginResponse(
        token=create_jwt_token(user.id, user.role),
        role=user.role,
        full_name=user.full_name,
        email=user.email,
        id=user.id,
        is_approved=user.is_approved,
    )

async def register_user( db: AsyncSession, data: RegisterRequest ) -> UserCreate:
    stmt = select(User).where(User.email == data.email) # type: ignore
    existing = (await db.execute(stmt)).scalar_one_or_none()
 
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Email already registered")

    # hashed = hash_password(data.password)
    user = UserCreate(
        email=data.email,
        full_name=data.full_name,
        password=data.password,
    )
    db.add(user) # type: ignore
    await db.commit()
    db.refresh(user) # type: ignore

    return UserCreate.model_validate(user)

def login_user(db: Session, data: LoginRequest) -> TokenResponse:
    stmt: Select = select(User).where(User.email == data.email) # type: ignore
    result: Any = db.execute(stmt) # type: ignore
    user: Optional[User] = result.scalars().one_or_none() # type: ignore

    if user is None or not verify_password(data.password, user.hashed_password): # type: ignore
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token: str = create_jwt_token(user_id=user.id, role=user.role) # type: ignore
    return TokenResponse(token=token)