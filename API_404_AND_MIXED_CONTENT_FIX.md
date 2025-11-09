# Fix: API 404 Errors and Mixed Content Warnings

## Issues Observed

1. **404 Not Found Errors:**
   - `GET https://web-production-776f1.up.railway.app/api/data/info` → 404
   - `GET https://web-production-776f1.up.railway.app/api/strategies` → 404

2. **Mixed Content Warning:**
   - Request to `http://web-production-776f1.up.railway.app/api/strategies/` (HTTP) blocked
   - Page is HTTPS but trying to load HTTP resources

## Root Causes

### 404 Errors
The routes exist in the code but return 404, which suggests:
- Backend service might not be running
- Routes might not be properly registered
- Backend might be serving from a different path
- Backend deployment might have failed

### Mixed Content Warning
Some requests are using HTTP instead of HTTPS:
- Old cached frontend build with HTTP URLs
- `VITE_API_URL` might have been set to HTTP at some point
- Browser cache holding old configuration

## Step-by-Step Fix

### Step 1: Verify Backend is Running

1. **Check Railway Backend Service:**
   - Go to: Railway Dashboard → Backend Service
   - Check **Deployments** tab
   - Latest deployment should be "Deployed" (green)
   - If "Failed" or "Building", wait for it to complete

2. **Check Backend Logs:**
   - Railway Dashboard → Backend Service → **Logs**
   - Look for:
     - `Application startup complete`
     - `Database initialized successfully`
     - `CORS allowed origins: [...]`
   - If you see errors, note them down

3. **Test Backend Directly:**
   - Open browser and visit: `https://web-production-776f1.up.railway.app/health`
   - Should return: `{"status": "healthy", ...}`
   - If this fails, backend is not running properly

4. **Test API Routes Directly:**
   - Visit: `https://web-production-776f1.up.railway.app/api/data/info`
   - Should return JSON data (not 404)
   - Visit: `https://web-production-776f1.up.railway.app/api/strategies`
   - Should return JSON data (not 404)

### Step 2: Fix Mixed Content (HTTP vs HTTPS)

1. **Verify VITE_API_URL in Railway:**
   - Railway Dashboard → Frontend Service → **Variables**
   - Check `VITE_API_URL` value
   - **Must be:** `https://web-production-776f1.up.railway.app`
   - **NOT:** `http://web-production-776f1.up.railway.app` (missing 's')
   - If it's HTTP, change it to HTTPS and save

2. **Redeploy Frontend:**
   - After changing `VITE_API_URL`, frontend will auto-redeploy
   - Wait 3-7 minutes for deployment to complete
   - Check Railway Dashboard → Frontend Service → Deployments
   - Status should be "Deployed" (green)

3. **Clear Browser Cache:**
   - **Hard refresh:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - **Or use incognito/private window:**
     - Chrome: `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
     - Firefox: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
   - **Or clear cache manually:**
     - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
     - Firefox: Settings → Privacy → Clear Data → Cached Web Content

### Step 3: Verify Backend Routes are Registered

1. **Check Backend Logs for Route Registration:**
   - Railway Dashboard → Backend Service → **Logs**
   - Look for startup messages
   - Routes should be registered automatically when backend starts

2. **Test Backend API Docs:**
   - Visit: `https://web-production-776f1.up.railway.app/docs`
   - Should show FastAPI Swagger UI
   - Look for `/api/data/info` and `/api/strategies` endpoints
   - If they're missing, routes aren't registered

3. **Check Backend Code Structure:**
   - Verify `backend/api/main.py` includes:
     ```python
     app.include_router(data.router)
     app.include_router(strategies.router)
     ```
   - These should be present (they are in the code)

### Step 4: Verify Environment Variables

**Backend Service Variables (Railway):**
- [ ] `PYTHONPATH=/app` (or correct path)
- [ ] `DATABASE_URL` is set
- [ ] `CORS_ORIGINS` includes your frontend domain
- [ ] `FRONTEND_URL` is set correctly

**Frontend Service Variables (Railway):**
- [ ] `VITE_API_URL=https://web-production-776f1.up.railway.app` (HTTPS, not HTTP)

### Step 5: Restart Services

