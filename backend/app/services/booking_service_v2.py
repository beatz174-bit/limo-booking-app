"""Service layer for booking lifecycle operations."""
import secrets
import uuid

from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_v2 import User, UserRole
from app.models.booking_v2 import Booking, BookingStatus
from app.models.settings import AdminConfig
from app.schemas.api_booking import BookingCreateRequest
from app.services import pricing_service, routing, stripe_client

async def create_booking(db: AsyncSession, data: BookingCreateRequest) -> tuple[Booking, str]:
    """Create a booking and corresponding Stripe SetupIntent."""
    now = datetime.now(timezone.utc)
    if data.pickup_when <= now:
        raise ValueError("pickup time must be in the future")

    result = await db.execute(select(User).where(User.email == data.customer.email))
    customer = result.scalar_one_or_none()
    if customer is None:
        customer = User(email=data.customer.email, name=data.customer.name, role=UserRole.CUSTOMER)
        db.add(customer)
        await db.flush()

    settings = (await db.execute(select(AdminConfig))).scalar_one()
    distance_km, duration_min = await routing.estimate_route(
        data.pickup.lat,
        data.pickup.lng,
        data.dropoff.lat,
        data.dropoff.lng,
    )
    estimate_cents = pricing_service.estimate_fare(settings, distance_km, duration_min)
    deposit = estimate_cents // 2
    code = secrets.token_urlsafe(3).upper()

    booking = Booking(
        public_code=code,
        customer_id=customer.id,
        pickup_address=data.pickup.address,
        pickup_lat=data.pickup.lat,
        pickup_lng=data.pickup.lng,
        dropoff_address=data.dropoff.address,
        dropoff_lat=data.dropoff.lat,
        dropoff_lng=data.dropoff.lng,
        pickup_when=data.pickup_when,
        notes=data.notes,
        passengers=data.passengers,
        estimated_price_cents=estimate_cents,
        deposit_required_cents=deposit,
        status=BookingStatus.PENDING,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    setup_intent = stripe_client.create_setup_intent(data.customer.email)
    client_secret = setup_intent.client_secret
    return booking, client_secret

async def confirm_booking(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
    """Confirm a pending booking and charge the deposit."""
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.status is not BookingStatus.PENDING:
        raise ValueError("booking cannot be confirmed")

    intent = stripe_client.charge_deposit(booking.deposit_required_cents)
    booking.status = BookingStatus.DRIVER_CONFIRMED
    booking.deposit_payment_intent_id = intent.id
    await db.commit()
    await db.refresh(booking)
    return booking


async def decline_booking(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
    """Decline a pending booking."""
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.status is not BookingStatus.PENDING:
        raise ValueError("booking cannot be declined")

    booking.status = BookingStatus.DECLINED
    await db.commit()
    await db.refresh(booking)
    return booking
