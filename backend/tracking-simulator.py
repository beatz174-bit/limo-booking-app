#!/usr/bin/env python3
"""
Simulate driver movement with a random start ~5 km from the pickup.

Requirements:
  pip install httpx websockets

Example:
  python tracking-simulator.py --booking ABC123
  python tracking-simulator.py --api-base http://localhost:8000 \
    --booking ABC123 --distance-km 10 --points 200
"""

import argparse
import asyncio
import json
import logging
import math
import random
import time
from typing import Iterable, Tuple

import httpx
import websockets
from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from app.models.booking import Booking, BookingStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_BASE = "http://localhost:8000"  # backend base URL
POINTS = 120  # samples per leg


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
DEFAULT_BOOKING_CODE = "ABC123"
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
        default=DEFAULT_BOOKING_CODE,
        help="public booking code from the customer link",
    )
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
        help="samples per leg",
    )
    return parser.parse_args()

DEFAULT_API_BASE = "http://localhost:8000"
DEFAULT_BOOKING_CODE = "ABC123"
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
        default=DEFAULT_BOOKING_CODE,
        help="public booking code from the customer link",
    )
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
        help="samples per leg",
    )
    return parser.parse_args()


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







# --- main simulation ---------------------------------------------------------
async def simulate():
    transport = httpx.AsyncHTTPTransport(retries=3)
    try:
        async with httpx.AsyncClient(transport=transport) as client:
            # 1. Get booking + ws_url
            r = await client.get(f"{API_BASE}/api/v1/track/{BOOKING_CODE}")
            r.raise_for_status()
            data = r.json()
            booking = data["booking"]
            ws_url = data["ws_url"]

            pickup = (booking["pickup_lat"], booking["pickup_lng"])
            dropoff = (booking["dropoff_lat"], booking["dropoff_lng"])
            start = random_point_near(*pickup, distance_km=5.0)

            # Metrics for both legs
            leg1 = await route_metrics(client, start, pickup)
            leg2 = await route_metrics(client, pickup, dropoff)
    except httpx.HTTPError:
        logger.exception("HTTP request failed; aborting simulation")
        return

    try:
        async with websockets.connect(ws_url) as ws:
            # --- leg 1: home -> pickup
            duration1 = leg1["min"] * 60
            interval1 = duration1 / POINTS
            speed1 = leg1["km"] / (leg1["min"] / 60)

            for lat, lng in interpolate(start, pickup, POINTS):
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

            # --- leg 2: pickup -> dropoff
            duration2 = leg2["min"] * 60
            interval2 = duration2 / POINTS
            speed2 = leg2["km"] / (leg2["min"] / 60)

            for lat, lng in interpolate(pickup, dropoff, POINTS):
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
    except WebSocketException:
        logger.exception("WebSocket error; aborting simulation")
        return



        logger.info("Simulation completed")



async def main():
    parser = argparse.ArgumentParser(description="Simulate driver movement")
    parser.add_argument("--booking-code", help="Public booking code to use")
    args = parser.parse_args()

    booking_code = args.booking_code
    if not booking_code:
        bookings = await fetch_driver_confirmed_bookings()
        if not bookings:
            print("No driver confirmed bookings found.")
            return
        for idx, (_, code, pickup, dropoff) in enumerate(bookings, start=1):
            print(f"{idx}. {pickup} -> {dropoff} ({code})")
        while True:
            choice = input("Select booking: ")
            if choice.isdigit() and 1 <= int(choice) <= len(bookings):
                booking_code = bookings[int(choice) - 1][1]
                break
            print("Invalid selection.")

    await simulate(booking_code)




if __name__ == "__main__":
    args = parse_args()
    asyncio.run(
        simulate(
            api_base=args.api_base,
            booking_code=args.booking,
            distance_km=args.distance_km,
            points=args.points,
        )
    )
