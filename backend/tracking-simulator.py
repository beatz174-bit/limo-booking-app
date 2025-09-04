#!/usr/bin/env python3
"""
Simulate driver movement with a random start ~5 km from the pickup.

Requirements:
  pip install httpx websockets

Example:
  python tracking-simulator.py --booking ABC123 --token <JWT>
  python tracking-simulator.py --booking ABC123 --email user@example.com
  python tracking-simulator.py --api-base http://localhost:8000 \
    --booking ABC123 --distance-km 10 --points 200
"""

import argparse
import asyncio
import getpass
import json
import logging
import math
import random
import time
from typing import Iterable, Tuple

import httpx
import websockets
from sqlalchemy import select
from websockets.exceptions import WebSocketException

from app.db.database import AsyncSessionLocal
from app.models.booking import Booking, BookingStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def fetch_driver_confirmed_bookings():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(
                Booking.id,
                Booking.public_code,
                Booking.pickup_address,
                Booking.dropoff_address,
            ).where(Booking.status == BookingStatus.DRIVER_CONFIRMED)
        )
        return result.all()


DEFAULT_API_BASE = "http://localhost:8000"
DEFAULT_DISTANCE_KM = 5.0
DEFAULT_POINTS = 120


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--api-base",
        default=DEFAULT_API_BASE,
        help="backend base URL",
    )
    parser.add_argument(
        "--booking",
        help="public booking code from the customer link",
    )
    parser.add_argument(
        "--token",
        help="driver JWT for authentication",
    )
    parser.add_argument("--email", help="driver email for authentication")
    parser.add_argument("--password", help="driver password for authentication")
    parser.add_argument(
        "--distance-km",
        type=float,
        default=DEFAULT_DISTANCE_KM,
        help="starting distance from pickup in km",
    )
    parser.add_argument(
        "--points",
        type=int,
        default=DEFAULT_POINTS,
        help="samples per leg (min 2)",
    )
    args = parser.parse_args()
    if args.points < 2:
        parser.error("--points must be at least 2")
    return args


async def login(api_base: str, email: str, password: str) -> str:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{api_base}/auth/login", json={"email": email, "password": password}
        )
        if r.status_code == 200:
            return r.json()["token"]
        logger.error("Authentication failed with status %s: %s", r.status_code, r.text)
        raise SystemExit(1)


# --- helpers -----------------------------------------------------------------
def interpolate(
    a: Tuple[float, float], b: Tuple[float, float], n: int
) -> Iterable[Tuple[float, float]]:
    for i in range(n):
        t = i / (n - 1)
        yield (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))


def random_point_near(
    lat: float, lng: float, distance_km: float = 5.0
) -> Tuple[float, float]:
    """Return a point `distance_km` away from (lat,lng) in a random direction."""
    R = 6371.0
    bearing = math.radians(random.uniform(0, 360))
    d = distance_km / R
    lat1 = math.radians(lat)
    lng1 = math.radians(lng)

    lat2 = math.asin(
        math.sin(lat1) * math.cos(d) + math.cos(lat1) * math.sin(d) * math.cos(bearing)
    )
    lng2 = lng1 + math.atan2(
        math.sin(bearing) * math.sin(d) * math.cos(lat1),
        math.cos(d) - math.sin(lat1) * math.sin(lat2),
    )
    return (math.degrees(lat2), math.degrees(lng2))


async def route_metrics(
    client: httpx.AsyncClient,
    api_base: str,
    a: Tuple[float, float],
    b: Tuple[float, float],
) -> dict:
    logger.info("Fetching route metrics from %s to %s", a, b)
    params = {
        "pickupLat": a[0],
        "pickupLon": a[1],
        "dropoffLat": b[0],
        "dropoffLon": b[1],
    }
    r = await client.get(f"{api_base}/route-metrics", params=params)
    r.raise_for_status()
    metrics = r.json()
    logger.info("Route metrics: %s", metrics)
    return metrics


# --- websocket helpers ------------------------------------------------------
async def _keepalive(ws: websockets.WebSocketClientProtocol) -> None:
    try:
        while True:
            msg = await ws.recv()
            logger.debug("Received message: %s", msg)
    except websockets.ConnectionClosed:
        pass


