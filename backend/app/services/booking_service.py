# app/services/booking_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import List, Optional
from sqlalchemy import select


from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingRead, BookingUpdate

async def create_booking(db: AsyncSession, user_id: int, data: BookingCreate) -> BookingRead:
    # booking_payload = data.model_dump(exclude_unset=True)
    # booking = Booking(**data.model_dump(), user_id=user_id, db=db)
    # booking = Booking(**booking_payload)

    payload = data.model_dump()

    booking = Booking(
        user_id=user_id,
        pickup_location=payload["pickup_location"],
        dropoff_location=payload["destination"],  # map to ORM field
        time=payload["ride_time"],                 # map to ORM field
        status="pending",
        price=0,
    )

    db.add(booking) # type: ignore
    await db.commit()
    await db.refresh(booking) # type: ignore

    return BookingRead.model_validate(booking)

async def list_bookings(
    db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100
) -> List[BookingRead]:
    stmt: "SelectBooking" = ( # type: ignore
        select(Booking) # type: ignore
        .where(Booking.user_id == user_id) # type: ignore
        .order_by(Booking.id)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt) # type: ignore
    bookings = result.scalars().all() # type: ignore

    # Respect deprecation: use model_validate instead of from_orm
    return [BookingRead.model_validate(b) for b in bookings] # type: ignore

async def update_booking_status(
    db: AsyncSession, booking_id: int, new_status: BookingUpdate
) -> BookingRead:
    booking: Optional[Booking] = await db.get(Booking, booking_id) # type: ignore

    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    booking.status = new_status.status
    await db.commit()
    await db.refresh(booking) # type: ignore

    return BookingRead.model_validate(booking)

async def delete_booking(db: AsyncSession, booking_id: int) -> None:
    booking: Optional[Booking] = await db.get(Booking, booking_id) # type: ignore
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    await db.delete(booking) # type: ignore
    await db.commit()