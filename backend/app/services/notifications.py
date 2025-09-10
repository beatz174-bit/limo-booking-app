"""Notification helper service."""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.models.notification import Notification, NotificationType
from app.models.user_v2 import User as UserV2
from app.models.user_v2 import UserRole

logger = logging.getLogger(__name__)

notification_map: dict[NotificationType, dict[str, str]] = {
    NotificationType.NEW_BOOKING: {
        "headings": "New booking",
        "contents": "You have a new booking",
    },
    NotificationType.CONFIRMATION: {
        "headings": "Booking confirmed",
        "contents": "Your booking has been confirmed",
    },
    NotificationType.LEAVE_NOW: {
        "headings": "Time to leave",
        "contents": "Please leave now for your ride",
    },
    NotificationType.ON_THE_WAY: {
        "headings": "Driver on the way",
        "contents": "Your driver is on the way",
    },
    NotificationType.ARRIVED_PICKUP: {
        "headings": "Driver arrived",
        "contents": "Your driver has arrived at the pickup location",
    },
    NotificationType.STARTED: {
        "headings": "Ride started",
        "contents": "Your ride has started",
    },
    NotificationType.ARRIVED_DROPOFF: {
        "headings": "Arrived at dropoff",
        "contents": "You have arrived at your destination",
    },
    NotificationType.COMPLETED: {
        "headings": "Ride completed",
        "contents": "Your ride is complete",
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
        await _send_onesignal(session, to_role, notif_type, payload or {})


async def _send_onesignal(
    db: AsyncSession,
    to_role: UserRole,
    notif_type: NotificationType,
    payload: dict[str, Any],
) -> None:
    """Send a OneSignal push if credentials are configured.

    The function safely no-ops when required settings are missing or when the HTTP
    request fails. Messages are delivered to each stored player ID for the target
    role.
    """

    settings = get_settings()
    if not (settings.onesignal_app_id and settings.onesignal_api_key):
        logger.warning(
            "OneSignal disabled",
            extra={
                "onesignal_app_id": settings.onesignal_app_id,
                "has_onesignal_api_key": bool(settings.onesignal_api_key),
            },
        )
        return

    data = {"type": notif_type.value}
    for k, v in payload.items():
        data[k] = json.dumps(v) if not isinstance(v, str) else v

    notification = notification_map.get(notif_type)

    result = await db.execute(
        select(UserV2.onesignal_player_id).where(
            UserV2.role == to_role, UserV2.onesignal_player_id.is_not(None)
        )
    )
    try:
        raw_result = result.all()
        player_ids = [row[0] for row in raw_result]
    except AttributeError:
        player_ids = result.scalars().all()
        raw_result = [(pid,) for pid in player_ids]
    logger.info(
        "Queried OneSignal player IDs",
        extra={
            "role": to_role.value,
            "raw_result": raw_result,
            "count": len(player_ids),
        },
    )

    if not player_ids:
        logger.info(
            "No OneSignal player IDs",
            extra={"role": to_role.value, "payload": data},
        )
        return

    message: dict[str, Any] = {
        "app_id": settings.onesignal_app_id,
        "include_player_ids": player_ids,
        "data": data,
    }
    if notification:
        message["headings"] = {"en": str(notification.get("headings", ""))}
        message["contents"] = {"en": str(notification.get("contents", ""))}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://onesignal.com/api/v1/notifications",
                headers={"Authorization": f"Basic {settings.onesignal_api_key}"},
                json=message,
            )
            logger.info(
                "OneSignal request",
                extra={
                    "player_ids": player_ids,
                    "payload": data,
                    "request_payload": message,
                    "status_code": response.status_code,
                },
            )
            response.raise_for_status()
            logger.info(
                "OneSignal response",
                extra={
                    "player_ids": player_ids,
                    "payload": data,
                    "request_payload": message,
                    "status_code": response.status_code,
                    "response": response.json(),
                },
            )
    except httpx.HTTPError as exc:
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        logger.exception(
            "OneSignal send failed",
            extra={
                "player_ids": player_ids,
                "payload": data,
                "request_payload": message,
                "status_code": status_code,
                "error": str(exc),
            },
        )