# --- main simulation ---------------------------------------------------------
async def simulate(
    api_base: str, booking_code: str, token: str, distance_km: float, points: int
) -> None:
    SPEEDUP_FACTOR = 20
    transport = httpx.AsyncHTTPTransport(retries=3)
    async with httpx.AsyncClient(
        transport=transport, headers={"Authorization": f"Bearer {token}"}
    ) as client:
        try:
            # 1. Get booking + ws_url
            r = await client.get(f"{api_base}/api/v1/track/{booking_code}")
            r.raise_for_status()
            data = r.json()
            booking = data["booking"]
            booking_id = booking["id"]
            base_ws_url = data["ws_url"].split("/ws/")[0]
            ws_url = f"{base_ws_url}/ws/bookings/{booking_id}?token={token}"

            pickup = (booking["pickup_lat"], booking["pickup_lng"])
            dropoff = (booking["dropoff_lat"], booking["dropoff_lng"])
            start = random_point_near(*pickup, distance_km=distance_km)

            # Metrics for both legs
            leg1 = await route_metrics(client, api_base, start, pickup)
            leg2 = await route_metrics(client, api_base, pickup, dropoff)
        except httpx.HTTPError:
            logger.exception("HTTP request failed; aborting simulation")
            return

        try:
            async with websockets.connect(ws_url) as ws:
                recv_task = asyncio.create_task(_keepalive(ws))
                try:
                    # --- leg 1: home -> pickup
                    duration1 = leg1["min"] * 60
                    interval1 = duration1 / points / SPEEDUP_FACTOR
                    speed1 = leg1["km"] / (leg1["min"] / 60) * SPEEDUP_FACTOR

                    for lat, lng in interpolate(start, pickup, points):
                        await ws.send(
                            json.dumps(
                                {
                                    "lat": lat,
                                    "lng": lng,
                                    "ts": int(time.time()),
                                    "speed": speed1,
                                }
                            )
                        )
                        await asyncio.sleep(interval1)

                    r = await client.post(
                        f"{api_base}/api/v1/driver/bookings/{booking_id}/start-trip"
                    )
                    r.raise_for_status()

                    # --- leg 2: pickup -> dropoff
                    duration2 = leg2["min"] * 60
                    interval2 = duration2 / points / SPEEDUP_FACTOR
                    speed2 = leg2["km"] / (leg2["min"] / 60) * SPEEDUP_FACTOR

                    for lat, lng in interpolate(pickup, dropoff, points):
                        await ws.send(
                            json.dumps(
                                {
                                    "lat": lat,
                                    "lng": lng,
                                    "ts": int(time.time()),
                                    "speed": speed2,
                                }
                            )
                        )
                        await asyncio.sleep(interval2)

                    r = await client.post(
                        f"{api_base}/api/v1/driver/bookings/{booking_id}/complete"
                    )
                    r.raise_for_status()
                finally:
                    recv_task.cancel()
                    try:
                        await recv_task
                    except asyncio.CancelledError:
                        pass
        except WebSocketException:
            logger.exception("WebSocket error; aborting simulation")
            return

    logger.info("Simulation completed")


def select_booking_interactively() -> str:
    bookings = asyncio.run(fetch_driver_confirmed_bookings())
    if not bookings:
        logger.error("No driver confirmed bookings found.")
        raise SystemExit(1)
    for idx, (_, code, pickup, dropoff) in enumerate(bookings, start=1):
        print(f"{idx}. {pickup} -> {dropoff} ({code})")
    while True:
        choice = input("Select booking: ")
        if choice.isdigit() and 1 <= int(choice) <= len(bookings):
            return bookings[int(choice) - 1][1]
        print("Invalid selection.")


def main() -> None:
    args = parse_args()
    booking_code = args.booking or select_booking_interactively()
    token = args.token
    if not token:
        email = args.email or input("Email: ")
        password = args.password or getpass.getpass("Password: ")
        token = asyncio.run(login(args.api_base, email, password))
    asyncio.run(
        simulate(
            api_base=args.api_base,
            booking_code=booking_code,
            token=token,
            distance_km=args.distance_km,
            points=args.points,
        )
    )


if __name__ == "__main__":
    main()
