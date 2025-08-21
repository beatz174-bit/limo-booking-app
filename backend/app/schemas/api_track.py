from pydantic import BaseModel
from app.schemas.booking_v2 import BookingRead

class TrackResponse(BaseModel):
    booking: BookingRead
    ws_url: str
