"""Helpers for Google Directions API."""

import asyncio
from math import atan2, cos, radians, sin, sqrt
from typing import Tuple

import httpx
from app.core.config import get_settings

settings = get_settings()


async def estimate_route(
    pickup_lat: float,
    pickup_lng: float,
    dropoff_lat: float,
    dropoff_lng: float,
) -> Tuple[float, float]:
    """Return (distance_km, duration_min) between two coordinates.

    In test environments or when no Google API key is configured, fall back to
    a simple haversine distance calculation with an assumed average speed of
    60 km/h to avoid external network calls.
    """

    if settings.env == "test" or not settings.google_maps_api_key:
        r = 6371.0
        dlat = radians(dropoff_lat - pickup_lat)
        dlng = radians(dropoff_lng - pickup_lng)
        a = (
            sin(dlat / 2) ** 2
            + cos(radians(pickup_lat)) * cos(radians(dropoff_lat)) * sin(dlng / 2) ** 2
        )
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance_km = r * c
        duration_min = distance_km  # 60 km/h average speed
        return distance_km, duration_min

    params = {
        "origin": f"{pickup_lat},{pickup_lng}",
        "destination": f"{dropoff_lat},{dropoff_lng}",
        "key": settings.google_maps_api_key,
    }
    url = "https://maps.googleapis.com/maps/api/directions/json"
    async with httpx.AsyncClient() as client:
        for attempt in range(3):
            try:
                resp = await client.get(url, params=params, timeout=10)
            except httpx.RequestError as exc:
                if attempt == 2:
                    raise ValueError("route service unavailable") from exc
            else:
                if resp.status_code < 500:
                    resp.raise_for_status()
                    data = resp.json()
                    routes = data.get("routes") or []
                    if (
                        data.get("status") != "OK"
                        or not routes
                        or not routes[0].get("legs")
                    ):
                        raise ValueError("no route found")
                    leg = routes[0]["legs"][0]
                    distance_km = leg["distance"]["value"] / 1000.0
                    duration_min = leg["duration"]["value"] / 60.0
                    return distance_km, duration_min
                if attempt == 2:
                    raise ValueError("route service unavailable")
            await asyncio.sleep(2**attempt)
    raise ValueError("route service unavailable")
