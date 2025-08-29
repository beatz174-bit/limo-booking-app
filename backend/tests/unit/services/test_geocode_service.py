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

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"features": [{"properties": {"label": "123 Fake St"}}]}

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        # Avoid type hints here for Python 3.9 compatibility
        async def get(self, url, params=None, headers=None):
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


async def test_search_geocode_merges_results(monkeypatch: MonkeyPatch):
    class OrsResp:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {
                "features": [
                    {
                        "properties": {
                            "label": "10 Main St, Springfield",
                            "housenumber": "10",
                            "street": "Main St",
                            "locality": "Springfield",
                            "postalcode": "12345",
                            "name": "City Library",
                            "gid": "whosonfirst:venue:123",
                        }
                    }
                ]
            }

    class NomResp:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> list:
            return [
                {
                    "display_name": "Central Park, Springfield",
                    "address": {"city": "Springfield"},
                }
            ]

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None, headers=None):  # type: ignore[override]
            if "openrouteservice" in url:
                assert params["text"] == "Main"
                assert params["size"] == 5
                return OrsResp()
            assert "nominatim" in url
            return NomResp()

    monkeypatch.setattr(
        geocode_service, "httpx", type("X", (), {"AsyncClient": DummyClient})
    )
    monkeypatch.setattr(
        geocode_service, "get_settings", lambda: type("S", (), {"ors_api_key": "KEY"})()
    )
    monkeypatch.setattr(geocode_service, "AIRPORTS", {})

    results = await geocode_service.search_geocode("Main")
    assert results == [
        {
            "name": "10 Main St, Springfield",
            "address": {
                "house_number": "10",
                "road": "Main St",
                "city": "Springfield",
                "postcode": "12345",
            },
            "name": "City Library",
            "type": "venue",
        }
    ]


async def test_search_geocode_returns_airport(monkeypatch: MonkeyPatch):
    class DummyResp:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {
                "features": [
                    {
                        "properties": {
                            "name": "Heathrow Airport",
                            "locality": "London",
                            "gid": "whosonfirst:airport:123",
                        }
                    }
                ]
            }

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None, headers=None):  # type: ignore[override]
            assert "search" in url
            return DummyResp()

    monkeypatch.setattr(
        geocode_service, "httpx", type("X", (), {"AsyncClient": DummyClient})
    )
    monkeypatch.setattr(
        geocode_service, "get_settings", lambda: type("S", (), {"ors_api_key": "KEY"})()
    )

    results = await geocode_service.search_geocode("LHR")
    assert {
        "address": {"city": "London"},
        "name": "Heathrow Airport",
        "type": "airport",
    } in results


@pytest.mark.xfail(reason="reverse_geocode fails on empty response", raises=IndexError)
async def test_reverse_geocode_falls_back_to_coordinates(monkeypatch: MonkeyPatch):
    class DummyResp:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            # Response with no features should fall back to "lat, lon"
            return {"features": []}

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

    # Expected behaviour: gracefully fall back to formatted coordinates
    addr = await geocode_service.reverse_geocode(1.0, 2.0)
    assert addr == "1.00000, 2.00000"


async def test_search_geocode_returns_empty_when_no_features(monkeypatch: MonkeyPatch):
    class OrsResp:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"features": []}

    class NomResp:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> list:
            return []

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None, headers=None):  # type: ignore[override]
            return OrsResp() if "openrouteservice" in url else NomResp()

    monkeypatch.setattr(
        geocode_service, "httpx", type("X", (), {"AsyncClient": DummyClient})
    )
    monkeypatch.setattr(
        geocode_service, "get_settings", lambda: type("S", (), {"ors_api_key": "KEY"})()
    )
    monkeypatch.setattr(geocode_service, "AIRPORTS", {})

    results = await geocode_service.search_geocode("Nowhere")
    assert results == []


async def test_search_geocode_airport_lookup(monkeypatch: MonkeyPatch):
    class OrsResp:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self):
            return {"features": []}

    class NomResp:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self):
            return []

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return None

        async def get(self, url, params=None, headers=None):  # type: ignore[override]
            return OrsResp() if "openrouteservice" in url else NomResp()

    monkeypatch.setattr(
        geocode_service, "httpx", type("X", (), {"AsyncClient": DummyClient})
    )
    monkeypatch.setattr(
        geocode_service, "get_settings", lambda: type("S", (), {"ors_api_key": "KEY"})()
    )
    monkeypatch.setattr(
        geocode_service,
        "AIRPORTS",
        {
            "JFK": {
                "name": "John F Kennedy International Airport",
                "city": "New York",
                "subd": "New York",
                "country": "US",
            }
        },
    )

    results = await geocode_service.search_geocode("JFK")
    assert results == [
        {
            "name": "John F Kennedy International Airport",
            "address": {
                "city": "New York",
                "state": "New York",
                "country": "US",
            },
        }
    ]


async def test_reverse_geocode_debug_log(
    monkeypatch: MonkeyPatch, capfd: pytest.CaptureFixture[str]
):
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