1. **Restart Backend:**
   - Railway Dashboard → Backend Service → **Settings** → **Restart**
   - Wait 30-60 seconds for restart
   - Check logs to confirm it started

2. **Restart Frontend (if needed):**
   - Railway Dashboard → Frontend Service → **Settings** → **Restart**
   - Or trigger redeploy by changing a variable

## Verification Steps

### Test 1: Backend Health

```bash
# In browser or terminal
curl https://web-production-776f1.up.railway.app/health
```

**Expected:** `{"status": "healthy", "data_records": ..., "api_version": "1.0.0"}`

### Test 2: API Endpoints

```bash
# Test data info endpoint
curl https://web-production-776f1.up.railway.app/api/data/info

# Test strategies endpoint
curl https://web-production-776f1.up.railway.app/api/strategies
```

**Expected:** Both should return JSON data (not 404)

### Test 3: Frontend in Browser

1. Visit: `https://nxtgenalpha.com`
2. Open DevTools (F12) → **Console**
3. Check for errors:
   - Should NOT see 404 errors
   - Should NOT see mixed content warnings
   - Should see successful API calls

4. Open DevTools → **Network** tab
5. Filter by `api`
6. Check requests:
   - All should use `https://` (not `http://`)
   - Status should be `200 OK` (not 404)
   - Requests should go to: `https://web-production-776f1.up.railway.app/api/...`

## Troubleshooting

### Issue: Backend returns 404 for all routes

**Possible causes:**
1. Backend service is not running
2. Routes not registered (check `backend/api/main.py`)
3. Backend serving from different base path

**Fix:**
1. Check Railway backend logs for errors
2. Verify backend service is "Deployed" (not "Failed")
3. Restart backend service
4. Check if backend is accessible at root: `https://web-production-776f1.up.railway.app/`

### Issue: Mixed content warning persists

**Possible causes:**
1. Frontend not redeployed after changing `VITE_API_URL`
2. Browser cache holding old build
3. `VITE_API_URL` still set to HTTP

**Fix:**
1. Verify `VITE_API_URL` is HTTPS in Railway
2. Wait for frontend redeployment to complete
3. Hard refresh browser or use incognito
4. Clear browser cache completely

### Issue: Some requests work, others don't

**Possible causes:**
1. Partial deployment
2. Cached old build mixed with new build
3. Some routes not registered

**Fix:**
1. Clear browser cache completely
2. Verify all routes in backend logs
3. Test each endpoint directly in browser

### Issue: Backend health check works but API routes don't

**Possible causes:**
1. Routes not included in main.py
2. Import errors preventing route registration
3. Path prefix mismatch

**Fix:**
1. Check backend logs for import errors
2. Verify routes are included in `backend/api/main.py`:
   ```python
   app.include_router(data.router)      # /api/data/*
   app.include_router(strategies.router) # /api/strategies/*
   ```
3. Check route prefixes match:
   - `data.router` has prefix `/api/data`
   - `strategies.router` has prefix `/api/strategies`

## Quick Checklist

Before testing, verify:

- [ ] Backend service is "Deployed" in Railway
- [ ] Backend health check works: `https://web-production-776f1.up.railway.app/health`
- [ ] `VITE_API_URL` is set to HTTPS (not HTTP) in Railway Frontend variables
- [ ] Frontend has redeployed after setting `VITE_API_URL`
- [ ] Browser cache cleared or using incognito window
- [ ] Backend logs show no errors
- [ ] API routes are accessible directly: `/api/data/info` and `/api/strategies`

## Expected Behavior After Fix

✅ Backend health check returns 200 OK  
✅ `/api/data/info` returns JSON data (200 OK)  
✅ `/api/strategies` returns JSON data (200 OK)  
✅ Frontend loads data and strategies without errors  
✅ No mixed content warnings in console  
✅ All API requests use HTTPS  
✅ No 404 errors in browser console  

## Summary

The main fixes are:
1. **Ensure `VITE_API_URL` uses HTTPS** (not HTTP) in Railway
2. **Wait for frontend redeployment** after changing variables
3. **Clear browser cache** or use incognito
4. **Verify backend is running** and routes are registered
5. **Restart backend** if needed

If issues persist after these steps, check Railway backend logs for specific errors.

