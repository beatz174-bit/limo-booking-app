import pytest
import httpx
from app.services import route_metrics_service

@pytest.mark.asyncio
async def test_get_route_metrics(monkeypatch):
    async def fake_get(self, url, params=None):
        class Resp:
            status_code = 200
            def raise_for_status(self):
                pass
            def json(self):
                return {
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
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await route_metrics_service.get_route_metrics("A", "B")
    assert result == pytest.approx({"km": 1.234, "min": 9.45})
