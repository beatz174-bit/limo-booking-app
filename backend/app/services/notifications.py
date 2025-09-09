"""Notification helper service."""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from app.core.config import get_settings
from app.models.notification import Notification, NotificationType
from app.models.user_v2 import User as UserV2
from app.models.user_v2 import UserRole
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

logger = logging.getLogger(__name__)

notification_map: dict[NotificationType, dict[str, str]] = {
    NotificationType.NEW_BOOKING: {
        "title": "New booking",
        "body": "You have a new booking",
    },
    NotificationType.CONFIRMATION: {
        "title": "Booking confirmed",
        "body": "Your booking has been confirmed",
    },
    NotificationType.LEAVE_NOW: {
        "title": "Time to leave",
        "body": "Please leave now for your ride",
    },
    NotificationType.ON_THE_WAY: {
        "title": "Driver on the way",
        "body": "Your driver is on the way",
    },
    NotificationType.ARRIVED_PICKUP: {
        "title": "Driver arrived",
        "body": "Your driver has arrived at the pickup location",
    },
    NotificationType.STARTED: {
        "title": "Ride started",
        "body": "Your ride has started",
    },
    NotificationType.ARRIVED_DROPOFF: {
        "title": "Arrived at dropoff",
        "body": "You have arrived at your destination",
    },
    NotificationType.COMPLETED: {
        "title": "Ride completed",
        "body": "Your ride is complete",
    },
}


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
    await db.flush()
    return note


async def dispatch_notification(
    db: async_sessionmaker[AsyncSession],
    to_role: UserRole,
    notif_type: NotificationType,
    payload: dict[str, Any] | None = None,
) -> None:
    async with db() as session:
        await _send_fcm(session, to_role, notif_type, payload or {})


async def _send_fcm(
    db: AsyncSession,
    to_role: UserRole,
    notif_type: NotificationType,
    payload: dict[str, Any],
) -> None:
    """Send a Firebase Cloud Messaging push if credentials are configured.

    The function safely no-ops when any required key is missing or when the HTTP
    request fails. Messages are delivered to a topic matching the target role so
    that the single driver and any customers can subscribe independently.
    """

    settings = get_settings()
    if not (
        settings.fcm_project_id
        and settings.fcm_client_email
        and settings.fcm_private_key
    ):
        logger.warning(
            "FCM disabled",
            extra={
                "fcm_project_id": settings.fcm_project_id,
                "fcm_client_email": settings.fcm_client_email,
                "fcm_private_key_len": len(settings.fcm_private_key or ""),
            },
        )
        return

    now = int(datetime.now(timezone.utc).timestamp())
    claim = {
        "iss": settings.fcm_client_email,
        "sub": settings.fcm_client_email,
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
        "scope": "https://www.googleapis.com/auth/firebase.messaging",
    }
    assertion = jwt.encode(
        claim,
        settings.fcm_private_key.replace("\\n", "\n"),
        algorithm="RS256",
    )
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": assertion,
                },
            )
            token_resp.raise_for_status()
            access_token = token_resp.json().get("access_token")
            if not access_token:
                return

            data = {"type": notif_type.value}
            for k, v in payload.items():
                data[k] = json.dumps(v) if not isinstance(v, str) else v

            notification = notification_map.get(notif_type)
            if notification:
                notification = {k: str(v) for k, v in notification.items()}

            result = await db.execute(
                select(UserV2.fcm_token).where(
                    UserV2.role == to_role, UserV2.fcm_token.is_not(None)
                )
            )
            tokens = result.scalars().all()

            if tokens:
                for token in tokens:
                    message = {
                        "message": {
                            "token": token,
                            "data": data,
                            "webpush": {"notification": notification},
                        }
                    }
                    logger.info("FCM request: %s", message)
                    response = await client.post(
                        f"https://fcm.googleapis.com/v1/projects/{settings.fcm_project_id}/messages:send",
                        headers={"Authorization": f"Bearer {access_token}"},
                        json=message,
                    )
                    logger.info("FCM response: %s", response.json())
            else:
                message = {
                    "message": {
                        "topic": to_role.value.lower(),
                        "data": data,
                        "webpush": {"notification": notification},
                    }
                }
                logger.info("FCM request: %s", message)
                response = await client.post(
                    f"https://fcm.googleapis.com/v1/projects/{settings.fcm_project_id}/messages:send",
                    headers={"Authorization": f"Bearer {access_token}"},
                    json=message,
                )
                logger.info("FCM response: %s", response.json())
        except httpx.HTTPError:
            logger.exception("FCM send failed")
            # Silently ignore push delivery issues to keep core flow resilient
            return
