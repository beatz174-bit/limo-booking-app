# tests/unit/api/test_settings_router.py
import pytest
from types import SimpleNamespace
from httpx import AsyncClient
from _pytest.monkeypatch import MonkeyPatch

from app.main import app
from app.dependencies import get_current_user
from app.schemas.setup import SettingsPayload


def _admin_override():
    # Minimal object with id=1 so your admin guard passes
    return SimpleNamespace(id=1)


@pytest.mark.asyncio
async def test_get_settings_router(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import settings as settings_router

    async def fake_get_settings(*_args, **_kwargs): # type: ignore
        return SettingsPayload(
            account_mode=True,
            google_maps_api_key="XYZ",
            flagfall=10.5,
            per_km_rate=2.75,
            per_minute_rate=1.1,
        )

    monkeypatch.setattr(settings_router, "get_settings", fake_get_settings)  # type: ignore

    # Override auth dependency
    app.dependency_overrides[get_current_user] = _admin_override
    try:
        res = await client.get("/settings")
        assert res.status_code == 200
        assert res.json() == {
            "account_mode": True,
            "google_maps_api_key": "XYZ",
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
        }
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_put_settings_router(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import settings as settings_router

    body = SettingsPayload(
        account_mode=False,
        google_maps_api_key="ABC-123",
        flagfall=12.0,
        per_km_rate=3.0,
        per_minute_rate=1.25,
    )

    async def fake_update_settings(*_args, **_kwargs): # type: ignore
        return body

    monkeypatch.setattr(settings_router, "update_settings", fake_update_settings) # type: ignore

    app.dependency_overrides[get_current_user] = _admin_override
    try:
        res = await client.put("/settings", json=body.model_dump())
        assert res.status_code == 200
        assert res.json() == body.model_dump()
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_put_settings_router_validation_error(client: AsyncClient):
    # Validation happens before the service; still need auth override to avoid 401
    app.dependency_overrides[get_current_user] = _admin_override
    try:
        bad_body = { # type: ignore
            "account_mode": "open",  # wrong type: should be boolean
            "google_maps_api_key": "XYZ",
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
        }
        res = await client.put("/settings", json=bad_body) # type: ignore
        assert res.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)
