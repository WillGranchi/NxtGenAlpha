"""
Migration script to create price_data table for storing cryptocurrency OHLCV data.
Run this manually or use Alembic to generate a proper migration.

Run from project root: python3 backend/migrations/create_price_data_table.py
Or on Railway: railway run --service web python3 backend/migrations/create_price_data_table.py
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from backend.core.database import engine

def create_price_data_table():
    """Create price_data table if it doesn't exist."""
    try:
        with engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name='price_data'
            """))
            
            if result.fetchone() is None:
                # Create the table
                conn.execute(text("""
                    CREATE TABLE price_data (
                        id SERIAL PRIMARY KEY,
                        symbol VARCHAR(20) NOT NULL,
                        exchange VARCHAR(50) NOT NULL DEFAULT 'Binance',
                        date TIMESTAMP NOT NULL,
                        open FLOAT NOT NULL,
                        high FLOAT NOT NULL,
                        low FLOAT NOT NULL,
                        close FLOAT NOT NULL,
                        volume FLOAT NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT uq_price_data_symbol_exchange_date UNIQUE (symbol, exchange, date)
                    )
                """))
                
                # Create indexes
                conn.execute(text("""
                    CREATE INDEX idx_price_data_symbol ON price_data (symbol)
                """))
                
                conn.execute(text("""
                    CREATE INDEX idx_price_data_exchange ON price_data (exchange)
                """))
                
                conn.execute(text("""
                    CREATE INDEX idx_price_data_date ON price_data (date)
                """))
                
                # Composite index for fast range queries
                conn.execute(text("""
                    CREATE INDEX idx_price_data_symbol_exchange_date 
                    ON price_data (symbol, exchange, date)
                """))
                
                # Partial index for recent data (last 30 days)
                conn.execute(text("""
                    CREATE INDEX idx_price_data_date_recent 
                    ON price_data (date) 
                    WHERE date > NOW() - INTERVAL '30 days'
                """))
                
                conn.commit()
                print("✅ Successfully created price_data table with indexes")
                
                # Verify it was created
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_name='price_data'
                """))
                if result.fetchone():
                    print("✓ Verified: price_data table exists")
                    
                    # Verify indexes
                    index_result = conn.execute(text("""
                        SELECT indexname 
                        FROM pg_indexes 
                        WHERE tablename='price_data'
                    """))
                    indexes = [row[0] for row in index_result.fetchall()]
                    print(f"✓ Verified: {len(indexes)} indexes created: {', '.join(indexes)}")
            else:
                print("✓ price_data table already exists")
    except Exception as e:
        print(f"❌ Error creating price_data table: {e}")
        raise

if __name__ == "__main__":
    create_price_data_table()

