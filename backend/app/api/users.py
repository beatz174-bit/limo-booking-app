"""User management API routes, including phone support."""

import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user_v2 import User
from app.schemas.api_booking import StripePaymentMethod, StripeSetupIntent
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.user_service import (
    create_setup_intent_for_user,
    create_user,
    delete_user,
    get_payment_method,
    get_user,
    list_users,
    remove_payment_method,
    save_payment_method,
    update_user,
)

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


class PaymentMethodPayload(BaseModel):
    payment_method_id: str


@router.post("/me/payment-method", response_model=StripeSetupIntent)
async def api_create_payment_method(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a SetupIntent client secret for the current user."""
    logger.info(
        "api_create_payment_method:start",
        extra={"user_id": current_user.id, "payment_method_id": None},
    )

    client_secret = await create_setup_intent_for_user(db, current_user)

    logger.info(
        "api_create_payment_method:success",
        extra={"user_id": current_user.id, "payment_method_id": None},
    )
    return StripeSetupIntent(setup_intent_client_secret=client_secret)


@router.put("/me/payment-method", response_model=UserRead)
async def api_save_payment_method(
    data: PaymentMethodPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Persist a confirmed payment method to the user's profile."""
    logger.info(
        "api_save_payment_method:start",
        extra={
            "user_id": current_user.id,
            "payment_method_id": data.payment_method_id,
        },
    )

    user = await save_payment_method(db, current_user, data.payment_method_id)

    logger.info(
        "api_save_payment_method:success",
        extra={
            "user_id": current_user.id,
            "payment_method_id": data.payment_method_id,
        },
    )
    return user


@router.delete("/me/payment-method", status_code=status.HTTP_204_NO_CONTENT)
async def api_remove_payment_method(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove the saved payment method for the current user."""

    await remove_payment_method(db, current_user)


@router.get("/me/payment-method", response_model=StripePaymentMethod)
async def api_get_payment_method(current_user: User = Depends(get_current_user)):
    return await get_payment_method(current_user)
