import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base
from app.dependencies import get_db
from app.models.user import User
from app.core.security import hash_password
from uuid import uuid4

# Use in-memory SQLite DB shared across threads
TEST_DATABASE_URL = "sqlite://"

# Engine & session setup
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Global setup: Create schema once
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# DB session per test function
@pytest.fixture(scope="function")
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


# Override get_db dependency for all API tests
@pytest.fixture(scope="function")
def client(db_session):
    def _get_test_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_test_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session):
    """
    Create and return a test user in the DB.
    """
    user = User(
        email="test@example.com",
        full_name="Test User",
        hashed_password=hash_password("secret"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def auth_token(client, test_user):
    """
    Log in the test user and return a valid JWT token.
    """
    response = client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "secret"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    """
    Provide Authorization headers for authenticated requests.
    """
    return {"Authorization": f"Bearer {auth_token}"}