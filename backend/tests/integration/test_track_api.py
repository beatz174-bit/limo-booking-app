import pytest
from httpx import AsyncClient
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


async def test_track_endpoint(async_session, client: AsyncClient):
    booking = await _create_booking(async_session)
    res = await client.get(f"/api/v1/track/{booking.public_code}")
    assert res.status_code == 200
    data = res.json()
    assert data["booking"]["id"] == str(booking.id)
    assert "ws_url" in data
