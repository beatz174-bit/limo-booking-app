import pytest
from httpx import AsyncClient
from _pytest.monkeypatch import MonkeyPatch

pytestmark = pytest.mark.asyncio

async def test_route_metrics_success(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import route_metrics as router

    async def fake_get_route_metrics(pickup: str, dropoff: str):
        assert pickup == "A" and dropoff == "B"
        return {"km": 1.23, "min": 4.5}

    monkeypatch.setattr(router, "get_route_metrics", fake_get_route_metrics)

    res = await client.get("/route-metrics", params={"pickup": "A", "dropoff": "B"})
    assert res.status_code == 200
    assert res.json() == {"km": 1.23, "min": 4.5}


async def test_route_metrics_error(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import route_metrics as router

    async def fake_get_route_metrics(pickup: str, dropoff: str):
        raise RuntimeError("bad request")

    monkeypatch.setattr(router, "get_route_metrics", fake_get_route_metrics)

    res = await client.get("/route-metrics", params={"pickup": "A", "dropoff": "B"})
    assert res.status_code == 400
    assert res.json()["detail"] == "bad request"
