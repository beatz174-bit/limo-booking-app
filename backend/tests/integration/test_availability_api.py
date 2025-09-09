import uuid
from datetime import datetime, timedelta, timezone

import pytest
from _pytest.monkeypatch import MonkeyPatch
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.booking import Booking, BookingStatus
from app.models.user_v2 import User, UserRole

pytestmark = pytest.mark.asyncio


async def test_create_and_get_availability(
    async_session, client: AsyncClient, admin_headers
):
    start = datetime.now(timezone.utc) + timedelta(days=3)
    end = start + timedelta(hours=2)
    res = await client.post(
        "/api/v1/availability",
        json={
            "start_dt": start.isoformat(),
            "end_dt": end.isoformat(),
            "reason": "vac",
        },
        headers=admin_headers,
    )
    assert res.status_code == 201
    month = start.strftime("%Y-%m")
    res2 = await client.get(
        f"/api/v1/availability?month={month}", headers=admin_headers
    )
    assert res2.status_code == 200
    data = res2.json()
    assert any(s["reason"] == "vac" for s in data["slots"])


async def test_get_availability_includes_null_reason(
    async_session, client: AsyncClient, admin_headers
):
    start = datetime.now(timezone.utc) + timedelta(days=4)
    end = start + timedelta(hours=2)
    res = await client.post(
        "/api/v1/availability",
        json={
            "start_dt": start.isoformat(),
            "end_dt": end.isoformat(),
        },
        headers=admin_headers,
    )
    assert res.status_code == 201
    month = start.strftime("%Y-%m")
    res2 = await client.get(
        f"/api/v1/availability?month={month}", headers=admin_headers
    )
    assert res2.status_code == 200
    data = res2.json()
    assert any(s["reason"] is None for s in data["slots"])


async def test_non_admin_can_get_availability(client: AsyncClient, user_headers):
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    res = await client.get(f"/api/v1/availability?month={month}", headers=user_headers)
    assert res.status_code == 200


async def test_non_admin_cannot_create_slot(client: AsyncClient, user_headers):
    start = datetime.now(timezone.utc) + timedelta(days=2)
    end = start + timedelta(hours=1)
    res = await client.post(
        "/api/v1/availability",
        json={"start_dt": start.isoformat(), "end_dt": end.isoformat()},
        headers=user_headers,
    )
    assert res.status_code == 403


async def _create_booking(async_session, when: datetime) -> Booking:
    user = User(
        email=f"c{uuid.uuid4()}@example.com",
        full_name="C",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
        stripe_payment_method_id="pm_test",
        stripe_customer_id="cus_test",
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
        pickup_when=when,
        passengers=1,
        estimated_price_cents=1000,
        deposit_required_cents=500,
        status=BookingStatus.PENDING,
    )
    async_session.add(booking)
    await async_session.commit()
    await async_session.refresh(booking)
    return booking


async def test_double_booking_blocked(
    async_session, client: AsyncClient, monkeypatch: MonkeyPatch, admin_headers
):
    when = datetime.now(timezone.utc) + timedelta(days=1)
    booking1 = await _create_booking(async_session, when)
    booking2 = await _create_booking(async_session, when)

    class FakePI:
        id = "pi"

    monkeypatch.setattr(
        "app.services.stripe_client.charge_deposit",
        lambda amount, booking_id, **kwargs: FakePI(),
    )

    async def fake_route(*args, **kwargs):
        return (0, 0)

    monkeypatch.setattr("app.services.routing.estimate_route", fake_route)

    res1 = await client.post(
        f"/api/v1/driver/bookings/{booking1.id}/confirm", headers=admin_headers
    )
    assert res1.status_code == 200
    res2 = await client.post(
        f"/api/v1/driver/bookings/{booking2.id}/confirm", headers=admin_headers
    )
    assert res2.status_code == 400
