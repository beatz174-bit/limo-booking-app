"""add phone to users_v2

Revision ID: c9a2f3e1d4b5
Revises: 13b1cf856965
Create Date: 2025-02-15 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "c9a2f3e1d4b5"
down_revision = "13b1cf856965"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users_v2") as batch_op:
        batch_op.add_column(sa.Column("phone", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users_v2") as batch_op:
        batch_op.drop_column("phone")
