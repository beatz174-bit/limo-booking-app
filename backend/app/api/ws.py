import asyncio
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from broadcaster import Broadcast

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
                await broadcast.publish(channel=channel, message=data)
        except WebSocketDisconnect:
            pass
        finally:
            send_task.cancel()


async def _forward_messages(websocket: WebSocket, subscriber):
    async for event in subscriber:
        await websocket.send_text(event.message)
