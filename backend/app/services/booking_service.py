"""Service layer for booking lifecycle operations."""

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from math import atan2, cos, radians, sin, sqrt

import stripe
from app.models.availability_slot import AvailabilitySlot
from app.models.booking import Booking, BookingStatus
from app.models.notification import NotificationType
from app.models.route_point import RoutePoint
from app.models.settings import AdminConfig
from app.models.trip import Trip
from app.models.user_v2 import User, UserRole
from app.schemas.api_booking import BookingCreateRequest
from app.services import notifications, pricing_service, routing, stripe_client
from app.services.booking_updates import send_booking_update
from app.services.settings_service import get_admin_user_id
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def create_booking(
    db: AsyncSession, data: BookingCreateRequest, user: User
) -> Booking:
    """Create a booking for a customer."""
    # ``pickup_when`` is normalized to UTC by the request schema validator.
    now_utc = datetime.now(timezone.utc)
    if data.pickup_when <= now_utc:
        raise ValueError("pickup time must be in the future")

    customer = user

    if not customer.stripe_payment_method_id:
        raise ValueError("default payment method required")

    settings = (await db.execute(select(AdminConfig))).scalar_one_or_none()
    if settings is None:
        settings = AdminConfig(
            account_mode=False,
            flagfall=0,
            per_km_rate=0,
            per_minute_rate=0,
        )
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
    await db.flush()
    admin_user_id = await get_admin_user_id(db)
    await notifications.create_notification(
        db,
        booking.id,
        NotificationType.NEW_BOOKING,
        UserRole.DRIVER,
        admin_user_id,
        {"booking_id": str(booking.id)},
    )
    await db.commit()
    await db.refresh(booking)
    return booking


async def confirm_booking(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
    """Confirm a pending booking and charge the deposit."""
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.status not in {
        BookingStatus.PENDING,
        BookingStatus.DEPOSIT_FAILED,
    }:
        raise ValueError("booking cannot be confirmed")
    buffer = timedelta(minutes=30)
    block_start = booking.pickup_when - buffer
    block_end = booking.pickup_when + timedelta(hours=1) + buffer
    overlap = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.end_dt > block_start,
            AvailabilitySlot.start_dt < block_end,
        )
    )
    if overlap.scalars().first():
        raise ValueError("booking overlaps existing slot")

    customer = await db.get(User, booking.customer_id)
    if (
        not customer
        or not customer.stripe_payment_method_id
        or not customer.stripe_customer_id
    ):
        raise ValueError("customer has no payment method")
    try:
        intent = stripe_client.charge_deposit(
            booking.deposit_required_cents,
            booking.id,
            public_code=booking.public_code,
            customer_email=customer.email,
            pickup_address=booking.pickup_address,
            dropoff_address=booking.dropoff_address,
            pickup_time=booking.pickup_when,
            payment_method=customer.stripe_payment_method_id,
            customer_id=customer.stripe_customer_id,
        )
    except stripe.error.CardError as exc:
        raise HTTPException(status_code=402, detail=exc.user_message) from exc
    except stripe.error.StripeError as exc:
        booking.status = BookingStatus.DEPOSIT_FAILED
        await db.commit()
        await db.refresh(booking)
        raise HTTPException(
            status_code=400, detail="Failed to process deposit"
        ) from exc

    booking.status = BookingStatus.DRIVER_CONFIRMED
    booking.deposit_payment_intent_id = intent.id
    slot = AvailabilitySlot(
        start_dt=block_start, end_dt=block_end, reason=f"BOOKING:{booking.id}"
    )
    db.add(slot)
    await db.commit()
    await db.refresh(booking)
    await send_booking_update(booking)
    return booking


async def retry_deposit(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
    """Retry charging the deposit for a booking."""
    return await confirm_booking(db, booking_id)


async def decline_booking(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
    """Decline a pending booking."""
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.status is not BookingStatus.PENDING:
        raise ValueError("booking cannot be declined")

    booking.status = BookingStatus.DECLINED
    await db.commit()
    await db.refresh(booking)
    await send_booking_update(booking)
    return booking


async def leave_booking(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
    """Mark a confirmed booking as on the way."""
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.status is not BookingStatus.DRIVER_CONFIRMED:
        raise ValueError("booking cannot be left")
    booking.status = BookingStatus.ON_THE_WAY
    await db.commit()
    await db.refresh(booking)
    await send_booking_update(booking)
    return booking


async def arrive_pickup(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.status is not BookingStatus.ON_THE_WAY:
        raise ValueError("booking cannot arrive at pickup")
    booking.status = BookingStatus.ARRIVED_PICKUP
    await db.commit()
    await db.refresh(booking)
    await send_booking_update(booking)
    return booking


async def start_trip(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.status is not BookingStatus.ARRIVED_PICKUP:
        raise ValueError("booking cannot start trip")
    booking.status = BookingStatus.IN_PROGRESS
    trip = Trip(booking_id=booking.id, started_at=datetime.now(timezone.utc))
    db.add(trip)
    await db.commit()
    await db.refresh(booking)
    await send_booking_update(booking)
    return booking


async def arrive_dropoff(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.status is not BookingStatus.IN_PROGRESS:
        raise ValueError("booking cannot arrive dropoff")
    booking.status = BookingStatus.ARRIVED_DROPOFF
    trip = (
        await db.execute(select(Trip).where(Trip.booking_id == booking.id))
    ).scalar_one()
    trip.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(booking)
    await send_booking_update(booking)
    return booking


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    )
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


async def complete_booking(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.status is not BookingStatus.ARRIVED_DROPOFF:
        raise ValueError("booking cannot be completed")

    points = (
        (
            await db.execute(
                select(RoutePoint)
                .where(RoutePoint.booking_id == booking.id)
                .order_by(RoutePoint.ts)
            )
        )
        .scalars()
        .all()
    )
    distance = 0.0
    for p1, p2 in zip(points, points[1:]):
        distance += _haversine(p1.lat, p1.lng, p2.lat, p2.lng)
    duration = 0
    if points:
        duration = int((points[-1].ts - points[0].ts).total_seconds())

    trip = (
        await db.execute(select(Trip).where(Trip.booking_id == booking.id))
    ).scalar_one()
    trip.distance_meters = int(distance)
    trip.duration_seconds = duration
    trip.started_at = points[0].ts if points else trip.started_at
    trip.ended_at = points[-1].ts if points else trip.ended_at

    settings = (await db.execute(select(AdminConfig))).scalar_one()
    fare = pricing_service.estimate_fare(settings, distance / 1000, duration / 60)
    if fare < booking.deposit_required_cents:
        raise ValueError("final fare less than deposit")
    remainder = fare - booking.deposit_required_cents
    customer = await db.get(User, booking.customer_id)
    if (
        not customer
        or not customer.stripe_payment_method_id
        or not customer.stripe_customer_id
    ):
        raise ValueError("customer has no payment method")
    intent = stripe_client.charge_final(
        remainder,
        booking.id,
        public_code=booking.public_code,
        customer_email=customer.email,
        pickup_address=booking.pickup_address,
        dropoff_address=booking.dropoff_address,
        pickup_time=booking.pickup_when,
        payment_method=customer.stripe_payment_method_id,
        customer_id=customer.stripe_customer_id,
    )
    booking.final_price_cents = fare
    booking.final_payment_intent_id = intent.id
    booking.status = BookingStatus.COMPLETED
    await db.commit()
    await db.refresh(booking)
    await send_booking_update(booking, final_price_cents=booking.final_price_cents)
    return booking
