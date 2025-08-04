# app/api/bookings.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
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

@router.post("/", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
def api_create_booking(data: BookingCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> BookingRead:
    return create_booking(db, data)

@router.get("/", response_model=List[BookingRead])
def api_list_bookings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), user: User  = Depends(get_current_user)):
    return list_bookings(db, user.id, skip, limit)

@router.patch("/{booking_id}/status", response_model=BookingRead)
def api_update_status(booking_id: int, data: BookingUpdate, db: Session = Depends(get_db), user: User  = Depends(get_current_user)):
    return update_booking_status(db, booking_id, data)

@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_booking(booking_id: int, db: Session = Depends(get_db), user: User  = Depends(get_current_user)):
    delete_booking(db, booking_id)
