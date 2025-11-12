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

---

## API Errors

### Problem: 404 Not Found for API Endpoints

**Symptoms:**
- `/api/data/info` returns 404
- `/api/strategies` returns 404
- Other API endpoints return 404

**Possible Causes:**
1. Backend service not running
2. Data file missing (prevents backend from starting)
3. Routes not registered
4. Backend deployment failed

**Fix Steps:**

1. **Check Backend Health:**
   ```
   https://web-production-776f1.up.railway.app/health
   ```
   - Should return: `{"status": "healthy", ...}`
   - If "unhealthy": See [Data File Issues](#data-file-issues)

2. **Verify Backend is Running:**
   - Railway Dashboard → Backend Service → Deployments
   - Status should be "Deployed" (green)
   - Check logs for errors

3. **Test API Routes Directly:**
   - Visit: `https://web-production-776f1.up.railway.app/api/data/info`
   - Should return JSON (not 404)

4. **Check Backend Logs:**
   - Look for: `Application startup complete`
   - Look for route registration errors

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

**Related Documentation:**
- `DEPLOYMENT_VERIFICATION.md` - Step-by-step verification guide
- `RAILWAY_DEPLOYMENT.md` - Railway deployment guide
- `GOOGLE_OAUTH_SETUP.md` - OAuth setup guide

