import logging
import os

import pytest
from _pytest.monkeypatch import MonkeyPatch

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.services import geocode_service

pytestmark = pytest.mark.asyncio


async def test_reverse_geocode_parses_label(monkeypatch: MonkeyPatch):
    class DummyResp:
        status_code = 200

        def raise_for_status(self) -> None:  # pragma: no cover - test dummy
            return None

        def json(self) -> dict:
            return {"features": [{"properties": {"label": "123 Fake St"}}]}

    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None, headers=None):  # type: ignore[override]
            assert "reverse" in url
            assert params["point.lat"] == 1.0
            assert params["point.lon"] == 2.0
            return DummyResp()

    monkeypatch.setattr(
        geocode_service, "httpx", type("X", (), {"AsyncClient": DummyClient})
    )
    monkeypatch.setattr(
        geocode_service, "get_settings", lambda: type("S", (), {"ors_api_key": "KEY"})()
    )

    addr = await geocode_service.reverse_geocode(1.0, 2.0)
    assert addr == "123 Fake St"


async def test_search_geocode_returns_details(monkeypatch: MonkeyPatch):
    class AutoResp:
        status_code = 200

        def raise_for_status(self) -> None:  # pragma: no cover - test dummy
            return None

        def json(self) -> dict:
            return {"predictions": [{"place_id": "sfo1"}]}

    class DetailsResp:
        status_code = 200

        def raise_for_status(self) -> None:  # pragma: no cover - test dummy
            return None

        def json(self) -> dict:
            return {
                "result": {
                    "name": "San Francisco International Airport",
                    "formatted_address": "San Francisco International Airport, San Francisco, CA, USA",
                    "geometry": {"location": {"lat": 37.62, "lng": -122.38}},
                    "place_id": "sfo1",
                }
            }

    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None):  # type: ignore[override]
            if "autocomplete" in url:
                assert params["input"] == "SFO"
                assert params["components"] == "country:AU"
                assert params["types"] == "address"
                return AutoResp()
            assert params["place_id"] == "sfo1"
            return DetailsResp()

    monkeypatch.setattr(
        geocode_service, "httpx", type("X", (), {"AsyncClient": DummyClient})
    )
    monkeypatch.setattr(
        geocode_service,
        "get_settings",
        lambda: type("S", (), {"google_maps_api_key": "KEY"})(),
    )

    results = await geocode_service.search_geocode("SFO")
    assert results == [
        {
            "name": "San Francisco International Airport",
            "address": "San Francisco International Airport, San Francisco, CA, USA",
            "lat": 37.62,
            "lng": -122.38,
            "place_id": "sfo1",
        }
    ]


async def test_search_geocode_no_results(monkeypatch: MonkeyPatch):
    class AutoResp:
        status_code = 200

        def raise_for_status(self) -> None:  # pragma: no cover - test dummy
            return None

        def json(self) -> dict:
            return {"predictions": []}

    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None):  # type: ignore[override]
            return AutoResp()

    monkeypatch.setattr(
        geocode_service, "httpx", type("X", (), {"AsyncClient": DummyClient})
    )
    monkeypatch.setattr(
        geocode_service,
        "get_settings",
        lambda: type("S", (), {"google_maps_api_key": "KEY"})(),
    )

    results = await geocode_service.search_geocode("Nowhere")
    assert results == []


async def test_reverse_geocode_debug_log(
    monkeypatch: MonkeyPatch, capfd: pytest.CaptureFixture[str]
):
    class DummyResp:
        status_code = 200

        def raise_for_status(self) -> None:  # pragma: no cover - test dummy
            return None

        def json(self) -> dict:
            return {"features": [{"properties": {"label": "123 Fake St"}}]}

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None, headers=None):  # type: ignore[override]
            return DummyResp()

    monkeypatch.setattr(
        geocode_service, "httpx", type("X", (), {"AsyncClient": DummyClient})
    )
    monkeypatch.setattr(
        geocode_service, "get_settings", lambda: type("S", (), {"ors_api_key": "KEY"})()
    )
    old = os.environ.get("LOG_LEVEL")
    os.environ["LOG_LEVEL"] = "DEBUG"
    monkeypatch.delenv("GRAYLOG_HOST", raising=False)
    monkeypatch.delenv("GRAYLOG_PORT", raising=False)
    monkeypatch.delenv("GRAYLOG_TRANSPORT", raising=False)
    get_settings.cache_clear()
    try:
        setup_logging()
        await geocode_service.reverse_geocode(1.0, 2.0)
        captured = capfd.readouterr()
        assert "reverse geocode request" in captured.out
    finally:
        logging.getLogger().handlers.clear()
        if old is not None:
            os.environ["LOG_LEVEL"] = old
        else:
            os.environ.pop("LOG_LEVEL", None)
        get_settings.cache_clear()
