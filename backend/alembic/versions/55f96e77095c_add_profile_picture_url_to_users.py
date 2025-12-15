"""add_profile_picture_url_to_users

Revision ID: 55f96e77095c
Revises: 537db4350e23
Create Date: 2025-12-15 18:48:43.225455

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '55f96e77095c'
down_revision: Union[str, None] = '537db4350e23'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add profile_picture_url column to users table
    op.add_column('users', sa.Column('profile_picture_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    # Remove profile_picture_url column from users table
    op.drop_column('users', 'profile_picture_url')

