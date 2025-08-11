# app/db/database.py
import warnings
from typing import Awaitable, Dict, Union, Protocol

from sqlalchemy.engine.url import make_url, URL
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncEngine,
    AsyncSession,
)
from sqlalchemy.orm import DeclarativeBase
from pathlib import Path
from app.core.config import get_settings

settings = get_settings()

# --------------------------------------------------------------------
# 🚀 1. Build engine URL and detect async driver



raw = settings.database_path
path = Path(raw) #type: ignore
if not path.is_absolute():
    # choose your root; e.g., repo root or backend dir
    repo_root = Path(__file__).resolve().parents[3]  # adjust as needed
    full_path = (repo_root / path).resolve()
else:
    full_path = settings.database_path


url = make_url(f"sqlite+aiosqlite:///{full_path}")
if url.drivername == "sqlite":
    # Automatic fix: wrap sqlite into sqlite+aiosqlite
    warnings.warn(
        "Detected non-async SQLite URL—switching to 'sqlite+aiosqlite' automatically",
        stacklevel=2,
    )
    url = URL.create(
        drivername="sqlite+aiosqlite",
        database=url.database or ":memory:", 
    )

# --------------------------------------------------------------------
# 📦 2. Engine kwargs (type-safe assignments)

is_sqlite_async = url.drivername.startswith("sqlite+aiosqlite")
engine_kwargs: Dict[str, Union[int, bool, Dict[str, bool]]] = {
    "connect_args": {"check_same_thread": False} if is_sqlite_async else {}
}

if not is_sqlite_async:
    engine_kwargs["pool_size"] = settings.database_pool_size
    engine_kwargs["max_overflow"] = settings.database_max_overflow
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = settings.database_pool_recycle

# --------------------------------------------------------------------
# 🧰 3. Create actual AsyncEngine

async_engine: AsyncEngine = create_async_engine(
    str(url),
    **engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

# --------------------------------------------------------------------
# 4. Declarative Base for ORM models

class Base(DeclarativeBase):
    pass

# --------------------------------------------------------------------
# 5. Database "lifespan" utilities

async def connect() -> None:
    """
    Called on app startup; creates all tables if not exist.
    Automatically handles AsyncEngine.
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def disconnect() -> None:
    """
    Cleanly dispose engine on app shutdown.
    """
    await async_engine.dispose()

class LifespanCallable(Protocol):
    """
    Simple alias for async fn: () -> Awaitable[None]
    Helps static analyzers infer the connect/disconnect signatures.
    """
    def __call__(self) -> Awaitable[None]:
        ...
    

class Database:
    """
    Expose lifecycle functions for FastAPI lifespan parameter.
    """

    def __init__(
        self,
        connect_fn: LifespanCallable,
        disconnect_fn: LifespanCallable,
    ) -> None:
        self.connect = connect_fn
        self.disconnect = disconnect_fn

# Final instance to import in main.py
database = Database(connect_fn=connect, disconnect_fn=disconnect)

# --------------------------------------------------------------------
# 6. Optional SQLite sync fallback ---------------------------------------------------
#
# If you ever want to use a sync engine (e.g. for legacy tests), you can
# also expose this engine and session factory:
#
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker
#
# sync_engine = async_engine.sync_engine
# SessionLocal = sessionmaker(bind=sync_engine, expire_on_commit=False)
#
# And define get_db_dep() for FastAPI sync endpoints:
#
# def get_db_dep() -> Generator[Session, None, None]:
#     session = SessionLocal()
#     try:
#         yield session
#     finally:
#         session.close()
