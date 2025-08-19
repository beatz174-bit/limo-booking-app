# app/api/geocode.py
from fastapi import APIRouter, HTTPException, Query
import httpx

from app.schemas.geocode import GeocodeResponse, GeocodeSearchResponse
from app.services.geocode_service import reverse_geocode, search_geocode

router = APIRouter(prefix="/geocode", tags=["geocode"])


@router.get("/reverse", response_model=GeocodeResponse)
async def api_reverse_geocode(lat: float = Query(...), lon: float = Query(...)) -> GeocodeResponse:
    """Look up an address from latitude and longitude."""
    try:
        address = await reverse_geocode(lat, lon)
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Geocoding service timed out") from exc
    except httpx.HTTPError as exc:
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
        results = await search_geocode(q, limit)
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Geocoding service timed out") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Geocoding service error") from exc
    return GeocodeSearchResponse(results=results)
