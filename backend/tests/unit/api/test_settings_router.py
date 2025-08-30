# tests/unit/api/test_settings_router.py
import uuid
from types import SimpleNamespace

import pytest
from _pytest.monkeypatch import MonkeyPatch
from httpx import AsyncClient

from app.dependencies import get_current_user
from app.main import app
from app.schemas.setup import SettingsPayload

ADMIN_ID = uuid.UUID(int=1)


def _admin_override():
    # Minimal object with id=1 so your admin guard passes
    return SimpleNamespace(id=ADMIN_ID)


@pytest.mark.asyncio
async def test_get_settings_router(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import settings as settings_router

    async def fake_get_settings(*_args, **_kwargs):  # type: ignore
        return SettingsPayload(
            account_mode=True,
            flagfall=10.5,
            per_km_rate=2.75,
            per_minute_rate=1.1,
            admin_user_id=ADMIN_ID,
        )

    monkeypatch.setattr(settings_router, "get_settings", fake_get_settings)  # type: ignore

    # Override auth dependency
    app.dependency_overrides[get_current_user] = _admin_override
    try:
        res = await client.get("/settings")
        assert res.status_code == 200
        assert res.json() == {
            "account_mode": True,
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
            "admin_user_id": str(ADMIN_ID),
        }
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_put_settings_router(monkeypatch: MonkeyPatch, client: AsyncClient):
    from app.api import settings as settings_router

    body = SettingsPayload(
        account_mode=False,
        flagfall=12.0,
        per_km_rate=3.0,
        per_minute_rate=1.25,
        admin_user_id=ADMIN_ID,
    )

    async def fake_update_settings(*_args, **_kwargs):  # type: ignore
        return body

    monkeypatch.setattr(settings_router, "update_settings", fake_update_settings)  # type: ignore

    app.dependency_overrides[get_current_user] = _admin_override
    try:
        res = await client.put("/settings", json=body.model_dump(mode="json"))
        assert res.status_code == 200
        assert res.json() == body.model_dump(mode="json")
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_put_settings_router_validation_error(client: AsyncClient):
    # Validation happens before the service; still need auth override to avoid 401
    app.dependency_overrides[get_current_user] = _admin_override
    try:
        bad_body = {  # type: ignore
            "account_mode": "open",  # wrong type: should be boolean
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
        }
        res = await client.put("/settings", json=bad_body)  # type: ignore
        assert res.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)
