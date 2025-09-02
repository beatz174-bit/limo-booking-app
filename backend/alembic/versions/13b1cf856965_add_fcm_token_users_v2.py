"""add fcm_token to users_v2

Revision ID: 13b1cf856965
Revises: 87a01afc87c7
Create Date: 2025-09-02 12:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "13b1cf856965"
down_revision = "87a01afc87c7"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users_v2") as batch_op:
        batch_op.add_column(sa.Column("fcm_token", sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table("users_v2") as batch_op:
        batch_op.drop_column("fcm_token")
