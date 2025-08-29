"""Pydantic models for geocoding responses."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class GeocodeResponse(BaseModel):
    """Single address lookup result."""

    address: str


class GeocodeSearchResult(BaseModel):
    """One item from a geocode search result list."""

    name: Optional[str] = None
    address: str
    lat: float
    lng: float
    place_id: str = Field(..., alias="placeId")

    model_config = ConfigDict(populate_by_name=True)


class GeocodeSearchResponse(BaseModel):
    """Collection of geocode search results."""

    results: List[GeocodeSearchResult]
