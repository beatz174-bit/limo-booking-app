# alembic/env.py
import os # type: ignore
import sys # type: ignore
from logging.config import fileConfig
from dotenv import load_dotenv

load_dotenv()
# Ensure your app module (root project directory) is on sys.path
#sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import get_settings
env_settings = get_settings()

from sqlalchemy import engine_from_config, pool
from alembic import context  # essential – must be here before using `context.config`



# Load the DATABASE_URL from the environment
# DATABASE_PATH = os.getenv("DATABASE_PATH")
DATABASE_PATH = env_settings.database_path
print(DATABASE_PATH)
if not DATABASE_PATH:
    raise RuntimeError("DATABASE_PATH environment variable is not set")
# Now that path is set, import your Base metadata
from app.db.database import Base
# If you have custom types/models,
# import them here to include them in autogeneration:
from app.models import user, booking, settings # type: ignore


config = context.config

# optionally override sqlalchemy.url loaded from alembic.ini:
# config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

fileConfig(config.config_file_name) # type: ignore
print(Base.metadata.tables.keys())
target_metadata = Base.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"}
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    section = config.get_section(config.config_ini_section)
    if DATABASE_PATH and section:
        section["sqlalchemy.url"] = f"sqlite:///{DATABASE_PATH}"
        connectable = engine_from_config(
            section,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool
        )
        with connectable.connect() as conn:
            context.configure(
                connection=conn,
                target_metadata=target_metadata,
                render_as_batch=True
            )
            with context.begin_transaction():
                context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
