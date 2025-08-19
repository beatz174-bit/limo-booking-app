# app/api/geocode.py
from fastapi import APIRouter, Query

from app.schemas.geocode import GeocodeResponse, GeocodeSearchResponse
from app.services.geocode_service import reverse_geocode, search_geocode

router = APIRouter(prefix="/geocode", tags=["geocode"])


@router.get("/reverse", response_model=GeocodeResponse)
async def api_reverse_geocode(lat: float = Query(...), lon: float = Query(...)) -> GeocodeResponse:
    address = await reverse_geocode(lat, lon)
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
    results = await search_geocode(q, limit)
    return GeocodeSearchResponse(results=results)
