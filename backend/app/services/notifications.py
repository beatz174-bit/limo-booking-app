"""Notification helper service."""

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
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
    await _send_fcm(to_role, notif_type, payload or {})
    return note


async def _send_fcm(
    to_role: UserRole, notif_type: NotificationType, payload: dict[str, Any]
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
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
        )
        if token_resp.status_code != 200:
            return
        access_token = token_resp.json().get("access_token")
        if not access_token:
            return

        data = {"type": notif_type.value}
        for k, v in payload.items():
            data[k] = json.dumps(v) if not isinstance(v, str) else v

        message = {
            "message": {
                "topic": to_role.value.lower(),
                "data": data,
            }
        }

        url = (
            "https://fcm.googleapis.com/v1/projects/"
            f"{settings.fcm_project_id}/messages:send"
        )
        try:
            await client.post(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                json=message,
            )
        except httpx.HTTPError:
            # Silently ignore push delivery issues to keep core flow resilient
            return
