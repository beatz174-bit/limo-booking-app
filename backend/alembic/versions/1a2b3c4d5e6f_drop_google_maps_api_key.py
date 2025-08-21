"""drop google maps api key from admin_config

Revision ID: 1a2b3c4d5e6f
Revises: f3110ce62ca7
Create Date: 2025-08-18 00:00:00.000000
"""

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op


def _has_column(inspector, table, column):
    return column in [c["name"] for c in inspector.get_columns(table)]


# revision identifiers, used by Alembic.
revision = "1a2b3c4d5e6f"
down_revision = "f3110ce62ca7"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if _has_column(inspector, "admin_config", "google_maps_api_key"):
        with op.batch_alter_table("admin_config", schema=None) as batch_op:
            batch_op.drop_column("google_maps_api_key")


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not _has_column(inspector, "admin_config", "google_maps_api_key"):
        with op.batch_alter_table("admin_config", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("google_maps_api_key", sa.String(), nullable=True)
            )
