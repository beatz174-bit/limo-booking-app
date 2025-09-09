import uuid
from datetime import datetime, timedelta, timezone

import pytest
import stripe
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.booking import Booking, BookingStatus
from app.models.user_v2 import User, UserRole
from app.schemas.api_booking import BookingCreateRequest, Location
from app.services import booking_service

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
        stripe_payment_method_id="pm_test",
        stripe_customer_id="cus_test",
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

    err = stripe.error.CardError(
        "fail",
        param=None,
        code=None,
        json_body={"error": {"payment_intent": {"id": "pi_fail"}}},
    )
    mocker.patch(
        "app.services.stripe_client.charge_deposit",
        side_effect=err,
    )

    with pytest.raises(HTTPException) as excinfo:
        await booking_service.confirm_booking(async_session, booking.id)

    assert excinfo.value.status_code == 402
    await async_session.refresh(booking)
    assert booking.status is BookingStatus.PENDING
    assert booking.deposit_payment_intent_id is None


async def test_confirm_booking_handles_card_error(async_session: AsyncSession, mocker):
    await async_session.execute(text("DELETE FROM availability_slots"))
    await async_session.commit()

    user = User(
        email=f"test{uuid.uuid4().hex}@example.com",
        full_name="Test",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
        stripe_payment_method_id="pm_test",
        stripe_customer_id="cus_test",
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


async def test_create_booking_commits_once(async_session: AsyncSession, mocker):
    user = User(
        email=f"test{uuid.uuid4().hex}@example.com",
        full_name="Test",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
        stripe_customer_id="cus_123",
        stripe_payment_method_id="pm_123",
    )
    async_session.add(user)
    await async_session.commit()

    mocker.patch("app.services.routing.estimate_route", return_value=(1.0, 1.0))
    mocker.patch("app.services.notifications._send_fcm", return_value=None)

    commit_spy = mocker.spy(async_session, "commit")

    data = BookingCreateRequest(
        pickup_when=datetime.now(timezone.utc) + timedelta(hours=1),
        pickup=Location(address="A", lat=0.0, lng=0.0),
        dropoff=Location(address="B", lat=1.0, lng=1.0),
        passengers=1,
    )

    booking = await booking_service.create_booking(async_session, data, user)

    assert commit_spy.call_count == 1
    assert booking.id is not None


async def test_create_booking_requires_payment_method(async_session: AsyncSession):
    user = User(
        email=f"test{uuid.uuid4().hex}@example.com",
        full_name="Test",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
    )
    async_session.add(user)
    await async_session.commit()

    data = BookingCreateRequest(
        pickup_when=datetime.now(timezone.utc) + timedelta(hours=1),
        pickup=Location(address="A", lat=0.0, lng=0.0),
        dropoff=Location(address="B", lat=1.0, lng=1.0),
        passengers=1,
    )

    with pytest.raises(ValueError):
        await booking_service.create_booking(async_session, data, user)
