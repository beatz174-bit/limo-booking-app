"""add recipient to notifications

Revision ID: bb39b3df88c1
Revises: 4d2b4b9da96b
Create Date: 2024-05-16 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "bb39b3df88c1"
down_revision = "4d2b4b9da96b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("notifications") as batch_op:
        batch_op.add_column(sa.Column("to_user_id", sa.UUID(), nullable=True))
        batch_op.create_foreign_key(
            "notifications_to_user_id_fkey",
            "users_v2",
            ["to_user_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("notifications") as batch_op:
        batch_op.drop_constraint("notifications_to_user_id_fkey", type_="foreignkey")
        batch_op.drop_column("to_user_id")
