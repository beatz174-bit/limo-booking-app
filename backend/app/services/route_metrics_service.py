"""Utilities for computing route distance and duration via Google APIs."""

import logging
from datetime import datetime
from typing import Union

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

GOOGLE_DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


async def get_route_metrics(
    pickup: str,
    dropoff: str,
    ride_time: Union[datetime, None] = None,
) -> dict:
    """Fetch distance and duration between two addresses.

    If ``ride_time`` is provided, it is forwarded to the Google Distance Matrix
    API via the ``departure_time`` parameter so that traffic predictions are
    based on the requested pickup time.
    """

    logger.info(
        "route metrics pickup=%s dropoff=%s ride_time=%s", pickup, dropoff, ride_time
    )
    settings = get_settings()
    api_key = settings.google_maps_api_key
    # Treat empty strings or placeholder "undefined" as missing configuration
    if not api_key or api_key == "undefined":
        raise RuntimeError("GOOGLE_MAPS_API_KEY not configured")
    params = {
        "origins": pickup,
        "destinations": dropoff,
        "units": "metric",
        "key": api_key,
    }
    if ride_time is not None:
        params["departure_time"] = int(ride_time.timestamp())
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(GOOGLE_DISTANCE_MATRIX_URL, params=params)
        res.raise_for_status()
        data = res.json()
    if data.get("status") != "OK":
        message = data.get("error_message") or data.get("status", "error")
        logger.error("distance matrix error: %s", message)
        raise RuntimeError(message)
    try:
        element = data["rows"][0]["elements"][0]
        if element.get("status") != "OK":
            logger.error("element status %s", element.get("status"))
            raise RuntimeError(element.get("status", "error"))
        distance_m = element["distance"]["value"]
        duration_s = element["duration"]["value"]
        return {"km": distance_m / 1000, "min": duration_s / 60}
    except Exception as exc:
        logger.exception("invalid response from Distance Matrix")
        raise RuntimeError("Invalid response from Distance Matrix") from exc
