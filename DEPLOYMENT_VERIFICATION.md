# Deployment Verification Guide

Complete step-by-step verification checklist for ensuring your Trading Platform is properly deployed and configured.

## Quick Reference

**Railway Dashboard:** https://railway.app  
**Backend URL:** `https://web-production-776f1.up.railway.app`  
**Frontend URL:** `https://nxtgenalpha.com`  
**Google Cloud Console:** https://console.cloud.google.com

---

## Step 1: Verify VITE_API_URL

### Overview

The `VITE_API_URL` environment variable is **baked into the frontend build** at build time. After changing it, the frontend **must be rebuilt** (3-7 minutes).

### Railway Configuration

1. **Access Railway Dashboard:**
   - Go to: https://railway.app
   - Select your project
   - Find the **Frontend** service

2. **Check Variables:**
   - Frontend Service → **Variables** tab
   - Look for: `VITE_API_URL`
   - **Must be:** `https://web-production-776f1.up.railway.app` (HTTPS, not HTTP)

3. **If Missing or Wrong:**
   - Click "New Variable" or edit existing
   - **Name:** `VITE_API_URL`
   - **Value:** `https://web-production-776f1.up.railway.app`
   - **Important:** No quotes around the value
   - Click **Save**

### Deployment Verification

- [ ] Variable is set correctly
- [ ] Frontend service shows new deployment starting
- [ ] Wait 3-7 minutes for deployment
- [ ] Latest deployment status is "Deployed" (green)
- [ ] Deployment timestamp is after variable change

### Browser Verification

1. **Visit:** `https://nxtgenalpha.com`
2. **Open DevTools (F12) → Console**
3. **Check API Logs:**
   - Look for: `[API] Base URL: https://web-production-776f1.up.railway.app`
   - Should NOT see: `http://` or `DEFAULT`

4. **Check Network Tab:**
   - Open **Network** tab
   - Filter by `api`
   - All requests should go to: `https://web-production-776f1.up.railway.app/api/...`
   - All should use `https://` (not `http://`)

5. **Hard Refresh:**
   - `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or use incognito window

**Expected Result:**
- Console shows correct API URL
- Network requests use HTTPS
- No mixed content warnings

---

## Step 2: Verify CORS Configuration

### Overview

CORS allows your frontend to make requests to your backend. Without proper configuration, the browser will block API requests.

### Railway Configuration

1. **Access Railway Dashboard:**
   - Backend Service → **Variables** tab

2. **Check CORS_ORIGINS:**
   - Look for: `CORS_ORIGINS`
   - **Should be:** `https://nxtgenalpha.com,https://www.nxtgenalpha.com`
   - **Format:** Comma-separated, no spaces around commas

3. **Check FRONTEND_URL:**
   - Look for: `FRONTEND_URL`
   - **Should be:** `https://nxtgenalpha.com`

4. **If Missing or Wrong:**
   - Add/edit the variable
   - Save changes

### Backend Restart (Critical)

- [ ] **Restart backend service** after setting/changing CORS variables
- [ ] Railway Dashboard → Backend Service → **Settings** → **Restart**
- [ ] Wait 30-60 seconds for restart
- [ ] Check logs to confirm it started

**Why:** CORS configuration loads at startup. Changes require a restart.

### Backend Logs Verification

- [ ] Check Railway Dashboard → Backend Service → **Logs**
- [ ] Should see: `CORS allowed origins: ['https://nxtgenalpha.com', 'https://www.nxtgenalpha.com']`
- [ ] No CORS-related errors

### Browser Verification

1. **Visit:** `https://nxtgenalpha.com`
2. **Open DevTools → Console**
3. **Check for CORS Errors:**
   - Should NOT see: `Access to XMLHttpRequest ... has been blocked by CORS policy`
   - API requests should succeed

4. **Test CORS Preflight (Optional):**
   ```bash
   curl -H "Origin: https://nxtgenalpha.com" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        https://web-production-776f1.up.railway.app/api/auth/me \
        -v
   ```
   Should see `Access-Control-Allow-Origin` header

