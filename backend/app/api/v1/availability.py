from calendar import monthrange
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_async_session
from app.dependencies import require_admin
from app.models.availability_slot import AvailabilitySlot
from app.models.booking import Booking, BookingStatus
from app.schemas.api_availability import AvailabilityResponse, BookingSlot
from app.schemas.availability_slot import AvailabilitySlotCreate, AvailabilitySlotRead

router = APIRouter(
    prefix="/api/v1/availability",
    tags=["availability"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=AvailabilityResponse)
async def get_availability(
    month: str, db: AsyncSession = Depends(get_async_session)
) -> AvailabilityResponse:
    """Return availability slots and confirmed bookings for a given month."""
    try:
        start = datetime.fromisoformat(f"{month}-01").replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="invalid month") from exc
    days = monthrange(start.year, start.month)[1]
    end = start + timedelta(days=days)

    slot_res = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.start_dt < end,
            AvailabilitySlot.end_dt > start,
            or_(
                AvailabilitySlot.reason.is_(None),
                ~AvailabilitySlot.reason.like("BOOKING:%"),
            ),
        )
    )
    slots = [AvailabilitySlotRead.model_validate(s) for s in slot_res.scalars().all()]

    booking_res = await db.execute(
        select(Booking).where(
            Booking.status.in_(
                [
                    BookingStatus.DRIVER_CONFIRMED,
                    BookingStatus.ON_THE_WAY,
                    BookingStatus.ARRIVED_PICKUP,
                    BookingStatus.IN_PROGRESS,
                    BookingStatus.ARRIVED_DROPOFF,
                ]
            ),
            Booking.pickup_when >= start,
            Booking.pickup_when < end,
        )
    )
    bookings = [BookingSlot.model_validate(b) for b in booking_res.scalars().all()]
    return AvailabilityResponse(slots=slots, bookings=bookings)


@router.post(
    "", response_model=AvailabilitySlotRead, status_code=status.HTTP_201_CREATED
)
async def create_slot(
    payload: AvailabilitySlotCreate, db: AsyncSession = Depends(get_async_session)
) -> AvailabilitySlotRead:
    """Create a manual availability block."""
    overlap = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.end_dt > payload.start_dt,
            AvailabilitySlot.start_dt < payload.end_dt,
        )
    )
    if overlap.scalars().first():
        raise HTTPException(status_code=400, detail="overlaps existing slot")
    slot = AvailabilitySlot(**payload.model_dump())
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return AvailabilitySlotRead.model_validate(slot)
