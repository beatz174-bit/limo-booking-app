# tests/unit/services/test_setup_service.py
from typing import Union

import pytest
from app.models.settings import AdminConfig
from app.models.user_v2 import User
from app.schemas.setup import SettingsPayload, SetupPayload
from app.services import setup_service
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
async def _clean_setup_state(async_session: AsyncSession):  # type: ignore
    # ensure each test in this module starts with a clean slate
    await async_session.execute(delete(AdminConfig))
    await async_session.execute(delete(User))
    await async_session.commit()


async def test_is_setup_complete_initial(async_session: AsyncSession):
    # Before running setup, there should be no config
    assert await setup_service.is_setup_complete(async_session) is None


async def test_complete_initial_setup_success(async_session: AsyncSession):
    payload = SetupPayload(
        admin_email="admin@example.com",
        full_name="Admin User",
        admin_password="supersecret",
        settings=SettingsPayload(
            account_mode=True,
            flagfall=10.5,
            per_km_rate=2.75,
            per_minute_rate=1.1,
        ),
    )

    result = await setup_service.complete_initial_setup(async_session, payload)
    assert result == {"message": "Setup complete"}

    # Admin user created
    res = await async_session.execute(
        select(User).where(User.email == "admin@example.com")
    )
    admin = res.scalar_one()
    assert admin.email == "admin@example.com"

    # Config record created with expected values
    cfg = (await async_session.execute(select(AdminConfig).limit(1))).scalars().first()
    assert cfg is not None

    assert cfg.account_mode is True
    assert cfg.flagfall == 10.5
    assert cfg.per_km_rate == 2.75
    # Model uses per_min_rate, payload uses per_minute_rate
    assert cfg.per_minute_rate == 1.1


async def test_complete_initial_setup_idempotent(async_session: AsyncSession):
    payload = SetupPayload(
        admin_email="admin2@example.com",
        full_name="Admin Two",
        admin_password="pw",
        settings=SettingsPayload(
            account_mode=True,
            flagfall=1.0,
            per_km_rate=2.0,
            per_minute_rate=3.0,
        ),
    )

    # If setup is already complete from a prior test, we should immediately get a 400.
    already: Union[SettingsPayload, None] = await setup_service.is_setup_complete(
        async_session
    )
    if already:
        with pytest.raises(Exception) as excinfo:
            await setup_service.complete_initial_setup(async_session, payload)
        msg = str(excinfo.value)
        assert "400" in msg or "Setup already completed" in msg
        return

    # Otherwise: first call succeeds...
    await setup_service.complete_initial_setup(async_session, payload)
    # ...and second call is rejected.
    with pytest.raises(Exception) as excinfo:
        await setup_service.complete_initial_setup(async_session, payload)
    msg = str(excinfo.value)
    assert "400" in msg or "Setup already completed" in msg
