from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_async_session
from app.models.booking_v2 import Booking
from app.schemas.booking_v2 import BookingRead
from app.schemas.api_track import TrackResponse
from app.core.config import get_settings

router = APIRouter(prefix="/api/v1/track", tags=["track"])
settings = get_settings()

@router.get("/{code}", response_model=TrackResponse)
async def track_booking(code: str, db: AsyncSession = Depends(get_async_session)):
    result = await db.execute(select(Booking).where(Booking.public_code == code))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="booking not found")
    ws_url = f"{settings.app_base_url}/ws/bookings/{booking.id}"
    return TrackResponse(booking=BookingRead.model_validate(booking), ws_url=ws_url)
