# PostgreSQL and 502 Error Diagnosis

## Understanding the Issue

If the domain is attached to the frontend service and you're getting a 502, but you suspect PostgreSQL, let's check:

1. **Frontend service** (serves static files) - shouldn't need database
2. **Backend service** (needs PostgreSQL) - if DB fails, API calls fail
3. **PostgreSQL service** - if it's down, backend can't work

## Diagnosis Steps

### Step 1: Check Frontend Service Status

**Railway Dashboard → Frontend Service → Logs:**

Look for:
- ✅ `INFO  Accepting connections at http://0.0.0.0:8080` (or similar)
- ✅ Service running without crashes
- ❌ Any error messages about connection failures
- ❌ Service restarting in a loop

**If frontend is crashing:**
- Check if there are errors in the logs
- Verify `serve` package is installed correctly
- Check PORT environment variable

### Step 2: Check Backend Service Status

**Railway Dashboard → Backend Service → Logs:**

Look for:
- ✅ `Database initialized successfully`
- ✅ `Application startup complete`
- ✅ `Uvicorn running on http://0.0.0.0:8080`
- ❌ `Failed to initialize database: ...`
- ❌ `connection to server at ... failed`
- ❌ `database system is not ready to accept connections`

### Step 3: Check PostgreSQL Service Status

**Railway Dashboard → PostgreSQL Service → Logs:**

Look for:
- ✅ `database system is ready to accept connections`
- ✅ Normal checkpoint operations
- ❌ `FATAL: database does not exist`
- ❌ `FATAL: password authentication failed`
- ❌ Connection errors

### Step 4: Verify DATABASE_URL Environment Variable

**Railway Dashboard → Backend Service → Variables:**

Check:
- ✅ `DATABASE_URL` is set
- ✅ Format: `postgresql://user:password@host:5432/dbname`
- ✅ Or using Railway reference: `${{Postgres.DATABASE_URL}}`

**Common Issues:**
- Missing `DATABASE_URL` variable
- Wrong format (missing `postgresql://` prefix)
- Using localhost instead of Railway PostgreSQL service URL

### Step 5: Test Backend API Directly

```bash
# Test backend health endpoint
curl https://web-production-776f1.up.railway.app/api/health

# Test root endpoint
curl https://web-production-776f1.up.railway.app/
```

**Expected:**
- Returns JSON response
- Status 200 OK

**If backend returns 502:**
- Backend service is down or not accessible
- Check backend logs for errors

**If backend returns 500:**
- Database connection issue
- Check DATABASE_URL and PostgreSQL logs

**If backend returns 200:**
- Backend is working, issue is likely frontend

## Common PostgreSQL Issues and Fixes

### Issue 1: DATABASE_URL Not Set

**Symptom:** Backend logs show connection errors or "Failed to initialize database"

**Fix:**
1. Railway Dashboard → Backend Service → Variables
2. Add `DATABASE_URL=${{Postgres.DATABASE_URL}}`
3. Or get actual connection string from PostgreSQL service → Connect tab
4. Save and redeploy

### Issue 2: PostgreSQL Service Not Running

**Symptom:** Backend can't connect, PostgreSQL logs show errors

**Fix:**
1. Railway Dashboard → PostgreSQL Service
2. Check if service is running
3. Restart if needed
4. Wait for it to be ready

### Issue 3: Wrong DATABASE_URL Format

**Symptom:** Connection refused or authentication failed

**Fix:**
- Use Railway's variable reference: `${{Postgres.DATABASE_URL}}`
- Or ensure format is: `postgresql://user:password@host:5432/dbname`
- Don't use `localhost` - use Railway PostgreSQL service hostname

### Issue 4: Database Connection Pool Exhausted

**Symptom:** Intermittent connection errors

**Fix:**
- Backend already uses `pool_pre_ping=True` which helps
- May need to restart backend service
- Check PostgreSQL connection limits

## Frontend 502 vs Backend Issues

### If Frontend Returns 502:

**Frontend service issue** (not PostgreSQL):
- Frontend service not running
- Frontend service crashed
- Port binding issue
- Build failed

**Fix:** Check frontend service logs and deployment status

### If Frontend Loads But API Calls Fail:

**Backend/Database issue:**
- Backend service not running
- Database connection failed
- API endpoints returning errors

**Fix:** Check backend service logs and DATABASE_URL

## Quick Diagnostic Commands

### Check Backend Database Connection

```bash
# Via Railway CLI (if linked)
railway run --service web python3 << 'PYTHON_EOF'
import sys
sys.path.insert(0, '/app')
import os
from backend.core.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT version()'))
        version = result.fetchone()[0]
        print(f"✅ Database connected! PostgreSQL version: {version[:50]}")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
PYTHON_EOF
```

### Check Frontend Service

```bash
# Get frontend Railway URL and test
curl -I https://YOUR-FRONTEND-URL.up.railway.app
```

## Expected Behavior

### Working Setup:

1. **PostgreSQL:** Running, accepting connections
2. **Backend:** Connected to PostgreSQL, API responding
3. **Frontend:** Serving static files, making API calls to backend

### If PostgreSQL is down:

- ✅ Frontend can still serve static files (should work)
- ❌ Backend API calls will fail (500 errors)
- ❌ Frontend won't be able to load data

**But:** Frontend static files should still load even if backend is down!

## Next Steps

1. **Check Railway Dashboard:**
   - Frontend service logs (is it running?)
   - Backend service logs (any database errors?)
   - PostgreSQL service logs (is it running?)

2. **Verify DATABASE_URL:**
   - Is it set correctly in backend service?
   - Is it using Railway PostgreSQL service?

3. **Test Services:**
   - Test backend Railway URL directly
   - Test frontend Railway URL directly
   - Compare with custom domain

**Share the following information:**
- Frontend service logs (last 50 lines)
- Backend service logs (last 50 lines)
- PostgreSQL service logs (last 50 lines)
- DATABASE_URL value (masked password)

This will help identify the exact issue.

