from datetime import datetime, timedelta, timezone

import pytest
from app.core.security import create_jwt_token, hash_password
from app.models.booking import Booking, BookingStatus
from app.models.user_v2 import User, UserRole
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio


async def test_list_my_bookings(client: AsyncClient, async_session: AsyncSession):
    user = User(
        email="me@example.com",
        full_name="Me",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
    )
    async_session.add(user)
    await async_session.flush()

    booking = Booking(
        public_code="CODE123",
        customer_id=user.id,
        pickup_address="A",
        pickup_lat=1.0,
        pickup_lng=2.0,
        dropoff_address="B",
        dropoff_lat=3.0,
        dropoff_lng=4.0,
        pickup_when=datetime.now(timezone.utc) + timedelta(hours=1),
        passengers=1,
        estimated_price_cents=1000,
        deposit_required_cents=500,
        status=BookingStatus.PENDING,
    )
    async_session.add(booking)
    await async_session.commit()

    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    res = await client.get("/api/v1/customers/me/bookings", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["id"] == str(booking.id)
