import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.booking import Booking, BookingStatus
from app.models.route_point import RoutePoint
from app.models.settings import AdminConfig
from app.models.user_v2 import User, UserRole

pytestmark = pytest.mark.asyncio


async def _create_booking(async_session) -> Booking:
    user = User(
        email=f"c{uuid.uuid4()}@example.com",
        full_name="C",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
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
        pickup_when=datetime.now(timezone.utc) + timedelta(hours=1),
        passengers=1,
        estimated_price_cents=1000,
        deposit_required_cents=500,
        status=BookingStatus.PENDING,
    )
    async_session.add(booking)
    await async_session.commit()
    await async_session.refresh(booking)
    return booking


async def test_driver_complete_booking(
    async_session, client: AsyncClient, monkeypatch, admin_headers
):
    cfg = await async_session.get(AdminConfig, 1)
    cfg.per_km_rate = 100
    cfg.per_minute_rate = 100
    await async_session.commit()
    booking = await _create_booking(async_session)

    class FakePI:
        def __init__(self, id: str):
            self.id = id

    monkeypatch.setattr(
        "app.services.stripe_client.charge_deposit", lambda amount: FakePI("pi_dep")
    )
    monkeypatch.setattr(
        "app.services.stripe_client.charge_final", lambda amount: FakePI("pi_final")
    )

    async def fake_route(*args, **kwargs):
        return (0, 0)

    monkeypatch.setattr("app.services.routing.estimate_route", fake_route)

    await client.post(
        f"/api/v1/driver/bookings/{booking.id}/confirm", headers=admin_headers
    )
    await client.post(
        f"/api/v1/driver/bookings/{booking.id}/leave", headers=admin_headers
    )
    await client.post(
        f"/api/v1/driver/bookings/{booking.id}/arrive-pickup", headers=admin_headers
    )
    await client.post(
        f"/api/v1/driver/bookings/{booking.id}/start-trip", headers=admin_headers
    )

    start = datetime.now(timezone.utc)
    async_session.add_all(
        [
            RoutePoint(booking_id=booking.id, ts=start, lat=0, lng=0),
            RoutePoint(
                booking_id=booking.id, ts=start + timedelta(minutes=10), lat=0, lng=0.01
            ),
        ]
    )
    await async_session.commit()

    await client.post(
        f"/api/v1/driver/bookings/{booking.id}/arrive-dropoff", headers=admin_headers
    )
    res = await client.post(
        f"/api/v1/driver/bookings/{booking.id}/complete", headers=admin_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["final_price_cents"] >= 1000

    from sqlalchemy import delete

    await async_session.execute(delete(AdminConfig))
    await async_session.commit()
