# tests/unit/api/test_users_router.py
import pytest
from fastapi import Depends, HTTPException, status

from app.api.users import router as users_router
from app.schemas.user import UserRead, UserCreate

from app.services.user_service import UserService

from fastapi.testclient import TestClient
from app.main import get_app

@pytest.fixture
def fake_svc():
    class Fake:
        def get(self, user_id: int):
            if user_id == 42:
                return {"id": 42, "username": "zaphod", "email": "z@example.com"}
            raise HTTPException(status.HTTP_404_NOT_FOUND, "not found")

        def list_all(self):
            return [{"id": 2, "username": "ford", "email": "f@hitchhiker"}]

        def create(self, _):
            return {"id": 5, "username": "arthur", "email": "arthur@example.com"}

    return Fake()

@pytest.fixture
def client_with_fake(fake_svc):
    app = get_app()
    app.dependency_overrides[UserService] = lambda: fake_svc
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(UserService, None)

def test_get_found(client_with_fake):
    resp = client_with_fake.get("/users/42")
    assert resp.status_code == 200
    assert resp.json()["id"] == 42

def test_get_missing(client_with_fake):
    resp = client_with_fake.get("/users/99")
    assert resp.status_code == 404

def test_list_users(client_with_fake):
    resp = client_with_fake.get("/users")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_create_user_cannot_override_id(client_with_fake):
    payload = {"id": 99, "username": "nn", "email": "n@e"}
    resp = client_with_fake.post("/users", json=payload)
    assert resp.status_code == 400
