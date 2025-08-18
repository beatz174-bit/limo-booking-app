# app/services/geocode_service.py
from __future__ import annotations

import httpx

from app.core.config import get_settings


async def reverse_geocode(lat: float, lon: float) -> str:
    """Reverse geocode coordinates to a human-readable address.

    The function proxies to the OpenRouteService reverse geocoding endpoint.
    It requires an API key configured via settings.  The caller is expected to
    handle any exceptions raised by network failures or non-2xx responses.

    Parameters
    ----------
    lat: float
        Latitude of the point to reverse geocode.
    lon: float
        Longitude of the point to reverse geocode.

    Returns
    -------
    str
        The formatted address returned by the geocoding provider.  If the
        provider does not supply an address, a simple "lat, lon" string is
        returned.
    """

    settings = get_settings()
    api_key = settings.ors_api_key

    url = "https://api.openrouteservice.org/geocode/reverse"
    params = {
        "api_key": api_key,
        "point.lat": lat,
        "point.lon": lon,
        "size": 1,
    }
    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient() as client:
        res = await client.get(url, params=params, headers=headers)
        res.raise_for_status()
        data = res.json()

    address = (
        data.get("features", [{}])[0]
        .get("properties", {})
        .get("label")
    )

    return address or f"{lat:.5f}, {lon:.5f}"
