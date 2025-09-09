import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from starlette.testclient import TestClient

from app.core.security import hash_password
from app.main import app
from app.models.booking import Booking, BookingStatus
from app.models.route_point import RoutePoint
from app.models.settings import AdminConfig
from app.models.user_v2 import User, UserRole
from app.services import scheduler as scheduler_service

# Disable scheduler during tests to avoid event loop issues
scheduler_service.scheduler.start = lambda *_, **__: None
scheduler_service.scheduler.shutdown = lambda *_, **__: None

pytestmark = pytest.mark.asyncio


async def _create_booking(async_session) -> Booking:
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
        "app.services.stripe_client.charge_deposit",
        lambda amount, booking_id, **kwargs: FakePI("pi_dep"),
    )
    monkeypatch.setattr(
        "app.services.stripe_client.charge_final",
        lambda amount, booking_id, **kwargs: FakePI("pi_final"),
    )

    async def fake_route(*args, **kwargs):
        return (0, 0)

    monkeypatch.setattr("app.services.routing.estimate_route", fake_route)

    await client.post(
        f"/api/v1/driver/bookings/{booking.id}/confirm", headers=admin_headers
    )

    token = admin_headers["Authorization"].split()[1]
    with TestClient(app) as ws_client:
        with ws_client.websocket_connect(
            f"/ws/bookings/{booking.id}?token={token}"
        ) as ws:
            ws.send_text(json.dumps({"lat": -27.05, "lng": 153.05, "ts": 1}))
            ws.receive_json()
            ws.receive_json()
    with TestClient(app) as ws_client:
        with ws_client.websocket_connect(
            f"/ws/bookings/{booking.id}?token={token}"
        ) as ws:
            ws.send_text(
                json.dumps(
                    {"lat": booking.pickup_lat, "lng": booking.pickup_lng, "ts": 2}
                )
            )
            ws.receive_json()
            ws.receive_json()

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

    with TestClient(app) as ws_client:
        with ws_client.websocket_connect(
            f"/ws/bookings/{booking.id}?token={token}"
        ) as ws:
            ws.send_text(
                json.dumps(
                    {
                        "lat": booking.dropoff_lat,
                        "lng": booking.dropoff_lng,
                        "ts": 3,
                    }
                )
            )
            ws.receive_json()
            ws.receive_json()

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
