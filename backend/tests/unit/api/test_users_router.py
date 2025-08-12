# tests/unit/api/test_users_router.py
import pytest
from fastapi.testclient import TestClient
from app.main import get_app
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.user import UserRead, UserCreate

@pytest.fixture
def client_with_fakes(monkeypatch):
    app = get_app()

    # Bypass auth
    def _fake_current_user():
        return User(id=1, email="tester@example.com", full_name="Tester", hashed_password="x")
    app.dependency_overrides[get_current_user] = _fake_current_user

    # Avoid real DB (fakes ignore this arg anyway)
    async def _fake_get_db():
        yield None
    app.dependency_overrides[get_db] = _fake_get_db

    # ---- Patch where the router USES the symbols ----
    # i.e., patch app.api.users.<function>, not the service module.
    # get_user
    async def _fake_get_user(db, user_id: int):
        if user_id == 42:
            return UserRead(id=42, email="bob@example.com", full_name="Bob Example")
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # list_users
    async def _fake_list_users(db, skip: int = 0, limit: int = 100):
        return [
            UserRead(id=1, email="alice@example.com", full_name="Alice"),
            UserRead(id=2, email="eve@example.com", full_name="Eve"),
        ]

    # create_user
    async def _fake_create_user(db, data: UserCreate):
        if hasattr(data, "id"):
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID is read-only")
        return UserRead(id=123, email=data.email, full_name=data.full_name)

    # Apply patches at the import site
    monkeypatch.setattr("app.api.users.get_user", _fake_get_user, raising=True)
    monkeypatch.setattr("app.api.users.list_users", _fake_list_users, raising=True)
    monkeypatch.setattr("app.api.users.create_user", _fake_create_user, raising=True)

    client = TestClient(app)
    try:
        yield client
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)

def test_get_found(client_with_fakes):
    resp = client_with_fakes.get("/users/42")
    assert resp.status_code == 200
    assert resp.json()["id"] == 42

def test_get_missing(client_with_fakes):
    resp = client_with_fakes.get("/users/99")
    assert resp.status_code == 404

def test_list_users(client_with_fakes):
    resp = client_with_fakes.get("/users")
    assert resp.status_code == 200
    emails = {u["email"] for u in resp.json()}
    assert emails == {"alice@example.com", "eve@example.com"}

def test_create_user_cannot_override_id(client_with_fakes):
    payload = {"id": 99, "email": "nn@example.com", "full_name": "NN", "password": "pw"}
    resp = client_with_fakes.post("/users", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] != 99
