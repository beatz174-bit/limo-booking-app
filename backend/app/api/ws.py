import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from app.core.broadcast import broadcast
from app.core.security import decode_token
from app.db.database import AsyncSessionLocal
from app.models.booking import Booking, BookingStatus
from app.models.notification import NotificationType
from app.models.route_point import RoutePoint
from app.models.user_v2 import User, UserRole
from app.services import notifications
from app.services.settings_service import get_admin_user_id
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()


async def send_booking_update(booking: Booking, **fields) -> None:
    """Publish booking updates to the broadcast channel.

    Parameters
    ----------
    booking:
        The updated booking instance.
    fields:
        Additional fields to include in the payload.
    """
    payload = {"id": str(booking.id), "status": booking.status}
    if fields:
        payload.update(fields)
    if getattr(broadcast, "_listener_task", None) is None:
        await broadcast.connect()
    await broadcast.publish(
        channel=f"booking:{booking.id}",
        message=json.dumps(payload, default=str),
    )


@router.websocket("/ws/bookings/{booking_id}")
async def booking_ws(websocket: WebSocket, booking_id: uuid.UUID):
    from app.services import booking_service

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = decode_token(token)
        user_id = uuid.UUID(str(payload["sub"]))
    except Exception:
        await websocket.close(code=1008)
        return

    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        booking = await db.get(Booking, booking_id)
        admin_id = await get_admin_user_id(db)
        # admin_user_id may connect even without DRIVER role
        if (
            user is None
            or booking is None
            or (user.role is not UserRole.DRIVER and user.id != admin_id)
        ):
            await websocket.close(code=1008)
            return

    await websocket.accept()
    channel = f"booking:{booking_id}"
    logger.info(
        "ws connected",
        extra={"booking_id": str(booking_id), "user_id": str(user_id)},
    )
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
                        if booking:
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

                            if booking.status == BookingStatus.DRIVER_CONFIRMED:
                                await booking_service.leave_booking(db, booking_id)
                                await broadcast.publish(
                                    channel=channel,
                                    message=json.dumps({"status": "ON_THE_WAY"}),
                                )
                            elif booking.status == BookingStatus.ON_THE_WAY:
                                distance = booking_service._haversine(
                                    payload["lat"],
                                    payload["lng"],
                                    booking.pickup_lat,
                                    booking.pickup_lng,
                                )
                                if distance < 50:
                                    await booking_service.arrive_pickup(db, booking_id)
                                    await notifications.create_notification(
                                        db,
                                        booking.id,
                                        NotificationType.ARRIVED_PICKUP,
                                        UserRole.CUSTOMER,
                                        {},
                                    )
                                    await broadcast.publish(
                                        channel=channel,
                                        message=json.dumps(
                                            {"status": "ARRIVED_PICKUP"}
                                        ),
                                    )
                            elif booking.status == BookingStatus.IN_PROGRESS:
                                distance = booking_service._haversine(
                                    payload["lat"],
                                    payload["lng"],
                                    booking.dropoff_lat,
                                    booking.dropoff_lng,
                                )
                                if distance < 50:
                                    await booking_service.arrive_dropoff(db, booking_id)
                                    await notifications.create_notification(
                                        db,
                                        booking.id,
                                        NotificationType.ARRIVED_DROPOFF,
                                        UserRole.CUSTOMER,
                                        {},
                                    )
                                    await broadcast.publish(
                                        channel=channel,
                                        message=json.dumps(
                                            {"status": "ARRIVED_DROPOFF"}
                                        ),
                                    )
                await broadcast.publish(channel=channel, message=data)
        except WebSocketDisconnect:
            logger.info(
                "ws disconnected",
                extra={"booking_id": str(booking_id), "user_id": str(user_id)},
            )
        except Exception:
            logger.exception(
                "ws error",
                extra={"booking_id": str(booking_id), "user_id": str(user_id)},
            )
        finally:
            send_task.cancel()


@router.websocket("/ws/bookings/{booking_id}/watch")
async def booking_watch_ws(websocket: WebSocket, booking_id: uuid.UUID):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = decode_token(token)
        user_id = uuid.UUID(str(payload["sub"]))
    except Exception:
        await websocket.close(code=1008)
        return

    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        booking = await db.get(Booking, booking_id)
        if user is None or booking is None or user.id != booking.customer_id:
            await websocket.close(code=1008)
            return

    await websocket.accept()
    channel = f"booking:{booking_id}"
    logger.info(
        "watch ws connected",
        extra={"booking_id": str(booking_id), "user_id": str(user_id)},
    )
    async with broadcast.subscribe(channel=channel) as subscriber:
        send_task = asyncio.create_task(_forward_messages(websocket, subscriber))
        try:
            while True:
                try:
                    await websocket.receive_text()
                except WebSocketDisconnect:
                    raise
        except WebSocketDisconnect:
            logger.info(
                "watch ws disconnected",
                extra={"booking_id": str(booking_id), "user_id": str(user_id)},
            )
        except Exception:
            logger.exception(
                "watch ws error",
                extra={"booking_id": str(booking_id), "user_id": str(user_id)},
            )
        finally:
            send_task.cancel()


async def _forward_messages(websocket: WebSocket, subscriber):
    async for event in subscriber:
        logger.debug("forward", extra={"message": event.message})
        await websocket.send_text(event.message)
