"""Service layer for CRUD operations on bookings."""

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.sql import Select

from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingRead, BookingUpdate

async def create_booking(db: AsyncSession, user_id: int, data: BookingCreate) -> BookingRead:

    payload = data.model_dump()

    booking = Booking(
        user_id=user_id,
        pickup_location=payload["pickup_location"],
        dropoff_location=payload["destination"],  # map to ORM field
        time=payload["ride_time"],                 # map to ORM field
        status=payload["status"],
        price=payload["price"],
    )

    db.add(booking)
    await db.flush()
    await db.refresh(booking)

    return BookingRead.model_validate(booking)

async def list_bookings(
    db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100
) -> List[BookingRead]:
    stmt: Select[tuple[Booking]] = (
        select(Booking)
        .where(Booking.user_id == user_id)
        .order_by(Booking.id)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    bookings = result.scalars().all()

    # Respect deprecation: use model_validate instead of from_orm
    return [BookingRead.model_validate(b) for b in bookings]

async def update_booking_status(
    db: AsyncSession, booking_id: int, new_status: BookingUpdate
) -> BookingRead:
    booking: Optional[Booking] = await db.get(Booking, booking_id)

    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    booking.status = new_status.status
    await db.commit()
    await db.refresh(booking)

    return BookingRead.model_validate(booking)

async def delete_booking(db: AsyncSession, booking_id: int) -> None:
    booking: Optional[Booking] = await db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    await db.delete(booking)
    await db.commit()