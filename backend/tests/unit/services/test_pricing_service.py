from app.schemas.setup import SettingsPayload
from app.services import pricing_service


def test_estimate_fare_basic():
    settings = SettingsPayload(
        flagfall=5,
        per_km_rate=2,
        per_minute_rate=1.5,
        account_mode=False,
    )
    price = pricing_service.estimate_fare(settings, distance_km=10, duration_min=15)
    assert price == 4750


def test_estimate_fare_rounding():
    settings = SettingsPayload(
        flagfall=0,
        per_km_rate=1.234,
        per_minute_rate=0,
        account_mode=False,
    )
    price = pricing_service.estimate_fare(settings, distance_km=1, duration_min=0)
    assert price == 123
