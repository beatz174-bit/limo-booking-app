# tests/integration/test_auth_token_endpoint.py
import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_oauth2_token_flow(client: httpx.AsyncClient, async_session: AsyncSession):
    # register first (or use a seeded user)
    await client.post("/auth/register", json={"email":"t1@example.com","full_name":"T1","password":"pw"})
    r = await client.post(
        "/auth/token",
        data={"username":"t1@example.com","password":"pw"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body and body["token_type"] == "bearer"
