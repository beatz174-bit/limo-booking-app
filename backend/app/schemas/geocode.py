# app/schemas/geocode.py
"""Pydantic models for geocoding responses."""

from typing import List, Optional

from pydantic import BaseModel


class GeocodeResponse(BaseModel):
    """Single address lookup result."""

    address: str


class AddressComponents(BaseModel):
    """Breakdown of address parts returned by provider."""

    house_number: Optional[str] = None
    road: Optional[str] = None
    suburb: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None


class GeocodeSearchResult(BaseModel):
    """One item from a geocode search result list."""

    name: str
    address: AddressComponents


class GeocodeSearchResponse(BaseModel):
    """Collection of geocode search results."""

    results: List[GeocodeSearchResult]
