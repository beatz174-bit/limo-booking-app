# app/api/geocode.py
from fastapi import APIRouter, HTTPException, Query
import httpx
import logging

from app.schemas.geocode import GeocodeResponse, GeocodeSearchResponse
from app.services.geocode_service import reverse_geocode, search_geocode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/geocode", tags=["geocode"])


@router.get("/reverse", response_model=GeocodeResponse)
async def api_reverse_geocode(lat: float = Query(...), lon: float = Query(...)) -> GeocodeResponse:
    """Look up an address from latitude and longitude."""
    try:
        logger.info("reverse geocode lat=%s lon=%s", lat, lon)
        address = await reverse_geocode(lat, lon)
    except httpx.TimeoutException as exc:
        logger.warning("reverse geocode timeout lat=%s lon=%s", lat, lon)
        raise HTTPException(status_code=504, detail="Geocoding service timed out") from exc
    except httpx.HTTPError as exc:
        logger.error("reverse geocode http error lat=%s lon=%s", lat, lon)
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
    try:
        logger.info("search geocode query=%s limit=%s", q, limit)
        results = await search_geocode(q, limit)
    except httpx.TimeoutException as exc:
        logger.warning("geocode search timeout query=%s", q)
        raise HTTPException(status_code=504, detail="Geocoding service timed out") from exc
    except httpx.HTTPError as exc:
        logger.error("geocode search http error query=%s", q)
        raise HTTPException(status_code=502, detail="Geocoding service error") from exc
    return GeocodeSearchResponse(results=results)

