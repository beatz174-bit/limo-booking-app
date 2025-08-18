# app/api/geocode.py
from fastapi import APIRouter, Query

from app.schemas.geocode import GeocodeResponse
from app.services.geocode_service import reverse_geocode

router = APIRouter(prefix="/geocode", tags=["geocode"])


@router.get("/reverse", response_model=GeocodeResponse)
async def api_reverse_geocode(lat: float = Query(...), lon: float = Query(...)) -> GeocodeResponse:
    address = await reverse_geocode(lat, lon)
    return GeocodeResponse(address=address)
