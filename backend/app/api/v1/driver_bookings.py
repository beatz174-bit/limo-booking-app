from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.db.database import get_async_session
from app.models.booking_v2 import Booking, BookingStatus
from app.schemas.booking_v2 import BookingRead
from app.schemas.api_booking import BookingStatusResponse
from app.services import booking_service_v2

router = APIRouter(prefix="/api/v1/driver/bookings", tags=["driver-bookings"])


@router.get("", response_model=list[BookingRead])
async def list_bookings(status: BookingStatus | None = None, db: AsyncSession = Depends(get_async_session)):
    stmt = select(Booking)
    if status:
        stmt = stmt.where(Booking.status == status)
    result = await db.execute(stmt)
    bookings = result.scalars().all()
    return [BookingRead.model_validate(b) for b in bookings]


@router.post("/{booking_id}/confirm", response_model=BookingStatusResponse)
async def confirm_booking(booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)):
    try:
        booking = await booking_service_v2.confirm_booking(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return BookingStatusResponse(status=booking.status)


@router.post("/{booking_id}/decline", response_model=BookingStatusResponse)
async def decline_booking(booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)):
    try:
        booking = await booking_service_v2.decline_booking(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return BookingStatusResponse(status=booking.status)
