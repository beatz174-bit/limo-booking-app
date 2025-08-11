# tests/conftest.py
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from alembic.config import Config
from alembic import command  # for migrations

from app.main import app as _app
from app.db.database import Base
from app.dependencies import get_db
from app.core.config import get_settings

settings = get_settings()

TEST_DATABASE_URL = settings.database_path
engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

@pytest.fixture(scope="session", autouse=True)
def apply_migrations():
    cfg = Config(os.getenv("ALEMBIC_INI_PATH", "alembic.ini"))
    command.upgrade(cfg, "head")
    yield
    command.downgrade(cfg, "base")

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.rollback()
    _app.dependency_overrides[get_db] = override_get_db
    with TestClient(_app) as client:
        yield client
    _app.dependency_overrides.clear()
