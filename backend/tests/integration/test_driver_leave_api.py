import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from starlette.testclient import TestClient

from app.core.security import hash_password
from app.main import app
from app.models.booking import Booking, BookingStatus
from app.models.user_v2 import User, UserRole
from app.services import scheduler as scheduler_service

# Disable scheduler during tests to avoid event loop issues
scheduler_service.scheduler.start = lambda *_, **__: None
scheduler_service.scheduler.shutdown = lambda *_, **__: None

pytestmark = pytest.mark.asyncio


async def _create_confirmed_booking(async_session) -> Booking:
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
        status=BookingStatus.DRIVER_CONFIRMED,
    )
    async_session.add(booking)
    await async_session.commit()
    await async_session.refresh(booking)
    return booking


async def test_driver_leave_booking(async_session, admin_headers):
    booking = await _create_confirmed_booking(async_session)
    token = admin_headers["Authorization"].split()[1]
    with TestClient(app) as client:
        with client.websocket_connect(f"/ws/bookings/{booking.id}?token={token}") as ws:
            ws.send_text(json.dumps({"lat": -27.05, "lng": 153.05, "ts": 1}))
            ws.receive_json()
            ws.receive_json()
    await async_session.refresh(booking)
    assert booking.status == BookingStatus.ON_THE_WAY
