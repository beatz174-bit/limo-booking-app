import httpx
import pytest
from _pytest.monkeypatch import MonkeyPatch

from app.services import routing

pytestmark = pytest.mark.asyncio


async def test_estimate_route_invalid_key(monkeypatch: MonkeyPatch) -> None:
    class DummyResp:
        status_code = 200

        def json(self):
            return {
                "status": "REQUEST_DENIED",
                "error_message": "API key invalid or expired",
            }

        def raise_for_status(self) -> None:  # pragma: no cover - no HTTP errors
            return None

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None, timeout=None):  # type: ignore[override]
            return DummyResp()

    monkeypatch.setattr(
        routing,
        "settings",
        type("S", (), {"env": "prod", "google_maps_api_key": "x"})(),
    )
    monkeypatch.setattr(routing.httpx, "AsyncClient", DummyClient)

    with pytest.raises(ValueError, match="API key invalid or expired"):
        await routing.estimate_route(1, 2, 3, 4)
