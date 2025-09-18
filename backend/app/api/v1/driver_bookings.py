import json
import uuid

from app.core.broadcast import broadcast
from app.db.database import get_async_session
from app.dependencies import require_admin
from app.models.booking import Booking, BookingStatus
from app.models.notification import NotificationType
from app.models.user_v2 import UserRole
from app.schemas.api_booking import BookingStatusResponse
from app.schemas.booking import BookingRead
from app.services import booking_service, notifications, scheduler
from app.services.booking_updates import send_booking_update
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/api/v1/driver/bookings",
    tags=["driver-bookings"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[BookingRead])
async def list_bookings(
    status: BookingStatus | None = None, db: AsyncSession = Depends(get_async_session)
):
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
async def confirm_booking(
    booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)
):
    try:
        booking = await booking_service.confirm_booking(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    leave_at = await scheduler.schedule_leave_now(booking)
    await notifications.create_notification(
        db,
        booking.id,
        NotificationType.CONFIRMATION,
        UserRole.CUSTOMER,
        {"deposit_required_cents": booking.deposit_required_cents},
    )
    await db.commit()
    await send_booking_update(booking, leave_at=leave_at)
    return BookingStatusResponse(status=booking.status, leave_at=leave_at)


@router.post("/{booking_id}/retry-deposit", response_model=BookingStatusResponse)
async def retry_deposit(
    booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)
):
    try:
        booking = await booking_service.retry_deposit(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    leave_at = await scheduler.schedule_leave_now(booking)
    await send_booking_update(booking, leave_at=leave_at)
    return BookingStatusResponse(status=booking.status, leave_at=leave_at)


@router.post("/{booking_id}/decline", response_model=BookingStatusResponse)
async def decline_booking(
    booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)
):
    try:
        booking = await booking_service.decline_booking(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return BookingStatusResponse(status=booking.status)


@router.post("/{booking_id}/leave", response_model=BookingStatusResponse)
async def leave_booking(
    booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)
):
    try:
        booking = await booking_service.leave_booking(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await notifications.create_notification(
        db,
        booking.id,
        NotificationType.ON_THE_WAY,
        UserRole.CUSTOMER,
        {},
    )
    await db.commit()
    return BookingStatusResponse(status=booking.status)


@router.post("/{booking_id}/arrive-pickup", response_model=BookingStatusResponse)
async def arrive_pickup(
    booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)
):
    try:
        booking = await booking_service.arrive_pickup(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return BookingStatusResponse(status=booking.status)


@router.post("/{booking_id}/start-trip", response_model=BookingStatusResponse)
async def start_trip(
    booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)
):
    try:
        booking = await booking_service.start_trip(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await notifications.create_notification(
        db,
        booking.id,
        NotificationType.STARTED,
        UserRole.CUSTOMER,
        {},
    )
    await db.commit()
    await broadcast.publish(
        channel=f"booking:{booking.id}",
        message=json.dumps({"status": booking.status}),
    )
    return BookingStatusResponse(status=booking.status)


@router.post("/{booking_id}/arrive-dropoff", response_model=BookingStatusResponse)
async def arrive_dropoff(
    booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)
):
    try:
        booking = await booking_service.arrive_dropoff(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return BookingStatusResponse(status=booking.status)


@router.post("/{booking_id}/complete", response_model=BookingStatusResponse)
async def complete_booking(
    booking_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)
):
    try:
        booking = await booking_service.complete_booking(db, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await notifications.create_notification(
        db,
        booking.id,
        NotificationType.COMPLETED,
        UserRole.CUSTOMER,
        {},
    )
    await db.commit()
    await broadcast.publish(
        channel=f"booking:{booking.id}",
        message=json.dumps({"status": booking.status}),
    )
    return BookingStatusResponse(
        status=booking.status, final_price_cents=booking.final_price_cents
    )
