# Testing Guide

This document describes how to run the automated test suite for the authentication and strategy management system.

## Prerequisites

1. Docker and Docker Compose installed
2. Containers running: `docker compose up -d`
3. Database initialized (see below)

## Quick Start

### 1. Initialize Database

```bash
./scripts/init_db.sh
```

This will:
- Verify Docker containers are running
- Test database connection
- Create all required tables (users, strategies)
- Verify schema is correct

### 2. Run Full Integration Test Suite

```bash
./scripts/test_integration.sh
```

This comprehensive script will:
- Check Docker containers
- Initialize database if needed
- Run API endpoint tests (`test_auth_flow.sh`)
- Run Python unit tests (`pytest backend/tests/`)
- Provide a summary of all test results

### 3. Run Individual Test Suites

#### API Endpoint Tests (Bash)

```bash
./test_auth_flow.sh
```

Tests:
- Docker container health
- Database connectivity
- Guest mode endpoint
- Authentication endpoints
- Strategy CRUD endpoints (auth required)
- Backend service endpoints

#### Python Unit Tests

```bash
# Run all tests
pytest backend/tests/ -v

# Run specific test file
pytest backend/tests/test_auth_flow.py -v
pytest backend/tests/test_database.py -v

# Run with coverage
pytest backend/tests/ --cov=backend --cov-report=html
```

## Test Files

### `test_auth_flow.sh`
Bash script that tests API endpoints via HTTP requests. Tests infrastructure, authentication, and strategy endpoints without requiring a full test environment setup.

### `backend/tests/test_auth_flow.py`
Python pytest tests for:
- Authentication flows (guest mode, login, logout, theme)
- Strategy CRUD operations (create, read, update, delete, duplicate)
- Strategy validation
- Complete integration flows (save → load)
- User isolation (users can only see their own strategies)

### `backend/tests/test_database.py`
Database-specific tests:
- Database initialization
- Table schema validation
- Database operations (CRUD)
- Relationship testing
- Constraint validation (unique, foreign keys)
- Cascade delete behavior

### `scripts/init_db.sh`
Database initialization script that:
- Checks container status
- Tests database connection
- Creates tables if needed
- Verifies schema

### `scripts/test_integration.sh`
Master test runner that executes all test suites and provides a comprehensive report.

## Expected Results

All tests should pass if:
1. Docker containers are running
2. Database is initialized
3. Backend is healthy and responding
4. All dependencies are installed

## Troubleshooting

### Database Connection Failed
- Ensure PostgreSQL container is running: `docker compose ps`
- Check database logs: `docker compose logs db`
- Verify DATABASE_URL environment variable

### Tests Fail with Import Errors
- Ensure you're in the project root directory
- Check that all Python dependencies are installed: `pip install -r requirements.txt`
- Verify PYTHONPATH includes the backend directory

### Authentication Tests Fail
- Check that JWT_SECRET_KEY is set (defaults to "change-me-in-production")
- Verify Google OAuth credentials are set for OAuth tests
- Note: Some OAuth tests may fail if credentials aren't configured (this is expected)

### Strategy CRUD Tests Fail
- Ensure database is initialized: `./scripts/init_db.sh`
- Check that auth endpoints are working first
- Verify database tables exist

## Manual Testing

For manual end-to-end testing:

1. **Start services:**
   ```bash
   docker compose up -d
   ```

2. **Initialize database:**
   ```bash
   ./scripts/init_db.sh
   ```

3. **Access application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

4. **Test flow:**
   - Visit frontend (guest mode should work)
   - Build a strategy with indicators
   - Try to save strategy (should prompt for login)
   - Sign in with Google
   - Save strategy
   - Load saved strategy
   - Run backtest
   - Verify results display correctly

## Environment Variables

Required for full testing:
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `JWT_SECRET_KEY` - Secret key for JWT tokens (defaults to insecure value)
- `DATABASE_URL` - PostgreSQL connection string (set automatically in docker-compose)

## Continuous Integration

These tests can be integrated into CI/CD pipelines. The test scripts return appropriate exit codes:
- Exit 0: All tests passed
- Exit 1: One or more tests failed

