#!/bin/bash
# Verify Railway deployment configuration

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Railway Deployment Configuration Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check Procfile exists
echo "1. Checking Procfile..."
if [ -f "Procfile" ]; then
    echo -e "${GREEN}✓${NC} Procfile exists"
    if grep -q "uvicorn backend.api.main:app" Procfile; then
        echo -e "${GREEN}✓${NC} Procfile contains correct start command"
    else
        echo -e "${RED}✗${NC} Procfile doesn't contain correct start command"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} Procfile not found"
    ERRORS=$((ERRORS + 1))
fi

# Check railway.json exists
echo ""
echo "2. Checking railway.json..."
if [ -f "railway.json" ]; then
    echo -e "${GREEN}✓${NC} railway.json exists"
else
    echo -e "${YELLOW}⚠${NC}  railway.json not found (optional, but recommended)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check requirements.txt exists
echo ""
echo "3. Checking requirements.txt..."
if [ -f "requirements.txt" ]; then
    echo -e "${GREEN}✓${NC} requirements.txt exists"
    if grep -q "fastapi" requirements.txt && grep -q "uvicorn" requirements.txt; then
        echo -e "${GREEN}✓${NC} requirements.txt contains FastAPI and uvicorn"
    else
        echo -e "${RED}✗${NC} requirements.txt missing FastAPI or uvicorn"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} requirements.txt not found"
    ERRORS=$((ERRORS + 1))
fi

# Check backend structure
echo ""
echo "4. Checking backend structure..."
if [ -d "backend" ]; then
    echo -e "${GREEN}✓${NC} backend/ directory exists"
    if [ -f "backend/api/main.py" ]; then
        echo -e "${GREEN}✓${NC} backend/api/main.py exists"
    else
        echo -e "${RED}✗${NC} backend/api/main.py not found"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} backend/ directory not found"
    ERRORS=$((ERRORS + 1))
fi

# Check frontend structure
echo ""
echo "5. Checking frontend structure..."
if [ -d "frontend" ]; then
    echo -e "${GREEN}✓${NC} frontend/ directory exists"
    if [ -f "frontend/package.json" ]; then
        echo -e "${GREEN}✓${NC} frontend/package.json exists"
        if grep -q "\"build\"" frontend/package.json; then
            echo -e "${GREEN}✓${NC} frontend/package.json has build script"
        else
            echo -e "${YELLOW}⚠${NC}  frontend/package.json missing build script"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${RED}✗${NC} frontend/package.json not found"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} frontend/ directory not found"
    ERRORS=$((ERRORS + 1))
fi

# Check .gitignore
echo ""
echo "6. Checking .gitignore..."
if [ -f ".gitignore" ]; then
    echo -e "${GREEN}✓${NC} .gitignore exists"
    if grep -q "^\*$" .gitignore; then
        echo -e "${RED}✗${NC} .gitignore has wildcard '*' that ignores everything!"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓${NC} .gitignore looks correct"
    fi
    if grep -q "\.env" .gitignore; then
        echo -e "${GREEN}✓${NC} .gitignore excludes .env files"
    else
        echo -e "${YELLOW}⚠${NC}  .gitignore doesn't exclude .env files"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗${NC} .gitignore not found"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your codebase is ready for Railway deployment."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠${NC}  Configuration has $WARNINGS warning(s) but should work"
    echo ""
    echo "Review warnings above, but deployment should proceed."
    exit 0
else
    echo -e "${RED}✗${NC} Found $ERRORS error(s) and $WARNINGS warning(s)"
    echo ""
    echo "Please fix the errors above before deploying to Railway."
    exit 1
fi

