#!/usr/bin/env python3
"""
Simulate driver movement for a booking.

Requirements:
  pip install httpx websockets
"""

import asyncio
import json
import time
from typing import Iterable, Tuple

import httpx
import websockets

API_BASE = "http://localhost:8000"   # backend base URL
BOOKING_CODE = "ABC123"              # public booking code from the customer link
POINTS = 120                         # number of GPS samples to send

async def fetch_booking_and_metrics():
    async with httpx.AsyncClient() as client:
        # 1. Fetch booking + ws_url via public tracking endpoint
        r = await client.get(f"{API_BASE}/api/v1/track/{BOOKING_CODE}")
        r.raise_for_status()
        data = r.json()
        booking = data["booking"]
        ws_url = data["ws_url"]

        # 2. Ask backend for route distance/duration
        params = {
            "pickupLat": booking["pickup_lat"],
            "pickupLon": booking["pickup_lng"],
            "dropoffLat": booking["dropoff_lat"],
            "dropoffLon": booking["dropoff_lng"],
        }
        m = await client.get(f"{API_BASE}/route-metrics", params=params)
        m.raise_for_status()
        metrics = m.json()

    return booking, ws_url, metrics

def interpolate(a: Tuple[float, float], b: Tuple[float, float], n: int) -> Iterable[Tuple[float, float]]:
    """Generate n linearly interpolated coordinates between two points."""
    for i in range(n):
        t = i / (n - 1)
        yield (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))

async def simulate():
    booking, ws_url, metrics = await fetch_booking_and_metrics()
    pickup = (booking["pickup_lat"], booking["pickup_lng"])
    dropoff = (booking["dropoff_lat"], booking["dropoff_lng"])

    duration_sec = metrics["min"] * 60
    interval = duration_sec / POINTS
    speed_kmh = metrics["km"] / (metrics["min"] / 60)

    async with websockets.connect(ws_url) as ws:
        for lat, lng in interpolate(pickup, dropoff, POINTS):
            payload = {
                "lat": lat,
                "lng": lng,
                "ts": int(time.time()),
                "speed": speed_kmh,
            }
            await ws.send(json.dumps(payload))
            await asyncio.sleep(interval)

if __name__ == "__main__":
    asyncio.run(simulate())
