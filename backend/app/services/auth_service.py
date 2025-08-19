"""Business logic for authentication and user registration."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.schemas.auth import RegisterRequest, LoginRequest, LoginResponse
from app.schemas.user import UserRead  # <- your output schema
from app.models.user import User       # <- ORM model
from app.core.security import verify_password, create_jwt_token, hash_password
from app.dependencies import get_db


async def authenticate_user(db: AsyncSession, data: LoginRequest) -> LoginResponse:
    """Verify credentials and return a JWT token on success."""
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
    """Create a new user after checking email uniqueness."""
    existing = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Build ORM entity (not a Pydantic schema)
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
    )

    # Persist to database
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Return a response schema
    return UserRead.model_validate(user, from_attributes=True)
    # If you're on Pydantic v1:
    # return UserRead.from_orm(user)


# If you keep a sync helper, make sure its token signature matches authenticate_user
# or just delete it if unused.


async def generate_token(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """OAuth2 password grant endpoint for Swagger's Authorize button."""
    # Reuse existing authenticate_user (expects email+password)
    # OAuth2PasswordRequestForm provides 'username' — treat as email.
    res = await authenticate_user(db, LoginRequest(email=form.username, password=form.password))
    if not res or not getattr(res, "token", None):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"access_token": res.token, "token_type": "bearer"}