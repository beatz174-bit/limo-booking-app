import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.booking import Booking, BookingStatus
from app.models.notification import Notification, NotificationRole, NotificationType
from app.models.user_v2 import User, UserRole
from app.services.scheduler import _leave_now_job

pytestmark = pytest.mark.asyncio


async def test_leave_now_job_creates_notifications(
    async_session: AsyncSession, mocker
) -> None:
    mocker.patch("app.services.notifications._send_fcm", return_value=None)

    customer = User(
        email="test@example.com",
        full_name="Test",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
    )
    async_session.add(customer)
    await async_session.flush()

    booking = Booking(
        public_code=uuid.uuid4().hex[:6].upper(),
        customer_id=customer.id,
        pickup_address="A",
        pickup_lat=0.0,
        pickup_lng=0.0,
        dropoff_address="B",
        dropoff_lat=1.0,
        dropoff_lng=1.0,
        pickup_when=datetime.now(timezone.utc) + timedelta(hours=1),
        notes=None,
        passengers=1,
        estimated_price_cents=1000,
        deposit_required_cents=500,
        status=BookingStatus.DRIVER_CONFIRMED,
    )
    async_session.add(booking)
    await async_session.commit()

    await _leave_now_job(booking.id)

    await async_session.refresh(booking)
    assert booking.status is BookingStatus.ON_THE_WAY

    result = await async_session.execute(
        select(Notification).where(Notification.booking_id == booking.id)
    )
    notes = result.scalars().all()
    assert len(notes) == 2
    roles_types = {(n.type, n.to_role) for n in notes}
    assert (NotificationType.LEAVE_NOW, NotificationRole.DRIVER) in roles_types
    assert (NotificationType.ON_THE_WAY, NotificationRole.CUSTOMER) in roles_types