**Expected Result:**
- No CORS errors in console
- API requests succeed
- Backend logs show correct CORS origins

---

## Step 3: Verify Google OAuth Configuration

### Overview

Google OAuth requires configuration in both Railway and Google Cloud Console.

### Part A: Railway Configuration

**Backend Service → Variables:**

#### Required Variables:

- [ ] **GOOGLE_CLIENT_ID**
  - Value: Your Google OAuth Client ID
  - Format: `123456789-abc...apps.googleusercontent.com`

- [ ] **GOOGLE_CLIENT_SECRET**
  - Value: Your Google OAuth Client Secret
  - Format: `GOCSPX-...`
  - **Mark as Secret** (click eye icon)

- [ ] **BACKEND_URL**
  - Value: `https://web-production-776f1.up.railway.app`

- [ ] **ENVIRONMENT**
  - Value: `production`

- [ ] **COOKIE_SECURE**
  - Value: `true`

- [ ] **FRONTEND_URL**
  - Value: `https://nxtgenalpha.com`

#### After Setting Variables:

- [ ] **Restart backend service**
- [ ] Wait 30-60 seconds
- [ ] Check logs for errors

### Part B: Google Cloud Console Configuration

1. **Access Google Cloud Console:**
   - Go to: https://console.cloud.google.com
   - Sign in and select your project

2. **Navigate to OAuth Credentials:**
   - APIs & Services → **Credentials**
   - Find your OAuth 2.0 Client ID

3. **Configure Authorized JavaScript Origins:**
   - Click on your OAuth client to edit
   - Under "Authorized JavaScript origins", add:
     - `https://web-production-776f1.up.railway.app`
     - `https://nxtgenalpha.com`
     - `https://www.nxtgenalpha.com`

4. **Configure Authorized Redirect URIs:**
   - Under "Authorized redirect URIs", add:
     - `https://web-production-776f1.up.railway.app/api/auth/google/callback`
   - **Must match exactly:**
     - ✅ Protocol: `https://` (not `http://`)
     - ✅ Domain: `web-production-776f1.up.railway.app`
     - ✅ Path: `/api/auth/google/callback`
     - ✅ No trailing slash

5. **Save Changes:**
   - Click **Save**
   - Wait 1-2 minutes for changes to propagate

### Verification

- [ ] All Railway variables are set
- [ ] Backend service restarted
- [ ] Google Cloud Console configured
- [ ] Redirect URI matches exactly
- [ ] Test OAuth login flow

**Test OAuth Flow:**
1. Visit: `https://nxtgenalpha.com`
2. Click "Sign in with Google"
3. Should redirect to Google sign-in (not error page)
4. After signing in, should redirect back to site
5. User should be logged in

---

## Step 4: Test API Endpoints

### Backend Health Check

```bash
curl https://web-production-776f1.up.railway.app/health
```

**Expected:**
```json
{
  "status": "healthy",
  "data_records": <number>,
  "api_version": "1.0.0"
}
```

### API Endpoints

```bash
# Test data info endpoint
curl https://web-production-776f1.up.railway.app/api/data/info

# Test strategies endpoint
curl https://web-production-776f1.up.railway.app/api/strategies

# Test auth endpoint (should redirect)
curl -I https://web-production-776f1.up.railway.app/api/auth/google/login
```

**Expected:**
- All endpoints return JSON (not 404)
- Health check returns "healthy"
- Auth endpoint redirects (302/307)

### Frontend Browser Test

1. **Visit:** `https://nxtgenalpha.com`
2. **Open DevTools (F12) → Console**
3. **Check for Errors:**
   - Should NOT see 404 errors
   - Should NOT see CORS errors
   - Should NOT see mixed content warnings
   - Should see successful API calls

4. **Check Network Tab:**
   - Filter by `api`
   - All requests should be `200 OK`
   - All should use `https://`

---

## Step 5: Verify Authentication

### Code Deployment Verification

