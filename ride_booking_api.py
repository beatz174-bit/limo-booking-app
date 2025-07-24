# ride_booking_api.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import List
import uuid

app = FastAPI()

# Pricing constants
FLAGFALL = 10.0
PER_KM_RATE = 2.0
PER_MIN_RATE = 1.0

# In-memory stores
bookings = []

class Location(BaseModel):
    address: str
    lat: float
    lng: float

class QuoteRequest(BaseModel):
    pickup: Location
    dropoff: Location
    datetime: datetime

class BookingRequest(BaseModel):
    customer_name: str
    customer_email: str
    pickup: Location
    dropoff: Location
    datetime: datetime
    quoted_price: float

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_email: str
    pickup: Location
    dropoff: Location
    datetime: datetime
    quoted_price: float
    status: str = "pending"  # pending, confirmed, completed

@app.get("/availability")
def check_availability(date: str):
    requested_date = datetime.strptime(date, "%Y-%m-%d")
    day_bookings = [b for b in bookings if b.datetime.date() == requested_date.date()]
    taken_times = [b.datetime.strftime("%H:%M") for b in day_bookings]
    all_slots = [(requested_date + timedelta(hours=h)).strftime("%H:%M") for h in range(6, 22)]
    available_slots = [s for s in all_slots if s not in taken_times]
    return {"available_times": available_slots}

@app.post("/quote")
def generate_quote(req: QuoteRequest):
    distance_km = 15.0  # Simulated
    duration_min = 25   # Simulated
    price = FLAGFALL + (PER_KM_RATE * distance_km) + (PER_MIN_RATE * duration_min)
    return {
        "estimated_distance_km": distance_km,
        "estimated_duration_min": duration_min,
        "price": round(price, 2)
    }

@app.post("/booking")
def create_booking(req: BookingRequest):
    # Prevent double-booking
    if any(b.datetime == req.datetime for b in bookings):
        raise HTTPException(status_code=400, detail="Driver already booked at that time.")
    new_booking = Booking(**req.dict())
    bookings.append(new_booking)
    return {"booking_id": new_booking.id, "status": new_booking.status}

@app.post("/booking/{booking_id}/approve")
def approve_booking(booking_id: str):
    for b in bookings:
        if b.id == booking_id:
            b.status = "confirmed"
            return {"message": "Booking confirmed."}
    raise HTTPException(status_code=404, detail="Booking not found")

@app.get("/customer/bookings")
def list_customer_bookings(email: str):
    return [b for b in bookings if b.customer_email == email]
