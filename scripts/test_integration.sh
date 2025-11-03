#!/bin/bash
# Full integration test runner

set -e

echo "🚀 Running Full Integration Test Suite"
echo "======================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running: $test_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo ""
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo ""
        echo -e "${RED}❌ $test_name: FAILED${NC}"
    fi
    echo ""
}

# Check prerequisites first
if [ -f "$PROJECT_ROOT/scripts/check_prerequisites.sh" ]; then
    echo "Checking prerequisites..."
    if ! "$PROJECT_ROOT/scripts/check_prerequisites.sh"; then
        echo ""
        echo -e "${RED}❌ Prerequisites not met. Please fix the issues above and try again.${NC}"
        echo "   See DOCKER_SETUP.md for installation instructions."
        exit 1
    fi
    echo ""
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    # Try to find Docker in common locations
    if DOCKER_PATH=$(find /usr/local/bin /usr/bin /Applications/Docker.app/Contents/Resources/bin "$HOME/.docker/bin" -name docker -type f 2>/dev/null | head -1); then
        echo -e "${YELLOW}⚠${NC}  Using Docker from: $DOCKER_PATH"
        export PATH="$(dirname "$DOCKER_PATH"):$PATH"
    else
        echo -e "${RED}✗${NC} Docker is not installed or not in PATH"
        echo "   Run: ./scripts/check_prerequisites.sh"
        echo "   See: DOCKER_SETUP.md"
        exit 1
    fi
fi

# Check if containers are running
echo "Checking Docker containers..."
if ! docker ps --format "{{.Names}}" | grep -q "tradingplat"; then
    echo -e "${YELLOW}⚠${NC}  Docker containers are not running"
    echo "  Starting containers..."
    docker compose up -d
    
    echo "  Waiting for services to be ready..."
    sleep 10
fi

echo -e "${GREEN}✓${NC} Docker containers are running"
echo ""

# Phase 1: Database Initialization
if [ -f "scripts/init_db.sh" ]; then
    run_test "Database Initialization" "./scripts/init_db.sh"
else
    echo -e "${YELLOW}⚠${NC}  Database init script not found, skipping..."
    echo ""
fi

# Phase 2: Bash Integration Tests
if [ -f "test_auth_flow.sh" ]; then
    run_test "API Endpoint Tests" "./test_auth_flow.sh"
else
    echo -e "${YELLOW}⚠${NC}  test_auth_flow.sh not found, skipping..."
    echo ""
fi

# Phase 3: Python Unit Tests (run inside Docker container)
if [ -d "backend/tests" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running Python Tests (inside Docker container)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Run pytest inside the backend container
    if docker compose exec -T -w /app backend pytest backend/tests/ -v --tb=short 2>&1; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo ""
        echo -e "${GREEN}✅ Python Tests: PASSED${NC}"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo ""
        echo -e "${RED}❌ Python Tests: FAILED${NC}"
        echo ""
        echo "Note: Python tests run inside Docker container where all dependencies are installed"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠${NC}  backend/tests directory not found, skipping Python tests..."
    echo ""
fi

# Final Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Total test suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
else
    echo -e "${GREEN}Failed: $FAILED_TESTS${NC}"
fi
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review output above for details.${NC}"
    exit 1
fi

