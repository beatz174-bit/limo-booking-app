import uuid
from datetime import datetime, timedelta, timezone

import pytest
import stripe
from _pytest.monkeypatch import MonkeyPatch
from httpx import AsyncClient
from sqlalchemy import text

from app.core.security import hash_password
from app.models.booking import Booking, BookingStatus
from app.models.user_v2 import User, UserRole

pytestmark = pytest.mark.asyncio


async def _create_booking(async_session) -> Booking:
    await async_session.execute(text("DELETE FROM availability_slots"))
    await async_session.commit()
    user = User(
        email=f"c{uuid.uuid4()}@example.com",
        full_name="C",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
        stripe_payment_method_id="pm_test",
    )
    async_session.add(user)
    await async_session.flush()
    booking = Booking(
        public_code=str(uuid.uuid4())[:6],
        customer_id=user.id,
        pickup_address="A",
        pickup_lat=-27.0,
        pickup_lng=153.0,
        dropoff_address="B",
        dropoff_lat=-27.1,
        dropoff_lng=153.1,
        pickup_when=datetime.now(timezone.utc) + timedelta(days=2),
        passengers=1,
        estimated_price_cents=1000,
        deposit_required_cents=500,
        status=BookingStatus.PENDING,
    )
    async_session.add(booking)
    await async_session.commit()
    await async_session.refresh(booking)
    return booking


async def test_retry_deposit_creates_new_intent(
    async_session, client: AsyncClient, monkeypatch: MonkeyPatch, admin_headers
):
    booking = await _create_booking(async_session)

    def fail(_amount, _booking_id, **kwargs):
        raise stripe.error.StripeError("fail")

    monkeypatch.setattr("app.services.stripe_client.charge_deposit", fail)

    # initial confirm fails
    res = await client.post(
        f"/api/v1/driver/bookings/{booking.id}/confirm", headers=admin_headers
    )
    assert res.status_code == 400
    await async_session.refresh(booking)
    assert booking.status is BookingStatus.DEPOSIT_FAILED

    class FakePI:
        id = "pi_retry"

    monkeypatch.setattr(
        "app.services.stripe_client.charge_deposit",
        lambda amount, booking_id, **kwargs: FakePI(),
    )

    async def fake_route(*args, **kwargs):
        return (0, 0)

    monkeypatch.setattr("app.services.routing.estimate_route", fake_route)

    res = await client.post(
        f"/api/v1/driver/bookings/{booking.id}/retry-deposit", headers=admin_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "DRIVER_CONFIRMED"
    await async_session.refresh(booking)
    assert booking.status is BookingStatus.DRIVER_CONFIRMED
    assert booking.deposit_payment_intent_id == "pi_retry"
