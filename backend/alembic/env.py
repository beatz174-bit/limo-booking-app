# alembic/env.py
import pkgutil
from importlib import import_module
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine.url import make_url

from alembic import context  # essential – must be here before using `context.config`
from app.core.config import get_settings

load_dotenv()

env_settings = get_settings()
database_uri = env_settings.sqlalchemy_database_uri
database_url = make_url(database_uri)
alembic_url = (
    database_url.set(drivername=database_url.get_backend_name())
    if "+" in database_url.drivername
    else database_url
)
import app.models

# Now that path is set, import your Base metadata
from app.db.database import Base

# Dynamically import all modules in app.models to ensure models are registered
for module_info in pkgutil.iter_modules(app.models.__path__, app.models.__name__ + "."):
    import_module(module_info.name)


config = context.config
config.set_main_option(
    "sqlalchemy.url", alembic_url.render_as_string(hide_password=False)
)

fileConfig(config.config_file_name)  # type: ignore
target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    section = config.get_section(config.config_ini_section)
    if section:
        section["sqlalchemy.url"] = alembic_url.render_as_string(hide_password=False)
        connectable = engine_from_config(
            section, prefix="sqlalchemy.", poolclass=pool.NullPool
        )
        with connectable.connect() as conn:
            context.configure(
                connection=conn,
                target_metadata=target_metadata,
                render_as_batch=database_url.get_backend_name() == "sqlite",
            )
            with context.begin_transaction():
                context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
