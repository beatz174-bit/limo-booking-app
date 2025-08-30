import uuid

import pytest
from fastapi import HTTPException
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_jwt_token, hash_password
from app.dependencies import get_current_user
from app.models.user_v2 import User

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


async def test_get_current_user_int_subject(async_session: AsyncSession):
    u = User(
        email="intsub@example.com",
        full_name="IntSub",
        hashed_password=hash_password("x"),
    )
    async_session.add(u)
    await async_session.commit()

    settings = get_settings()
    token = jwt.encode(
        {"sub": u.id.int},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    current = await get_current_user(token=token, db=async_session)
    assert current.id == u.id