#### Frontend:
- [ ] `frontend/src/services/api.ts` has Authorization header code
- [ ] Frontend deployed (check Railway deployments)
- [ ] Latest deployment is after code changes

#### Backend:
- [ ] `backend/api/routes/auth.py` has SameSite=None cookie logic
- [ ] Backend deployed (check Railway deployments)
- [ ] Latest deployment is after code changes

### Authentication Flow Test

1. **Clear Previous Session:**
   ```javascript
   // In browser console
   localStorage.clear()
   ```

2. **Sign In:**
   - Click "Sign in with Google"
   - Complete Google sign-in
   - Should redirect back to site

3. **Check Token:**
   ```javascript
   // In browser console
   localStorage.getItem('auth_token')
   ```
   - Should return JWT token (not null)

4. **Check Network Tab:**
   - Find `/api/auth/me` request
   - Request Headers should have: `Authorization: Bearer <token>`
   - Response should be `200 OK` with user data

5. **Verify Profile:**
   - User profile/name should be visible
   - "Sign in" button should be replaced with user menu

6. **Test Persistence:**
   - Refresh the page
   - User should still be logged in
   - Check console - should see successful `/api/auth/me` call

**Expected Result:**
- User can sign in
- Token is stored
- Authorization header is sent
- User stays logged in after refresh

---

## Complete Verification Checklist

### Railway Configuration

**Frontend Service:**
- [ ] `VITE_API_URL=https://web-production-776f1.up.railway.app` (HTTPS)
- [ ] Frontend deployed successfully

**Backend Service:**
- [ ] `ENVIRONMENT=production`
- [ ] `COOKIE_SECURE=true`
- [ ] `FRONTEND_URL=https://nxtgenalpha.com`
- [ ] `CORS_ORIGINS=https://nxtgenalpha.com,https://www.nxtgenalpha.com`
- [ ] `BACKEND_URL=https://web-production-776f1.up.railway.app`
- [ ] `GOOGLE_CLIENT_ID` is set
- [ ] `GOOGLE_CLIENT_SECRET` is set (marked as Secret)
- [ ] `JWT_SECRET_KEY` is set (marked as Secret)
- [ ] Backend deployed successfully
- [ ] Backend restarted after variable changes

### Google Cloud Console

- [ ] OAuth 2.0 Client ID exists
- [ ] Authorized JavaScript origins include:
  - [ ] `https://web-production-776f1.up.railway.app`
  - [ ] `https://nxtgenalpha.com`
  - [ ] `https://www.nxtgenalpha.com`
- [ ] Authorized redirect URIs include:
  - [ ] `https://web-production-776f1.up.railway.app/api/auth/google/callback`
- [ ] Changes saved

### Functionality Tests

- [ ] Backend health check returns "healthy"
- [ ] `/api/data/info` returns JSON (200 OK)
- [ ] `/api/strategies` returns JSON (200 OK)
- [ ] OAuth login redirects to Google
- [ ] After sign-in, redirects back to site
- [ ] User is logged in and profile shows
- [ ] User stays logged in after refresh
- [ ] No errors in browser console
- [ ] No errors in Railway logs

---

## Troubleshooting

If verification fails, see `TROUBLESHOOTING.md` for detailed solutions to common issues.

### Common Issues

1. **404 Errors:** Check backend is running and data file exists
2. **CORS Errors:** Verify `CORS_ORIGINS` and restart backend
3. **Mixed Content:** Ensure `VITE_API_URL` uses HTTPS
4. **Auth Not Persisting:** Check environment variables and code deployment
5. **OAuth Errors:** Verify Google Cloud Console configuration

---

## Next Steps

After completing verification:

1. Monitor Railway logs for any errors
2. Test with multiple users if possible
3. Document any custom configurations
4. Set up monitoring/alerts if needed

**Related Documentation:**
- `TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `RAILWAY_DEPLOYMENT.md` - Railway deployment guide
- `GOOGLE_OAUTH_SETUP.md` - OAuth setup guide

