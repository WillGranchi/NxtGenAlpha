"""add_symbol_exchange_to_saved_models

Revision ID: add_symbol_exchange_001
Revises: create_price_data_001
Create Date: 2026-01-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_symbol_exchange_001'
down_revision: Union[str, None] = 'create_price_data_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Strategies: add symbol/exchange
    op.add_column('strategies', sa.Column('symbol', sa.String(length=20), nullable=False, server_default='BTCUSDT'))
    op.add_column('strategies', sa.Column('exchange', sa.String(length=50), nullable=False, server_default='Binance'))

    # Valuations: add exchange (symbol already exists)
    op.add_column('valuations', sa.Column('exchange', sa.String(length=50), nullable=False, server_default='Binance'))

    # FullCycle presets: add symbol/exchange
    op.add_column('fullcycle_presets', sa.Column('symbol', sa.String(length=20), nullable=False, server_default='BTCUSDT'))
    op.add_column('fullcycle_presets', sa.Column('exchange', sa.String(length=50), nullable=False, server_default='Binance'))


def downgrade() -> None:
    op.drop_column('fullcycle_presets', 'exchange')
    op.drop_column('fullcycle_presets', 'symbol')
    op.drop_column('valuations', 'exchange')
    op.drop_column('strategies', 'exchange')
    op.drop_column('strategies', 'symbol')


