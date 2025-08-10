from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.schemas.auth import RegisterRequest, LoginRequest, LoginResponse
from app.schemas.user import UserRead  # <- your output schema
from app.models.user import User       # <- ORM model
from app.core.security import verify_password, create_jwt_token, hash_password

async def authenticate_user(db: AsyncSession, data: LoginRequest) -> LoginResponse:
    stmt = select(User).where(User.email == data.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return LoginResponse(
        token=create_jwt_token(user.id),
        full_name=user.full_name,
        email=user.email,
        id=user.id,
    )

async def register_user(db: AsyncSession, data: RegisterRequest) -> UserRead:
    # 1) unique email check
    existing = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # 2) build ORM entity (NOT a Pydantic schema)
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
    )

    # 3) persist
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # 4) return a response schema (Pydantic v2)
    return UserRead.model_validate(user, from_attributes=True)
    # If you're on Pydantic v1:
    # return UserRead.from_orm(user)

# If you keep a sync helper, make sure its token signature matches authenticate_user
# or just delete it if unused.
