import uuid
from typing import Dict

import pytest
from app.core.security import create_jwt_token
from app.models.user_v2 import User
from app.schemas.setup import SettingsPayload
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

ADMIN_ID = uuid.UUID(int=1)


async def _ensure_admin_id1(async_session: AsyncSession) -> User:
    """Make sure a user with id=1 exists (service checks admin via id==1)."""
    u1 = await async_session.get(User, ADMIN_ID)
    if u1 is None:
        # Create a minimal active user record with id=1
        u1 = User(
            id=ADMIN_ID,
            email="settings-admin-override@example.com",
            full_name="Settings Admin Override",
            hashed_password="x",
        )
        async_session.add(u1)
        await async_session.commit()
        await async_session.refresh(u1)
    return u1


@pytest.mark.asyncio
async def test_settings_put_requires_auth(client: AsyncClient):
    # PUT without a bearer token should be unauthorized
    resp2 = await client.put(
        "/settings",
        json={
            "account_mode": True,
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
        },
    )
    assert resp2.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_settings_after_setup(
    client: AsyncClient, async_session: AsyncSession
):
    # Complete initial setup so settings exist
    payload: Dict[str, object] = {
        "admin_email": "admin@example.com",
        "full_name": "Admin User",
        "admin_password": "supersecret",
        "settings": {
            "account_mode": True,
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
        },
    }
    setup_resp = await client.post("/setup", json=payload)
    # Allow 400 if setup was already completed by a previous test run
    assert setup_resp.status_code in (200, 201, 400)

    # GET should succeed without authentication
    resp = await client.get("/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert data == {
        "account_mode": True,
        "flagfall": 10.5,
        "per_km_rate": 2.75,
        "per_minute_rate": 1.1,
    }


@pytest.mark.asyncio
async def test_put_settings_updates_values(
    client: AsyncClient, async_session: AsyncSession
):
    # Ensure setup exists first (creates initial settings row)
    payload: Dict[str, object] = {
        "admin_email": "admin@example.com",
        "full_name": "Admin User",
        "admin_password": "supersecret",
        "settings": {
            "account_mode": True,
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
        },
    }
    setup_resp = await client.post("/setup", json=payload)
    assert setup_resp.status_code in (200, 201, 400)  # allow idempotent reruns locally

    # Auth as id=1
    u1 = await _ensure_admin_id1(async_session)
    token = create_jwt_token(u1.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Update settings
    new_values: SettingsPayload = SettingsPayload(
        account_mode=False,
        flagfall=12.0,
        per_km_rate=3.0,
        per_minute_rate=1.25,
    )
    put_resp = await client.put(
        "/settings", headers=headers, json=new_values.model_dump()
    )
    assert put_resp.status_code == 200
    data = put_resp.json()
    assert data == new_values.model_dump()

    # Subsequent GET reflects new values without auth
    get_resp = await client.get("/settings")
    assert get_resp.status_code == 200
    assert get_resp.json() == new_values.model_dump()
