"""add deposit failed booking status

Revision ID: 87a01afc87c7
Revises: 0d3b77dfdf03
Create Date: 2025-09-02 09:58:51.986136

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "87a01afc87c7"
down_revision = "0d3b77dfdf03"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'DEPOSIT_FAILED'")


def downgrade():
    op.execute("ALTER TYPE bookingstatus RENAME TO bookingstatus_old")
    op.execute(
        "CREATE TYPE bookingstatus AS ENUM('PENDING','DRIVER_CONFIRMED','DECLINED','ON_THE_WAY','ARRIVED_PICKUP','IN_PROGRESS','ARRIVED_DROPOFF','COMPLETED','CANCELLED')"
    )
    op.execute(
        "ALTER TABLE bookings_v2 ALTER COLUMN status TYPE bookingstatus USING status::text::bookingstatus"
    )
    op.execute("DROP TYPE bookingstatus_old")
