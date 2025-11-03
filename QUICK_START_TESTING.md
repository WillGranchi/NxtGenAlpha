# Quick Start - Running Tests Locally

## Prerequisites Check

Before running tests, ensure you have:
1. Docker and Docker Compose installed and running
2. All services started

## Step-by-Step Instructions

### 1. Start Docker Services

```bash
# Navigate to project root
cd /Users/willgranchi/TradingPlat

# Start all containers
docker compose up -d

# Wait for services to be ready (about 10-15 seconds)
sleep 10

# Verify containers are running
docker compose ps
```

You should see:
- `tradingplat-db-1` (PostgreSQL)
- `tradingplat-backend-1` (FastAPI backend)
- `tradingplat-frontend-1` (React frontend)

### 2. Initialize Database

```bash
# Run database initialization script
./scripts/init_db.sh
```

This will:
- Test database connection
- Create required tables (users, strategies)
- Verify schema

### 3. Run Test Suite

You have three options:

#### Option A: Run All Tests (Recommended)
```bash
./scripts/test_integration.sh
```

#### Option B: Run API Endpoint Tests Only
```bash
./test_auth_flow.sh
```

#### Option C: Run Python Unit Tests Only
```bash
# First, install test dependencies (if not already installed)
pip install pytest pytest-asyncio httpx

# Then run tests
pytest backend/tests/ -v
```

## Expected Output

### Successful Test Run

When tests pass, you'll see:
```
✅ All tests passed!
Total tests: X
Passed: X
Failed: 0
```

### If Tests Fail

Common issues and solutions:

1. **Docker containers not running**
   ```bash
   docker compose up -d
   ```

2. **Database not initialized**
   ```bash
   ./scripts/init_db.sh
   ```

3. **Services not ready yet**
   ```bash
   # Wait a bit longer and check logs
   docker compose logs backend
   docker compose logs db
   ```

4. **Port conflicts**
   - Check if ports 8000, 3000, or 5432 are already in use
   - Stop conflicting services or modify docker-compose.yml

## Manual Testing in Browser

After running automated tests, you can also test manually:

1. **Open Frontend**: http://localhost:3000
2. **Open Backend API Docs**: http://localhost:8000/docs
3. **Test Flow**:
   - Visit frontend (should work in guest mode)
   - Build a strategy with indicators
   - Try saving (will prompt for login)
   - Sign in with Google OAuth
   - Save and load strategies
   - Run backtests

## Viewing Test Results in Detail

### Python Tests with Coverage
```bash
pytest backend/tests/ --cov=backend --cov-report=html
# Open htmlcov/index.html in browser
```

### Verbose Output
```bash
# More detailed output
pytest backend/tests/ -vv
```

## Troubleshooting

### Docker Not Found
If you get "command not found: docker":
- Ensure Docker Desktop is installed and running
- On macOS, Docker Desktop must be running
- Restart your terminal after installing Docker

### Database Connection Errors
```bash
# Check database logs
docker compose logs db

# Test database connection manually
docker compose exec backend python3 -c "from backend.core.database import engine; engine.connect()"
```

### Python Import Errors
```bash
# Ensure you're in the project root
cd /Users/willgranchi/TradingPlat

# Install dependencies
pip install -r requirements.txt

# Or run tests inside container
docker compose exec backend pytest backend/tests/ -v
```

## Next Steps

After tests pass:
1. Test authentication flow in browser
2. Create and save strategies
3. Test strategy loading and modification
4. Verify backtest functionality with saved strategies

