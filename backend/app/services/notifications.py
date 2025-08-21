"""Notification helper service."""
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType
from app.models.user_v2 import UserRole


async def create_notification(
    db: AsyncSession,
    booking_id: uuid.UUID,
    notif_type: NotificationType,
    to_role: UserRole,
    payload: dict | None = None,
) -> Notification:
    note = Notification(
        booking_id=booking_id,
        type=notif_type,
        to_role=to_role,
        payload=payload or {},
        created_at=datetime.now(timezone.utc),
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note
