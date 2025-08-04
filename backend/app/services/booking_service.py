# app/services/booking_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from sqlalchemy import select


from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingRead, BookingUpdate

def create_booking(db: Session, data: BookingCreate) -> BookingRead:
    booking_payload = data.model_dump(exclude_unset=True)

    booking = Booking(**booking_payload)
    db.add(booking) # type: ignore
    db.commit()
    db.refresh(booking) # type: ignore

    return BookingRead.model_validate(booking)

def list_bookings(
    db: Session, user_id: int, skip: int = 0, limit: int = 100
) -> List[BookingRead]:
    stmt: "SelectBooking" = ( # type: ignore
        select(Booking) # type: ignore
        .where(Booking.user_id == user_id) # type: ignore
        .order_by(Booking.id)
        .offset(skip)
        .limit(limit)
    )
    result = db.scalars(stmt) # type: ignore
    bookings = result.all() # type: ignore

    # Respect deprecation: use model_validate instead of from_orm
    return [BookingRead.model_validate(b) for b in bookings] # type: ignore

def update_booking_status(
    db: Session, booking_id: int, new_status: BookingUpdate
) -> BookingRead:
    booking: Optional[Booking] = db.get(Booking, booking_id) # type: ignore

    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    booking.status = new_status.status
    db.commit()
    db.refresh(booking) # type: ignore

    return BookingRead.model_validate(booking)

def delete_booking(db: Session, booking_id: int) -> None:
    booking: Optional[Booking] = db.get(Booking, booking_id) # type: ignore
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    db.delete(booking) # type: ignore
    db.commit()