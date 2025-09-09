"""v1 booking endpoints."""

from app.dependencies import get_current_user_v2, get_db
from app.models.user_v2 import User
from app.schemas.api_booking import (
    BookingCreateRequest,
    BookingCreateResponse,
    BookingPublic,
)
from app.services import booking_service
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/bookings", tags=["bookings"])


@router.post(
    "", response_model=BookingCreateResponse, status_code=status.HTTP_201_CREATED
)
async def create_booking_endpoint(
    payload: BookingCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user_v2),
) -> BookingCreateResponse:
    try:
        booking = await booking_service.create_booking(db, payload, user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    booking_public = BookingPublic.model_validate(booking)
    return BookingCreateResponse(booking=booking_public)
