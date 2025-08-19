# backend/app/core/config.py
from __future__ import annotations

import os
"""Application configuration using Pydantic settings."""

import os
from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


# --- Resolve which .env to load ------------------------------------------------

_ENV = os.getenv("ENV", "development").lower()
_ENV_TO_FILE = {
    "development": ".env.development",
    "dev": ".env.development",
    "testing": ".env.test",
    "test": ".env.test",
    "production": ".env.production",
    "prod": ".env.production",
}
_ENV_FILE = _ENV_TO_FILE.get(_ENV, ".env.development")


def _find_upwards(filename: str) -> Optional[Path]:
    """Find a file by walking up from this file's directory."""
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        candidate = parent / filename
        if candidate.exists():
            return candidate
    return None


# Load the chosen .env early so BaseSettings reads from os.environ.
# By default load_dotenv() does NOT override already-set OS env vars (what we want).
try:
    from dotenv import load_dotenv

    dotenv_path = _find_upwards(_ENV_FILE)
    if dotenv_path:
        load_dotenv(dotenv_path, override=False)
    else:
        # As a fallback, load any plain ".env" if present
        load_dotenv(override=False)
except Exception:
    # If python-dotenv isn't installed or anything goes wrong, just continue.
    pass


# --- Pydantic BaseSettings import (v1 and v2 compatible) -----------------------

try:

    _P2 = True
except Exception:

    _P2 = False # type: ignore

def _project_root() -> Path:
    """
    Best-effort project root resolution.
    We try to find where your .env files live, or the 'backend' folder.
    """
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        if (parent / ".env.development").exists() or (parent / "backend").exists():
            return parent
    return Path.cwd()


# --- Settings model ------------------------------------------------------------

class Settings(BaseSettings):
    # App
    app_name: str = os.getenv("PROJECT_NAME","Limo Booking App")
    app_version: str = os.getenv("PROJECT_VERSION","undefined")
    api_prefix: str = os.getenv("API_PREFIX","undefined")
    env: str = _ENV
    debug: bool = os.getenv("DEBUG", "false").lower() in {"1", "true", "yes", "on"}
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    # CORS (allow multiple origins via comma-separated list)
    allow_origins: str = os.getenv("CORS_ALLOW_ORIGINS", "undefined")
    allow_credentials: bool = True
    allow_methods: List[str] = ["*"]
    allow_headers: List[str] = ["*"]

    # Database (prefer DATABASE_URL; else derive from DATABASE_PATH)
    database_url: Optional[str] = os.getenv("DATABASE_URL")
    database_path: Optional[str] = os.getenv("DATABASE_PATH")
    database_pool_size: int = int(os.getenv("DB_POOL_SIZE","undefined"))
    database_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW","undefined"))
    database_pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE","undefined"))

    # Auth / Security
    jwt_secret_key: str  = os.getenv("JWT_SECRET_KEY","undefined") # must be provided by env
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Third-party APIs
    ors_api_key: Optional[str] = os.getenv("ORS_API_KEY","undefined")
    google_maps_api_key: Optional[str] = os.getenv("GOOGLE_MAPS_API_KEY")

    # Pydantic config (v1 vs v2)
    if _P2:
        model_config = SettingsConfigDict(env_prefix="", extra="ignore", case_sensitive=False)
    else:
        class Config:
            env_prefix = ""
            case_sensitive = False

    # ---------- Convenience helpers ----------

    @model_validator(mode="after")
    def _create_database_dir(self) -> "Settings":
        """Ensure the directory for the SQLite database exists.

        Tests load ``database_path`` from ``.env`` and expect that the
        corresponding directory is present.  When the folder is missing, SQLite
        cannot create the database file and every test fails with
        ``sqlite3.OperationalError: unable to open database file``.  By
        resolving the path relative to the project root and creating the parent
        directory here, we make the settings object robust for first-time
        execution.
        """
        if self.database_path:
            path = Path(self.database_path)
            if not path.is_absolute():
                path = (_project_root() / path).resolve()
            # ``mkdir`` succeeds even if the directory already exists
            path.parent.mkdir(parents=True, exist_ok=True)
            self.database_path = str(path)
        return self

    @property
    def cors_origins(self) -> List[str]:
        """
        Returns allow_origins as a list for FastAPI CORSMiddleware.
        Example: "https://a.com, https://b.com"
        """
        return [o.strip() for o in self.allow_origins.split(",") if o.strip()]

    @property
    def sqlalchemy_database_uri(self) -> str:
        """
        Final SQLAlchemy-compatible database URL.
        Priority: DATABASE_URL > DATABASE_PATH > default dev file.
        """
        if self.database_url:
            return self.database_url

        if self.database_path:
            path = Path(self.database_path)
            # If a full URL was put in DATABASE_PATH by mistake, just return it.
            if str(path).startswith(("sqlite:", "postgresql", "mysql", "mssql")):
                return str(path)
            # Compose a sqlite URL; make relative paths relative to project root
            if not path.is_absolute():
                path = (_project_root() / path).resolve()
            return f"sqlite:///{path}"

        # Sensible default for dev if nothing is provided
        default_path = (_project_root() / "data" / "app.db").resolve()
        return f"sqlite:///{default_path}"

@lru_cache
def get_settings() -> Settings:
    """Singleton-style accessor so we don't re-parse env every import."""
    return Settings()
