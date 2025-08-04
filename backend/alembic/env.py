# alembic/env.py
import os
import sys
from logging.config import fileConfig

# Ensure your app module (root project directory) is on sys.path
#sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import engine_from_config, pool
from alembic import context  # essential – must be here before using `context.config`

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
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
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
