"""add admin_user_id to admin_config

Revision ID: 0d3b77dfdf03
Revises: 8e1b5e99d2a5
Create Date: 2025-02-15 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0d3b77dfdf03"
down_revision = "8e1b5e99d2a5"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("admin_config") as batch_op:
        batch_op.add_column(sa.Column("admin_user_id", sa.UUID(), nullable=True))
        batch_op.create_foreign_key(
            "admin_config_admin_user_id_fkey",
            "users_v2",
            ["admin_user_id"],
            ["id"],
        )


def downgrade():
    with op.batch_alter_table("admin_config") as batch_op:
        batch_op.drop_constraint("admin_config_admin_user_id_fkey", type_="foreignkey")
        batch_op.drop_column("admin_user_id")
