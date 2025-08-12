import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.booking import Booking
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingUpdate
from app.services import booking_service
from datetime import datetime

async def test_create_booking_success(async_session: AsyncSession):
    # Prepare a user for foreign key association
    user = User(email="bservice@example.com", full_name="Book Service", hashed_password="hash")
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    data = BookingCreate(pickup_location="LocA", destination="LocB", ride_time="2025-12-31T23:59:00")
    result = await booking_service.create_booking(db=async_session, data=data, user_id=user.id)
    assert result.pickup_location == "LocA"
    assert result.destination == "LocB"
    assert result.status == "pending"
    # The booking should be persisted in the DB
    res = await async_session.execute(select(Booking).filter_by(pickup_location="LocA"))
    booking = res.scalar_one_or_none()
    assert booking is not None
    assert booking.dropoff_location == "LocB"

async def test_list_bookings_filters_by_user(async_session: AsyncSession):
    # Create two users and their bookings
    user1 = User(email="bservice1@example.com", full_name="Booker1", hashed_password="h1")
    user2 = User(email="bservice2@example.com", full_name="Booker2", hashed_password="h2")
    async_session.add_all([user1, user2])
    await async_session.commit()
    await async_session.refresh(user1)
    await async_session.refresh(user2)
    booking1 = Booking(user_id=user1.id, pickup_location="X1", dropoff_location="Y1", time="2025-01-01T00:00:00", status="pending", price=10.0)
    booking2 = Booking(user_id=user2.id, pickup_location="X2", dropoff_location="Y2", time="2025-01-02T00:00:00", status="pending", price=20.0)
    async_session.add_all([booking1, booking2])
    await async_session.commit()
    await async_session.refresh(booking1)
    await async_session.refresh(booking2)
    result = await booking_service.list_bookings(async_session, user1.id)
    # Should only return bookings for user1
    assert len(result) == 1
    assert result[0].pickup_location == "X1" and result[0].destination == "Y1"

async def test_update_booking_status_success(async_session: AsyncSession):
    # Create a user so user_id is non-null
    user = User(email="u1@example.com", full_name="U One", hashed_password="hash")
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    # Use current field names + a real datetime
    booking = Booking(
        user_id=user.id,
        pickup_location="U1",
        dropoff_location="U2",
        time=datetime.fromisoformat("2030-06-01T12:00:00"),
        status="pending",
        price=0,
    )
    async_session.add(booking)
    await async_session.commit()
    await async_session.refresh(booking)

    data = BookingUpdate(status="completed")
    result = await booking_service.update_booking_status(async_session, booking.id, data)

    assert result.id == booking.id
    assert result.status == "completed"
    assert result.user_id == user.id

async def test_update_booking_status_not_found(async_session: AsyncSession):
    data = BookingUpdate(status="cancelled")
    with pytest.raises(HTTPException) as excinfo:
        await booking_service.update_booking_status(async_session, 9999, data)
    assert excinfo.value.status_code == 404

async def test_delete_booking_success(async_session: AsyncSession):
    booking = Booking(pickup_location="D1", dropoff_location="D2", time="2030-07-07T07:00:00", status="pending", price=15.0)
    async_session.add(booking)
    await async_session.commit()
    await async_session.refresh(booking)
    await booking_service.delete_booking(async_session, booking.id)
    # Booking should be removed
    gone = await async_session.get(Booking, booking.id)
    assert gone is None

async def test_delete_booking_not_found(async_session: AsyncSession):
    with pytest.raises(HTTPException) as excinfo:
        await booking_service.delete_booking(async_session, 123456)
    assert excinfo.value.status_code == 404
