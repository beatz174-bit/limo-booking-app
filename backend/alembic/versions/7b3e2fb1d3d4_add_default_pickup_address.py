"""add default pickup address to users

Revision ID: 7b3e2fb1d3d4
Revises: 1a2b3c4d5e6f
Create Date: 2025-02-14 00:00:00.000000

"""

import sqlalchemy as sa
from sqlalchemy import inspect


def _has_column(inspector, table, column):
    return column in [c["name"] for c in inspector.get_columns(table)]


from alembic import op

# revision identifiers, used by Alembic.
revision = "7b3e2fb1d3d4"
down_revision = "1a2b3c4d5e6f"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not _has_column(inspector, "users", "default_pickup_address"):
        op.add_column(
            "users",
            sa.Column("default_pickup_address", sa.Text(), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if _has_column(inspector, "users", "default_pickup_address"):
        op.drop_column("users", "default_pickup_address")
