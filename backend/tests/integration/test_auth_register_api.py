import pytest
from app.core.security import hash_password
from app.models.user_v2 import User
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, async_session: AsyncSession):
    payload = {
        "email": "regapi@example.com",
        "full_name": "Reg API",
        "password": "pw12345",
    }
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["email"] == "regapi@example.com"
    assert data["full_name"] == "Reg API"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(
    client: AsyncClient, async_session: AsyncSession
):
    u = User(
        email="dupapi@example.com",
        full_name="Dup API",
        hashed_password=hash_password("x"),
    )
    async_session.add(u)
    await async_session.commit()

    payload = {
        "email": "dupapi@example.com",
        "full_name": "Dup API 2",
        "password": "pw",
    }
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Email already registered"
