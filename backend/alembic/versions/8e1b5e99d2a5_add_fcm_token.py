"""add fcm token

Revision ID: 8e1b5e99d2a5
Revises: 2875930f4d56
Create Date: 2025-02-15 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "8e1b5e99d2a5"
down_revision = "2875930f4d56"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("fcm_token", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("users", "fcm_token")
