#!/bin/bash
# Script to run database migrations on Railway
# This ensures we use the correct Python and working directory

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root (Railway's working directory is /app or project root)
cd "$PROJECT_ROOT"

echo "🔍 Finding Python with alembic installed..."

# On Railway, Nixpacks installs packages during build
# Try to find the correct Python - check multiple locations
PYTHON_CMD=""

# Method 1: Check if uvicorn's Python has alembic (since app is running)
if command -v uvicorn &> /dev/null; then
    UVICORN_PYTHON=$(which uvicorn | sed 's|/bin/uvicorn||')
    if [ -n "$UVICORN_PYTHON" ] && [ -f "$UVICORN_PYTHON/bin/python" ]; then
        if "$UVICORN_PYTHON/bin/python" -m alembic --help &> /dev/null; then
            PYTHON_CMD="$UVICORN_PYTHON/bin/python"
            echo "✓ Found Python via uvicorn: $PYTHON_CMD"
        fi
    fi
fi

# Method 2: Check common Python locations with packages
if [ -z "$PYTHON_CMD" ]; then
    for py_cmd in python3.11 python3 python; do
        if command -v "$py_cmd" &> /dev/null; then
            # Check if alembic is available
            if "$py_cmd" -m alembic --help &> /dev/null 2>&1; then
                PYTHON_CMD="$py_cmd"
                echo "✓ Found Python with alembic: $PYTHON_CMD"
                break
            fi
        fi
    done
fi

# Method 3: Check Nixpacks Python location
if [ -z "$PYTHON_CMD" ] && [ -d "/nix/store" ]; then
    # Find Python in Nix store
    NIX_PYTHON=$(find /nix/store -name "python3*" -type f -executable 2>/dev/null | head -1)
    if [ -n "$NIX_PYTHON" ] && "$NIX_PYTHON" -m alembic --help &> /dev/null 2>&1; then
        PYTHON_CMD="$NIX_PYTHON"
        echo "✓ Found Python in Nix store: $PYTHON_CMD"
    fi
fi

# Method 4: Install alembic if not found (last resort)
if [ -z "$PYTHON_CMD" ]; then
    echo "⚠️  Python with alembic not found. Installing packages..."
    
    # Try to install using python3
    if command -v python3 &> /dev/null; then
        echo "Installing packages with python3..."
        python3 -m pip install --user alembic sqlalchemy psycopg2-binary || true
        if python3 -m alembic --help &> /dev/null 2>&1; then
            PYTHON_CMD="python3"
            echo "✓ Installed and verified alembic with python3"
        fi
    fi
fi

# Final check
if [ -z "$PYTHON_CMD" ]; then
    echo "❌ Error: Could not find or install Python with alembic"
    echo "Available Python interpreters:"
    which -a python3 python 2>/dev/null || echo "  None found"
    echo ""
    echo "Please check Railway build logs to ensure packages were installed."
    exit 1
fi

# Check if migrations directory exists
if [ ! -d "backend/alembic/versions" ]; then
    echo "📁 Creating migrations directory..."
    mkdir -p backend/alembic/versions
    touch backend/alembic/versions/.gitkeep
    echo "⚠️  Note: Migrations directory created. You may need to create initial migration first."
    echo "   Run: $PYTHON_CMD -m alembic -c backend/alembic.ini revision --autogenerate -m 'Initial migration'"
fi

# Run migrations
# alembic.ini is in backend/, but we run from project root
# Use -c flag to specify config file location
echo "🚀 Running database migrations..."
echo "   Using: $PYTHON_CMD"
echo "   Config: backend/alembic.ini"
echo ""

"$PYTHON_CMD" -m alembic -c backend/alembic.ini upgrade head

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations completed successfully!"
else
    echo ""
    echo "❌ Migration failed. Check the error above."
    exit 1
fi

