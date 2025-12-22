#!/bin/bash
# Prerequisite checker for testing environment

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Checking Prerequisites"
echo "========================="
echo ""

ERRORS=0
WARNINGS=0

# Function to check command availability
check_command() {
    local cmd=$1
    local name=$2
    local install_instructions=$3
    
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $name is installed ($(which $cmd))"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not found"
        if [ -n "$install_instructions" ]; then
            echo -e "  ${YELLOW}→${NC} $install_instructions"
        fi
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check Docker Desktop on macOS
check_docker_desktop() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if [ -d "/Applications/Docker.app" ]; then
            echo -e "${GREEN}✓${NC} Docker Desktop is installed"
            
            # Check if Docker Desktop is running
            if pgrep -f "Docker Desktop" > /dev/null; then
                echo -e "${GREEN}✓${NC} Docker Desktop is running"
                return 0
            else
                echo -e "${YELLOW}⚠${NC}  Docker Desktop is installed but not running"
                echo -e "  ${YELLOW}→${NC} Please start Docker Desktop from Applications"
                WARNINGS=$((WARNINGS + 1))
                return 1
            fi
        else
            echo -e "${YELLOW}⚠${NC}  Docker Desktop may not be installed"
            return 1
        fi
    fi
    return 0
}

# Function to try finding Docker in common locations
find_docker() {
    local docker_paths=(
        "/usr/local/bin/docker"
        "/usr/bin/docker"
        "/Applications/Docker.app/Contents/Resources/bin/docker"
        "$HOME/.docker/bin/docker"
    )
    
    for path in "${docker_paths[@]}"; do
        if [ -f "$path" ] && [ -x "$path" ]; then
            echo "$path"
            return 0
        fi
    done
    
    return 1
}

# Check Docker
echo "1. Checking Docker..."
DOCKER_CMD=""
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed ($(which docker))"
    DOCKER_CMD="docker"
elif DOCKER_PATH=$(find_docker); then
    echo -e "${YELLOW}⚠${NC}  Docker found at: $DOCKER_PATH"
    echo -e "  ${YELLOW}→${NC} Docker is not in PATH. Scripts will use full path."
    DOCKER_CMD="$DOCKER_PATH"
    # Don't count as error if Docker Desktop is running
    if [[ "$OSTYPE" == "darwin"* ]] && pgrep -f "Docker Desktop" > /dev/null; then
        # Just a warning, not an error - Docker is functional
        WARNINGS=$((WARNINGS + 1))
    else
        # Still count as error if Docker Desktop not running
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} Docker not found in PATH or common locations"
    ERRORS=$((ERRORS + 1))
fi

# Check Docker Compose (new syntax)
echo ""
echo "2. Checking Docker Compose..."
COMPOSE_CMD=""
if [ -n "$DOCKER_CMD" ]; then
    # Test if 'docker compose' works with found Docker
    if [ "$DOCKER_CMD" = "docker" ]; then
        if docker compose version &> /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} 'docker compose' command is working"
            COMPOSE_CMD="docker compose"
        else
            echo -e "${YELLOW}⚠${NC}  'docker compose' command not working"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        # Use found Docker path
        if "$DOCKER_CMD" compose version &> /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} 'docker compose' command is working (using found Docker)"
            COMPOSE_CMD="$DOCKER_CMD compose"
        else
            echo -e "${YELLOW}⚠${NC}  'docker compose' command not working"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
fi

# Check docker-compose (legacy)
if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} Legacy 'docker-compose' command is available"
    if [ -z "$COMPOSE_CMD" ]; then
        COMPOSE_CMD="docker-compose"
    fi
fi

# Check Docker Desktop on macOS
echo ""
echo "3. Checking Docker Desktop (macOS)..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    check_docker_desktop
fi

# Check Python (optional, for running tests locally)
echo ""
echo "4. Checking Python..."
if check_command "python3" "Python 3" ""; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo "  Version: $PYTHON_VERSION"
fi

# Check curl (for API tests)
echo ""
echo "5. Checking curl..."
check_command "curl" "curl" ""

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Prerequisites Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All prerequisites met!${NC}"
    echo ""
    echo "You can now run:"
    echo "  ./scripts/test_integration.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Prerequisites mostly met, but there are $WARNINGS warning(s)${NC}"
    echo ""
    if [ -n "$DOCKER_CMD" ] && [ "$DOCKER_CMD" != "docker" ]; then
        echo -e "${GREEN}✓${NC} Docker found and will be used via full path"
        echo ""
    fi
    echo "You should be able to proceed. Scripts will automatically use the found Docker."
    echo ""
    echo "You can now run:"
    echo "  ./scripts/test_integration.sh"
    exit 0
else
    echo -e "${RED}❌ Missing $ERRORS critical prerequisite(s)${NC}"
    echo ""
    if [ -z "$DOCKER_CMD" ]; then
        echo -e "${RED}❌ Docker is required but not available.${NC}"
        echo ""
        echo "Please:"
        echo "  1. Install Docker Desktop: https://www.docker.com/products/docker-desktop"
        echo "  2. Start Docker Desktop"
        echo "  3. Restart your terminal or add Docker to PATH"
        echo "  4. Run this check again: ./scripts/check_prerequisites.sh"
    else
        echo "Please review the errors above."
    fi
    echo ""
    echo "For Docker installation help, see: DOCKER_SETUP.md"
    exit 1
fi

