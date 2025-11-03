#!/bin/bash
# Comprehensive test script for authentication and strategy management flow

set -e

# Check prerequisites first
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/scripts/check_prerequisites.sh" ]; then
    if ! "$PROJECT_ROOT/scripts/check_prerequisites.sh"; then
        echo ""
        echo "❌ Prerequisites not met. Please fix the issues above and try again."
        echo "   See DOCKER_SETUP.md for installation instructions."
        exit 1
    fi
    echo ""
fi

echo "🧪 Testing Authentication and Strategy Management Flow"
echo "======================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:8000"
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Find Docker command if not in PATH
DOCKER_CMD="docker"
if ! command -v docker &> /dev/null; then
    DOCKER_PATHS=(
        "/usr/local/bin/docker"
        "/usr/bin/docker"
        "/Applications/Docker.app/Contents/Resources/bin/docker"
        "$HOME/.docker/bin/docker"
    )
    
    for path in "${DOCKER_PATHS[@]}"; do
        if [ -f "$path" ] && [ -x "$path" ]; then
            DOCKER_CMD="$path"
            break
        fi
    done
    
    if [ "$DOCKER_CMD" != "docker" ]; then
        docker() { "$DOCKER_CMD" "$@"; }
    fi
fi

# Test result tracking
test_result() {
    TEST_COUNT=$((TEST_COUNT + 1))
    if [ $1 -eq 0 ]; then
        PASS_COUNT=$((PASS_COUNT + 1))
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

# Phase 1: Infrastructure & Database Tests
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Phase 1: Infrastructure & Database Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "1.1 Testing Docker containers..."
if command -v docker &> /dev/null || [ "$DOCKER_CMD" != "docker" ]; then
    CONTAINERS=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -E "tradingplat-(db|backend|frontend)" || true)
    if [ -n "$CONTAINERS" ]; then
        test_result 0 "Docker containers are running"
        echo "$CONTAINERS" | while read -r container; do
            echo "  - $container"
        done
    else
        test_result 1 "Docker containers are not running"
        echo "  Run: docker compose up -d"
    fi
else
    test_result 1 "Docker command not found"
fi
echo ""

echo "1.2 Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health" 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "healthy"; then
    test_result 0 "Backend health check passed"
    echo "  Response: $(echo "$BODY" | head -c 100)..."
else
    test_result 1 "Backend health check failed (HTTP $HTTP_CODE)"
fi
echo ""

