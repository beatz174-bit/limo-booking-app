import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import driver_bookings
from app.core.security import hash_password
from app.models.booking import Booking, BookingStatus
from app.models.notification import NotificationType
from app.models.user_v2 import User, UserRole

pytestmark = pytest.mark.asyncio


async def _make_booking(async_session: AsyncSession, status: BookingStatus) -> Booking:
    customer = User(
        email=f"customer{uuid.uuid4().hex}@example.com",
        full_name="Customer",
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
        status=status,
    )
    async_session.add(booking)
    await async_session.flush()
    return booking


async def test_confirm_booking_dispatch(async_session: AsyncSession, mocker) -> None:
    booking = await _make_booking(async_session, BookingStatus.PENDING)
    dispatch = mocker.patch(
        "app.services.notifications.dispatch_notification",
        new_callable=AsyncMock,
    )
    mocker.patch(
        "app.services.booking_service.confirm_booking",
        new_callable=AsyncMock,
        return_value=booking,
    )
    mocker.patch(
        "app.services.scheduler.schedule_leave_now",
        new_callable=AsyncMock,
        return_value=datetime.now(timezone.utc),
    )
    mocker.patch(
        "app.services.booking_updates.send_booking_update",
        new_callable=AsyncMock,
    )

    await driver_bookings.confirm_booking(booking.id, db=async_session)
    await asyncio.sleep(0)

    dispatch.assert_awaited_once()
    call = dispatch.await_args_list[0]
    assert call.kwargs["to_user_id"] == booking.customer_id
    assert call.kwargs["to_role"] is UserRole.CUSTOMER
    assert call.kwargs["notif_type"] is NotificationType.CONFIRMATION


async def test_leave_booking_dispatch(async_session: AsyncSession, mocker) -> None:
    booking = await _make_booking(async_session, BookingStatus.DRIVER_CONFIRMED)
    dispatch = mocker.patch(
        "app.services.notifications.dispatch_notification",
        new_callable=AsyncMock,
    )
    mocker.patch(
        "app.services.booking_service.leave_booking",
        new_callable=AsyncMock,
        return_value=booking,
    )

    await driver_bookings.leave_booking(booking.id, db=async_session)
    await asyncio.sleep(0)

    dispatch.assert_awaited_once()
    call = dispatch.await_args_list[0]
    assert call.kwargs["to_user_id"] == booking.customer_id
    assert call.kwargs["to_role"] is UserRole.CUSTOMER
    assert call.kwargs["notif_type"] is NotificationType.ON_THE_WAY


async def test_start_trip_dispatch(async_session: AsyncSession, mocker) -> None:
    booking = await _make_booking(async_session, BookingStatus.ARRIVED_PICKUP)
    dispatch = mocker.patch(
        "app.services.notifications.dispatch_notification",
        new_callable=AsyncMock,
    )
    mocker.patch(
        "app.services.booking_service.start_trip",
        new_callable=AsyncMock,
        return_value=booking,
    )
    mocker.patch("app.core.broadcast.broadcast.publish", new_callable=AsyncMock)

    await driver_bookings.start_trip(booking.id, db=async_session)
    await asyncio.sleep(0)

    dispatch.assert_awaited_once()
    call = dispatch.await_args_list[0]
    assert call.kwargs["to_user_id"] == booking.customer_id
    assert call.kwargs["to_role"] is UserRole.CUSTOMER
    assert call.kwargs["notif_type"] is NotificationType.STARTED


async def test_complete_booking_dispatch(async_session: AsyncSession, mocker) -> None:
    booking = await _make_booking(async_session, BookingStatus.IN_PROGRESS)
    booking.final_price_cents = 1000
    dispatch = mocker.patch(
        "app.services.notifications.dispatch_notification",
        new_callable=AsyncMock,
    )
    mocker.patch(
        "app.services.booking_service.complete_booking",
        new_callable=AsyncMock,
        return_value=booking,
    )
    mocker.patch("app.core.broadcast.broadcast.publish", new_callable=AsyncMock)

    await driver_bookings.complete_booking(booking.id, db=async_session)
    await asyncio.sleep(0)

    dispatch.assert_awaited_once()
    call = dispatch.await_args_list[0]
    assert call.kwargs["to_user_id"] == booking.customer_id
    assert call.kwargs["to_role"] is UserRole.CUSTOMER
    assert call.kwargs["notif_type"] is NotificationType.COMPLETED
