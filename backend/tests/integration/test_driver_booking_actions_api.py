import pytest
from httpx import AsyncClient
from _pytest.monkeypatch import MonkeyPatch
from datetime import datetime, timedelta, timezone
import uuid

from app.models.user_v2 import User, UserRole
from app.models.booking_v2 import Booking, BookingStatus

pytestmark = pytest.mark.asyncio


async def _create_booking(async_session) -> Booking:
    user = User(email=f"c{uuid.uuid4()}@example.com", name="C", role=UserRole.CUSTOMER)
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


async def test_driver_confirm_booking(async_session, client: AsyncClient, monkeypatch: MonkeyPatch):
    booking = await _create_booking(async_session)

    class FakePI:
        id = "pi_test"

    monkeypatch.setattr("app.services.stripe_client.charge_deposit", lambda amount: FakePI())

    async def fake_route(*args, **kwargs):
        return (0, 0)

    monkeypatch.setattr("app.services.routing.estimate_route", fake_route)

    res = await client.post(f"/api/v1/driver/bookings/{booking.id}/confirm")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "DRIVER_CONFIRMED"

    await async_session.refresh(booking)
    assert booking.status == BookingStatus.DRIVER_CONFIRMED
    assert booking.deposit_payment_intent_id == "pi_test"


async def test_driver_decline_booking(async_session, client: AsyncClient):
    booking = await _create_booking(async_session)

    res = await client.post(f"/api/v1/driver/bookings/{booking.id}/decline")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "DECLINED"

    await async_session.refresh(booking)
    assert booking.status == BookingStatus.DECLINED
