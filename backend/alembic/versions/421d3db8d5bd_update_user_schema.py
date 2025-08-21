"""Update user schema

Revision ID: 421d3db8d5bd
Revises: b9516c750b29
Create Date: 2025-08-07 14:33:25.151974

"""

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op


def _has_column(inspector, table, column):
    return column in [c["name"] for c in inspector.get_columns(table)]


# revision identifiers, used by Alembic.
revision = "421d3db8d5bd"
down_revision = "b9516c750b29"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    with op.batch_alter_table("users", schema=None) as batch_op:
        if _has_column(inspector, "users", "is_approved"):
            batch_op.drop_column("is_approved")
        if _has_column(inspector, "users", "role"):
            batch_op.drop_column("role")

    # ### end Alembic commands ###


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    with op.batch_alter_table("users", schema=None) as batch_op:
        if not _has_column(inspector, "users", "role"):
            batch_op.add_column(sa.Column("role", sa.TEXT(), nullable=False))
        if not _has_column(inspector, "users", "is_approved"):
            batch_op.add_column(sa.Column("is_approved", sa.BOOLEAN(), nullable=False))

    # ### end Alembic commands ###
