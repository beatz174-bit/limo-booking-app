from pydantic import BaseModel, EmailStr, ConfigDict

"""Schemas for initial application setup."""

from pydantic import BaseModel, EmailStr, ConfigDict


class SettingsPayload(BaseModel):
    """Configuration values provided during setup."""
    account_mode: bool
    flagfall: float
    per_km_rate: float
    per_minute_rate: float
    model_config = ConfigDict(from_attributes=True)


class SetupPayload(BaseModel):
    """Payload containing admin user and settings."""
    admin_email: EmailStr
    full_name: str
    admin_password: str
    settings: SettingsPayload

# class SetupSummary(TypedDict):
#     account_mode: bool
#     flagfall: float
#     per_km_rate: float
#     per_minute_rate: float
