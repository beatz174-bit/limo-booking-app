"""Utilities for computing route distance and duration via Google APIs."""

import httpx

from app.core.config import get_settings

GOOGLE_DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

async def get_route_metrics(pickup: str, dropoff: str) -> dict:
    settings = get_settings()
    api_key = settings.google_maps_api_key
    if not api_key:
        raise RuntimeError("GOOGLE_MAPS_API_KEY not configured")
    params = {
        "origins": pickup,
        "destinations": dropoff,
        "units": "metric",
        "key": api_key,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(GOOGLE_DISTANCE_MATRIX_URL, params=params)
        res.raise_for_status()
        data = res.json()
    if data.get("status") != "OK":
        message = data.get("error_message") or data.get("status", "error")
        raise RuntimeError(message)
    try:
        element = data["rows"][0]["elements"][0]
        if element.get("status") != "OK":
            raise RuntimeError(element.get("status", "error"))
        distance_m = element["distance"]["value"]
        duration_s = element["duration"]["value"]
        return {"km": distance_m / 1000, "min": duration_s / 60}
    except Exception as exc:
        raise RuntimeError("Invalid response from Distance Matrix") from exc
