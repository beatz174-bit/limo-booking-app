"""Utilities for broadcasting booking updates to websocket subscribers."""

from __future__ import annotations

import json
from typing import Any

from app.core.broadcast import broadcast
from app.models.booking import Booking


async def send_booking_update(booking: Booking, **fields: Any) -> None:
    """Publish booking updates to the broadcast channel."""

    payload: dict[str, Any] = {"id": str(booking.id), "status": booking.status}
    if fields:
        payload.update(fields)
    if getattr(broadcast, "_listener_task", None) is None:
        await broadcast.connect()
    await broadcast.publish(
        channel=f"booking:{booking.id}",
        message=json.dumps(payload, default=str),
    )
