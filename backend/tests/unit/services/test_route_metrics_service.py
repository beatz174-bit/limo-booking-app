import pytest
import httpx
from datetime import datetime, timezone

from app.core.config import get_settings
from app.services import route_metrics_service

@pytest.mark.asyncio
async def test_get_route_metrics(monkeypatch):
    async def fake_get(self, url, params=None):
        assert params.get("departure_time") == 0
        class Resp:
            status_code = 200
            def raise_for_status(self):
                pass
            def json(self):
                return {
                    "status": "OK",
                    "rows": [
                        {"elements": [
                            {
                                "status": "OK",
                                "distance": {"value": 1234},
                                "duration": {"value": 567}
                            }
                        ]}
                    ]
                }
        return Resp()
    monkeypatch.setenv("GOOGLE_MAPS_API_KEY", "test")
    get_settings.cache_clear()
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    ride_time = datetime.fromtimestamp(0, tz=timezone.utc)
    result = await route_metrics_service.get_route_metrics("A", "B", ride_time)
    assert result == pytest.approx({"km": 1.234, "min": 9.45})


@pytest.mark.asyncio
async def test_get_route_metrics_request_denied(monkeypatch):
    async def fake_get(self, url, params=None):
        class Resp:
            status_code = 200
            def raise_for_status(self):
                pass
            def json(self):
                return {
                    "status": "REQUEST_DENIED",
                    "error_message": "Invalid key",
                    "rows": [],
                }
        return Resp()

    monkeypatch.setenv("GOOGLE_MAPS_API_KEY", "test")
    get_settings.cache_clear()
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    with pytest.raises(RuntimeError) as exc:
        await route_metrics_service.get_route_metrics("A", "B")
    assert "Invalid key" in str(exc.value)


@pytest.mark.asyncio
async def test_get_route_metrics_no_api_key(monkeypatch):
    monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)
    get_settings.cache_clear()
    with pytest.raises(RuntimeError) as exc:
        await route_metrics_service.get_route_metrics("A", "B")
    assert "not configured" in str(exc.value)
