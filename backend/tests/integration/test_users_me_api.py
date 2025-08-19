import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.core.security import hash_password, create_jwt_token

@pytest.mark.asyncio
async def test_get_and_update_me(client: AsyncClient, async_session: AsyncSession):
    user = User(
        email="me@example.com",
        full_name="Me",
        hashed_password=hash_password("pass"),
        default_pickup_address="123 Street",
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
    assert data["email"] == "me@example.com"
    assert data["default_pickup_address"] == "123 Street"

    # PATCH /users/me
    payload = {"full_name": "New Name", "default_pickup_address": "456 Ave"}
    res = await client.patch("/users/me", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "New Name"
    assert data["default_pickup_address"] == "456 Ave"

    await async_session.refresh(user)
    assert user.full_name == "New Name"
    assert user.default_pickup_address == "456 Ave"
