# app/api/bookings.py
"""Booking management API endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.booking import BookingCreate, BookingRead, BookingUpdate
from app.services.booking_service import create_booking, list_bookings, update_booking_status, delete_booking
from app.dependencies import get_db, get_current_user
from app.models.user import User  # optional for type hints

router = APIRouter(
    prefix="/bookings",
    tags=["bookings"],
    dependencies=[Depends(get_current_user)]  # ensures auth on all routes
)


@router.post("", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def api_create_booking(data: BookingCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> BookingRead:
    """Create a new booking for the current user."""
    booking = await create_booking(db=db, data=data, user_id=user.id)
    return booking


@router.get("", response_model=List[BookingRead])
async def api_list_bookings(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), user: User  = Depends(get_current_user)):
    """List bookings for the authenticated user."""
    bookings = await list_bookings(db, user.id, skip, limit)
    return bookings


@router.patch("/{booking_id}/status", response_model=BookingRead)
async def api_update_status(booking_id: int, data: BookingUpdate, db: AsyncSession = Depends(get_db), user: User  = Depends(get_current_user)):
    """Update the status of an existing booking."""
    booking_status = await update_booking_status(db, booking_id, data)
    return booking_status


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_booking(booking_id: int, db: AsyncSession = Depends(get_db), user: User  = Depends(get_current_user)):
    """Remove a booking from the system."""
    await delete_booking(db, booking_id)
