# tests/unit/services/test_user_service.py
import pytest
from sqlalchemy.exc import IntegrityError

from app.services.user_service import UserService
from app.schemas.user import UserCreate, UserUpdate

class DummyUserRepo:
    def __init__(self):
        self.db = {}
    def get_by_email(self, email):
        return self.db.get(email)
    def create(self, user_data):
        email = user_data.email
        if email in self.db:
            raise IntegrityError("dup", params={}, orig=None)
        self.db[email] = dict(
            id=len(self.db) + 1,
            email=email,
            username=user_data.username
        )
        return self.db[email]
    def update(self, user_id, patch: UserUpdate):
        for u in self.db.values():
            if u["id"] == user_id:
                u.update(patch.dict(exclude_unset=True, exclude={"password"}))
                return u
        raise KeyError("not found")

@pytest.fixture
def svc():
    repo = DummyUserRepo()
    return UserService(user_repo=repo)

def test_signup_success(svc):
    u = svc.signup(UserCreate(username="bob", email="bob@example.com", password="pw"))
    assert u["email"] == "bob@example.com"
    assert u["username"] == "bob"

def test_signup_duplicate(svc):
    svc.signup(UserCreate(username="bob", email="bob@example.com", password="pw"))
    with pytest.raises(ValueError):
        svc.signup(UserCreate(username="bob2", email="bob@example.com", password="pwsecret"))

def test_update_happy(svc):
    u_init = svc.signup(UserCreate(username="alice", email="alice@example.com", password="pw"))
    out = svc.update(u_init["id"], UserUpdate(username="alicia"))
    assert out["username"] == "alicia"

def test_update_not_found(svc):
    with pytest.raises(ValueError):
        svc.update(999, UserUpdate(username="ghost"))
