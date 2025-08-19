"""add default pickup address to users

Revision ID: 7b3e2fb1d3d4
Revises: 1a2b3c4d5e6f
Create Date: 2025-02-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7b3e2fb1d3d4'
down_revision = '1a2b3c4d5e6f'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('default_pickup_address', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('users', 'default_pickup_address')
