#!/usr/bin/env python3
"""
Simulate driver movement with a random start ~5 km from the pickup.

Requirements:
  pip install httpx websockets
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
from websockets.exceptions import WebSocketException

API_BASE = "http://localhost:8000"  # backend base URL
BOOKING_CODE = "ABC123"  # public booking code from the customer link
DRIVER_TOKEN = "REPLACE_ME"  # JWT for the driver user
POINTS = 120  # samples per leg

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    client: httpx.AsyncClient, a: Tuple[float, float], b: Tuple[float, float]
):
    logger.info("Fetching route metrics from %s to %s", a, b)
    params = {
        "pickupLat": a[0],
        "pickupLon": a[1],
        "dropoffLat": b[0],
        "dropoffLon": b[1],
    }
    r = await client.get(f"{API_BASE}/route-metrics", params=params)
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


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--radius-km",
        type=float,
        default=5.0,
        help="radius in kilometers for the initial random point",
    )
    args = parser.parse_args()
    asyncio.run(simulate(args.radius_km))
