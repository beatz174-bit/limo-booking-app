import pytest
from _pytest.monkeypatch import MonkeyPatch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict
from app.schemas.setup import SetupPayload

pytestmark = pytest.mark.asyncio


async def test_get_setup_status_initial(monkeypatch: MonkeyPatch, client: AsyncClient):
    # Patch the *router* module symbol, not the service module
    import app.api.setup as setup_router

    async def fake_is_setup_complete(db: AsyncSession):
        return None

    monkeypatch.setattr(setup_router, "is_setup_complete", fake_is_setup_complete)

    resp = await client.get("/setup")
    assert resp.status_code == 200
    assert resp.json() is None


async def test_get_setup_status_after_setup(monkeypatch: MonkeyPatch, client: AsyncClient):
    import app.api.setup as setup_router

    async def fake_is_setup_complete(db: AsyncSession) -> Dict[str, object]:
        # Minimal config shape the router exposes today
        return {
            "account_mode": True,
            "google_maps_api_key": "XYZ",
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
        }

    monkeypatch.setattr(setup_router, "is_setup_complete", fake_is_setup_complete)

    resp = await client.get("/setup")
    assert resp.status_code == 200
    data = resp.json()
    assert data["account_mode"] is True
    assert data["google_maps_api_key"] == "XYZ"
    assert data["flagfall"] == 10.5
    assert data["per_km_rate"] == 2.75
    assert data["per_minute_rate"] == 1.1


async def test_post_setup_success_forwards_payload(monkeypatch: MonkeyPatch, client: AsyncClient):
    import app.api.setup as setup_router

    recorded = {}

    async def fake_complete_initial_setup(db: AsyncSession, payload: SetupPayload):
        recorded["payload"] = payload
        return {"message": "Setup complete"}

    # Patch the router symbol so we don't execute the real service
    monkeypatch.setattr(setup_router, "complete_initial_setup", fake_complete_initial_setup)

    body: Dict[str, object] = {
        "admin_email": "admin@example.com",
        "full_name": "Admin User",
        "admin_password": "supersecret",
        "settings": {
            "account_mode": True,
            "google_maps_api_key": "XYZ",
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
        },
    }

    resp = await client.post("/setup", json=body)
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"message": "Setup complete"}

    # Ensure router built the typed payload and forwarded correct values
    # p: SetupPayload = recorded["payload"] #
    p = SetupPayload.model_validate(recorded["payload"])
    assert p.admin_email == "admin@example.com" #
    assert p.full_name == "Admin User" #
    assert p.settings.account_mode == True #
    assert p.settings.flagfall == 10.5 #
    assert p.settings.per_km_rate == 2.75 #
    assert p.settings.per_minute_rate == 1.1 #


async def test_post_setup_validation_error(monkeypatch: MonkeyPatch, client: AsyncClient):
    # No patch needed here; we're testing FastAPI validation only.
    bad_body: Dict[str, object] = {
        "admin_email": "admin@example.com",
        "full_name": "Admin User",
        "admin_password": "supersecret",
        "settings": {
            # "account_mode": "open",  # missing on purpose
            "google_maps_api_key": "XYZ",
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
        },
    }

    resp = await client.post("/setup", json=bad_body)
    assert resp.status_code == 422
