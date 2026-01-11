"""create_price_data_table

Revision ID: create_price_data_001
Revises: add_fullcycle_presets_001
Create Date: 2025-01-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'create_price_data_001'
down_revision: Union[str, None] = 'add_fullcycle_presets_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create price_data table
    op.create_table(
        'price_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('exchange', sa.String(length=50), nullable=False, server_default='Binance'),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('open', sa.Float(), nullable=False),
        sa.Column('high', sa.Float(), nullable=False),
        sa.Column('low', sa.Float(), nullable=False),
        sa.Column('close', sa.Float(), nullable=False),
        sa.Column('volume', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('symbol', 'exchange', 'date', name='uq_price_data_symbol_exchange_date'),
    )
    
    # Create individual indexes
    op.create_index(op.f('ix_price_data_symbol'), 'price_data', ['symbol'], unique=False)
    op.create_index(op.f('ix_price_data_exchange'), 'price_data', ['exchange'], unique=False)
    op.create_index(op.f('ix_price_data_date'), 'price_data', ['date'], unique=False)
    
    # Create composite index for fast range queries
    op.create_index('idx_price_data_symbol_exchange_date', 'price_data', ['symbol', 'exchange', 'date'], unique=False)
    
    # Create partial index for recent data (last 30 days)
    op.execute(text("""
        CREATE INDEX idx_price_data_date_recent 
        ON price_data (date) 
        WHERE date > NOW() - INTERVAL '30 days'
    """))


def downgrade() -> None:
    # Drop indexes
    op.execute(text("DROP INDEX IF EXISTS idx_price_data_date_recent"))
    op.drop_index('idx_price_data_symbol_exchange_date', table_name='price_data')
    op.drop_index(op.f('ix_price_data_date'), table_name='price_data')
    op.drop_index(op.f('ix_price_data_exchange'), table_name='price_data')
    op.drop_index(op.f('ix_price_data_symbol'), table_name='price_data')
    
    # Drop price_data table
    op.drop_table('price_data')

