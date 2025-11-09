# Fix: Authentication Not Persisting After Login

## Problem
After successfully logging in with Google OAuth, the user is redirected back but appears as not logged in. The login works, but authentication doesn't persist.

## Root Causes

1. **Cookie SameSite Issue**: When redirecting from Google OAuth (cross-site redirect), cookies with `SameSite=lax` may not be sent properly
2. **Frontend Not Sending Token**: The frontend stored the token in localStorage but wasn't sending it in the Authorization header
3. **Cookie vs Header**: Backend checks cookies first, then Authorization header, but if cookies fail, the header wasn't being sent

## Fixes Applied

### 1. Frontend: Added Authorization Header (✅ Fixed)

**File:** `frontend/src/services/api.ts`

Added code to automatically send the token from localStorage in the Authorization header for all API requests:

```typescript
// Add token from localStorage to Authorization header as fallback
const token = localStorage.getItem('auth_token');
if (token && !config.headers.Authorization) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

**Why:** This ensures the backend can authenticate the user even if cookies fail to be sent.

### 2. Backend: Fixed Cookie SameSite Settings (✅ Fixed)

**File:** `backend/api/routes/auth.py`

Updated cookie settings to use `SameSite=None` with `Secure=True` for cross-site OAuth redirects:

```python
# For cross-site redirects (OAuth flow), use SameSite=None with Secure
if cookie_secure:
    cookie_samesite = "none"
elif environment == "production":
    cookie_secure = True
    cookie_samesite = "none"
```

**Why:** `SameSite=None` with `Secure=True` allows cookies to be sent during cross-site redirects (from Google back to your site).

## Required Railway Environment Variables

Make sure these are set in Railway **Backend** service:

### Critical Variables:

1. **ENVIRONMENT**
   - Value: `production`
   - This ensures `cookie_secure=True` and `cookie_samesite="none"`

2. **COOKIE_SECURE**
   - Value: `true`
   - Required for `SameSite=None` to work

3. **FRONTEND_URL**
   - Value: `https://nxtgenalpha.com` (or your frontend domain)
   - Used for redirect after OAuth

4. **CORS_ORIGINS**
   - Value: `https://nxtgenalpha.com` (or your frontend domain)
   - Must include your frontend domain

### Verify in Railway:

1. Go to: Railway Dashboard → **Backend** Service → **Variables**
2. Check these are set:
   ```
   ENVIRONMENT=production
   COOKIE_SECURE=true
   FRONTEND_URL=https://nxtgenalpha.com
   CORS_ORIGINS=https://nxtgenalpha.com
   ```
3. If any are missing or wrong, update them
4. **Restart the backend service** after changing variables

## How It Works Now

### Login Flow:

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth
3. User signs in with Google
4. Google redirects back to: `{BACKEND_URL}/api/auth/google/callback?code=...`
5. Backend:
   - Exchanges code for user info
   - Creates JWT token
   - Sets HTTP-only cookie with `SameSite=None; Secure`
   - Redirects to: `{FRONTEND_URL}/?token={jwt_token}`
6. Frontend:
   - Reads token from URL query parameter
   - Stores in localStorage
   - Removes token from URL
   - Calls `/api/auth/me` to get user info
   - Sends token in Authorization header: `Bearer {token}`
7. Backend:
   - Checks cookie first (may work if same domain)
   - Falls back to Authorization header (always works)
   - Returns user info
8. Frontend displays user as logged in

### Subsequent Requests:

- Frontend automatically includes `Authorization: Bearer {token}` header
- Backend authenticates using cookie or header
- User stays logged in

## Testing the Fix

### Step 1: Deploy Changes

1. **Frontend:** The changes are in `frontend/src/services/api.ts`
   - Rebuild and redeploy frontend
   - Railway should auto-deploy on git push

2. **Backend:** The changes are in `backend/api/routes/auth.py`
   - Railway should auto-deploy on git push
   - Or manually trigger redeploy

### Step 2: Verify Environment Variables

1. Railway Dashboard → Backend Service → Variables
2. Ensure:
   - `ENVIRONMENT=production`
   - `COOKIE_SECURE=true`
   - `FRONTEND_URL` is set correctly
   - `CORS_ORIGINS` includes your frontend domain

### Step 3: Test Login Flow

1. Visit: `https://nxtgenalpha.com`
2. Open browser DevTools (F12) → **Console** tab
3. Click "Sign in with Google"
4. Complete Google sign-in
5. After redirect, check console:
   - Should see: `[API] GET https://.../api/auth/me`
   - Should see: `[API] Base URL: ...`
6. Check **Network** tab:
   - Request to `/api/auth/me` should have:
     - `Authorization: Bearer ...` header
     - Cookie: `token=...` (if cookie worked)
7. User should be logged in and see profile

### Step 4: Verify Persistence

1. After logging in, refresh the page
2. User should still be logged in
3. Check console - should see successful `/api/auth/me` call

## Troubleshooting

### Issue: Still not logged in after fix

**Check 1: Environment Variables**
- Verify `ENVIRONMENT=production` in Railway
- Verify `COOKIE_SECURE=true` in Railway
- Restart backend after changing variables

**Check 2: Browser Console**
- Open DevTools → Console
- Look for errors when calling `/api/auth/me`
- Check if token is in localStorage: `localStorage.getItem('auth_token')`

**Check 3: Network Tab**
- Open DevTools → Network
- Find request to `/api/auth/me`
- Check **Headers** tab:
  - Should see `Authorization: Bearer ...` in Request Headers
  - Response should be `200 OK` with user data

**Check 4: CORS**
- If you see CORS errors, verify `CORS_ORIGINS` includes your frontend domain
- Should be: `https://nxtgenalpha.com` (or your domain)

**Check 5: Token in URL**
- After OAuth redirect, check if URL has `?token=...`
- If yes, frontend should store it and remove from URL
- If no, backend might not be redirecting correctly

### Issue: Cookie not being set

**Possible causes:**
1. `COOKIE_SECURE=true` but site is HTTP (should be HTTPS)
2. `ENVIRONMENT` not set to `production`
3. Browser blocking third-party cookies

**Fix:**
- Ensure site uses HTTPS
- Set `ENVIRONMENT=production`
- Check browser settings (some browsers block third-party cookies)

### Issue: Authorization header not being sent

**Check:**
1. Open DevTools → Network
2. Find any API request
3. Check **Headers** → **Request Headers**
4. Should see `Authorization: Bearer ...`

**If missing:**
- Check if token is in localStorage: `localStorage.getItem('auth_token')`
- Check browser console for errors
- Verify frontend code was deployed

## Summary

The fix ensures authentication works in two ways:
1. **Cookie-based** (preferred, but may fail on cross-site redirects)
2. **Header-based** (fallback, always works)

Both methods are now in place, so authentication should persist after login.

**Next Steps:**
1. Deploy the code changes
2. Verify Railway environment variables
3. Test the login flow
4. Verify user stays logged in after refresh

