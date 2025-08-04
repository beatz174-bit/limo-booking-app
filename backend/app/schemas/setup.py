from pydantic import BaseModel, EmailStr
from typing import Literal


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
