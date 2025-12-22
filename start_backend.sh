#!/bin/bash
# Backend server startup script

cd "$(dirname "$0")/backend"

# Activate virtual environment
source ../.venv/bin/activate

# Check if port is already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 8000 is already in use. Killing existing process..."
    kill -9 $(lsof -ti:8000) 2>/dev/null
    sleep 2
fi

echo "🚀 Starting backend server..."
echo "📍 Server will be available at: http://localhost:8000"
echo "📚 API docs will be at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server (foreground so we can see errors)
exec python3 -m uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
