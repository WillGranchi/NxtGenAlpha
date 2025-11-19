# Backend 404 Not Found - Troubleshooting Guide

If you're getting 404 for ALL endpoints (including `/` and `/health`), the backend likely isn't running or crashed during startup.

## Step 1: Check Backend Deployment Status

1. **Railway Dashboard** → **Backend Service** → **Deployments** tab
2. Check the latest deployment:
   - ✅ **"Active"** or **"Success"** → Backend deployed, go to Step 2
   - ❌ **"Failed"** → Check build logs (Step 3)
   - ⏳ **"Building"** → Wait for it to finish
   - ⏳ **"Queued"** → Wait for build slot

## Step 2: Check Backend Logs

1. **Railway Dashboard** → **Backend Service** → **Logs** tab
2. Look for these indicators:

### ✅ Backend is Running (Good Signs):
```
INFO:     Started server process [1]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:XXXX
```

### ❌ Backend Crashed (Bad Signs):
- `ModuleNotFoundError` or `ImportError`
- `FileNotFoundError` (especially data files)
- `Database connection failed`
- `Traceback` or `Exception`
- No "Uvicorn running" message

## Step 3: Common Issues & Fixes

### Issue 1: Missing Data File

**Symptoms:**
- Logs show: `FileNotFoundError: Bitcoin Historical Data4.csv`
- Health check fails with data loading error

**Fix:**
1. Check if data file exists: `backend/data/Bitcoin Historical Data4.csv`
2. Verify it's copied in Dockerfile (should be automatic)
3. If missing, add it to the repository and redeploy

### Issue 2: Import Errors

**Symptoms:**
- Logs show: `ModuleNotFoundError: No module named 'backend'`
- Import errors during startup

**Fix:**
1. Verify `backend/__init__.py` exists (should be there)
2. Check Dockerfile copies backend correctly: `COPY backend/ ./backend/`
3. Verify PYTHONPATH is set: `ENV PYTHONPATH=/app`

### Issue 3: Database Connection Failed

**Symptoms:**
- Logs show: `Failed to initialize database`
- Database connection errors

**Fix:**
1. Check `DATABASE_URL` is set in Backend → Variables
2. Verify PostgreSQL service is running
3. Check DATABASE_URL format: `postgresql://user:pass@host:port/db`

### Issue 4: Port Configuration

**Symptoms:**
- Backend starts but requests don't reach it
- Port mismatch errors

**Fix:**
1. Verify Railway set `PORT` environment variable
2. Check Dockerfile uses `$PORT` correctly
3. Ensure public networking is enabled with correct port (8080)

## Step 4: Verify Backend is Actually Running

### Check Railway Logs for:
1. **Startup messages:**
   ```
   INFO:     Started server process [X]
   INFO:     Application startup complete.
   INFO:     Uvicorn running on http://0.0.0.0:XXXX
   ```

2. **No errors after startup:**
   - Should NOT see tracebacks or exceptions
   - Should NOT see "Application startup failed"

3. **Port number:**
   - Should see: `Uvicorn running on http://0.0.0.0:8080` (or similar)
   - Note the actual port number

### Test Backend Directly:

1. **Get backend Railway URL:**
   - Railway → Backend → Settings → Networking
   - Copy the public URL (e.g., `https://backend-production-e240a.up.railway.app`)

2. **Test endpoints:**
   ```bash
   # Root endpoint
   curl https://backend-production-e240a.up.railway.app/
   
   # Health endpoint
   curl https://backend-production-e240a.up.railway.app/health
   
   # Docs endpoint
   curl https://backend-production-e240a.up.railway.app/docs
   ```

3. **Expected responses:**
   - Root (`/`): `{"message": "Bitcoin Trading Strategy API", ...}`
   - Health (`/health`): `{"status": "healthy", ...}`
   - Docs (`/docs`): HTML page (Swagger UI)

## Step 5: If Backend Still Shows 404

### Check These:

1. **Service Name Confusion:**
   - Make sure you're testing the **Backend** service URL
   - NOT the Frontend service URL
   - NOT the PostgreSQL service URL

2. **Public Networking:**
   - Backend → Settings → Networking
   - Should have a public domain listed
   - If not, enable public networking

3. **Domain Routing:**
   - If using custom domain, make sure it's attached to **Backend** service
   - Test the Railway-generated URL directly (not custom domain)

4. **Redeploy Backend:**
   - Backend → Deployments → Click "Redeploy"
   - Wait for deployment to complete
   - Check logs again

## Step 6: Quick Diagnostic Commands

Run these in Railway Shell (if available) or check logs:

```bash
# Check if app is running
ps aux | grep uvicorn

# Check if port is listening
netstat -tuln | grep 8080

# Check Python path
echo $PYTHONPATH

# Test app import
python3 -c "from backend.api.main import app; print('Import successful')"
```

## Still Not Working?

1. **Share Railway Logs:**
   - Copy the last 50-100 lines from Backend → Logs
   - Look for errors, tracebacks, or startup failures

2. **Check Build Logs:**
   - Backend → Deployments → Latest → Build Logs
   - Look for build errors or warnings

3. **Verify Configuration:**
   - Root Directory: `/`
   - Dockerfile Path: `Dockerfile.backend`
   - Builder: `Dockerfile`

4. **Contact Railway Support:**
   - Include: Service name, deployment logs, error messages

