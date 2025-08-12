import os
import asyncio
import pytest
import pytest_asyncio
from pathlib import Path
import httpx

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine


from httpx import AsyncClient

# IMPORTANT: adjust these imports to match your repo.
# - app.main: FastAPI instance
# - app.core.config (or wherever) to read DATABASE_URL if needed
# - app.db.dependencies (or wherever) to import get_db dependency used by routes
from app.main import app
# try:
from app.dependencies import get_db  # ← common place
# except ImportError:
#     from app.api.dependencies import get_db  # ← fallback if you keep deps under api/

# --- Resolve async DB URL from .env.test (pytest-dotenv loads it when you pass --envfile) ---
from alembic.config import Config
from alembic import command  
from app.core.config import get_settings

settings = get_settings()

def _make_async_url(sync_url: str) -> str:
    """
    Make an async SQLAlchemy URL from a sync one.
    - sqlite:///...  -> sqlite+aiosqlite:///...
    - postgresql://  -> postgresql+asyncpg:// ...
    - mysql://       -> mysql+aiomysql:// ...
    """
    if sync_url.startswith("sqlite:///"):
        return sync_url.replace("sqlite:///", "sqlite+aiosqlite:///")
    if sync_url.startswith("postgresql://"):
        return sync_url.replace("postgresql://", "postgresql+asyncpg://")
    if sync_url.startswith("mysql://"):
        return sync_url.replace("mysql://", "mysql+aiomysql://")
    # If already async, return as-is
    return sync_url

SYNC_DB_URL = f'sqlite:///{os.getenv("DATABASE_PATH")}' or os.getenv("SQLALCHEMY_DATABASE_URI") or ""
if not SYNC_DB_URL:
    raise RuntimeError("DATABASE_URL not found in environment (ensure you run pytest with --envfile=.env.test)")
ASYNC_DB_URL = _make_async_url(SYNC_DB_URL)

# --- Create async engine / sessionmaker bound to the REAL test DB file/url ---

async_engine = create_async_engine(ASYNC_DB_URL, future=True)
AsyncSessionLocal = async_sessionmaker(bind=async_engine, expire_on_commit=False, class_=AsyncSession)


# --- Run Alembic migrations ONCE per test session (against the sync URL your env already uses) ---

@pytest.fixture(scope="session", autouse=True)
def _migrate_db(): # type: ignore
    """
    Your app already runs migrations automatically in test logs, but we ensure the DB is migrated
    before tests that open AsyncSession. If your app's startup runs Alembic, you can drop this.
    """
    # Option A: no-op because your app does it. Keep this stub to document intent.
    # yield

    # # Option B: if you need to run it manually, uncomment:
    # from alembic import command
    # from alembic.config import Config
    # cfg = Config("alembic.ini")
    # command.upgrade(cfg, "head")
    TEST_DATABASE_URL = f"sqlite:///{settings.database_path}"

    cfg = Config(os.getenv("ALEMBIC_INI_PATH", "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.upgrade(cfg, "head")
    yield
    # command.downgrade(cfg, "base")
    # Teardown: dispose connections and delete DB file instead of downgrade
    try:
        create_engine(TEST_DATABASE_URL).dispose()
    except Exception:
        pass
    try:
        Path(settings.database_path).unlink(missing_ok=True) # type: ignore
    except Exception:
        pass



# --- Event loop for pytest-asyncio (Py3.9 default policy etc.) ---

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# --- Async DB session fixture for tests that need direct DB access ---

@pytest_asyncio.fixture
async def async_session():
    async with AsyncSessionLocal() as session:
        yield session
        # optional: clean per-test if you want hard isolation
        # await session.rollback()


# --- Override FastAPI dependency to inject AsyncSession into routes/services ---

@pytest_asyncio.fixture(autouse=True, scope="function")
async def override_get_db():
    async def _get_db():
        async with AsyncSessionLocal() as session: 
            try:
                yield session          # endpoint runs here
                await session.commit()  # commit on success
            except:                     # noqa: E722
                await session.rollback()
                raise
            finally:
                await session.close()

    # apply override
    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.clear()


# --- Async HTTP client for integration tests ---

@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
