from pydantic import BaseModel
from app.schemas.booking import BookingRead

class TrackResponse(BaseModel):
    booking: BookingRead
    ws_url: str
