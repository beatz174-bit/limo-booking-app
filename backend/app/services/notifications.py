"""Notification helper service."""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Callable

import httpx
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import AsyncSessionLocal
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


_DISPATCH_QUEUE_KEY = "_notification_after_commit_callbacks"


@event.listens_for(Session, "after_commit")
def _run_notification_dispatch(session: Session) -> None:
    callbacks: list[Callable[[], None]] = session.info.pop(_DISPATCH_QUEUE_KEY, [])
    for callback in callbacks:
        try:
            callback()
        except Exception:  # pragma: no cover - defensive logging
            logger.exception("Failed to schedule notification dispatch")


@event.listens_for(Session, "after_rollback")
def _clear_notification_dispatch(session: Session) -> None:
    session.info.pop(_DISPATCH_QUEUE_KEY, None)


async def create_notification(
    db: AsyncSession,
    booking_id: uuid.UUID,
    notif_type: NotificationType,
    to_role: UserRole,
    to_user_id: uuid.UUID,
    payload: dict | None = None,
) -> Notification:
    if to_user_id is None:  # pragma: no cover - guardrail for typing
        raise ValueError("to_user_id is required for notification dispatch")

    payload_data = dict(payload or {})
    note = Notification(
        booking_id=booking_id,
        type=notif_type,
        to_role=to_role,
        to_user_id=to_user_id,
        payload=payload_data,
        created_at=datetime.now(timezone.utc),
    )
    db.add(note)
    await db.flush()
    _queue_dispatch_after_commit(
        db,
        to_user_id=to_user_id,
        to_role=to_role,
        notif_type=notif_type,
        payload=payload_data,
    )
    return note


async def dispatch_notification(
    db: async_sessionmaker[AsyncSession],
    to_user_id: uuid.UUID,
    to_role: UserRole,
    notif_type: NotificationType,
    payload: dict[str, Any] | None = None,
) -> None:
    async with db() as session:
        await _send_onesignal(session, to_user_id, to_role, notif_type, payload or {})


async def _send_onesignal(
    db: AsyncSession,
    to_user_id: uuid.UUID,
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

    user = await db.get(UserV2, to_user_id)
    if not user:
        logger.info(
            "Notification recipient missing",
            extra={
                "to_user_id": str(to_user_id),
                "role": to_role.value,
                "type": notif_type.value,
            },
        )
        return

    if user.role is not to_role:
        logger.warning(
            "Notification recipient role mismatch",
            extra={
                "to_user_id": str(to_user_id),
                "expected_role": to_role.value,
                "actual_role": user.role.value,
            },
        )

    player_id = user.onesignal_player_id
    if not player_id:
        logger.info(
            "Notification recipient missing OneSignal ID",
            extra={
                "to_user_id": str(to_user_id),
                "role": to_role.value,
                "type": notif_type.value,
            },
        )
        return

    message: dict[str, Any] = {
        "app_id": settings.onesignal_app_id,
        "include_player_ids": [player_id],
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
                    "player_ids": [player_id],
                    "payload": data,
                    "request_payload": message,
                    "status_code": response.status_code,
                },
            )
            response.raise_for_status()
            logger.info(
                "OneSignal response",
                extra={
                    "player_ids": [player_id],
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
                "player_ids": [player_id] if player_id else [],
                "payload": data,
                "request_payload": message,
                "status_code": status_code,
                "error": str(exc),
            },
        )


def _queue_dispatch_after_commit(
    db: AsyncSession,
    *,
    to_user_id: uuid.UUID,
    to_role: UserRole,
    notif_type: NotificationType,
    payload: dict[str, Any],
) -> None:
    sync_session = db.sync_session
    queue: list[Callable[[], None]] = sync_session.info.setdefault(
        _DISPATCH_QUEUE_KEY, []
    )

    def _schedule() -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:  # pragma: no cover - loop missing (shouldn't happen)
            logger.exception("No running event loop to dispatch notification")
            return
        loop.create_task(
            dispatch_notification(
                AsyncSessionLocal,
                to_user_id=to_user_id,
                to_role=to_role,
                notif_type=notif_type,
                payload=dict(payload),
            )
        )

    queue.append(_schedule)
