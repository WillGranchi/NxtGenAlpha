#!/bin/bash
# Test PostgreSQL connection from Railway backend service

echo "🔍 Testing PostgreSQL Connection"
echo "================================"
echo ""

# Test database connection
python3 << 'PYTHON_EOF'
import sys
import os
sys.path.insert(0, '/app')

try:
    from backend.core.database import engine, DATABASE_URL
    from sqlalchemy import text
    
    print(f"📋 DATABASE_URL: {DATABASE_URL[:50]}... (masked)")
    print("")
    
    print("🔌 Testing connection...")
    with engine.connect() as conn:
        # Test basic connection
        result = conn.execute(text('SELECT version()'))
        version = result.fetchone()[0]
        print(f"✅ Connection successful!")
        print(f"   PostgreSQL version: {version[:80]}...")
        
        # Test database exists
        result = conn.execute(text("SELECT current_database()"))
        db_name = result.fetchone()[0]
        print(f"✅ Connected to database: {db_name}")
        
        # Check if tables exist
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in result]
        
        if tables:
            print(f"✅ Found {len(tables)} table(s): {', '.join(tables)}")
            if 'users' in tables and 'strategies' in tables:
                print("✅ Required tables (users, strategies) exist!")
            else:
                print("⚠️  Some required tables may be missing")
        else:
            print("⚠️  No tables found in database")
            
        print("")
        print("✅ Database connection test PASSED")
        
except Exception as e:
    print(f"❌ Database connection test FAILED")
    print(f"   Error: {e}")
    print("")
    print("Troubleshooting:")
    print("1. Check DATABASE_URL environment variable is set")
    print("2. Verify PostgreSQL service is running in Railway")
    print("3. Check PostgreSQL service logs for errors")
    sys.exit(1)
PYTHON_EOF

exit_code=$?
echo ""
if [ $exit_code -eq 0 ]; then
    echo "✅ All database checks passed!"
else
    echo "❌ Database connection failed"
fi
exit $exit_code

