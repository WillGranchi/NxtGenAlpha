# Current Configuration Status and Fixes Applied

## ✅ Step 1: BACKEND_URL Set (For Google OAuth)

**Status:** ✅ **COMPLETE**

Set `BACKEND_URL` in Railway backend service:
```
BACKEND_URL=https://web-production-776f1.up.railway.app
```

This ensures Google OAuth redirect URI is constructed correctly:
```
https://web-production-776f1.up.railway.app/api/auth/google/callback
```

**Action Required:** Update Google Cloud Console redirect URI to match this exact URL.

## ⚠️ Step 2: VITE_API_URL Needs to be Set

**Status:** ⚠️ **NEEDS ACTION**

Frontend service needs `VITE_API_URL` set to backend URL.

**Railway Dashboard → Frontend Service → Variables:**

Set:
```
VITE_API_URL=https://web-production-776f1.up.railway.app
```

**Important:** After setting this, Railway will rebuild the frontend (Vite environment variables are baked into build).

## ✅ Step 3: CORS Configuration Verified

**Status:** ✅ **VERIFIED**

Backend has:
```
CORS_ORIGINS=https://nxtgenalpha.com,https://www.nxtgenalpha.com
```

This is correct.

## ✅ Step 4: Google OAuth Credentials Verified

**Status:** ✅ **VERIFIED**

Backend has:
- `GOOGLE_CLIENT_ID` = Set ✅
- `GOOGLE_CLIENT_SECRET` = Set ✅

## ⚠️ Step 5: Google Cloud Console Configuration Needed

**Action Required:**

1. Go to: https://console.cloud.google.com
2. APIs & Services → Credentials
3. Open your OAuth 2.0 Client ID
4. **Authorized JavaScript origins**, add:
   - `https://nxtgenalpha.com`
   - `https://web-production-776f1.up.railway.app`
5. **Authorized redirect URIs**, add:
   - `https://web-production-776f1.up.railway.app/api/auth/google/callback`
6. Click **Save**

## Next Steps

1. **Set VITE_API_URL** in frontend service (Railway dashboard)
2. **Wait for frontend redeploy** (2-3 minutes)
3. **Update Google Cloud Console** redirect URIs
4. **Test indicators** - should load after redeploy
5. **Test Google sign-in** - should work after Google Console update

## Quick Verification Commands

```bash
# Test backend API (should work)
curl https://web-production-776f1.up.railway.app/api/backtest/indicators

# Test Google OAuth endpoint (check for configuration errors)
curl https://web-production-776f1.up.railway.app/api/auth/google/login
```

## Expected Errors to Fix

**Before fixes:**
- Indicators: "Failed to fetch indicators" (frontend can't reach backend)
- Google sign-in: "OAuth not configured" or redirect URI mismatch

**After fixes:**
- Indicators: Should load successfully
- Google sign-in: Should redirect to Google and return correctly

