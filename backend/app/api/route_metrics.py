"""Endpoint exposing distance and duration calculations."""

import logging
from datetime import datetime
from typing import Union

from app.services.route_metrics_service import get_route_metrics
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/route-metrics", tags=["route-metrics"])


@router.get("", summary="Compute distance and duration between two addresses")
async def api_route_metrics(
    pickup: str = Query(...),
    dropoff: str = Query(...),
    ride_time: Union[datetime, None] = Query(
        None, description="Desired pickup time to account for traffic"
    ),
):
    """Return travel metrics between pickup and dropoff addresses."""
    try:
        logger.debug(
            "route metrics inputs pickup=%s dropoff=%s ride_time=%s",
            pickup,
            dropoff,
            ride_time,
        )
        logger.info(
            "route metrics pickup=%s dropoff=%s ride_time=%s",
            pickup,
            dropoff,
            ride_time,
        )
        metrics = await get_route_metrics(pickup, dropoff, ride_time)
        logger.debug("route metrics result %s", metrics)
        return metrics
    except ValueError as e:
        logger.warning(
            "route metrics invalid input pickup=%s dropoff=%s ride_time=%s",
            pickup,
            dropoff,
            ride_time,
        )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(
            "route metrics error pickup=%s dropoff=%s ride_time=%s",
            pickup,
            dropoff,
            ride_time,
        )
        raise HTTPException(status_code=400, detail=str(e))
