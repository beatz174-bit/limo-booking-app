import uuid
from datetime import datetime, timedelta, timezone

import pytest
import stripe
from app.core.security import hash_password
from app.models.booking import Booking, BookingStatus
from app.models.user_v2 import User, UserRole
from app.services import booking_service
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio


async def test_confirm_booking_handles_stripe_error(
    async_session: AsyncSession, mocker
):
    await async_session.execute(text("DELETE FROM availability_slots"))
    await async_session.commit()

    user = User(
        email="test2@example.com",
        full_name="Test",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
    )
    async_session.add(user)
    await async_session.flush()

    booking = Booking(
        public_code=uuid.uuid4().hex[:6].upper(),
        customer_id=user.id,
        pickup_address="A",
        pickup_lat=0.0,
        pickup_lng=0.0,
        dropoff_address="B",
        dropoff_lat=1.0,
        dropoff_lng=1.0,
        pickup_when=datetime.now(timezone.utc) + timedelta(days=30),
        notes=None,
        passengers=1,
        estimated_price_cents=1000,
        deposit_required_cents=500,
        status=BookingStatus.PENDING,
    )
    async_session.add(booking)
    await async_session.commit()

    mocker.patch(
        "app.services.stripe_client.charge_deposit",
        side_effect=stripe.error.StripeError("fail"),
    )

    with pytest.raises(HTTPException) as excinfo:
        await booking_service.confirm_booking(async_session, booking.id)

    assert excinfo.value.status_code == 400
    await async_session.refresh(booking)
    assert booking.status is BookingStatus.PENDING
    assert booking.deposit_payment_intent_id is None


async def test_confirm_booking_handles_card_error(async_session: AsyncSession, mocker):
    await async_session.execute(text("DELETE FROM availability_slots"))
    await async_session.commit()

    user = User(
        email="test@example.com",
        full_name="Test",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
    )
    async_session.add(user)
    await async_session.flush()

    booking = Booking(
        public_code=uuid.uuid4().hex[:6].upper(),
        customer_id=user.id,
        pickup_address="A",
        pickup_lat=0.0,
        pickup_lng=0.0,
        dropoff_address="B",
        dropoff_lat=1.0,
        dropoff_lng=1.0,
        pickup_when=datetime.now(timezone.utc) + timedelta(days=30),
        notes=None,
        passengers=1,
        estimated_price_cents=1000,
        deposit_required_cents=500,
        status=BookingStatus.PENDING,
    )
    async_session.add(booking)
    await async_session.commit()

    card_error = stripe.error.CardError(
        "Card declined",
        param=None,
        code="card_declined",
        json_body={"error": {"message": "Card declined"}},
    )
    mocker.patch(
        "app.services.stripe_client.charge_deposit",
        side_effect=card_error,
    )

    with pytest.raises(HTTPException) as excinfo:
        await booking_service.confirm_booking(async_session, booking.id)

    assert excinfo.value.status_code == 402
    assert excinfo.value.detail == "Card declined"
    await async_session.refresh(booking)
    assert booking.status is BookingStatus.PENDING
    assert booking.deposit_payment_intent_id is None
