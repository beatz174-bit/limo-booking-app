from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user_v2, get_db
from app.models.booking import Booking
from app.models.user_v2 import User
from app.schemas.booking import BookingRead

router = APIRouter(prefix="/api/v1/customers/me", tags=["customer-bookings"])


@router.get("/bookings", response_model=list[BookingRead])
async def list_my_bookings(
    current_user: User = Depends(get_current_user_v2),
    db: AsyncSession = Depends(get_db),
) -> list[BookingRead]:
    result = await db.execute(
        select(Booking)
        .where(Booking.customer_id == current_user.id)
        .order_by(Booking.created_at.desc())
    )
    bookings = result.scalars().all()
    return [BookingRead.model_validate(b) for b in bookings]
