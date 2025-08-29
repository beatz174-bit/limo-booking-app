# app/services/geocode_service.py
from __future__ import annotations

"""Service functions wrapping external geocoding APIs."""

import logging
from typing import Any

import httpx

from app.core.config import get_settings

try:  # pragma: no cover - optional dependency
    from airportsdata import load as load_airports

    AIRPORTS: dict[str, dict[str, Any]] = load_airports("IATA")
except Exception:  # pragma: no cover - fall back if package missing
    AIRPORTS = {}

logger = logging.getLogger(__name__)


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

    logger.info("reverse geocode", extra={"lat": lat, "lon": lon})
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
    logger.debug(
        "reverse geocode request",
        extra={"url": url, "lat": lat, "lon": lon},
    )

    async with httpx.AsyncClient() as client:
        res = await client.get(url, params=params, headers=headers)
        res.raise_for_status()
        data = res.json()

    address = data.get("features", [{}])[0].get("properties", {}).get("label")

    return address or f"{lat:.5f}, {lon:.5f}"


async def search_geocode(query: str, limit: int = 5) -> list[dict]:
    """Search for addresses matching free-form text.

    The search workflow is:

    1. If the query looks like an IATA airport code, try to resolve it using
       a local airports database.
    2. Query the OpenRouteService geocoder for general address suggestions.
    3. Query the OpenStreetMap Nominatim API for points of interest.
    4. Merge the results and return at most ``limit`` entries.

    Returns dictionaries with a ``name`` and structured ``address`` fields.
    """

    logger.info("search geocode", extra={"query": query, "limit": limit})
    results: list[dict] = []

    # Airport code lookup
    if len(query) == 3 and query.isalpha():
        airport = AIRPORTS.get(query.upper())
        if airport:
            address = {
                "city": airport.get("city"),
                "state": airport.get("subd"),
                "country": airport.get("country"),
            }
            results.append(
                {
                    "name": airport.get("name"),
                    "address": {k: v for k, v in address.items() if v},
                }
            )

    settings = get_settings()
    api_key = settings.ors_api_key

    ors_url = "https://api.openrouteservice.org/geocode/search"
    ors_params: dict[str, object] = {
        "api_key": api_key,
        "text": query,
        "size": limit,
    }
    nom_url = "https://nominatim.openstreetmap.org/search"
    nom_params: dict[str, object] = {
        "format": "json",
        "addressdetails": 1,
        "limit": limit,
        "q": query,
    }
    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient() as client:
        logger.debug(
            "search geocode request",
            extra={"url": ors_url, "query": query, "limit": limit},
        )
        ors_res = await client.get(ors_url, params=ors_params, headers=headers)
        ors_res.raise_for_status()
        ors_data = ors_res.json()

        nom_res = await client.get(
            nom_url, params=nom_params, headers={**headers, "User-Agent": "limo-app"}
        )
        nom_res.raise_for_status()
        nom_data = nom_res.json()

    for feature in ors_data.get("features", []):
        props = feature.get("properties", {})
        address = {
            "house_number": props.get("housenumber"),
            "road": props.get("street"),
            "suburb": props.get("neighbourhood"),
            "city": props.get("locality"),
            "postcode": props.get("postalcode"),
            "state": props.get("region"),
            "country": props.get("country"),
        }
        results.append(
            {
                "name": props.get("label") or props.get("name"),
                "address": {k: v for k, v in address.items() if v},
            }
        )

    for item in nom_data:
        addr = item.get("address", {})
        address = {
            "house_number": addr.get("house_number"),
            "road": addr.get("road"),
            "suburb": addr.get("suburb"),
            "city": addr.get("city") or addr.get("town") or addr.get("village"),
            "postcode": addr.get("postcode"),
            "state": addr.get("state"),
            "country": addr.get("country"),
        }
        results.append(
            {
                "name": item.get("display_name"),
                "address": {k: v for k, v in address.items() if v},
            }
        )

    return results[:limit]
