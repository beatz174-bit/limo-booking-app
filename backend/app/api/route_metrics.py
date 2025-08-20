"""Endpoint exposing distance and duration calculations."""

import logging

from fastapi import APIRouter, HTTPException, Query
from app.services.route_metrics_service import get_route_metrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/route-metrics", tags=["route-metrics"])


@router.get("", summary="Compute distance and duration between two addresses")
async def api_route_metrics(pickup: str = Query(...), dropoff: str = Query(...)):
    """Return travel metrics between pickup and dropoff addresses."""
    try:
        logger.info("route metrics pickup=%s dropoff=%s", pickup, dropoff)
        return await get_route_metrics(pickup, dropoff)
    except Exception as e:
        logger.error("route metrics error pickup=%s dropoff=%s", pickup, dropoff)
        raise HTTPException(status_code=400, detail=str(e))

