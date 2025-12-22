# Troubleshooting Guide

This guide covers common issues and their solutions for the Trading Platform.

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [API Errors (404, Network Errors)](#api-errors)
3. [CORS Issues](#cors-issues)
4. [Data File Issues](#data-file-issues)
5. [OAuth Configuration](#oauth-configuration)
6. [Mixed Content Warnings](#mixed-content-warnings)
7. [General Diagnostics](#general-diagnostics)

---

## Authentication Issues

### Problem: User Not Staying Logged In After Google Sign-In

**Symptoms:**
- User successfully signs in with Google
- After redirect, user appears as not logged in
- Profile/name doesn't show
- "Sign in" button still visible

**Root Causes:**
1. Cookie SameSite issue with cross-site OAuth redirects
2. Frontend not sending token in Authorization header
3. Backend not reading token correctly

**Fixes Applied:**

#### Frontend Fix
The frontend now automatically sends the token in the Authorization header:
- File: `frontend/src/services/api.ts`
- Code adds `Authorization: Bearer <token>` to all API requests
- Token is read from localStorage

#### Backend Fix
The backend uses `SameSite=None` with `Secure=True` for OAuth cookies:
- File: `backend/api/routes/auth.py`
- Cookies work for cross-site redirects

**Required Railway Variables (Backend):**
- `ENVIRONMENT=production`
- `COOKIE_SECURE=true`
- `FRONTEND_URL=https://nxtgenalpha.com`
- `CORS_ORIGINS` includes your frontend domain

**Verification:**
1. Check Network tab → `/api/auth/me` request
2. Should see `Authorization: Bearer <token>` in Request Headers
3. Response should be `200 OK` with user data
4. Check localStorage: `localStorage.getItem('auth_token')` should return token

**Troubleshooting:**
- If token missing: Check if OAuth redirect includes `?token=...` in URL
- If Authorization header missing: Verify frontend code is deployed
- If 401 error: Check token is valid and backend is reading it

### Problem: 404 Error on Signup/Login Endpoints

**Symptoms:**
- Getting 404 error when trying to signup/login
- `Request failed with status code 404`
- Endpoints `/api/auth/signup` or `/api/auth/login` not found

**Root Cause:**
- Backend server needs to be restarted to load new routes
- Routes not registered properly

**Fix Steps:**

1. **Restart Backend Server:**
   - **Local:** Stop server (Ctrl+C), then restart:
     ```bash
     cd backend
     uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
     ```
   - **Railway:** Trigger redeploy or wait for auto-reload

2. **Verify Routes are Registered:**
   - Visit: `http://localhost:8000/docs` (or Railway backend URL + `/docs`)
   - Should show `/api/auth/signup` and `/api/auth/login` endpoints

3. **Test Endpoint Directly:**
   ```bash
   curl -X POST http://localhost:8000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123456","name":"Test User"}'
   ```
   Should return response (not 404)

4. **Check Database Migration:**
   - Ensure `password_hash` column exists in users table
   - Run migration if needed:
     ```bash
     cd backend
     python migrations/add_password_hash.py
     # Or with Alembic:
     alembic upgrade head
     ```

**Common Issues:**
- Module import errors: Check Python path is set correctly
- Port conflicts: Ensure port 8000 is available
- Database errors: Run migration scripts

---

## API Errors

### Problem: 404 Not Found for API Endpoints

**Symptoms:**
- `/api/data/info` returns 404
- `/api/strategies` returns 404
- Other API endpoints return 404
- ALL endpoints return 404 (including `/` and `/health`)

**Possible Causes:**
1. Backend service not running or crashed
2. Data file missing (prevents backend from starting)
3. Routes not registered
4. Backend deployment failed
5. Port configuration issues

**Fix Steps:**

1. **Check Backend Deployment Status:**
   - Railway Dashboard → Backend Service → Deployments
   - Latest deployment should be "Active" or "Success"
   - If "Failed": Check build logs for errors

2. **Check Backend Logs:**
   - Railway Dashboard → Backend Service → Logs tab
   - **Good Signs:**
     ```
     INFO:     Started server process [1]
     INFO:     Waiting for application startup.
     INFO:     Application startup complete.
     INFO:     Uvicorn running on http://0.0.0.0:XXXX
     ```
   - **Bad Signs:**
     - `ModuleNotFoundError` or `ImportError`
     - `FileNotFoundError` (especially data files)
     - `Database connection failed`
     - `Traceback` or `Exception`
     - No "Uvicorn running" message

3. **Check Backend Health:**
   ```bash
   curl https://your-backend-url/health
   ```
   - Should return: `{"status": "healthy", ...}`
   - If "unhealthy": See [Data File Issues](#data-file-issues)
   - If 404: Backend is not running (see above)

4. **Test API Routes Directly:**
   - Visit: `https://your-backend-url/api/data/info`
   - Should return JSON (not 404)

5. **Common Backend Startup Issues:**

   **Missing Data File:**
   - Error: `FileNotFoundError: Bitcoin Historical Data4.csv`
   - Fix: Ensure file is committed to git and pushed
   - Verify: `git ls-files | grep "Bitcoin Historical Data4.csv"`

   **Import Errors:**
   - Error: `ModuleNotFoundError: No module named 'backend'`
   - Fix: Verify `PYTHONPATH=/app` is set in Railway
   - Check Dockerfile copies backend correctly

   **Database Connection Failed:**
   - Error: `Failed to initialize database`
   - Fix: Check `DATABASE_URL` is set correctly
   - Verify PostgreSQL service is running

   **Port Configuration:**
   - Error: Port binding issues
   - Fix: Verify Railway sets `PORT` environment variable
   - Check Dockerfile uses `$PORT` correctly

---

## CORS Issues

### Problem: CORS Errors or "Provisional Headers" Warning

**Symptoms:**
- Browser console shows: `Access to XMLHttpRequest ... has been blocked by CORS policy`
- Network tab shows "Provisional headers are shown"
- Requests fail with CORS errors

**Root Cause:**
- CORS not configured correctly
- Backend not restarted after changing `CORS_ORIGINS`
- Frontend origin not in allowed origins

**Fix Steps:**

1. **Verify CORS_ORIGINS in Railway:**
   - Railway Dashboard → Backend Service → Variables
   - `CORS_ORIGINS` should be: `https://nxtgenalpha.com,https://www.nxtgenalpha.com`
   - Format: Comma-separated, no spaces around commas

2. **Restart Backend Service:**
   - **Critical:** CORS config loads at startup
   - Railway Dashboard → Backend Service → Settings → Restart
   - Wait 30-60 seconds

3. **Check Backend Logs:**
   - Should see: `CORS allowed origins: ['https://nxtgenalpha.com', ...]`

4. **Test CORS Preflight:**
   ```bash
   curl -H "Origin: https://nxtgenalpha.com" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        https://web-production-776f1.up.railway.app/api/auth/me \
        -v
   ```
   Should see `Access-Control-Allow-Origin` header

**Common Mistakes:**
- ❌ `CORS_ORIGINS=https://nxtgenalpha.com https://www.nxtgenalpha.com` (spaces instead of commas)
- ✅ `CORS_ORIGINS=https://nxtgenalpha.com,https://www.nxtgenalpha.com`

---

## Data File Issues

### Problem: Backend Health Check Fails - Data File Not Found

**Error:**
```json
{"status":"unhealthy","error":"Data file not found: /app/backend/core/../data/Bitcoin Historical Data4.csv"}
```

**Root Cause:**
- Data file not committed to git
- Railway builds from git, so file wasn't included in deployment

**Fix:**

1. **Verify File is in Git:**
   ```bash
   git ls-files | grep "Bitcoin Historical Data4.csv"
   ```
   Should output: `backend/data/Bitcoin Historical Data4.csv`

2. **If Not in Git:**
   ```bash
   git add backend/data/Bitcoin\ Historical\ Data4.csv
   git commit -m "Add Bitcoin data file"
   git push origin main
   ```

3. **Wait for Railway Redeploy:**
   - Railway will auto-redeploy (3-5 minutes)
   - Check health endpoint again

4. **Verify:**
   ```bash
   curl https://web-production-776f1.up.railway.app/health
   ```
   Should return: `{"status": "healthy", ...}`

---

## OAuth Configuration

### Problem: redirect_uri_mismatch Error

**Error:**
```
Error 400: redirect_uri_mismatch
```

**Root Cause:**
- Redirect URI in Google Cloud Console doesn't match what backend sends

**Fix Steps:**

1. **Verify BACKEND_URL in Railway:**
   - Railway Dashboard → Backend Service → Variables
   - `BACKEND_URL` should be: `https://web-production-776f1.up.railway.app`

2. **Update Google Cloud Console:**
   - Go to: https://console.cloud.google.com
   - APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Under "Authorized redirect URIs", add:
     ```
     https://web-production-776f1.up.railway.app/api/auth/google/callback
     ```
   - **Must match exactly:** Protocol, domain, path, no trailing slash
   - Save and wait 1-2 minutes

3. **Test:**
   - Visit: `https://nxtgenalpha.com`
   - Click "Sign in with Google"
   - Should redirect to Google (not error page)

**Common Mistakes:**
- ❌ `http://...` (missing 's')
- ❌ `.../callback/` (trailing slash)
- ❌ Wrong domain
- ✅ `https://web-production-776f1.up.railway.app/api/auth/google/callback`

---

## Mixed Content Warnings

### Problem: Mixed Content - HTTP Request Blocked on HTTPS Page

**Error:**
```
Mixed Content: The page at 'https://nxtgenalpha.com/' was loaded over HTTPS, 
but requested an insecure XMLHttpRequest endpoint 'http://web-production-776f1.up.railway.app/...'
```

**Root Cause:**
- `VITE_API_URL` set to HTTP instead of HTTPS
- Old cached frontend build

**Fix:**

1. **Check VITE_API_URL:**
   - Railway Dashboard → Frontend Service → Variables
   - Must be: `https://web-production-776f1.up.railway.app` (with 's')
   - NOT: `http://web-production-776f1.up.railway.app`

2. **If Wrong, Fix It:**
   - Edit `VITE_API_URL`
   - Change to HTTPS
   - Save

3. **Wait for Frontend Redeploy:**
   - Frontend will auto-redeploy (3-7 minutes)
   - Check Railway Dashboard → Frontend Service → Deployments

4. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or use incognito window

**Verification:**
- Network tab → All API requests should use `https://`
- No mixed content warnings in console

---

## General Diagnostics

### Quick Diagnostic Steps

1. **Check Browser Console:**
   - Open DevTools (F12) → Console
   - Look for specific error messages
   - Note exact error text

2. **Check Network Tab:**
   - DevTools → Network
   - Find failing requests
   - Check status codes and error messages
   - Check Request Headers (Authorization, etc.)
   - Check Response content

3. **Check Token Storage:**
   ```javascript
   // In browser console
   localStorage.getItem('auth_token')
   ```
   - Should return JWT token (not null)

4. **Test Backend Directly:**
   ```bash
   # Health check
   curl https://web-production-776f1.up.railway.app/health
   
   # Auth endpoint (should redirect)
   curl -I https://web-production-776f1.up.railway.app/api/auth/google/login
   
   # Current user (without auth)
   curl https://web-production-776f1.up.railway.app/api/auth/me
   ```

5. **Check Railway Logs:**
   - Backend Service → Logs
   - Look for errors, CORS config, startup messages
   - Frontend Service → Logs
   - Look for build errors

### Expected Authentication Flow

1. User clicks "Sign in with Google"
2. Redirects to Google OAuth
3. User signs in
4. Google redirects to: `{BACKEND_URL}/api/auth/google/callback?code=...`
5. Backend processes OAuth, creates JWT token
6. Backend redirects to: `{FRONTEND_URL}/?token=<jwt-token>`
7. Frontend reads token from URL
8. Frontend stores token in localStorage
9. Frontend removes token from URL
10. Frontend calls `/api/auth/me` with `Authorization: Bearer <token>`
11. Backend returns user data
12. Frontend displays user profile

**If any step fails, that's where the issue is.**

### Railway Environment Variables Checklist

**Backend Service:**
- `ENVIRONMENT=production`
- `COOKIE_SECURE=true`
- `FRONTEND_URL=https://nxtgenalpha.com`
- `CORS_ORIGINS=https://nxtgenalpha.com,https://www.nxtgenalpha.com`
- `BACKEND_URL=https://web-production-776f1.up.railway.app`
- `GOOGLE_CLIENT_ID` (set)
- `GOOGLE_CLIENT_SECRET` (set)
- `JWT_SECRET_KEY` (set)

**Frontend Service:**
- `VITE_API_URL=https://web-production-776f1.up.railway.app` (HTTPS)

**Important:** Always restart backend after changing environment variables.

### Quick Reference

**Railway Dashboard:** https://railway.app  
**Backend URL:** `https://web-production-776f1.up.railway.app`  
**Frontend URL:** `https://nxtgenalpha.com`  
**Google Cloud Console:** https://console.cloud.google.com

## Frontend Issues

### Problem: Frontend Shows Backend JSON Instead of React App

**Symptoms:**
- Visiting frontend URL shows backend API response
- JSON data instead of HTML
- Domain routing issue

**Root Cause:**
- Domain attached to wrong service (Backend instead of Frontend)
- Frontend service not running

**Fix Steps:**

1. **Check Domain Attachment:**
   - Railway → Frontend → Settings → Networking
   - Ensure frontend has public domain
   - Railway → Backend → Settings → Networking
   - Ensure backend domain is DIFFERENT from frontend

2. **Test Railway URLs Directly:**
   - Frontend Railway URL: `https://frontend-production-xxxx.up.railway.app`
   - Backend Railway URL: `https://backend-production-xxxx.up.railway.app`
   - They should be different!

3. **Verify Frontend Service:**
   - Railway → Frontend Service → Deployments
   - Status should be "Active" or "Success"
   - Check logs show nginx running (not uvicorn)

### Problem: Frontend Shows Blank White Page

**Symptoms:**
- Page loads but shows blank white screen
- No errors in Railway logs
- Browser console shows JavaScript errors

**Fix Steps:**

1. **Open Browser DevTools (F12):**
   - Console tab - Look for errors:
     - `Uncaught ReferenceError`
     - `Failed to load resource`
     - `Mixed Content` errors

2. **Check Network Tab:**
   - Verify files are loading:
     - `index.html` should load
     - `index-xxxxx.js` should load
     - `index-xxxxx.css` should load

3. **Check Build:**
   - Railway → Frontend → Deployments → Latest → Build Logs
   - Look for `npm run build` completion
   - Verify `dist/` directory was created

4. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or use incognito window

### Problem: Frontend Build Failed

**Symptoms:**
- Frontend deployment shows "Failed"
- Build logs show errors

**Common Causes:**

1. **TypeScript Compilation Errors:**
   - Fix: Resolve all TypeScript errors
   - Check build logs for specific error messages

2. **Missing Dependencies:**
   - Fix: Ensure `package.json` dependencies are correct
   - Verify `npm install` completes successfully

3. **Build Timeout:**
   - Fix: Check build logs for timeout
   - May need to optimize build process

### Problem: Frontend Can't Connect to Backend

**Symptoms:**
- Frontend loads but API calls fail
- Console shows: `API URL is HTTP but page is HTTPS`
- Network requests fail

**Fix Steps:**

1. **Check VITE_API_URL:**
   - Railway → Frontend → Variables tab
   - Must be HTTPS (not HTTP)
   - Must match backend URL
   - No trailing slash

2. **Verify Backend is Running:**
   - Check backend health endpoint
   - Verify backend service is active

3. **Check CORS Configuration:**
   - See [CORS Issues](#cors-issues) section

## Backend Startup Issues

### Problem: Backend Crashes on Startup

**Common Errors:**

1. **Missing Data File:**
   ```
   FileNotFoundError: Bitcoin Historical Data4.csv
   ```
   - Fix: Ensure file is in git repository
   - Verify: `git ls-files | grep "Bitcoin Historical Data4.csv"`

2. **Import Errors:**
   ```
   ModuleNotFoundError: No module named 'backend'
   ```
   - Fix: Verify `PYTHONPATH=/app` is set
   - Check Dockerfile copies backend correctly

3. **Database Connection Failed:**
   ```
   Failed to initialize database
   ```
   - Fix: Check `DATABASE_URL` format
   - Verify PostgreSQL service is running

4. **Port Binding Errors:**
   ```
   Address already in use
   ```
   - Fix: Railway handles ports automatically
   - Verify Dockerfile uses `$PORT` correctly

**Related Documentation:**
- `RAILWAY_DEPLOYMENT.md` - Railway deployment guide with troubleshooting
- `GOOGLE_OAUTH_SETUP.md` - OAuth setup guide

