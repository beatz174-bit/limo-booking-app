import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.models.booking import Booking, BookingStatus
from app.models.notification import Notification, NotificationType
from app.models.user_v2 import User, UserRole

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


async def test_driver_leave_booking(async_session, client: AsyncClient, admin_headers):
    booking = await _create_confirmed_booking(async_session)

    res = await client.post(
        f"/api/v1/driver/bookings/{booking.id}/leave", headers=admin_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ON_THE_WAY"

    await async_session.refresh(booking)
    assert booking.status == BookingStatus.ON_THE_WAY

    notif = await async_session.execute(
        select(Notification).where(Notification.booking_id == booking.id)
    )
    assert notif.scalar_one().type == NotificationType.ON_THE_WAY
