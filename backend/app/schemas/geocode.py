# app/schemas/geocode.py
from pydantic import BaseModel


class GeocodeResponse(BaseModel):
    address: str
