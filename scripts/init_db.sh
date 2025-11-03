#!/bin/bash
# Database initialization script

set -e

# Check prerequisites first
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/scripts/check_prerequisites.sh" ]; then
    if ! "$PROJECT_ROOT/scripts/check_prerequisites.sh" > /dev/null 2>&1; then
        echo "❌ Prerequisites not met. Please run: ./scripts/check_prerequisites.sh"
        exit 1
    fi
fi

echo "🗄️  Initializing Database"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CONTAINER_NAME="tradingplat-backend-1"

# Find Docker command if not in PATH
if ! command -v docker &> /dev/null; then
    DOCKER_PATHS=(
        "/usr/local/bin/docker"
        "/usr/bin/docker"
        "/Applications/Docker.app/Contents/Resources/bin/docker"
        "$HOME/.docker/bin/docker"
    )
    
    DOCKER_CMD=""
    for path in "${DOCKER_PATHS[@]}"; do
        if [ -f "$path" ] && [ -x "$path" ]; then
            DOCKER_CMD="$path"
            break
        fi
    done
    
    if [ -z "$DOCKER_CMD" ]; then
        echo -e "${RED}✗${NC} Docker command not found"
        echo "  Run: ./scripts/check_prerequisites.sh"
        echo "  See: DOCKER_SETUP.md"
        exit 1
    fi
    
    # Create wrapper function
    docker() { "$DOCKER_CMD" "$@"; }
else
    DOCKER_CMD="docker"
fi

# Check if container exists and is running
if ! docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}✗${NC} Container $CONTAINER_NAME is not running"
    echo "  Run: docker compose up -d"
    exit 1
fi

echo "1. Testing database connection..."
if docker exec -w /app -e PYTHONPATH=/app $CONTAINER_NAME python3 -c "
from backend.core.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT version()'))
    version = result.fetchone()[0]
    print(f'Connected to PostgreSQL: {version.split(\",\")[0]}')
" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Database connection successful"
else
    echo -e "${RED}✗${NC} Database connection failed"
    exit 1
fi
echo ""

echo "2. Checking existing tables..."
EXISTING_TABLES=$(docker exec -w /app -e PYTHONPATH=/app $CONTAINER_NAME python3 -c "
from backend.core.database import engine
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
print(','.join(tables))
" 2>/dev/null || echo "")

if [ -n "$EXISTING_TABLES" ]; then
    echo "  Existing tables: $EXISTING_TABLES"
    if echo "$EXISTING_TABLES" | grep -q "users,strategies\|strategies,users"; then
        echo -e "${YELLOW}⚠${NC}  Tables already exist. Reinitializing..."
        read -p "  Do you want to drop and recreate tables? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker exec -w /app -e PYTHONPATH=/app $CONTAINER_NAME python3 -c "
from backend.core.database import engine, Base
Base.metadata.drop_all(bind=engine)
print('Dropped existing tables')
" 2>/dev/null
            echo -e "${GREEN}✓${NC} Dropped existing tables"
        else
            echo "  Skipping table creation"
            exit 0
        fi
    fi
else
    echo "  No existing tables found"
fi
echo ""

echo "3. Creating database tables..."
if docker exec -w /app -e PYTHONPATH=/app $CONTAINER_NAME python3 -c "
from backend.core.database import init_db
init_db()
print('Tables created successfully')
" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Database tables created"
else
    echo -e "${RED}✗${NC} Failed to create tables"
    exit 1
fi
echo ""

echo "4. Verifying table creation..."
VERIFICATION=$(docker exec -w /app -e PYTHONPATH=/app $CONTAINER_NAME python3 -c "
from backend.core.database import engine
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
required = {'users', 'strategies'}
found = set(tables)
if required.issubset(found):
    print('OK')
    print(f'Created tables: {sorted(found)}')
else:
    missing = required - found
    print(f'ERROR: Missing tables: {missing}')
" 2>/dev/null)

if echo "$VERIFICATION" | grep -q "OK"; then
    echo -e "${GREEN}✓${NC} All required tables exist"
    echo "$VERIFICATION" | grep "Created tables" || true
else
    echo -e "${RED}✗${NC} Table verification failed"
    echo "$VERIFICATION"
    exit 1
fi
echo ""

echo "5. Verifying schema..."
SCHEMA_CHECK=$(docker exec -w /app -e PYTHONPATH=/app $CONTAINER_NAME python3 -c "
from backend.core.database import engine
from sqlalchemy import inspect
inspector = inspect(engine)

# Check users table
users_columns = {col['name'] for col in inspector.get_columns('users')}
required_users = {'id', 'email', 'name', 'google_id', 'theme', 'created_at', 'updated_at'}
missing_users = required_users - users_columns

# Check strategies table
strategies_columns = {col['name'] for col in inspector.get_columns('strategies')}
required_strategies = {'id', 'user_id', 'name', 'indicators', 'expressions', 'parameters', 'created_at', 'updated_at'}
missing_strategies = required_strategies - strategies_columns

if not missing_users and not missing_strategies:
    print('OK')
    print(f'Users table: {len(users_columns)} columns')
    print(f'Strategies table: {len(strategies_columns)} columns')
else:
    print('ERROR')
    if missing_users:
        print(f'Missing users columns: {missing_users}')
    if missing_strategies:
        print(f'Missing strategies columns: {missing_strategies}')
" 2>/dev/null)

if echo "$SCHEMA_CHECK" | grep -q "OK"; then
    echo -e "${GREEN}✓${NC} Schema verification passed"
    echo "$SCHEMA_CHECK" | grep -E "table:" || true
else
    echo -e "${RED}✗${NC} Schema verification failed"
    echo "$SCHEMA_CHECK"
    exit 1
fi
echo ""

echo -e "${GREEN}✅ Database initialization complete!${NC}"
echo ""
echo "Next steps:"
echo "  - Run tests: ./test_auth_flow.sh"
echo "  - Or run Python tests: pytest backend/tests/"

