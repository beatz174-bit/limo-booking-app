# ride_booking_api.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError
from datetime import datetime, timedelta
from typing import List
import uuid
import httpx
import os
from dotenv import load_dotenv
load_dotenv()
from models import User, AdminConfig
from database import SessionLocal, get_db
from security import hash_password, verify_password, create_jwt_token, decode_token
from sqlalchemy.orm import Session
from auth import router as auth_router
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from typing import Optional
from decimal import Decimal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # ← allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)

ORS_API_KEY = os.getenv("ORS_API_KEY")
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

# Define a nested model for the settings field
class SettingsPayload(BaseModel):
    flagfall: Decimal = Field(gt=0, max_digits=6, decimal_places=2)
    per_km_rate: Decimal = Field(gt=0, max_digits=6, decimal_places=2)
    per_minute_rate: Decimal = Field(gt=0, max_digits=6, decimal_places=2)
    google_maps_api_key: str = Field(min_length=10)
    account_mode: str = Field(min_length=3, default="admin") 
    allow_public_registration: bool = False  # Optional default

class SetupPayload(BaseModel):
    admin_email: str
    admin_password: str
    full_name: str
    settings: SettingsPayload # expects: flagfall, per_km_rate, per_minute_rate, google_maps_api_key, account_mode

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    role: str
    full_name: str

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
    coords = [
        [req.pickup.lng, req.pickup.lat],
        [req.dropoff.lng, req.dropoff.lat]
    ]
    try:
        response = httpx.post(
            "https://api.openrouteservice.org/v2/directions/driving-car",
            headers={"Authorization": ORS_API_KEY},
            json={"coordinates": coords}
        )
        response.raise_for_status()
        data = response.json()
        distance_km = data["routes"][0]["summary"]["distance"] / 1000
        duration_min = data["routes"][0]["summary"]["duration"] / 60
        price = FLAGFALL + (PER_KM_RATE * distance_km) + (PER_MIN_RATE * duration_min)
        return {
            "estimated_distance_km": round(distance_km, 2),
            "estimated_duration_min": round(duration_min, 1),
            "price": round(price, 2)
        }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"ORS API failed: {str(e)}")

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

# @app.post("/setup")
# def complete_setup(data: SetupPayload):
#     db: Session = SessionLocal()

#     # Prevent running setup more than once
#     existing_admin = db.query(User).filter(User.role == "admin").first()
#     if existing_admin:
#         raise HTTPException(status_code=400, detail="Setup already completed.")

#     # Create admin user
#     admin_user = User(
#         email=data.admin_email,
#         full_name=data.full_name,
#         hashed_password=hash_password(data.admin_password),
#         role="admin",
#         is_approved=True,
#     )
#     db.add(admin_user)

#     # Save settings
#     config = AdminConfig(
#         allow_public_registration=(data.settings.get("account_mode") == "open"),
#         google_maps_api_key=data.settings.get("google_maps_api_key", ""),
#         flagfall=data.settings.get("flagfall", 10.0),
#         per_km_rate=data.settings.get("per_km_rate", 2.0),
#         per_min_rate=data.settings.get("per_minute_rate", 1.0),
#     )
#     db.add(config)

#     db.commit()
#     return {"message": "Setup complete"}
@app.post("/setup")
def complete_setup(data: SetupPayload):
    try:
        db: Session = SessionLocal()

        # Prevent running setup more than once
        existing_admin = db.query(User).filter(User.role == "admin").first()
        if existing_admin:
            raise HTTPException(status_code=400, detail="Setup already completed.")

        # Create admin user
        admin_user = User(
            email=data.admin_email,
            full_name=data.full_name,
            hashed_password=hash_password(data.admin_password),
            role="admin",
            is_approved=True,
        )
        db.add(admin_user)

        s = data.settings  # easier to read

        # Save settings
        config = AdminConfig(
            allow_public_registration=(s.account_mode == "open"),
            google_maps_api_key=s.google_maps_api_key,
            flagfall=s.flagfall,
            per_km_rate=s.per_km_rate,
            per_min_rate=s.per_minute_rate,
        )
        db.add(config)

        db.commit()
        return {"message": "Setup complete"}
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="User not approved yet")

    token = create_jwt_token(user.id, user.role)
    return {
        "token": token,
        "role": user.role,
        "full_name": user.full_name
    }

# @app.get("/setup")
# def check_setup_status():
#     config = SessionLocal().query(AdminConfig).first()
#     if not config:
#         raise HTTPException(status_code=404, detail="Not configured")
#     return {
#         "flagfall": config.flagfall,
#         "per_km_rate": config.per_km_rate,
#         "per_minute_rate": config.per_min_rate,
#         "google_maps_api_key": config.google_maps_api_key,
#         "account_mode": "open" if config.allow_public_registration else "staged",
#     }

@app.get("/setup")
def check_setup_status():
    try:
        db = SessionLocal()
        config = db.query(AdminConfig).first()
        if not config:
            raise HTTPException(status_code=404, detail="Not configured")

        return {
            "flagfall": float(config.flagfall or 0.0),
            "per_km_rate": float(config.per_km_rate or 0.0),
            "per_min_rate": float(config.per_min_rate or 0.0),
            "google_maps_api_key": config.google_maps_api_key or "",
            "account_mode": "open" if config.allow_public_registration else "staged",
        }
    except Exception as e:
        print("Error in GET /setup:", e)
        raise HTTPException(status_code=500, detail="Failed to load setup configuration")


@app.get("/users/me")
def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth_header: Optional[str] = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = auth_header.split(" ")[1]

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise ValueError("Missing sub in token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_approved": user.is_approved,
    }