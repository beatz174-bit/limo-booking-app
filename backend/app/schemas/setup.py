from pydantic import BaseModel, EmailStr, ConfigDict


class SettingsPayload(BaseModel):
    account_mode: bool
    google_maps_api_key: str
    flagfall: float
    per_km_rate: float
    per_minute_rate: float
    model_config = ConfigDict(from_attributes=True)


class SetupPayload(BaseModel):
    admin_email: EmailStr
    full_name: str
    admin_password: str
    settings: SettingsPayload

# class SetupSummary(TypedDict):
#     account_mode: bool
#     google_maps_api_key: str
#     flagfall: float
#     per_km_rate: float
#     per_minute_rate: float
