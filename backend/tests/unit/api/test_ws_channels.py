import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.security import create_jwt_token, hash_password
from app.main import app
from app.models.booking import Booking, BookingStatus
from app.models.settings import AdminConfig
from app.models.user_v2 import User, UserRole
from app.services import scheduler as scheduler_service
from app.services import settings_service

pytestmark = pytest.mark.asyncio

# Disable scheduler during tests to avoid event loop issues
scheduler_service.scheduler.start = lambda *_, **__: None
scheduler_service.scheduler.shutdown = lambda *_, **__: None


async def _prepare_data(async_session):
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
        pickup_lat=0.0,
        pickup_lng=0.0,
        dropoff_address="B",
        dropoff_lat=1.0,
        dropoff_lng=1.0,
        pickup_when=datetime.now(timezone.utc) + timedelta(hours=1),
        passengers=1,
        estimated_price_cents=1000,
        deposit_required_cents=500,
        status=BookingStatus.IN_PROGRESS,
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
    return driver, customer, booking


async def test_unauthorized_connections_rejected(async_session):
    driver, customer, booking = await _prepare_data(async_session)
    other = User(
        email=f"o{uuid.uuid4()}@example.com",
        full_name="O",
        hashed_password=hash_password("pwd"),
        role=UserRole.CUSTOMER,
    )
    async_session.add(other)
    await async_session.commit()
    other_token = create_jwt_token(other.id)
    customer_token = create_jwt_token(customer.id)

    with TestClient(app) as client:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/bookings/{booking.id}"):
                pass
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(
                f"/ws/bookings/{booking.id}?token={customer_token}"
            ):
                pass
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/bookings/{booking.id}/watch"):
                pass
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(
                f"/ws/bookings/{booking.id}/watch?token={other_token}"
            ):
                pass


async def test_driver_and_owner_channels(async_session):
    driver, customer, booking = await _prepare_data(async_session)
    driver_token = create_jwt_token(driver.id)
    customer_token = create_jwt_token(customer.id)

    with TestClient(app) as client:
        with client.websocket_connect(
            f"/ws/bookings/{booking.id}?token={driver_token}"
        ) as driver_ws, client.websocket_connect(
            f"/ws/bookings/{booking.id}/watch?token={customer_token}"
        ) as owner_ws:
            payload = {"lat": 1.0, "lng": 2.0, "ts": 1}
            driver_ws.send_text(json.dumps(payload))
            assert owner_ws.receive_json() == payload
            assert driver_ws.receive_json() == payload

            owner_ws.send_text(json.dumps({"lat": 9, "lng": 9, "ts": 1}))
            payload2 = {"lat": 3.0, "lng": 4.0, "ts": 2}
            driver_ws.send_text(json.dumps(payload2))
            assert owner_ws.receive_json() == payload2


async def test_admin_can_watch_booking(async_session):
    driver, customer, booking = await _prepare_data(async_session)
    driver_token = create_jwt_token(driver.id)

    with TestClient(app) as client:
        with client.websocket_connect(
            f"/ws/bookings/{booking.id}?token={driver_token}"
        ) as driver_ws, client.websocket_connect(
            f"/ws/bookings/{booking.id}/watch?token={driver_token}"
        ) as admin_ws:
            payload = {"lat": 5.0, "lng": 6.0, "ts": 3}
            driver_ws.send_text(json.dumps(payload))
            assert admin_ws.receive_json() == payload
