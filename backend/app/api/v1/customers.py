"""Customer-facing booking endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_async_session
from app.dependencies_v2 import get_current_user_v2
from app.models.booking_v2 import Booking
from app.schemas.booking_v2 import BookingRead
from app.models.user_v2 import User

router = APIRouter(prefix="/api/v1/customers", tags=["customer-bookings"])

@router.get("/me/bookings", response_model=list[BookingRead])
async def list_my_bookings(
    current_user: User = Depends(get_current_user_v2),
    db: AsyncSession = Depends(get_async_session),
) -> list[BookingRead]:
    stmt = select(Booking).where(Booking.customer_id == current_user.id)
    result = await db.execute(stmt)
    bookings = result.scalars().all()
    return [BookingRead.model_validate(b) for b in bookings]
