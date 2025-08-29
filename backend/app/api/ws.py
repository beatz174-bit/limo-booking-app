import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from broadcaster import Broadcast
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.db.database import AsyncSessionLocal
from app.models.booking import Booking, BookingStatus
from app.models.route_point import RoutePoint

logger = logging.getLogger(__name__)
router = APIRouter()
broadcast = Broadcast("memory://")


@router.websocket("/ws/bookings/{booking_id}")
async def booking_ws(websocket: WebSocket, booking_id: uuid.UUID):
    await websocket.accept()
    channel = f"booking:{booking_id}"
    logger.info("ws connected", extra={"booking_id": str(booking_id)})
    async with broadcast.subscribe(channel=channel) as subscriber:
        send_task = asyncio.create_task(_forward_messages(websocket, subscriber))
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    payload = json.loads(data)
                except json.JSONDecodeError:
                    logger.warning(
                        "invalid json",
                        extra={"booking_id": str(booking_id), "data": data},
                    )
                    payload = None
                if isinstance(payload, dict) and {"lat", "lng", "ts"} <= payload.keys():
                    async with AsyncSessionLocal() as db:
                        booking = await db.get(Booking, booking_id)
                        if booking and booking.status == BookingStatus.IN_PROGRESS:
                            point = RoutePoint(
                                booking_id=booking_id,
                                ts=datetime.fromtimestamp(payload["ts"], timezone.utc),
                                lat=payload["lat"],
                                lng=payload["lng"],
                                speed=payload.get("speed"),
                            )
                            db.add(point)
                            await db.commit()
                            logger.debug(
                                "route point saved",
                                extra={
                                    "booking_id": str(booking_id),
                                    "lat": payload["lat"],
                                    "lng": payload["lng"],
                                },
                            )
                await broadcast.publish(channel=channel, message=data)
        except WebSocketDisconnect:
            logger.info("ws disconnected", extra={"booking_id": str(booking_id)})
        except Exception:
            logger.exception("ws error", extra={"booking_id": str(booking_id)})
        finally:
            send_task.cancel()


async def _forward_messages(websocket: WebSocket, subscriber):
    async for event in subscriber:
        logger.debug("forward", extra={"message": event.message})
        await websocket.send_text(event.message)
