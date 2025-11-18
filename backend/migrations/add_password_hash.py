"""
Migration script to add password_hash column to users table.
Run this manually or use Alembic to generate a proper migration.

To use Alembic:
1. cd backend
2. alembic revision --autogenerate -m "add password_hash to users"
3. Review the generated migration file
4. alembic upgrade head

Run from project root: python3 backend/migrations/add_password_hash.py
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from backend.core.database import engine

def add_password_hash_column():
    """Add password_hash column to users table if it doesn't exist."""
    with engine.connect() as conn:
        # Check if column exists (PostgreSQL)
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='password_hash'
        """))
        
        if result.fetchone() is None:
            # Add the column
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN password_hash VARCHAR(255) NULL
            """))
            conn.commit()
            print("✓ Added password_hash column to users table")
        else:
            print("✓ password_hash column already exists")

if __name__ == "__main__":
    add_password_hash_column()

