# routes/bookings.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from database import get_db
from models import Booking  # ensure this is correct

class BookingOut(BaseModel):
    id: int
    user_id: int
    pickup_location: str
    dropoff_location: str
    time: str
    status: str
    price: float
    class Config:
        from_attributes = True
        orm_mode = True

router = APIRouter()

class ConfirmRequest(BaseModel):
    ids: List[int]

@router.post("/bookings/confirm")
def confirm_bookings(data: ConfirmRequest, db: Session = Depends(get_db)):
    bookings = db.query(Booking).filter(Booking.id.in_(data.ids)).all()

    if not bookings:
        raise HTTPException(status_code=404, detail="No bookings found")

    for booking in bookings:
        booking.status = "confirmed"
        print(f"Notify user for booking {booking.id}")

    db.commit()
    return {"confirmed_ids": [b.id for b in bookings]}

@router.get("/bookings/pending", response_model=List[BookingOut])
def get_pending_bookings(db: Session = Depends(get_db)):
    pending_bookings = db.query(Booking).filter(Booking.status == "pending").all()
    return [b.as_dict() for b in pending_bookings]