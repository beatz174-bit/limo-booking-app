import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.booking import Booking
from datetime import datetime

@pytest.mark.asyncio
async def test_update_booking_status_unauthorized(client: AsyncClient, async_session: AsyncSession):
    b = Booking(user_id=1, pickup_location="A", dropoff_location="B", time=datetime(2030,1,1,10,0), status="pending", price=0.0)
    async_session.add(b)
    await async_session.commit()

    resp = await client.patch(f"/bookings/{b.id}/status", json={"status": "completed"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"

@pytest.mark.asyncio
async def test_delete_booking_unauthorized(client: AsyncClient, async_session: AsyncSession):
    b = Booking(user_id=1, pickup_location="X", dropoff_location="Y", time=datetime(2030,1,1,10,0), status="pending", price=0.0)
    async_session.add(b)
    await async_session.commit()

    resp = await client.delete(f"/bookings/{b.id}")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"
