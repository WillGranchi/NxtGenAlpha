#!/bin/bash
# Verify Authentication Persistence Fix
# This script checks if the code changes for the auth fix are present

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Authentication Persistence Fix Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ERRORS=0
WARNINGS=0
CHECKS=0

# Function to check if code pattern exists in file
check_code_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    local required=${4:-true}
    
    CHECKS=$((CHECKS + 1))
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗${NC} File not found: $file"
        if [ "$required" = "true" ]; then
            ERRORS=$((ERRORS + 1))
        else
            WARNINGS=$((WARNINGS + 1))
        fi
        return 1
    fi
    
    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        if [ "$required" = "true" ]; then
            ERRORS=$((ERRORS + 1))
        else
            WARNINGS=$((WARNINGS + 1))
        fi
        return 1
    fi
}

# Check Frontend: Authorization Header Fix
echo -e "${CYAN}Frontend Code Verification${NC}"
echo "─────────────────────────────────────────"

check_code_pattern \
    "frontend/src/services/api.ts" \
    "localStorage.getItem('auth_token')" \
    "Frontend: Authorization header code present (token from localStorage)"

check_code_pattern \
    "frontend/src/services/api.ts" \
    "Authorization.*Bearer" \
    "Frontend: Authorization header with Bearer token"

check_code_pattern \
    "frontend/src/services/api.ts" \
    "config.headers.Authorization" \
    "Frontend: Setting Authorization header in request config"

echo ""

# Check Backend: Cookie SameSite Fix
echo -e "${CYAN}Backend Code Verification${NC}"
echo "─────────────────────────────────────────"

check_code_pattern \
    "backend/api/routes/auth.py" \
    "cookie_samesite.*none" \
    "Backend: SameSite=None cookie setting"

check_code_pattern \
    "backend/api/routes/auth.py" \
    "cookie_secure.*True" \
    "Backend: Secure cookie setting for production"

check_code_pattern \
    "backend/api/routes/auth.py" \
    "SameSite=None.*Secure" \
    "Backend: Cross-site cookie configuration comment"

echo ""

# Check if files exist
echo -e "${CYAN}File Structure Verification${NC}"
echo "─────────────────────────────────────────"

if [ -f "frontend/src/services/api.ts" ]; then
    echo -e "${GREEN}✓${NC} Frontend API service file exists"
    CHECKS=$((CHECKS + 1))
else
    echo -e "${RED}✗${NC} Frontend API service file not found"
    ERRORS=$((ERRORS + 1))
    CHECKS=$((CHECKS + 1))
fi

if [ -f "backend/api/routes/auth.py" ]; then
    echo -e "${GREEN}✓${NC} Backend auth routes file exists"
    CHECKS=$((CHECKS + 1))
else
    echo -e "${RED}✗${NC} Backend auth routes file not found"
    ERRORS=$((ERRORS + 1))
    CHECKS=$((CHECKS + 1))
fi

echo ""

# Check for documentation
echo -e "${CYAN}Documentation Verification${NC}"
echo "─────────────────────────────────────────"

if [ -f "FIX_AUTH_PERSISTENCE.md" ]; then
    echo -e "${GREEN}✓${NC} Fix documentation exists (FIX_AUTH_PERSISTENCE.md)"
    CHECKS=$((CHECKS + 1))
else
    echo -e "${YELLOW}⚠${NC}  Fix documentation not found (optional)"
    WARNINGS=$((WARNINGS + 1))
    CHECKS=$((CHECKS + 1))
fi

if [ -f "AUTH_FIX_VERIFICATION_CHECKLIST.md" ]; then
    echo -e "${GREEN}✓${NC} Verification checklist exists"
    CHECKS=$((CHECKS + 1))
else
    echo -e "${YELLOW}⚠${NC}  Verification checklist not found (optional)"
    WARNINGS=$((WARNINGS + 1))
    CHECKS=$((CHECKS + 1))
fi

echo ""

# Environment Variables Documentation Check
echo -e "${CYAN}Environment Variables Documentation${NC}"
echo "─────────────────────────────────────────"

ENV_VARS_REQUIRED=("ENVIRONMENT" "COOKIE_SECURE" "FRONTEND_URL" "CORS_ORIGINS")
ENV_VARS_FOUND=0

if [ -f "FIX_AUTH_PERSISTENCE.md" ]; then
    for var in "${ENV_VARS_REQUIRED[@]}"; do
        if grep -qi "$var" "FIX_AUTH_PERSISTENCE.md"; then
            ENV_VARS_FOUND=$((ENV_VARS_FOUND + 1))
        fi
    done
    
    if [ $ENV_VARS_FOUND -eq ${#ENV_VARS_REQUIRED[@]} ]; then
        echo -e "${GREEN}✓${NC} All required environment variables documented"
        CHECKS=$((CHECKS + 1))
    else
        echo -e "${YELLOW}⚠${NC}  Some environment variables may not be documented"
        WARNINGS=$((WARNINGS + 1))
        CHECKS=$((CHECKS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC}  Cannot verify environment variable documentation (FIX_AUTH_PERSISTENCE.md not found)"
    WARNINGS=$((WARNINGS + 1))
    CHECKS=$((CHECKS + 1))
fi

echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Verification Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Total checks: ${CYAN}$CHECKS${NC}"
echo -e "Passed: ${GREEN}$((CHECKS - ERRORS - WARNINGS))${NC}"
if [ $WARNINGS -gt 0 ]; then
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
fi
if [ $ERRORS -gt 0 ]; then
    echo -e "Errors: ${RED}$ERRORS${NC}"
fi
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All code checks passed!${NC}"
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo "1. Deploy code changes to Railway (frontend and backend)"
    echo "2. Verify Railway environment variables are set:"
    echo "   - ENVIRONMENT=production"
    echo "   - COOKIE_SECURE=true"
    echo "   - FRONTEND_URL=<your-frontend-url>"
    echo "   - CORS_ORIGINS=<your-frontend-domain>"
    echo "3. Restart backend service after setting variables"
    echo "4. Test login flow in browser (see AUTH_FIX_VERIFICATION_CHECKLIST.md)"
    echo ""
    echo -e "${YELLOW}Note:${NC} This script only verifies code changes are present."
    echo "You must still verify Railway configuration and test in browser."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠${NC}  Code changes verified with $WARNINGS warning(s)"
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo "1. Review warnings above"
    echo "2. Deploy code changes to Railway"
    echo "3. Verify Railway environment variables"
    echo "4. Test login flow in browser"
    exit 0
else
    echo -e "${RED}✗${NC} Found $ERRORS error(s) and $WARNINGS warning(s)"
    echo ""
    echo -e "${CYAN}Required Fixes:${NC}"
    echo "1. Ensure frontend/src/services/api.ts has Authorization header code"
    echo "2. Ensure backend/api/routes/auth.py has SameSite=None cookie logic"
    echo "3. Review errors above and fix code issues"
    echo ""
    echo "See FIX_AUTH_PERSISTENCE.md for details on required code changes."
    exit 1
fi

