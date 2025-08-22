"""v1 booking endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.api_booking import (
    BookingCreateRequest,
    BookingCreateResponse,
    BookingPublic,
    StripeSetupIntent,
)
from app.services import booking_service
from app.dependencies import get_db

router = APIRouter(prefix="/api/v1/bookings", tags=["bookings"])

@router.post("", response_model=BookingCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_booking_endpoint(
    payload: BookingCreateRequest, db: AsyncSession = Depends(get_db)
) -> BookingCreateResponse:
    try:
        booking, client_secret = await booking_service.create_booking(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    booking_public = BookingPublic.model_validate(booking)
    return BookingCreateResponse(
        booking=booking_public,
        stripe=StripeSetupIntent(setup_intent_client_secret=client_secret),
    )
