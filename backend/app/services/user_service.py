"""Service helpers for user CRUD operations."""

"""Service helpers for user CRUD operations."""

import logging
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user_v2 import User
from app.schemas.api_booking import StripePaymentMethod
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import stripe_client

logger = logging.getLogger(__name__)


class UserService:
    """Simple wrapper around the DB session."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session


async def create_user(db: AsyncSession, data: UserCreate) -> UserRead:
    """Create a user ensuring the email is unique."""
    logger.info("creating user", extra={"email": data.email})
    result = await db.execute(select(User).where(User.email == data.email))
    existing: Optional[User] = result.scalar_one_or_none()
    if existing:
        logger.warning("email already exists", extra={"email": data.email})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email exists",
        )
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        phone=data.phone,  # Store phone when provided
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserRead.model_validate(user)


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> UserRead:
    """Fetch a user by primary key."""
    logger.info("retrieving user", extra={"user_id": user_id})
    user = await db.get(User, user_id)
    if not user:
        logger.warning("user not found", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserRead.model_validate(user)


async def list_users(
    db: AsyncSession, skip: int = 0, limit: int = 100
) -> list[UserRead]:
    """Return a paginated list of users."""
    logger.info("listing users", extra={"skip": skip, "limit": limit})
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return [UserRead.model_validate(u) for u in users]


async def update_user(
    db: AsyncSession, user_id: uuid.UUID, data: UserUpdate
) -> UserRead:
    """Update user fields, hashing password if supplied."""
    logger.info("updating user", extra={"user_id": user_id})
    user = await db.get(User, user_id)
    if not user:
        logger.warning("user not found", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    # Handle password specially; everything else set directly
    if "password" in update_data:
        user.hashed_password = hash_password(update_data.pop("password"))

    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)

    await db.flush()
    await db.refresh(user)
    return UserRead.model_validate(user)


async def delete_user(db: AsyncSession, user_id: uuid.UUID):
    """Remove a user record from the database."""
    logger.info("deleting user", extra={"user_id": user_id})
    user = await db.get(User, user_id)
    if not user:
        logger.warning("user not found", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    await db.delete(user)
    await db.flush()


async def create_setup_intent_for_user(db: AsyncSession, user: User) -> str:
    """Ensure a customer exists and return a SetupIntent client secret."""

    if user.stripe_customer_id is None:
        stripe_customer = stripe_client.create_customer(
            user.email, user.full_name, user.phone
        )
        user.stripe_customer_id = stripe_customer.id
        await db.flush()

    setup_intent = stripe_client.create_setup_intent(
        user.stripe_customer_id, str(user.id)
    )
    return setup_intent.client_secret


async def save_payment_method(
    db: AsyncSession, user: User, payment_method_id: str
) -> UserRead:
    """Persist a confirmed payment method and set it as default."""

    if user.stripe_customer_id is None:
        stripe_customer = stripe_client.create_customer(
            user.email, user.full_name, user.phone
        )
        user.stripe_customer_id = stripe_customer.id

    logger.info(
        "set_default_payment_method:start",
        extra={"user_id": user.id, "payment_method_id": payment_method_id},
    )
    stripe_client.set_default_payment_method(user.stripe_customer_id, payment_method_id)
    logger.info(
        "set_default_payment_method:success",
        extra={"user_id": user.id, "payment_method_id": payment_method_id},
    )
    user.stripe_payment_method_id = payment_method_id

    logger.info(
        "db_flush:start",
        extra={"user_id": user.id, "payment_method_id": payment_method_id},
    )
    await db.flush()
    logger.info(
        "db_flush:success",
        extra={"user_id": user.id, "payment_method_id": payment_method_id},
    )

    logger.info(
        "db_refresh:start",
        extra={"user_id": user.id, "payment_method_id": payment_method_id},
    )
    await db.refresh(user)
    logger.info(
        "db_refresh:success",
        extra={"user_id": user.id, "payment_method_id": payment_method_id},
    )
    return UserRead.model_validate(user)


async def remove_payment_method(db: AsyncSession, user: User) -> None:
    """Detach and clear the stored payment method for a user."""

    if user.stripe_payment_method_id:
        stripe_client.detach_payment_method(user.stripe_payment_method_id)
        user.stripe_payment_method_id = None
        await db.flush()


async def get_payment_method(user: User) -> StripePaymentMethod:
    """Return stored payment method details for a user."""

    if not user.stripe_payment_method_id:
        raise HTTPException(status_code=404)

    details = stripe_client.get_payment_method_details(user.stripe_payment_method_id)
    return StripePaymentMethod(**details)
