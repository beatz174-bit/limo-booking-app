"""Scheduler for leave-now notifications."""
import uuid
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import get_settings
from app.db.database import AsyncSessionLocal
from app.services import routing, notifications
from app.models.notification import NotificationType
from app.models.user_v2 import UserRole

settings = get_settings()
scheduler = AsyncIOScheduler(timezone=settings.app_tz)


async def compute_leave_at(booking) -> datetime:
    """Calculate when the driver should leave for pickup."""
    _, duration_min = await routing.estimate_route(
        settings.driver_base_lat,
        settings.driver_base_lng,
        booking.pickup_lat,
        booking.pickup_lng,
    )
    return booking.pickup_when - timedelta(minutes=duration_min + settings.leave_buffer_min)


async def schedule_leave_now(booking):
    leave_at = await compute_leave_at(booking)
    scheduler.add_job(_leave_now_job, 'date', run_date=leave_at, args=[booking.id])
    return leave_at


async def _leave_now_job(booking_id: uuid.UUID):
    async with AsyncSessionLocal() as session:
        await notifications.create_notification(
            session,
            booking_id,
            NotificationType.LEAVE_NOW,
            UserRole.DRIVER,
            {},
        )
