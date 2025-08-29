import uuid

import pytest
from app.core.security import create_jwt_token, hash_password
from app.models.user_v2 import User
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_update_user_unauthorized(
    client: AsyncClient, async_session: AsyncSession
):
    u = User(
        email="updateme@example.com",
        full_name="Old Name",
        hashed_password=hash_password("pw"),
    )
    async_session.add(u)
    await async_session.commit()

    resp = await client.patch(f"/users/{u.id}", json={"full_name": "New Name"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_update_user_not_found(client: AsyncClient, async_session: AsyncSession):
    me = User(
        email="notfound@example.com",
        full_name="Me",
        hashed_password=hash_password("pw"),
    )
    async_session.add(me)
    await async_session.commit()

    token = create_jwt_token(me.id)
    headers = {"Authorization": f"Bearer {token}"}

    missing_id = uuid.uuid4()
    resp = await client.patch(
        f"/users/{missing_id}", headers=headers, json={"full_name": "Nope"}
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"


@pytest.mark.asyncio
async def test_update_user_success(client: AsyncClient, async_session: AsyncSession):
    actor = User(
        email="actor@example.com",
        full_name="Actor",
        hashed_password=hash_password("pw"),
    )
    target = User(
        email="targetupdate@example.com",
        full_name="Before",
        hashed_password=hash_password("pw2"),
    )
    async_session.add_all([actor, target])
    await async_session.commit()

    token = create_jwt_token(actor.id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.patch(
        f"/users/{target.id}", headers=headers, json={"full_name": "After"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(target.id)
    assert data["full_name"] == "After"

    # await async_session.expire_all()

    # persisted?
    res = await async_session.execute(select(User).where(User.id == target.id))
    updated = res.scalar_one()
    await async_session.refresh(target)
    assert updated.full_name == "After"
