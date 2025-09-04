import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from starlette.testclient import TestClient

from app.core.security import create_jwt_token, hash_password
from app.main import app
from app.models.booking import Booking, BookingStatus
from app.models.settings import AdminConfig
from app.models.trip import Trip
from app.models.user_v2 import User, UserRole
from app.services import scheduler as scheduler_service
from app.services import settings_service

pytestmark = pytest.mark.asyncio

# Disable scheduler during tests to avoid event loop issues
scheduler_service.scheduler.start = lambda *_, **__: None
scheduler_service.scheduler.shutdown = lambda *_, **__: None


async def _create_booking(async_session, status: BookingStatus) -> tuple[User, Booking]:
    driver = User(
        email=f"d{uuid.uuid4()}@example.com",
        full_name="D",
        hashed_password=hash_password("pwd"),
        role=UserRole.DRIVER,
    )
    customer = User(
        email=f"c{uuid.uuid4()}@example.com",
        full_name="C",
        hashed_password=hash_password("pwd"),
        role=UserRole.CUSTOMER,
    )
    async_session.add_all([driver, customer])
    await async_session.flush()
    booking = Booking(
        public_code=str(uuid.uuid4())[:6],
        customer_id=customer.id,
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
        status=status,
    )
    async_session.add(booking)
    async_session.merge(
        AdminConfig(
            id=1,
            account_mode=False,
            flagfall=0,
            per_km_rate=0,
            per_minute_rate=0,
            admin_user_id=driver.id,
        )
    )
    await async_session.commit()
    settings_service._cached_admin_user_id = driver.id
    await async_session.refresh(booking)
    if status is BookingStatus.IN_PROGRESS:
        async_session.add(
            Trip(booking_id=booking.id, started_at=datetime.now(timezone.utc))
        )
        await async_session.commit()
    return driver, booking


async def test_first_location_update_sets_on_the_way(async_session):
    driver, booking = await _create_booking(
        async_session, BookingStatus.DRIVER_CONFIRMED
    )
    token = create_jwt_token(driver.id)
    with TestClient(app) as client:
        with client.websocket_connect(f"/ws/bookings/{booking.id}?token={token}") as ws:
            ws.send_text(json.dumps({"lat": -27.05, "lng": 153.05, "ts": 1}))
            ws.receive_json()
            ws.receive_json()
    await async_session.refresh(booking)
    assert booking.status is BookingStatus.ON_THE_WAY


async def test_approaching_pickup_sets_arrived_pickup(async_session):
    driver, booking = await _create_booking(async_session, BookingStatus.ON_THE_WAY)
    token = create_jwt_token(driver.id)
    with TestClient(app) as client:
        with client.websocket_connect(f"/ws/bookings/{booking.id}?token={token}") as ws:
            ws.send_text(
                json.dumps(
                    {"lat": booking.pickup_lat, "lng": booking.pickup_lng, "ts": 1}
                )
            )
            ws.receive_json()
            ws.receive_json()
    await async_session.refresh(booking)
    assert booking.status is BookingStatus.ARRIVED_PICKUP


async def test_approaching_dropoff_sets_arrived_dropoff(async_session):
    driver, booking = await _create_booking(async_session, BookingStatus.IN_PROGRESS)
    token = create_jwt_token(driver.id)
    with TestClient(app) as client:
        with client.websocket_connect(f"/ws/bookings/{booking.id}?token={token}") as ws:
            ws.send_text(
                json.dumps(
                    {"lat": booking.dropoff_lat, "lng": booking.dropoff_lng, "ts": 1}
                )
            )
            ws.receive_json()
            ws.receive_json()
    await async_session.refresh(booking)
    assert booking.status is BookingStatus.ARRIVED_DROPOFF
