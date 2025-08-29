import uuid

import pytest
from app.core.security import create_jwt_token, hash_password
from app.dependencies import get_current_user
from app.models.user_v2 import User
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio


async def test_get_current_user_success(async_session: AsyncSession):
    u = User(
        email="tok@example.com", full_name="Tok", hashed_password=hash_password("x")
    )
    async_session.add(u)
    await async_session.commit()
    token = create_jwt_token(u.id)

    current = await get_current_user(token=token, db=async_session)
    assert current.id == u.id


async def test_get_current_user_invalid_token(async_session: AsyncSession):
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user(token="not.a.jwt", db=async_session)
    assert excinfo.value.status_code == 401


async def test_get_current_user_user_not_found(async_session: AsyncSession):
    # valid token, but points at missing user
    token = create_jwt_token(uuid.uuid4())
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user(token=token, db=async_session)
    assert excinfo.value.status_code == 404
