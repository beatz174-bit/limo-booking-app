import pytest
import httpx
from httpx import AsyncClient
from _pytest.monkeypatch import MonkeyPatch

pytestmark = pytest.mark.asyncio

async def test_reverse_geocode_timeout(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import geocode as geocode_router

    async def fake_reverse(lat: float, lon: float):
        raise httpx.TimeoutException("timeout")

    monkeypatch.setattr(geocode_router, "reverse_geocode", fake_reverse)

    res = await client.get("/geocode/reverse", params={"lat": 1.0, "lon": 2.0})
    assert res.status_code == 504
    assert res.json()["detail"] == "Geocoding service timed out"


async def test_geocode_search_http_error(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import geocode as geocode_router

    async def fake_search(q: str, limit: int = 5):
        raise httpx.HTTPError("boom")

    monkeypatch.setattr(geocode_router, "search_geocode", fake_search)

    res = await client.get("/geocode/search", params={"q": "Main"})
    assert res.status_code == 502
    assert res.json()["detail"] == "Geocoding service error"
