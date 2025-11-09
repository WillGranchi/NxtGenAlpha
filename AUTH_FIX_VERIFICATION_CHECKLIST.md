# Authentication Fix Verification Checklist

This checklist verifies that the authentication persistence fix is properly configured and working after deployment.

**Related Documentation:**
- `FIX_AUTH_PERSISTENCE.md` - Details about the fix and how it works
- `FIX_REDIRECT_URI_MISMATCH.md` - OAuth redirect URI configuration

---

## Part 1: Code Deployment Verification

### Frontend Code Changes

- [ ] **File exists:** `frontend/src/services/api.ts`
- [ ] **Authorization header code present:**
  - Open `frontend/src/services/api.ts`
  - Search for: `localStorage.getItem('auth_token')`
  - Should see code that adds `Authorization: Bearer {token}` header
  - Code should be in the request interceptor (around line 27-32)
- [ ] **Frontend deployed:**
  - Railway Dashboard → Frontend Service → Deployments
  - Latest deployment timestamp is recent (after code changes)
  - Deployment status is "Deployed" (green)

### Backend Code Changes

- [ ] **File exists:** `backend/api/routes/auth.py`
- [ ] **Cookie SameSite code present:**
  - Open `backend/api/routes/auth.py`
  - Search for: `cookie_samesite = "none"`
  - Should see logic that sets `SameSite=None` when `cookie_secure=True`
  - Code should be around line 153-161
- [ ] **Backend deployed:**
  - Railway Dashboard → Backend Service → Deployments
  - Latest deployment timestamp is recent (after code changes)
  - Deployment status is "Deployed" (green)

---

## Part 2: Railway Environment Variables Verification

### Backend Service Variables

Go to: **Railway Dashboard → Backend Service → Variables**

#### Critical Variables (Required for Fix)

- [ ] **ENVIRONMENT**
  - Value: `production`
  - **Why:** Enables secure cookie settings and SameSite=None logic
  - **If missing:** Add it, then restart backend service

- [ ] **COOKIE_SECURE**
  - Value: `true`
  - **Why:** Required for SameSite=None to work (must be HTTPS)
  - **If missing:** Add it, then restart backend service

- [ ] **FRONTEND_URL**
  - Value: `https://nxtgenalpha.com` (or your actual frontend domain)
  - **Why:** Used for redirect after OAuth login
  - **If missing/wrong:** Update it, then restart backend service

- [ ] **CORS_ORIGINS**
  - Value: Should include your frontend domain (e.g., `https://nxtgenalpha.com`)
  - **Why:** Allows frontend to make API requests
  - **If missing/wrong:** Update it, then restart backend service

#### Other Required Variables

- [ ] **GOOGLE_CLIENT_ID** - Set and valid
- [ ] **GOOGLE_CLIENT_SECRET** - Set and valid (marked as Secret)
- [ ] **BACKEND_URL** - Set to backend URL
- [ ] **JWT_SECRET_KEY** - Set (marked as Secret)

### Backend Service Restart

- [ ] **Restarted backend service** after setting/updating environment variables
  - Railway Dashboard → Backend Service → Settings → Restart
  - Waited 30-60 seconds for restart to complete
  - Checked logs to confirm service restarted successfully

---

## Part 3: Browser-Based Testing

### Step 1: Initial Login Test

1. [ ] **Visit frontend:**
   - Go to: `https://nxtgenalpha.com` (or your frontend URL)
   - Open browser DevTools (F12)

2. [ ] **Clear previous session:**
   - Open Console tab
   - Run: `localStorage.clear()`
   - Refresh page

3. [ ] **Initiate login:**
   - Click "Sign in with Google" button
   - Complete Google sign-in
   - Should redirect back to your site

4. [ ] **Check URL after redirect:**
   - URL should have `?token=...` parameter (briefly)
   - Frontend should remove token from URL automatically
   - If token stays in URL, frontend code may not be deployed

### Step 2: Verify Token Storage

1. [ ] **Check localStorage:**
   - Open Console tab
   - Run: `localStorage.getItem('auth_token')`
   - Should return a JWT token string (not null)
   - If null, token wasn't stored from URL parameter

2. [ ] **Check cookies:**
   - Open DevTools → Application tab → Cookies
   - Look for cookie named `token`
   - Should exist if cookie was set successfully
   - Note: Cookie may not appear if cross-site redirect blocked it

### Step 3: Verify Authorization Header

1. [ ] **Open Network tab:**
   - DevTools → Network tab
   - Filter by: `api` or `auth`
   - Look for request to `/api/auth/me`

2. [ ] **Check request headers:**
   - Click on `/api/auth/me` request
   - Go to "Headers" tab
   - Under "Request Headers", look for:
     - `Authorization: Bearer <token>` ✅ **This should exist**
     - `Cookie: token=<token>` (may or may not exist)

3. [ ] **Verify response:**
   - Response status should be `200 OK`
   - Response body should contain user data:
     ```json
     {
       "authenticated": true,
       "user": { ... }
     }
     ```

### Step 4: Verify User is Logged In

1. [ ] **Check UI:**
   - User profile/name should be visible
   - "Sign in" button should be replaced with user menu/logout
   - No "Please sign in" messages

2. [ ] **Check console logs:**
   - Should see: `[API] GET https://.../api/auth/me`
   - Should see: `[API] Base URL: ...`
   - No authentication errors

### Step 5: Verify Persistence (Critical Test)

