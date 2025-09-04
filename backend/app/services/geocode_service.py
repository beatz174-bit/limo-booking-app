# app/services/geocode_service.py
from __future__ import annotations

"""Service functions wrapping external geocoding APIs."""

import logging
import math

import httpx
from app.core.config import get_settings

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
        try:
            res = await client.get(url, params=params, headers=headers)
            res.raise_for_status()
        except Exception:
            logger.exception("reverse geocode request failed")
            raise
        logger.debug(
            "reverse geocode response",
            extra={
                "status": res.status_code,
                "payload": getattr(res, "text", "")[:200],
            },
        )
        data = res.json()

    address = data.get("features", [{}])[0].get("properties", {}).get("label")

    if not address:
        logger.warning("no address found", extra={"lat": lat, "lon": lon})

    return address or f"{lat:.5f}, {lon:.5f}"


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in kilometers between two coordinates using the
    haversine formula."""

    r = 6371.0  # Earth radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


async def search_geocode(
    query: str, limit: int = 5, lat: float | None = None, lon: float | None = None
) -> list[dict]:
    """Use Google Places Autocomplete and Details to resolve addresses.

    Returns dictionaries containing ``name``, ``address``, ``lat``, ``lng`` and
    ``place_id`` for each suggestion.
    """

    logger.info("search geocode", extra={"query": query, "limit": limit})
    settings = get_settings()
    api_key = settings.google_maps_api_key
    if not api_key or api_key == "undefined":
        raise RuntimeError("GOOGLE_MAPS_API_KEY not configured")

    autocomplete_url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    details_url = "https://maps.googleapis.com/maps/api/place/details/json"
    results: list[dict] = []

    async with httpx.AsyncClient(timeout=10) as client:
        logger.debug(
            "google autocomplete request",
            extra={"url": autocomplete_url, "query": query, "limit": limit},
        )
        auto_params = {"input": query, "key": api_key}
        if lat is not None and lon is not None:
            auto_params.update({"location": f"{lat},{lon}", "radius": 50000})
        auto_res = await client.get(autocomplete_url, params=auto_params)
        auto_res.raise_for_status()
        predictions = auto_res.json().get("predictions", [])[:limit]

        for pred in predictions:
            place_id = pred.get("place_id")
            if not place_id:
                continue
            params = {
                "place_id": place_id,
                "key": api_key,
                "fields": "place_id,name,formatted_address,geometry/location",
            }
            logger.debug(
                "google place details request",
                extra={"url": details_url, "place_id": place_id},
            )
            det_res = await client.get(details_url, params=params)
            det_res.raise_for_status()
            det = det_res.json().get("result", {})
            location = det.get("geometry", {}).get("location", {})
            results.append(
                {
                    "name": det.get("name"),
                    "address": det.get("formatted_address"),
                    "lat": location.get("lat"),
                    "lng": location.get("lng"),
                    "place_id": det.get("place_id"),
                }
            )

    if lat is not None and lon is not None and results:
        for r in results:
            if r.get("lat") is not None and r.get("lng") is not None:
                r["_distance"] = _haversine_distance(lat, lon, r["lat"], r["lng"])
        results.sort(key=lambda r: r.get("_distance", float("inf")))
        for r in results:
            r.pop("_distance", None)

    if not results:
        logger.warning("no geocoding results", extra={"query": query})
    return results
