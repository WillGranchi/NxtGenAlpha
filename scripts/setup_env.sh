#!/bin/bash
# Interactive environment setup script for Trading Platform

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Trading Platform - Environment Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠${NC}  .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Exiting."
        exit 0
    fi
    echo ""
fi

# Start with .env.example as base
if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Copied .env.example to .env"
else
    echo -e "${RED}✗${NC} .env.example not found. Creating basic .env file..."
    touch .env
fi

echo ""

# Function to update env variable in .env file
update_env() {
    local key=$1
    local value=$2
    local file=".env"
    
    if grep -q "^${key}=" "$file"; then
        # Update existing variable
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$file"
        fi
    else
        # Add new variable
        echo "${key}=${value}" >> "$file"
    fi
}

# Generate secure JWT secret
echo -e "${BLUE}1. Generating JWT Secret${NC}"
if command -v python3 &> /dev/null; then
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    update_env "JWT_SECRET_KEY" "$JWT_SECRET"
    echo -e "${GREEN}✓${NC} Generated secure JWT secret"
else
    echo -e "${YELLOW}⚠${NC}  Python3 not found. Please generate JWT secret manually:"
    echo "   python3 -c \"import secrets; print(secrets.token_urlsafe(32))\""
    echo ""
    read -p "Enter JWT secret (or press Enter to skip): " jwt_secret
    if [ -n "$jwt_secret" ]; then
        update_env "JWT_SECRET_KEY" "$jwt_secret"
    fi
fi
echo ""

# Google OAuth Configuration
echo -e "${BLUE}2. Google OAuth Configuration${NC}"
echo "   See GOOGLE_OAUTH_SETUP.md for instructions on obtaining these values"
echo ""

read -p "Enter Google OAuth Client ID (or press Enter to skip): " google_client_id
if [ -n "$google_client_id" ]; then
    update_env "GOOGLE_CLIENT_ID" "$google_client_id"
    echo -e "${GREEN}✓${NC} Google Client ID configured"
fi

read -p "Enter Google OAuth Client Secret (or press Enter to skip): " google_client_secret
if [ -n "$google_client_secret" ]; then
    update_env "GOOGLE_CLIENT_SECRET" "$google_client_secret"
    echo -e "${GREEN}✓${NC} Google Client Secret configured"
fi
echo ""

# Environment Type
echo -e "${BLUE}3. Environment Type${NC}"
echo "   a) Development (localhost)"
echo "   b) Production (with domain)"
read -p "Select environment [a/b]: " env_choice

case $env_choice in
    b|B|production|Production|PRODUCTION)
        ENVIRONMENT="production"
        update_env "ENVIRONMENT" "$ENVIRONMENT"
        
        read -p "Enter production frontend URL (e.g., https://your-domain.com): " frontend_url
        if [ -n "$frontend_url" ]; then
            update_env "FRONTEND_URL" "$frontend_url"
        fi
        
        read -p "Enter production backend URL (e.g., https://api.your-domain.com): " backend_url
        if [ -n "$backend_url" ]; then
            update_env "BACKEND_URL" "$backend_url"
            update_env "CORS_ORIGINS" "$frontend_url"
        fi
        
        # Set secure cookie settings for production
        update_env "COOKIE_SECURE" "true"
        echo -e "${GREEN}✓${NC} Production environment configured"
        ;;
    *)
        ENVIRONMENT="development"
        update_env "ENVIRONMENT" "$ENVIRONMENT"
        echo -e "${GREEN}✓${NC} Development environment configured"
        ;;
esac
echo ""

# Database Configuration
echo -e "${BLUE}4. Database Configuration${NC}"
read -p "Use Docker PostgreSQL? (Y/n): " use_docker_db
if [[ ! $use_docker_db =~ ^[Nn]$ ]]; then
    echo -e "${GREEN}✓${NC} Using Docker PostgreSQL (default)"
else
    read -p "Enter database connection string (postgresql://user:pass@host:port/db): " db_url
    if [ -n "$db_url" ]; then
        update_env "DATABASE_URL" "$db_url"
        echo -e "${GREEN}✓${NC} Database URL configured"
    fi
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Setup Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✓${NC} Environment file created: .env"
echo ""

# Check for missing critical values
MISSING_VARS=()

if ! grep -q "^GOOGLE_CLIENT_ID=.*[^=]$" .env || grep -q "^GOOGLE_CLIENT_ID=$" .env; then
    MISSING_VARS+=("GOOGLE_CLIENT_ID")
fi

if ! grep -q "^GOOGLE_CLIENT_SECRET=.*[^=]$" .env || grep -q "^GOOGLE_CLIENT_SECRET=$" .env; then
    MISSING_VARS+=("GOOGLE_CLIENT_SECRET")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC}  Missing required configuration:"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "   ${YELLOW}-${NC} $var"
    done
    echo ""
    echo "Please edit .env file and add these values."
    echo "See GOOGLE_OAUTH_SETUP.md for instructions."
    echo ""
fi

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Review and edit .env file if needed"
if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "2. Add Google OAuth credentials (see GOOGLE_OAUTH_SETUP.md)"
    echo "3. Start Docker containers: docker compose up -d"
    echo "4. Initialize database: ./scripts/init_db.sh"
else
    echo "2. Start Docker containers: docker compose up -d"
    echo "3. Initialize database: ./scripts/init_db.sh"
    echo "4. Test the application: http://localhost:3000"
fi
echo ""

echo -e "${GREEN}Setup complete!${NC}"

