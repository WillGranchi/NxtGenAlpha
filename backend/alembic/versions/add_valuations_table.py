"""add_valuations_table

Revision ID: add_valuations_table_001
Revises: 55f96e77095c
Create Date: 2025-12-15 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '55f96e77095c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create valuations table
    op.create_table(
        'valuations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('indicators', sa.JSON(), nullable=False),
        sa.Column('zscore_method', sa.String(length=20), nullable=False),
        sa.Column('rolling_window', sa.Integer(), nullable=False),
        sa.Column('average_window', sa.Integer(), nullable=True),
        sa.Column('show_average', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('overbought_threshold', sa.Float(), nullable=False),
        sa.Column('oversold_threshold', sa.Float(), nullable=False),
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('start_date', sa.String(length=20), nullable=True),
        sa.Column('end_date', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_valuations_id'), 'valuations', ['id'], unique=False)
    op.create_index(op.f('ix_valuations_user_id'), 'valuations', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop valuations table
    op.drop_index(op.f('ix_valuations_user_id'), table_name='valuations')
    op.drop_index(op.f('ix_valuations_id'), table_name='valuations')
    op.drop_table('valuations')
