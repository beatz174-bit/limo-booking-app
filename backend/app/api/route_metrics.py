"""Endpoint exposing distance and duration calculations."""

from fastapi import APIRouter, HTTPException, Query
from app.services.route_metrics_service import get_route_metrics

router = APIRouter(prefix="/route-metrics", tags=["route-metrics"])


@router.get("", summary="Compute distance and duration between two addresses")
async def api_route_metrics(pickup: str = Query(...), dropoff: str = Query(...)):
    """Return travel metrics between pickup and dropoff addresses."""
    try:
        return await get_route_metrics(pickup, dropoff)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
