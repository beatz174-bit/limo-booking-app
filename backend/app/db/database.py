# app/db/database.py
import warnings

"""Database connection and session management utilities."""

import asyncio
from pathlib import Path
from typing import Awaitable, Dict, Protocol, Union

from sqlalchemy.engine.url import URL, make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from alembic import command
from alembic.config import Config
from app.core.config import get_settings

settings = get_settings()

# --------------------------------------------------------------------
# 🚀 1. Build engine URL and detect async driver


raw = settings.database_path
path = Path(raw)  # type: ignore
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
engine_kwargs: Dict[str, Union[int, bool, Dict[str, Union[bool, int]]]] = {
    "connect_args": {"timeout": 30}
}

if is_sqlite_async:
    engine_kwargs["connect_args"]["check_same_thread"] = False
else:
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


async def _enable_wal() -> None:
    if hasattr(async_engine, "run_sync"):
        await async_engine.run_sync(
            lambda conn: conn.exec_driver_sql("PRAGMA journal_mode=WAL")
        )
    else:
        async with async_engine.begin() as conn:
            await conn.run_sync(lambda c: c.exec_driver_sql("PRAGMA journal_mode=WAL"))


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
    """Run on app startup to ensure the database is migrated."""
    await _enable_wal()
    # Import all ORM models so that metadata is populated. Legacy models are
    # still imported for backward compatibility.
    # New domain models
    from app.models import availability_slot  # noqa: F401
    from app.models import booking  # noqa: F401
    from app.models import notification  # noqa: F401
    from app.models import route_point  # noqa: F401
    from app.models import trip  # noqa: F401
    from app.models import user_v2  # noqa: F401
    from app.models import settings, user  # noqa: F401  # type: ignore

    command.upgrade(Config("alembic.ini"), "head")


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

    def __call__(self) -> Awaitable[None]: ...


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


async def get_async_session() -> AsyncSession:
    """FastAPI dependency that provides an `AsyncSession`."""
    async with AsyncSessionLocal() as session:
        yield session


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
