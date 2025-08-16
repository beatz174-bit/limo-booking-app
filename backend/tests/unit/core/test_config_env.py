# tests/unit/core/test_config_env.py
import os
from importlib import reload
from app.core import config as config_module
from pathlib import Path

def _reload_with_env(env: dict[str,str]):
    old = os.environ.copy()
    os.environ.clear()
    os.environ.update(env)
    try:
        reload(config_module)
        return config_module.get_settings()
    finally:
        # restore environment and module
        os.environ.clear()
        os.environ.update(old)
        reload(config_module)

def test_env_file_selection_uses_ENV_variable():
    s = _reload_with_env({"ENV": "test", "PROJECT_NAME": "Limo Booking App"})
    assert s.env == "test"

def test_database_url_falls_back_to_path(tmp_path: Path):
    db_dir = tmp_path / "data"
    db_dir.mkdir()
    db_file = db_dir / "app.db"

    s = _reload_with_env({
        "ENV": "test",
        "DATABASE_URL": "",                 # force the fallback path
        "DATABASE_PATH": str(db_file),      # where we want it to land
        "JWT_SECRET_KEY": "secret",
    })

    # Your config derives the final URL via `sqlalchemy_database_uri`
    uri = s.sqlalchemy_database_uri
    assert uri.startswith("sqlite:///")
    assert str(db_file) in uri
