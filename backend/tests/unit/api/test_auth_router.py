# tests/unit/api/test_auth_router.py
import uuid
from typing import Dict

import pytest
from _pytest.monkeypatch import MonkeyPatch
from app.schemas.auth import LoginRequest, RegisterRequest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio


async def test_login_success(monkeypatch: MonkeyPatch, client: AsyncClient):
    import app.api.auth as auth_router

    called = {}

    async def fake_authenticate_user(
        db: AsyncSession, data: LoginRequest
    ) -> Dict[str, object]:
        # data is LoginRequest
        called["email"] = data.email
        called["password"] = data.password
        # Return the exact shape your endpoint returns today
        return {
            "token": "fake.jwt.token",
            "id": str(uuid.uuid4()),
            "email": data.email,
            "full_name": "Example User",
        }

    # Patch where the router uses the symbol
    monkeypatch.setattr(auth_router, "authenticate_user", fake_authenticate_user)

    resp = await client.post(
        "/auth/login", json={"email": "user@example.com", "password": "pw"}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["token"] == "fake.jwt.token"
    assert data["email"] == "user@example.com"
    assert data["full_name"] == "Example User"
    assert "id" in data
    assert called == {"email": "user@example.com", "password": "pw"}


async def test_login_validation_error(client: AsyncClient):
    # Let FastAPI validation fire
    resp = await client.post("/auth/login", json={"email": "user@example.com"})
    assert resp.status_code == 422


async def test_register_success(monkeypatch: MonkeyPatch, client: AsyncClient):
    import app.api.auth as auth_router

    called = {}

    async def fake_register_user(
        db: AsyncSession, data: RegisterRequest
    ) -> Dict[str, object]:
        # data is RegisterRequest
        called["email"] = data.email
        called["full_name"] = data.full_name
        called["password"] = data.password
        # Return the shape your endpoint returns today (user basics)
        return {
            "id": str(uuid.uuid4()),
            "email": data.email,
            "full_name": data.full_name,
        }

    monkeypatch.setattr(auth_router, "register_user", fake_register_user)

    resp = await client.post(
        "/auth/register",
        json={
            "email": "new@example.com",
            "full_name": "New User",
            "password": "s3cr3t",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["email"] == "new@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data
    assert called == {
        "email": "new@example.com",
        "full_name": "New User",
        "password": "s3cr3t",
    }


async def test_register_validation_error(client: AsyncClient):
    resp = await client.post(
        "/auth/register", json={"email": "bad@example.com", "password": "pw"}
    )
    assert resp.status_code == 422
