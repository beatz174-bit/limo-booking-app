import httpx
import pytest
from _pytest.monkeypatch import MonkeyPatch

from app.services import routing

pytestmark = pytest.mark.asyncio


async def test_estimate_route_retries_then_succeeds(monkeypatch: MonkeyPatch):
    class DummyResp:
        def __init__(self, status_code, data=None):
            self.status_code = status_code
            self._data = data or {}

        def json(self):
            return self._data

        def raise_for_status(
            self,
        ) -> None:  # pragma: no cover - no HTTP errors in tests
            return None

    calls = {"count": 0}

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None, timeout=None):  # type: ignore[override]
            calls["count"] += 1
            if calls["count"] == 1:
                raise httpx.RequestError("boom")
            if calls["count"] == 2:
                return DummyResp(500)
            return DummyResp(
                200,
                {
                    "routes": [
                        {
                            "legs": [
                                {
                                    "distance": {"value": 1000},
                                    "duration": {"value": 600},
                                }
                            ]
                        }
                    ]
                },
            )

    async def fake_sleep(_):
        return None

    monkeypatch.setattr(
        routing,
        "settings",
        type("S", (), {"env": "prod", "google_maps_api_key": "x"})(),
    )
    monkeypatch.setattr(routing.httpx, "AsyncClient", DummyClient)
    monkeypatch.setattr(routing.asyncio, "sleep", fake_sleep)

    distance, duration = await routing.estimate_route(1, 2, 3, 4)
    assert (distance, duration) == (1.0, 10.0)
    assert calls["count"] == 3


async def test_estimate_route_fails_after_retries(monkeypatch: MonkeyPatch):
    class DummyResp:
        status_code = 500

        def json(self):
            return {}

        def raise_for_status(self) -> None:  # pragma: no cover
            return None

    calls = {"count": 0}

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None, timeout=None):  # type: ignore[override]
            calls["count"] += 1
            return DummyResp()

    async def fake_sleep(_):
        return None

    monkeypatch.setattr(
        routing,
        "settings",
        type("S", (), {"env": "prod", "google_maps_api_key": "x"})(),
    )
    monkeypatch.setattr(routing.httpx, "AsyncClient", DummyClient)
    monkeypatch.setattr(routing.asyncio, "sleep", fake_sleep)

    with pytest.raises(ValueError, match="route service unavailable"):
        await routing.estimate_route(1, 2, 3, 4)
    assert calls["count"] == 3
