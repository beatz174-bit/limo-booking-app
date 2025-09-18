import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.booking import Booking, BookingStatus
from app.models.notification import Notification, NotificationRole, NotificationType
from app.models.settings import AdminConfig
from app.models.user_v2 import User, UserRole
from app.services import settings_service
from app.services.scheduler import _leave_now_job

pytestmark = pytest.mark.asyncio


async def test_leave_now_job_creates_notifications(
    async_session: AsyncSession, mocker
) -> None:
    dispatch = mocker.patch(
        "app.services.notifications.dispatch_notification",
        new_callable=AsyncMock,
    )

    driver = User(
        email=f"driver{uuid.uuid4().hex}@example.com",
        full_name="Driver",
        hashed_password=hash_password("pass"),
        role=UserRole.DRIVER,
    )
    customer = User(
        email=f"test{uuid.uuid4().hex}@example.com",
        full_name="Test",
        hashed_password=hash_password("pass"),
        role=UserRole.CUSTOMER,
    )
    async_session.add_all([driver, customer])
    await async_session.flush()
    settings_service._cached_admin_user_id = None
    await async_session.merge(
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
    await asyncio.sleep(0)

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
    assert all(n.to_user_id for n in notes)

    assert dispatch.await_count == 2
    driver_call = next(
        call
        for call in dispatch.await_args_list
        if call.kwargs["to_role"] is UserRole.DRIVER
        and call.kwargs["notif_type"] is NotificationType.LEAVE_NOW
    )
    assert driver_call.kwargs["to_user_id"] == driver.id
    customer_call = next(
        call
        for call in dispatch.await_args_list
        if call.kwargs["to_role"] is UserRole.CUSTOMER
        and call.kwargs["notif_type"] is NotificationType.ON_THE_WAY
    )
    assert customer_call.kwargs["to_user_id"] == booking.customer_id
