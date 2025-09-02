import pytest
from _pytest.monkeypatch import MonkeyPatch
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_route_metrics_success(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import route_metrics as router

    async def fake_get_route_metrics(pickup: str, dropoff: str, ride_time=None):
        assert pickup == "1.0,2.0" and dropoff == "3.0,4.0"
        return {"km": 1.23, "min": 4.5}

    monkeypatch.setattr(router, "get_route_metrics", fake_get_route_metrics)

    res = await client.get(
        "/route-metrics",
        params={
            "pickupLat": 1.0,
            "pickupLon": 2.0,
            "dropoffLat": 3.0,
            "dropoffLon": 4.0,
        },
    )
    assert res.status_code == 200
    assert res.json() == {"km": 1.23, "min": 4.5}


async def test_route_metrics_error(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import route_metrics as router

    async def fake_get_route_metrics(pickup: str, dropoff: str, ride_time=None):
        raise RuntimeError("bad request")

    monkeypatch.setattr(router, "get_route_metrics", fake_get_route_metrics)

    res = await client.get(
        "/route-metrics",
        params={
            "pickupLat": 1.0,
            "pickupLon": 2.0,
            "dropoffLat": 3.0,
            "dropoffLon": 4.0,
        },
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "bad request"
