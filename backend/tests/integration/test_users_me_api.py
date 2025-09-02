import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_jwt_token, hash_password
from app.models.user_v2 import User


@pytest.mark.asyncio
async def test_get_and_update_me(client: AsyncClient, async_session: AsyncSession):
    email = f"{uuid.uuid4()}@example.com"
    user = User(
        email=email,
        full_name="Me",
        hashed_password=hash_password("pass"),
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # GET /users/me
    res = await client.get("/users/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == email

    # PATCH /users/me
    payload = {"full_name": "New Name"}
    res = await client.patch("/users/me", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "New Name"

    await async_session.refresh(user)
    assert user.full_name == "New Name"


@pytest.mark.asyncio
async def test_enable_disable_push(client: AsyncClient, async_session: AsyncSession):
    user = User(
        email=f"{uuid.uuid4()}@example.com",
        full_name="Pusher",
        hashed_password=hash_password("pass"),
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.patch("/users/me", json={"fcm_token": "tok"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["fcm_token"] == "tok"
    await async_session.refresh(user)
    assert user.fcm_token == "tok"

    resp = await client.patch("/users/me", json={"fcm_token": None}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["fcm_token"] is None
    await async_session.refresh(user)
    assert user.fcm_token is None
