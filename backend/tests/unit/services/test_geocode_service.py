import pytest
from _pytest.monkeypatch import MonkeyPatch
from typing import Optional

from app.services import geocode_service

pytestmark = pytest.mark.asyncio


async def test_reverse_geocode_parses_label(monkeypatch: MonkeyPatch):
    class DummyResp:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"features": [{"properties": {"label": "123 Fake St"}}]}

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None, headers=None):
            assert "reverse" in url
            assert params["point.lat"] == 1.0
            assert params["point.lon"] == 2.0
            return DummyResp()

    monkeypatch.setattr(geocode_service, "httpx", type("X", (), {"AsyncClient": DummyClient}))
    monkeypatch.setattr(geocode_service, "get_settings", lambda: type("S", (), {"ors_api_key": "KEY"})())

    addr = await geocode_service.reverse_geocode(1.0, 2.0)
    assert addr == "123 Fake St"
