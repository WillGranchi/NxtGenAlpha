# Troubleshooting Authentication 404 Error

## Issue
Getting 404 error when trying to signup/login: `Request failed with status code 404`

## Root Cause
The backend server needs to be **restarted** to load the new `/api/auth/signup` and `/api/auth/login` routes that were just added.

## Solution

### Step 1: Restart the Backend Server

**If running locally:**
```bash
# Stop the current backend server (Ctrl+C)
# Then restart it:
cd backend
uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
```

**If running on Railway:**
- The server should auto-reload, but you may need to trigger a redeploy
- Or wait a few minutes for auto-reload to pick up changes

### Step 2: Verify Backend is Running

Test the endpoint directly:
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

You should get a response (either success or validation error), NOT a 404.

### Step 3: Check Frontend API URL

Make sure your frontend is pointing to the correct backend URL:

1. Check `.env` file in `frontend/` directory:
   ```
   VITE_API_URL=http://localhost:8000
   ```

2. Or check `frontend/src/services/api.ts` - it should use:
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
   ```

### Step 4: Verify Routes are Registered

Check the backend logs when starting. You should see routes being registered. You can also visit:
- `http://localhost:8000/docs` - Should show `/api/auth/signup` and `/api/auth/login` endpoints

### Step 5: Database Migration

Before testing signup, make sure the database has the `password_hash` column:

```bash
cd backend
python migrations/add_password_hash.py
```

Or if using Alembic:
```bash
cd backend
alembic revision --autogenerate -m "add password_hash to users"
alembic upgrade head
```

## Quick Test

After restarting the backend, test with curl:

```bash
# Test signup endpoint
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","name":"Test User"}'

# Should return:
# {"message":"User created successfully","user":{...},"token":"..."}
```

If you still get 404, check:
1. Backend server is actually running on port 8000
2. No errors in backend console/logs
3. Routes are being imported correctly in `backend/api/main.py`

## Common Issues

### Issue: "Module not found" errors in backend
**Fix**: Make sure you're running from the project root or have the Python path set correctly

### Issue: CORS errors
**Fix**: Check that `CORS_ORIGINS` in backend includes your frontend URL (e.g., `http://localhost:3001`)

### Issue: Database errors
**Fix**: Run the migration script to add `password_hash` column

### Issue: Port conflicts
**Fix**: Make sure port 8000 is available, or change the port in both frontend and backend configs

