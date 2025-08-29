import pytest
from _pytest.monkeypatch import MonkeyPatch
from httpx import AsyncClient

# `client` fixture from tests.conftest sets up the app; no extra imports needed.

pytestmark = pytest.mark.asyncio


async def test_reverse_geocode_endpoint(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import geocode as geocode_router

    async def fake_reverse(lat: float, lon: float) -> str:  # type: ignore
        assert lat == 1.0 and lon == 2.0
        return "123 Fake St"

    monkeypatch.setattr(geocode_router, "reverse_geocode", fake_reverse)

    res = await client.get("/geocode/reverse?lat=1.0&lon=2.0")
    assert res.status_code == 200
    assert res.json() == {"address": "123 Fake St"}


async def test_geocode_search_endpoint(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import geocode as geocode_router

    async def fake_search(q: str, limit: int = 5):  # type: ignore
        assert q == "Main St"
        assert limit == 5
        return [
            {
                "address": {"road": "Main St"},
                "name": "Main Street",
                "type": "road",
            }
        ]

    monkeypatch.setattr(geocode_router, "search_geocode", fake_search)

    res = await client.get("/geocode/search?q=Main%20St")
    assert res.status_code == 200
    assert res.json() == {
        "results": [
            {
                "address": {"road": "Main St"},
                "name": "Main Street",
                "type": "road",
            }
        ]
    }