echo "1.3 Testing database connection..."
DB_TEST=$(docker exec -w /app -e PYTHONPATH=/app tradingplat-backend-1 python3 -c "
from backend.core.database import engine
from sqlalchemy import text
try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1'))
        print('OK')
except Exception as e:
    print(f'ERROR: {e}')
" 2>/dev/null || echo "ERROR: Container not accessible")

if echo "$DB_TEST" | grep -q "OK"; then
    test_result 0 "Database connection successful"
else
    test_result 1 "Database connection failed"
    echo "  Error: $DB_TEST"
fi
echo ""

echo "1.4 Testing database tables..."
TABLES_TEST=$(docker exec -w /app -e PYTHONPATH=/app tradingplat-backend-1 python3 -c "
from backend.core.database import engine
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
required = {'users', 'strategies'}
found = set(tables)
if required.issubset(found):
    print('OK')
    print(f'Found tables: {found}')
else:
    missing = required - found
    print(f'ERROR: Missing tables: {missing}')
" 2>/dev/null || echo "ERROR: Container not accessible")

if echo "$TABLES_TEST" | grep -q "OK"; then
    test_result 0 "Database tables exist"
    echo "$TABLES_TEST" | grep "Found tables" || true
else
    test_result 1 "Database tables missing"
    echo "  Error: $TABLES_TEST"
    echo "  Run: docker compose exec backend python3 -c 'from backend.core.database import init_db; init_db()'"
fi
echo ""

# Phase 2: Authentication API Tests
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Phase 2: Authentication API Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "2.1 Testing guest mode (GET /api/auth/me)..."
GUEST_RESPONSE=$(curl -s "$API_URL/api/auth/me" 2>/dev/null || echo "")
if echo "$GUEST_RESPONSE" | grep -q '"authenticated"\s*:\s*false'; then
    test_result 0 "Guest mode works correctly"
else
    test_result 1 "Guest mode check failed"
    echo "  Response: $GUEST_RESPONSE"
fi
echo ""

echo "2.2 Testing Google OAuth login redirect..."
LOGIN_RESPONSE=$(curl -s -L -o /dev/null -w "%{http_code}" "$API_URL/api/auth/google/login" 2>/dev/null || echo "000")
if [ "$LOGIN_RESPONSE" = "302" ] || [ "$LOGIN_RESPONSE" = "200" ]; then
    test_result 0 "Google login redirect works (HTTP $LOGIN_RESPONSE)"
else
    test_result 1 "Google login redirect failed (HTTP $LOGIN_RESPONSE)"
    echo "  Note: This may fail if GOOGLE_CLIENT_ID is not set"
fi
echo ""

echo "2.3 Testing logout endpoint..."
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/logout" 2>/dev/null || echo "")
if echo "$LOGOUT_RESPONSE" | grep -q "Logged out\|message"; then
    test_result 0 "Logout endpoint works"
else
    test_result 1 "Logout endpoint check failed"
    echo "  Response: $LOGOUT_RESPONSE"
fi
echo ""

echo "2.4 Testing theme endpoint (without auth)..."
THEME_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/theme?theme=dark" 2>/dev/null || echo "")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/auth/theme?theme=dark" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    test_result 0 "Theme endpoint requires authentication (HTTP $HTTP_CODE)"
else
    test_result 1 "Theme endpoint authentication check failed (HTTP $HTTP_CODE)"
fi
echo ""

# Phase 3: Strategy CRUD API Tests
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Phase 3: Strategy CRUD API Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "3.1 Testing strategy list (without auth)..."
STRATEGY_LIST_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/strategies/saved/list" 2>/dev/null || echo "000")
if [ "$STRATEGY_LIST_HTTP" = "401" ] || [ "$STRATEGY_LIST_HTTP" = "403" ]; then
    test_result 0 "Strategy list requires authentication (HTTP $STRATEGY_LIST_HTTP)"
else
    test_result 1 "Strategy list authentication check failed (HTTP $STRATEGY_LIST_HTTP)"
fi
echo ""

echo "3.2 Testing strategy creation (without auth)..."
STRATEGY_CREATE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","indicators":[],"expressions":{}}' \
    "$API_URL/api/strategies/saved" 2>/dev/null || echo "000")
if [ "$STRATEGY_CREATE_HTTP" = "401" ] || [ "$STRATEGY_CREATE_HTTP" = "403" ]; then
    test_result 0 "Strategy creation requires authentication (HTTP $STRATEGY_CREATE_HTTP)"
else
    test_result 1 "Strategy creation authentication check failed (HTTP $STRATEGY_CREATE_HTTP)"
fi
echo ""

# Phase 4: Backend Service Tests
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Phase 4: Backend Service Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "4.1 Testing indicator catalog endpoint..."
INDICATORS_RESPONSE=$(curl -s "$API_URL/api/backtest/indicators" 2>/dev/null || echo "")
if echo "$INDICATORS_RESPONSE" | grep -q "RSI\|MACD\|SMA"; then
    test_result 0 "Indicator catalog endpoint works"
    INDICATOR_COUNT=$(echo "$INDICATORS_RESPONSE" | grep -o '"RSI"\|"MACD"\|"SMA"\|"EMA"' | wc -l | tr -d ' ')
    echo "  Found indicators: $INDICATOR_COUNT"
else
    test_result 1 "Indicator catalog endpoint check failed"
    echo "  Response: ${INDICATORS_RESPONSE:0:200}..."
fi
echo ""

echo "4.2 Testing API documentation..."
DOCS_RESPONSE=$(curl -s "$API_URL/docs" 2>/dev/null || echo "")
if echo "$DOCS_RESPONSE" | grep -q "Swagger\|swagger\|OpenAPI"; then
    test_result 0 "API documentation is accessible"
else
    test_result 1 "API documentation check failed"
fi
echo ""

echo "4.3 Testing CORS configuration..."
CORS_HEADERS=$(curl -s -o /dev/null -I -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" \
    -X OPTIONS "$API_URL/health" 2>/dev/null | grep -i "access-control" || echo "")
if [ -n "$CORS_HEADERS" ]; then
    test_result 0 "CORS headers present"
else
    test_result 1 "CORS headers check failed (may be preflight issue)"
fi
echo ""

# Test Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Total tests: $TEST_COUNT"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}Failed: $FAIL_COUNT${NC}"
else
    echo -e "${GREEN}Failed: $FAIL_COUNT${NC}"
fi

if [ $FAIL_COUNT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed. Review output above for details.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Ensure Docker containers are running: docker compose up -d"
    echo "  2. Initialize database: docker compose exec backend python3 -c 'from backend.core.database import init_db; init_db()'"
    echo "  3. Verify Google OAuth credentials are set (for OAuth tests)"
    echo "  4. Check backend logs: docker compose logs backend"
    exit 1
fi
