"""
Migration script to add profile_picture_url column to users table.
Run this manually or use Alembic to generate a proper migration.

Run from project root: python3 backend/migrations/add_profile_picture_url.py
Or on Railway: railway run --service web python3 backend/migrations/add_profile_picture_url.py
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from backend.core.database import engine

def add_profile_picture_url_column():
    """Add profile_picture_url column to users table if it doesn't exist."""
    try:
        with engine.connect() as conn:
            # Check if column exists (PostgreSQL)
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='profile_picture_url'
            """))
            
            if result.fetchone() is None:
                # Add the column
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN profile_picture_url VARCHAR(500) NULL
                """))
                conn.commit()
                print("✅ Successfully added profile_picture_url column to users table")
                
                # Verify it was added
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='profile_picture_url'
                """))
                if result.fetchone():
                    print("✓ Verified: column exists")
            else:
                print("✓ profile_picture_url column already exists")
    except Exception as e:
        print(f"❌ Error adding profile_picture_url column: {e}")
        raise

if __name__ == "__main__":
    add_profile_picture_url_column()

