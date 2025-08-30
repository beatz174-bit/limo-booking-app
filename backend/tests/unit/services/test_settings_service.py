import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.setup import SettingsPayload
from app.schemas.user import UserRead
from app.services import settings_service

pytestmark = pytest.mark.asyncio


async def test_get_settings_404_when_missing(async_session: AsyncSession):
    """Service raises 404 when no settings row exists."""
    await async_session.execute(text("DELETE FROM admin_config"))
    await async_session.commit()

    with pytest.raises(HTTPException) as exc:
        await settings_service.get_settings(async_session)
    assert exc.value.status_code == 404


async def test_update_then_get_returns_values(async_session: AsyncSession):
    admin_id = uuid.UUID(int=1)
    settings_service._cached_admin_user_id = admin_id

    user: UserRead = UserRead(
        email="test@na.com",
        full_name="bloke",
        id=admin_id,
    )

    payload: SettingsPayload = SettingsPayload(
        account_mode=False,
        flagfall=12.0,
        per_km_rate=3.0,
        per_minute_rate=1.25,
    )

    # First call update to seed settings
    updated = await settings_service.update_settings(payload, async_session, user)
    assert updated.account_mode == payload.account_mode
    assert updated.flagfall == payload.flagfall
    assert updated.per_km_rate == payload.per_km_rate
    assert updated.per_minute_rate == payload.per_minute_rate

    # Now get should return the same values
    got = await settings_service.get_settings(async_session)
    assert got.account_mode == payload.account_mode
    assert got.flagfall == payload.flagfall
    assert got.per_km_rate == payload.per_km_rate
    assert got.per_minute_rate == payload.per_minute_rate

    settings_service._cached_admin_user_id = None
