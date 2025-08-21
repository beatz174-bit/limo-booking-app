"""Helpers for Google Directions API."""
from typing import Tuple
import httpx
from app.core.config import get_settings

settings = get_settings()

async def estimate_route(pickup_lat: float, pickup_lng: float, dropoff_lat: float, dropoff_lng: float) -> Tuple[float, float]:
    """Return (distance_km, duration_min) between two coordinates using Google Directions."""
    params = {
        "origin": f"{pickup_lat},{pickup_lng}",
        "destination": f"{dropoff_lat},{dropoff_lng}",
        "key": settings.google_maps_api_key,
    }
    url = "https://maps.googleapis.com/maps/api/directions/json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    leg = data["routes"][0]["legs"][0]
    distance_km = leg["distance"]["value"] / 1000.0
    duration_min = leg["duration"]["value"] / 60.0
    return distance_km, duration_min
