import httpx
import pytest

EXTERNAL_ENDPOINTS = [
    ("OpenRouteService", "https://api.openrouteservice.org/"),
    ("GoogleMaps", "https://maps.googleapis.com/"),
    ("Stripe", "https://api.stripe.com/"),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("name,url", EXTERNAL_ENDPOINTS)
async def test_external_service_reachable(name: str, url: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.head(url)
        assert response.status_code < 500
    except httpx.RequestError as exc:  # pragma: no cover - network required
        pytest.skip(f"{name} unreachable: {exc}")