1. [ ] **Refresh the page:**
   - Press `F5` or `Ctrl+R` (Windows) / `Cmd+R` (Mac)
   - User should **still be logged in**
   - This is the main test for the fix

2. [ ] **Check Network tab after refresh:**
   - Should see new request to `/api/auth/me`
   - Request should have `Authorization: Bearer <token>` header
   - Response should return user data (200 OK)

3. [ ] **Check console after refresh:**
   - Should see successful API calls
   - No authentication errors
   - User should remain logged in

4. [ ] **Close and reopen browser:**
   - Close browser tab/window
   - Reopen and visit `https://nxtgenalpha.com`
   - User should still be logged in (token persists in localStorage)

---

## Part 4: Troubleshooting Verification

### If User Still Not Logged In After Fix

#### Check 1: Environment Variables

- [ ] Verified `ENVIRONMENT=production` in Railway
- [ ] Verified `COOKIE_SECURE=true` in Railway
- [ ] Verified `FRONTEND_URL` is set correctly
- [ ] Verified `CORS_ORIGINS` includes frontend domain
- [ ] Backend service restarted after changes

#### Check 2: Code Deployment

- [ ] Frontend code changes are deployed (check deployment timestamp)
- [ ] Backend code changes are deployed (check deployment timestamp)
- [ ] Hard refreshed browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)
- [ ] Tried incognito/private window

#### Check 3: Browser Console

- [ ] Open DevTools → Console
- [ ] Look for errors when calling `/api/auth/me`
- [ ] Check if token exists: `localStorage.getItem('auth_token')`
- [ ] If token is null, login flow didn't complete properly

#### Check 4: Network Tab

- [ ] Open DevTools → Network
- [ ] Find request to `/api/auth/me`
- [ ] Check Request Headers:
  - [ ] `Authorization: Bearer ...` header exists ✅
  - [ ] If missing, frontend code may not be deployed
- [ ] Check Response:
  - [ ] Status is `200 OK` ✅
  - [ ] Response contains user data ✅
  - [ ] If 401, token is invalid or expired

#### Check 5: CORS Issues

- [ ] If CORS errors appear, verify `CORS_ORIGINS` in Railway
- [ ] Should include: `https://nxtgenalpha.com` (or your domain)
- [ ] Backend restarted after CORS changes

#### Check 6: Token in URL

- [ ] After OAuth redirect, check if URL has `?token=...`
- [ ] If yes, frontend should store it and remove from URL
- [ ] If no token in URL, backend might not be redirecting correctly
- [ ] Check backend logs for OAuth callback errors

---

## Part 5: Expected Behavior Summary

### ✅ Success Indicators

After the fix is properly deployed and configured:

1. **Login Flow:**
   - User clicks "Sign in with Google"
   - Redirects to Google, signs in
   - Redirects back to site with `?token=...` in URL
   - Token is stored in localStorage
   - Token is removed from URL
   - User is logged in and sees profile

2. **API Requests:**
   - All API requests include `Authorization: Bearer <token>` header
   - Backend authenticates user successfully
   - User data is returned

3. **Persistence:**
   - User stays logged in after page refresh
   - User stays logged in after closing/reopening browser
   - Token persists in localStorage

### ❌ Failure Indicators

If any of these occur, the fix is not working:

1. User appears logged in initially but loses authentication on refresh
2. `Authorization` header is missing from API requests
3. Token is not stored in localStorage after OAuth redirect
4. `/api/auth/me` returns 401 Unauthorized
5. Console shows authentication errors

---

## Quick Verification Commands

### Browser Console Commands

Run these in browser console (F12 → Console) to quickly verify:

```javascript
// Check if token is stored
localStorage.getItem('auth_token')

// Check current user API call
fetch('https://web-production-776f1.up.railway.app/api/auth/me', {
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
}).then(r => r.json()).then(console.log)

// Check if Authorization header is being sent
// (Open Network tab and check request headers instead)
```

### Railway Verification

1. **Check Backend Logs:**
   - Railway Dashboard → Backend Service → Logs
   - Look for OAuth-related errors
   - Look for authentication errors

2. **Check Environment Variables:**
   - Railway Dashboard → Backend Service → Variables
   - Verify all required variables are set
   - Check values are correct (no typos)

---

## Final Checklist

Before marking as complete, verify:

- [ ] All code changes are deployed (frontend and backend)
- [ ] All Railway environment variables are set correctly
- [ ] Backend service has been restarted after variable changes
- [ ] Login flow works end-to-end
- [ ] User stays logged in after page refresh ✅ **Critical test**
- [ ] Authorization header is sent in API requests
- [ ] No authentication errors in console or logs
- [ ] User can access protected features while logged in

---

## Success Criteria

**The fix is working correctly when:**

✅ User can log in with Google OAuth  
✅ Token is stored in localStorage  
✅ Authorization header is sent with API requests  
✅ User stays logged in after page refresh  
✅ User stays logged in after closing/reopening browser  
✅ No authentication errors in console or logs  

**If all criteria are met, the authentication persistence fix is working!** 🎉

---

## Next Steps After Verification

Once verified:

1. Document any issues found during verification
2. Update environment variables if needed
3. Monitor logs for any authentication-related errors
4. Test with multiple users if possible
5. Consider adding automated tests for authentication flow

---

## Reference

- **Backend URL:** `https://web-production-776f1.up.railway.app`
- **Frontend URL:** `https://nxtgenalpha.com`
- **Railway Dashboard:** https://railway.app
- **Fix Documentation:** `FIX_AUTH_PERSISTENCE.md`

