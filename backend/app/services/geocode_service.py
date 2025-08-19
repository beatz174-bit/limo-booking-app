# app/services/geocode_service.py
from __future__ import annotations

"""Service functions wrapping OpenRouteService geocoding APIs."""

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


async def search_geocode(query: str, limit: int = 5) -> list[dict]:
    """Search for addresses matching free-form text.

    This function proxies to the OpenRouteService forward geocoding endpoint
    and returns a simplified list of address components suitable for the
    frontend autocomplete feature. It requires an API key configured via
    settings.  The caller is expected to handle any exceptions raised by
    network failures or non-2xx responses.

    Parameters
    ----------
    query: str
        Free-form search text.
    limit: int, optional
        Maximum number of suggestions to return (default 5).

    Returns
    -------
    list[dict]
        A list of dictionaries each containing an ``address`` key mapping to
        address components (``house_number``, ``road``, ``suburb``, ``city``,
        ``postcode``) when available.
    """

    settings = get_settings()
    api_key = settings.ors_api_key

    url = "https://api.openrouteservice.org/geocode/search"
    params = {
        "api_key": api_key,
        "text": query,
        "size": limit,
    }
    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient() as client:
        res = await client.get(url, params=params, headers=headers)
        res.raise_for_status()
        data = res.json()

    results: list[dict] = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        address = {
            "house_number": props.get("housenumber"),
            "road": props.get("street"),
            "suburb": props.get("neighbourhood"),
            "city": props.get("locality"),
            "postcode": props.get("postalcode"),
        }
        results.append({"address": {k: v for k, v in address.items() if v}})

    return results
