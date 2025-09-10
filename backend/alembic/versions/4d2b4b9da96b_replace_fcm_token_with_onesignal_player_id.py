"""replace fcm_token with onesignal_player_id

Revision ID: 4d2b4b9da96b
Revises: fa3de645ec11
Create Date: 2025-09-10 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "4d2b4b9da96b"
down_revision = "fa3de645ec11"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("onesignal_player_id", sa.Text(), nullable=True))
    op.drop_column("users", "fcm_token")

    with op.batch_alter_table("users_v2") as batch_op:
        batch_op.add_column(sa.Column("onesignal_player_id", sa.Text(), nullable=True))
        batch_op.drop_column("fcm_token")


def downgrade():
    op.add_column("users", sa.Column("fcm_token", sa.Text(), nullable=True))
    op.drop_column("users", "onesignal_player_id")

    with op.batch_alter_table("users_v2") as batch_op:
        batch_op.add_column(sa.Column("fcm_token", sa.Text(), nullable=True))
        batch_op.drop_column("onesignal_player_id")
