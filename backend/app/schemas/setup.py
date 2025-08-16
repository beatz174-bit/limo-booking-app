from pydantic import BaseModel, EmailStr
from typing import Literal
from typing_extensions import TypedDict


class SettingsPayload(BaseModel):
    account_mode: Literal["open", "closed"]
    google_maps_api_key: str
    flagfall: float
    per_km_rate: float
    per_minute_rate: float


class SetupPayload(BaseModel):
    admin_email: EmailStr
    full_name: str
    admin_password: str
    settings: SettingsPayload

class SetupSummary(TypedDict):
    allow_public_registration: bool
    google_maps_api_key: str
    flagfall: float
    per_km_rate: float
    per_min_rate: float
