import asyncio
import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from broadcaster import Broadcast

from app.db.database import AsyncSessionLocal
from app.models.booking_v2 import Booking, BookingStatus
from app.models.route_point import RoutePoint

router = APIRouter()
broadcast = Broadcast("memory://")


@router.websocket("/ws/bookings/{booking_id}")
async def booking_ws(websocket: WebSocket, booking_id: uuid.UUID):
    await websocket.accept()
    channel = f"booking:{booking_id}"
    async with broadcast.subscribe(channel=channel) as subscriber:
        send_task = asyncio.create_task(_forward_messages(websocket, subscriber))
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    payload = json.loads(data)
                except json.JSONDecodeError:
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

                await broadcast.publish(channel=channel, message=data)
        except WebSocketDisconnect:
            pass
        finally:
            send_task.cancel()


async def _forward_messages(websocket: WebSocket, subscriber):
    async for event in subscriber:
        await websocket.send_text(event.message)
