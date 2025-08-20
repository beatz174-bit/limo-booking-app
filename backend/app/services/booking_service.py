"""Service layer for CRUD operations on bookings."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.sql import Select

from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingRead, BookingUpdate

logger = logging.getLogger(__name__)

async def create_booking(db: AsyncSession, user_id: int, data: BookingCreate) -> BookingRead:
    logger.info("creating booking for user %s", user_id)
    payload = data.model_dump()
    booking = Booking(
        user_id=user_id,
        pickup_location=payload["pickup_location"],
        dropoff_location=payload["destination"],
        time=payload["ride_time"],
        status=payload["status"],
        price=payload["price"],
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)
    logger.debug("booking %s created", booking.id)
    return BookingRead.model_validate(booking)

async def list_bookings(
    db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100
) -> List[BookingRead]:
    logger.info("listing bookings for user %s", user_id)
    stmt: Select[tuple[Booking]] = (
        select(Booking)
        .where(Booking.user_id == user_id)
        .order_by(Booking.id)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    bookings = result.scalars().all()
    return [BookingRead.model_validate(b) for b in bookings]

async def update_booking_status(
    db: AsyncSession, booking_id: int, new_status: BookingUpdate
) -> BookingRead:
    logger.info("updating booking %s", booking_id)
    booking: Optional[Booking] = await db.get(Booking, booking_id)
    if booking is None:
        logger.warning("booking %s not found", booking_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    booking.status = new_status.status
    await db.commit()
    await db.refresh(booking)
    return BookingRead.model_validate(booking)

async def delete_booking(db: AsyncSession, booking_id: int) -> None:
    logger.info("deleting booking %s", booking_id)
    booking: Optional[Booking] = await db.get(Booking, booking_id)
    if booking is None:
        logger.warning("booking %s not found", booking_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    await db.delete(booking)
    await db.commit()
