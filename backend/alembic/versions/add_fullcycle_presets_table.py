"""add_fullcycle_presets_table

Revision ID: add_fullcycle_presets_001
Revises: a1b2c3d4e5f6
Create Date: 2025-12-25 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_fullcycle_presets_001'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create fullcycle_presets table
    op.create_table(
        'fullcycle_presets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('indicator_params', sa.JSON(), nullable=False),
        sa.Column('selected_indicators', sa.JSON(), nullable=False),
        sa.Column('start_date', sa.String(length=20), nullable=True),
        sa.Column('end_date', sa.String(length=20), nullable=True),
        sa.Column('roc_days', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('show_fundamental_average', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('show_technical_average', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('show_overall_average', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sdca_in', sa.Float(), nullable=False, server_default='-2.0'),
        sa.Column('sdca_out', sa.Float(), nullable=False, server_default='2.0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_fullcycle_presets_id'), 'fullcycle_presets', ['id'], unique=False)
    op.create_index(op.f('ix_fullcycle_presets_user_id'), 'fullcycle_presets', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop fullcycle_presets table
    op.drop_index(op.f('ix_fullcycle_presets_user_id'), table_name='fullcycle_presets')
    op.drop_index(op.f('ix_fullcycle_presets_id'), table_name='fullcycle_presets')
    op.drop_table('fullcycle_presets')

