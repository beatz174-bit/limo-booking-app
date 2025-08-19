import pytest
from typing import Dict
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_jwt_token
from app.models.user import User
from app.schemas.setup import SettingsPayload


async def _ensure_admin_id1(async_session: AsyncSession) -> User:
    """Make sure a user with id=1 exists (service checks admin via id==1)."""
    u1 = await async_session.get(User, 1)
    if u1 is None:
        # Create a minimal active user record with id=1
        u1 = User(
            id=1,
            email="settings-admin-override@example.com",
            full_name="Settings Admin Override",
            hashed_password="x",
            is_active=True,
        )
        async_session.add(u1)
        await async_session.commit()
        await async_session.refresh(u1)
    return u1


@pytest.mark.asyncio
async def test_settings_requires_auth(client: AsyncClient):
    # GET without a bearer token should be unauthorized
    resp = await client.get("/settings")
    assert resp.status_code in (401, 403)

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
async def test_get_settings_after_setup(client: AsyncClient, async_session: AsyncSession):
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
    assert setup_resp.status_code in (200, 201)

    # Authenticate explicitly as id=1 (matches ensure_admin rule)
    u1 = await _ensure_admin_id1(async_session)
    token = create_jwt_token(u1.id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/settings", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data == {
        "account_mode": True,
        "flagfall": 10.5,
        "per_km_rate": 2.75,
        "per_minute_rate": 1.1,
    }


@pytest.mark.asyncio
async def test_put_settings_updates_values(client: AsyncClient, async_session: AsyncSession):
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
    put_resp = await client.put("/settings", headers=headers, json=new_values.model_dump())
    assert put_resp.status_code == 200
    data = put_resp.json()
    assert data == new_values.model_dump()

    # Subsequent GET reflects new values
    get_resp = await client.get("/settings", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json() == new_values.model_dump()
