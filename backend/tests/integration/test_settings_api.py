from typing import Dict

import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_jwt_token
from app.models.settings import AdminConfig
from app.schemas.setup import SettingsPayload


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
    await async_session.execute(text("DELETE FROM admin_config"))
    await async_session.commit()
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
    assert data["account_mode"] is True
    assert data["flagfall"] == 10.5
    assert data["per_km_rate"] == 2.75
    assert data["per_minute_rate"] == 1.1
    assert data["admin_user_id"]


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

    # Auth as admin created during setup
    res = await async_session.execute(
        select(AdminConfig.admin_user_id).where(AdminConfig.id == 1)
    )
    admin_id = res.scalar_one()
    from app.services import settings_service

    settings_service._cached_admin_user_id = None
    token = create_jwt_token(admin_id)
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
    for k, v in new_values.model_dump(exclude={"admin_user_id"}).items():
        assert data[k] == v

    # Subsequent GET reflects new values without auth
    get_resp = await client.get("/settings")
    assert get_resp.status_code == 200
    resp_data = get_resp.json()
    for k, v in new_values.model_dump(exclude={"admin_user_id"}).items():
        assert resp_data[k] == v
