import pytest
from httpx import AsyncClient

from app.main import app

@pytest.mark.asyncio
async def test_route_metrics_router(monkeypatch, client: AsyncClient):
    from app.api import route_metrics as router

    async def fake_get_route_metrics(pickup: str, dropoff: str):
        assert pickup == "A" and dropoff == "B"
        return {"km": 1.2, "min": 3.4}

    monkeypatch.setattr(router, "get_route_metrics", fake_get_route_metrics)

    res = await client.get("/route-metrics", params={"pickup": "A", "dropoff": "B"})
    assert res.status_code == 200
    assert res.json() == {"km": 1.2, "min": 3.4}
