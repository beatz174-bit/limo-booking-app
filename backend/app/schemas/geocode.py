# app/schemas/geocode.py
from typing import List, Optional

from pydantic import BaseModel


class GeocodeResponse(BaseModel):
    address: str


class AddressComponents(BaseModel):
    house_number: Optional[str] = None
    road: Optional[str] = None
    suburb: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None


class GeocodeSearchResult(BaseModel):
    address: AddressComponents


class GeocodeSearchResponse(BaseModel):
    results: List[GeocodeSearchResult]
