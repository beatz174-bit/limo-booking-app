"""Endpoint exposing distance and duration calculations."""

import logging
from datetime import datetime
from typing import Union

from app.services.route_metrics_service import get_route_metrics
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/route-metrics", tags=["route-metrics"])


class RouteMetricsRequest(BaseModel):
    pickup_lat: float = Field(..., alias="pickupLat")
    pickup_lon: float = Field(..., alias="pickupLon")
    dropoff_lat: float = Field(..., alias="dropoffLat")
    dropoff_lon: float = Field(..., alias="dropoffLon")

    class Config:
        allow_population_by_field_name = True


async def get_request(
    request: Request,
    query: RouteMetricsRequest = Depends(),
    body: RouteMetricsRequest | None = Body(None),
) -> RouteMetricsRequest:
    if body:
        return body
    if all(
        getattr(query, field) is not None
        for field in ["pickup_lat", "pickup_lon", "dropoff_lat", "dropoff_lon"]
    ):
        return query
    pickup = request.query_params.get("pickup")
    dropoff = request.query_params.get("dropoff")
    if pickup and dropoff:
        try:
            pickup_lat, pickup_lon = map(float, pickup.split(","))
            dropoff_lat, dropoff_lon = map(float, dropoff.split(","))
            return RouteMetricsRequest(
                pickup_lat=pickup_lat,
                pickup_lon=pickup_lon,
                dropoff_lat=dropoff_lat,
                dropoff_lon=dropoff_lon,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=400, detail="Invalid pickup or dropoff"
            ) from exc
    raise HTTPException(
        status_code=400,
        detail="pickupLat/pickupLon and dropoffLat/dropoffLon are required",
    )


@router.api_route(
    "",
    methods=["GET", "POST"],
    summary="Compute distance and duration between coordinates",
)
async def api_route_metrics(
    request: RouteMetricsRequest = Depends(get_request),
    ride_time: Union[datetime, None] = Query(
        None, description="Desired pickup time to account for traffic"
    ),
):
    """Return travel metrics between pickup and dropoff coordinates."""
    try:
        logger.debug("route metrics inputs %s ride_time=%s", request, ride_time)
        logger.info("route metrics %s ride_time=%s", request, ride_time)
        pickup = f"{request.pickup_lat},{request.pickup_lon}"
        dropoff = f"{request.dropoff_lat},{request.dropoff_lon}"
        metrics = await get_route_metrics(pickup, dropoff, ride_time)
        logger.debug("route metrics result %s", metrics)
        return metrics
    except ValueError as e:
        logger.warning(
            "route metrics invalid input %s ride_time=%s", request, ride_time
        )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("route metrics error %s ride_time=%s", request, ride_time)
        raise HTTPException(status_code=400, detail=str(e))
