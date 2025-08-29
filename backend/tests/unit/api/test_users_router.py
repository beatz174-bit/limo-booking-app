# tests/unit/api/test_users_router.py
import uuid

import pytest
from app.dependencies import get_current_user, get_db
from app.main import get_app
from app.models.user_v2 import User
from app.schemas.user import UserCreate, UserRead
from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def client_with_fakes(monkeypatch: MonkeyPatch):
    app = get_app()

    # Bypass auth
    def _fake_current_user():
        return User(
            id=uuid.uuid4(),
            email="tester@example.com",
            full_name="Tester",
            hashed_password="x",
        )

    app.dependency_overrides[get_current_user] = _fake_current_user

    # Avoid real DB (fakes ignore this arg anyway)
    async def _fake_get_db():
        yield None

    app.dependency_overrides[get_db] = _fake_get_db

    # ---- Patch where the router USES the symbols ----
    # i.e., patch app.api.users.<function>, not the service module.
    # get_user
    target_id = uuid.uuid4()

    async def _fake_get_user(db: AsyncSession, user_id: uuid.UUID):
        if user_id == target_id:
            return UserRead(
                id=target_id, email="bob@example.com", full_name="Bob Example"
            )
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # list_users
    async def _fake_list_users(db: AsyncSession, skip: int = 0, limit: int = 100):
        return [
            UserRead(id=uuid.uuid4(), email="alice@example.com", full_name="Alice"),
            UserRead(id=uuid.uuid4(), email="eve@example.com", full_name="Eve"),
        ]

    # create_user
    async def _fake_create_user(db: AsyncSession, data: UserCreate):
        if hasattr(data, "id"):
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="ID is read-only"
            )
        return UserRead(id=uuid.uuid4(), email=data.email, full_name=data.full_name)

    # Apply patches at the import site
    monkeypatch.setattr("app.api.users.get_user", _fake_get_user, raising=True)
    monkeypatch.setattr("app.api.users.list_users", _fake_list_users, raising=True)
    monkeypatch.setattr("app.api.users.create_user", _fake_create_user, raising=True)

    client = TestClient(app)
    try:
        yield client, target_id
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)


def test_get_found(client_with_fakes: tuple[TestClient, uuid.UUID]):
    client, target_id = client_with_fakes
    resp = client.get(f"/users/{target_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == str(target_id)


def test_get_missing(client_with_fakes: tuple[TestClient, uuid.UUID]):
    client, target_id = client_with_fakes
    resp = client.get(f"/users/{uuid.uuid4()}")
    assert resp.status_code == 404


def test_list_users(client_with_fakes: tuple[TestClient, uuid.UUID]):
    client, _ = client_with_fakes
    resp = client.get("/users")
    assert resp.status_code == 200
    emails = {u["email"] for u in resp.json()}
    assert emails == {"alice@example.com", "eve@example.com"}


def test_create_user_cannot_override_id(
    client_with_fakes: tuple[TestClient, uuid.UUID],
):
    client, _ = client_with_fakes
    payload: dict[str, object] = {
        "id": 99,
        "email": "nn@example.com",
        "full_name": "NN",
        "password": "pw",
    }
    resp = client.post("/users", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] != 99
