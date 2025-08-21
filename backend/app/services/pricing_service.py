"""Price estimation helpers."""
from __future__ import annotations

from typing import Protocol


class PricingLike(Protocol):
    """Typing protocol for objects with pricing fields."""
    flagfall: float
    per_km_rate: float
    per_minute_rate: float


def estimate_fare(settings: PricingLike, distance_km: float, duration_min: float) -> int:
    """Estimate fare in cents using simple linear model.

    Args:
        settings: object providing ``flagfall``, ``per_km_rate`` and ``per_minute_rate``.
        distance_km: travel distance in kilometres.
        duration_min: travel duration in minutes.

    Returns:
        Estimated price in integer cents, rounded to nearest cent.
    """
    total = (
        float(settings.flagfall)
        + float(settings.per_km_rate) * distance_km
        + float(settings.per_minute_rate) * duration_min
    )
    return int(round(total * 100))
