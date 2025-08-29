# app/api/geocode.py
import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.schemas.geocode import GeocodeResponse, GeocodeSearchResponse
from app.services.geocode_service import reverse_geocode, search_geocode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/geocode", tags=["geocode"])


@router.get("/reverse", response_model=GeocodeResponse)
async def api_reverse_geocode(
    lat: float = Query(...), lon: float = Query(...)
) -> GeocodeResponse:
    """Look up an address from latitude and longitude."""
    logger.debug("api_reverse_geocode", extra={"lat": lat, "lon": lon})
    try:
        logger.info("reverse geocode", extra={"lat": lat, "lon": lon})
        address = await reverse_geocode(lat, lon)
        logger.debug("reverse geocode resolved", extra={"address": address})
    except httpx.TimeoutException as exc:
        logger.exception("reverse geocode timeout", extra={"lat": lat, "lon": lon})
        raise HTTPException(
            status_code=504, detail="Geocoding service timed out"
        ) from exc
    except httpx.HTTPError as exc:
        logger.exception("reverse geocode http error", extra={"lat": lat, "lon": lon})
        raise HTTPException(status_code=502, detail="Geocoding service error") from exc
    return GeocodeResponse(address=address)


@router.get(
    "/search",
    response_model=GeocodeSearchResponse,
    response_model_exclude_none=True,
)
async def api_geocode_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=20),
) -> GeocodeSearchResponse:
    """Search for addresses matching a query string."""
    logger.debug("api_geocode_search", extra={"query": q, "limit": limit})
    try:
        logger.info("search geocode", extra={"query": q, "limit": limit})
        results = await search_geocode(q, limit)
        logger.debug(
            "search geocode results",
            extra={"query": q, "count": len(results)},
        )
    except httpx.TimeoutException as exc:
        logger.exception("geocode search timeout", extra={"query": q})
        raise HTTPException(
            status_code=504, detail="Geocoding service timed out"
        ) from exc
    except httpx.HTTPError as exc:
        logger.exception("geocode search http error", extra={"query": q})
        raise HTTPException(status_code=502, detail="Geocoding service error") from exc
    return GeocodeSearchResponse(results=results)
