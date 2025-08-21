from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.db.database import get_async_session
from app.models.booking_v2 import Booking, BookingStatus
from app.schemas.booking_v2 import BookingRead
from app.schemas.api_booking import BookingStatusResponse
from app.services import booking_service_v2, scheduler, notifications
from app.models.notification import NotificationType
from app.models.user_v2 import UserRole

router = APIRouter(prefix="/api/v1/driver/bookings", tags=["driver-bookings"])


@router.get("", response_model=list[BookingRead])
async def list_bookings(status: BookingStatus | None = None, db: AsyncSession = Depends(get_async_session)):
    stmt = select(Booking)
    if status:
        stmt = stmt.where(Booking.status == status)
    result = await db.execute(stmt)
    bookings = result.scalars().all()
    resp: list[BookingRead] = []
    for b in bookings:
        data = BookingRead.model_validate(b)
        if b.status == BookingStatus.DRIVER_CONFIRMED:
            data.leave_at = await scheduler.compute_leave_at(b)
        resp.append(data)
    return resp


@router.post("/{booking_id}/confirm", response_model=BookingStatusResponse)
async def confirm_booking(booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)):
    try:
        booking = await booking_service_v2.confirm_booking(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    leave_at = await scheduler.schedule_leave_now(booking)
    return BookingStatusResponse(status=booking.status, leave_at=leave_at)

@router.post("/{booking_id}/decline", response_model=BookingStatusResponse)
async def decline_booking(booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)):
    try:
        booking = await booking_service_v2.decline_booking(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return BookingStatusResponse(status=booking.status)

@router.post("/{booking_id}/leave", response_model=BookingStatusResponse)
async def leave_booking(booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)):
    try:
        booking = await booking_service_v2.leave_booking(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await notifications.create_notification(
        db,
        booking.id,
        NotificationType.ON_THE_WAY,
        UserRole.CUSTOMER,
        {},
    )
    return BookingStatusResponse(status=booking.status)
