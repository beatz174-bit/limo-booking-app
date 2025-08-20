import pytest
from httpx import AsyncClient
from datetime import datetime
from typing import Union
from _pytest.monkeypatch import MonkeyPatch

@pytest.mark.asyncio
async def test_route_metrics_router(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import route_metrics as router

    async def fake_get_route_metrics(pickup: str, dropoff: str, ride_time: Union[datetime, None]):
        assert pickup == "A" and dropoff == "B"
        assert ride_time == datetime(2020, 1, 1)
        return {"km": 1.2, "min": 3.4}

    monkeypatch.setattr(router, "get_route_metrics", fake_get_route_metrics)

    res = await client.get(
        "/route-metrics",
        params={"pickup": "A", "dropoff": "B", "ride_time": "2020-01-01T00:00:00"},
    )
    assert res.status_code == 200
    assert res.json() == {"km": 1.2, "min": 3.4}
