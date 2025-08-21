import pytest
from sqlalchemy import select

from app.models.user_v2 import User, UserRole

pytestmark = pytest.mark.asyncio


async def test_driver_seed(async_session):
    result = await async_session.execute(select(User).where(User.role == UserRole.DRIVER))
    driver = result.scalar_one_or_none()
    assert driver is not None
    assert driver.email == "driver@example.com"
