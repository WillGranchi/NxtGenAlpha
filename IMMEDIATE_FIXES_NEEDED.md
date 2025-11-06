# Immediate Fixes Needed - API Routing and Google OAuth

## ✅ Completed Fixes

1. **BACKEND_URL Set** ✅
   - Set to: `https://web-production-776f1.up.railway.app`
   - This fixes Google OAuth redirect URI construction

## 🔴 Critical Fixes Needed

### Fix 1: Set VITE_API_URL in Frontend Service

**Why:** Frontend is trying to call API on `nxtgenalpha.com` but that serves static files, not the backend API.

**Action Steps:**

1. **Railway Dashboard:** https://railway.app
2. **Select Project:** comfortable-imagination
3. **Find Frontend Service** (look for service with `nxtgenalpha.com` domain attached)
4. **Go to:** Frontend Service → Variables tab
5. **Find or Add:** `VITE_API_URL`
6. **Set Value to:**
   ```
   https://web-production-776f1.up.railway.app
   ```
7. **Save** - Railway will automatically rebuild frontend (2-3 minutes)

**How to Verify:**
- After redeploy, check browser console (F12)
- Network tab → Look for request to `/api/backtest/indicators`
- Should show URL: `https://web-production-776f1.up.railway.app/api/backtest/indicators`
- NOT: `https://nxtgenalpha.com/api/backtest/indicators`

### Fix 2: Update Google Cloud Console Redirect URIs

**Why:** Google OAuth redirect URI must match exactly what backend expects.

**Current Redirect URI (from BACKEND_URL):**
```
https://web-production-776f1.up.railway.app/api/auth/google/callback
```

**Action Steps:**

1. **Go to:** https://console.cloud.google.com
2. **Navigate:** APIs & Services → Credentials
3. **Open:** Your OAuth 2.0 Client ID
4. **Authorized JavaScript origins**, click "+ ADD URI":
   - `https://nxtgenalpha.com`
   - `https://web-production-776f1.up.railway.app`
5. **Authorized redirect URIs**, click "+ ADD URI":
   - `https://web-production-776f1.up.railway.app/api/auth/google/callback`
6. **Click Save**

**Important:** The redirect URI must match EXACTLY:
- ✅ Correct: `https://web-production-776f1.up.railway.app/api/auth/google/callback`
- ❌ Wrong: `http://web-production-776f1.up.railway.app/api/auth/google/callback` (missing s in https)
- ❌ Wrong: `https://web-production-776f1.up.railway.app/api/auth/google/callback/` (trailing slash)

## Verification After Fixes

### Test 1: Indicators Should Load

1. Visit: `https://nxtgenalpha.com`
2. Open browser console (F12)
3. Check Network tab for API calls
4. Should see successful request to: `https://web-production-776f1.up.railway.app/api/backtest/indicators`
5. Indicators catalog should display

### Test 2: Google Sign-In Should Work

1. Click "Sign in with Google" button
2. Should redirect to Google login page
3. After authentication, should redirect back to site
4. User should be logged in

### Test 3: Check Backend Logs

**Railway Dashboard → Backend Service → Logs:**

Should see:
- ✅ No "Google OAuth not configured" errors
- ✅ Successful OAuth callback processing
- ✅ User creation/authentication logs

## Troubleshooting

### If Indicators Still Fail

1. **Verify frontend redeployed:**
   - Railway Dashboard → Frontend Service → Deployments
   - Latest deployment should be recent (after VITE_API_URL change)

2. **Check browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear browser cache

3. **Check browser console:**
   - Open DevTools → Console
   - Look for API errors
   - Check Network tab for failed requests

4. **Verify API URL in build:**
   - The frontend build includes VITE_API_URL at build time
   - If old build is cached, it might still use old URL
   - Force rebuild by changing any variable or redeploying

### If Google Sign-In Still Fails

1. **Check backend logs:**
   - Railway Dashboard → Backend Service → Logs
   - Look for OAuth errors or redirect URI mismatch

2. **Verify redirect URI matches:**
   - Backend constructs: `{BACKEND_URL}/api/auth/google/callback`
   - With BACKEND_URL set, this should be: `https://web-production-776f1.up.railway.app/api/auth/google/callback`
   - This must match exactly in Google Cloud Console

3. **Test OAuth endpoint:**
   ```bash
   curl -I https://web-production-776f1.up.railway.app/api/auth/google/login
   ```
   - Should redirect to Google (302 redirect)
   - If 503 error, check backend logs for OAuth configuration errors

## Summary

**Two manual actions needed:**
1. ✅ Set `VITE_API_URL` in Railway frontend service
2. ✅ Update Google Cloud Console redirect URIs

**After these fixes:**
- Indicators will load ✅
- Google sign-in will work ✅

