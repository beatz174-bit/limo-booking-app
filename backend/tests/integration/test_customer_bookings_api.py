import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient

from app.models.user_v2 import User, UserRole
from app.models.booking_v2 import Booking
from app.core.security import create_jwt_token
import uuid

pytestmark = pytest.mark.asyncio

async def test_customer_booking_history(async_session, client: AsyncClient):
    customer = User(email=f"jane{uuid.uuid4()}@example.com", name="Jane", role=UserRole.CUSTOMER)
    other = User(email=f"other{uuid.uuid4()}@example.com", name="Other", role=UserRole.CUSTOMER)
    async_session.add_all([customer, other])
    await async_session.flush()
    b1 = Booking(
        public_code="ABC123",
        customer_id=customer.id,
        pickup_address="A",
        pickup_lat=-27.0,
        pickup_lng=153.0,
        dropoff_address="B",
        dropoff_lat=-27.1,
        dropoff_lng=153.1,
        pickup_when=datetime.now(timezone.utc) + timedelta(days=1),
        passengers=1,
        estimated_price_cents=1000,
        deposit_required_cents=500,
    )
    b2 = Booking(
        public_code="XYZ789",
        customer_id=other.id,
        pickup_address="C",
        pickup_lat=-27.2,
        pickup_lng=153.2,
        dropoff_address="D",
        dropoff_lat=-27.3,
        dropoff_lng=153.3,
        pickup_when=datetime.now(timezone.utc) + timedelta(days=2),
        passengers=1,
        estimated_price_cents=2000,
        deposit_required_cents=1000,
    )
    async_session.add_all([b1, b2])
    await async_session.commit()
    token = create_jwt_token(str(customer.id))
    res = await client.get(
        "/api/v1/customers/me/bookings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["public_code"] == "ABC123"
