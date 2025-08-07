# alembic/env.py
import os
import sys
from logging.config import fileConfig

# Ensure your app module (root project directory) is on sys.path
#sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import engine_from_config, pool
from alembic import context  # essential – must be here before using `context.config`

import os
from sqlalchemy.engine import URL

# Load the DATABASE_URL from the environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

# Now that path is set, import your Base metadata
from app.db.database import Base
# If you have custom types/models,
# import them here to include them in autogeneration:
from app.models import user, booking, settings


config = context.config

# optionally override sqlalchemy.url loaded from alembic.ini:
# config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

fileConfig(config.config_file_name)
print(Base.metadata.tables.keys())
target_metadata = Base.metadata

def run_migrations_offline():
    # config.set_main_option("sqlalchemy.url", DATABASE_URL)
    # url = config.get_main_option("sqlalchemy.url")
    section = config.get_section(config.config_ini_section)
    if DATABASE_URL and section: 
        section["sqlalchemy.url"] = DATABASE_URL
        # config.set_main_option("sqlalchemy.url", DATABASE_URL)
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"}
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
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
