"""add stripe identifiers to users_v2

Revision ID: fa3de645ec11
Revises: 13b1cf856965
Create Date: 2025-09-02 13:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "fa3de645ec11"
down_revision = "13b1cf856965"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users_v2") as batch_op:
        batch_op.add_column(sa.Column("stripe_customer_id", sa.String(), nullable=True))
        batch_op.add_column(
            sa.Column("stripe_payment_method_id", sa.String(), nullable=True)
        )


def downgrade():
    with op.batch_alter_table("users_v2") as batch_op:
        batch_op.drop_column("stripe_payment_method_id")
        batch_op.drop_column("stripe_customer_id")
