#!/bin/bash
# Script to verify database tables exist on Railway

set -e

echo "🔍 Verifying Railway database tables..."
echo ""

# Check if tables exist using Python
railway run --service web python3 << 'PYTHON_EOF'
import sys
import os

# Add project root to path
sys.path.insert(0, os.getcwd())

try:
    from backend.core.database import engine
    from sqlalchemy import inspect
    from sqlalchemy import text
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print("📊 Database Connection Status:")
    print("=" * 50)
    
    # Check connection
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"✅ Connected to PostgreSQL")
        print(f"   Version: {version.split(',')[0]}")
    
    print()
    print("📋 Tables in Database:")
    print("=" * 50)
    
    if tables:
        for table in sorted(tables):
            columns = inspector.get_columns(table)
            print(f"  ✓ {table} ({len(columns)} columns)")
    else:
        print("  ⚠️  No tables found")
    
    print()
    print("🔍 Checking Required Tables:")
    print("=" * 50)
    
    required_tables = {'users', 'strategies'}
    found_tables = set(tables)
    
    if required_tables.issubset(found_tables):
        print("✅ All required tables exist!")
        print(f"   Found: {', '.join(sorted(found_tables))}")
        print()
        print("✅ Database is ready!")
    else:
        missing = required_tables - found_tables
        print(f"❌ Missing tables: {', '.join(sorted(missing))}")
        print(f"   Found: {', '.join(sorted(found_tables)) if found_tables else 'None'}")
        print()
        print("⚠️  You need to run migrations:")
        print("   railway run --service web bash scripts/run_migrations.sh")

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("   Make sure you're connected to the Railway service")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
PYTHON_EOF

echo ""
echo "✅ Verification complete!"

