# Fix: Google OAuth redirect_uri_mismatch Error

## Error Message
```
Error 400: redirect_uri_mismatch
```

## What This Means
The redirect URI your backend is sending to Google doesn't match what's configured in your Google Cloud Console OAuth client settings.

## Current Backend Configuration

**Expected Redirect URI:**
```
https://web-production-776f1.up.railway.app/api/auth/google/callback
```

This is constructed from:
- `GOOGLE_REDIRECT_URI` environment variable (if set), OR
- `{BACKEND_URL}/api/auth/google/callback` (default)

## Quick Fix Steps

### Step 1: Verify Railway Backend URL

1. Go to: https://railway.app
2. Select your project → **Backend** service → **Variables** tab
3. Check `BACKEND_URL` is set to:
   ```
   https://web-production-776f1.up.railway.app
   ```
4. If it's different or missing, set it to the value above

### Step 2: Fix Google Cloud Console

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com
   - Sign in with your Google account
   - Select your project

2. **Navigate to OAuth Credentials:**
   - Click **"APIs & Services"** in the left sidebar
   - Click **"Credentials"**
   - Find your OAuth 2.0 Client ID (should be: `775998997595-qrjp2qakru8nep1k7fjd7mn157u6vbl6.apps.googleusercontent.com`)
   - **Click on it to edit**

3. **Check/Add Authorized Redirect URIs:**
   - Scroll down to **"Authorized redirect URIs"**
   - **Remove any incorrect URIs** (like `http://` versions or wrong domains)
   - **Add this exact URI** (if not already present):
     ```
     https://web-production-776f1.up.railway.app/api/auth/google/callback
     ```
   - **Important:** Must match EXACTLY:
     - ✅ Protocol: `https://` (not `http://`)
     - ✅ Domain: `web-production-776f1.up.railway.app`
     - ✅ Path: `/api/auth/google/callback`
     - ✅ No trailing slash

4. **Save Changes:**
   - Click **"Save"** button at the bottom
   - Wait 1-2 minutes for changes to propagate

### Step 3: Verify the Fix

1. **Test the OAuth flow:**
   - Visit: `https://nxtgenalpha.com`
   - Click **"Sign in with Google"**
   - You should be redirected to Google sign-in (not the error page)
   - After signing in, you should be redirected back to your site

2. **If it still fails:**
   - Wait 2-3 more minutes (Google can take time to update)
   - Clear browser cache and try again
   - Check Railway backend logs for any errors

## Common Mistakes to Avoid

❌ **Wrong Protocol:**
- `http://web-production-776f1.up.railway.app/api/auth/google/callback` (missing 's')
- ✅ Correct: `https://web-production-776f1.up.railway.app/api/auth/google/callback`

❌ **Trailing Slash:**
- `https://web-production-776f1.up.railway.app/api/auth/google/callback/` (extra slash)
- ✅ Correct: `https://web-production-776f1.up.railway.app/api/auth/google/callback`

❌ **Wrong Domain:**
- `https://nxtgenalpha.com/api/auth/google/callback` (frontend domain, not backend)
- ✅ Correct: `https://web-production-776f1.up.railway.app/api/auth/google/callback`

❌ **Extra Spaces:**
- ` https://web-production-776f1.up.railway.app/api/auth/google/callback ` (spaces)
- ✅ Correct: `https://web-production-776f1.up.railway.app/api/auth/google/callback`

## Still Having Issues?

### Check What Redirect URI is Actually Being Sent

1. **Check Railway Backend Logs:**
   - Railway Dashboard → Backend Service → **Logs**
   - Look for OAuth-related errors
   - The logs might show what redirect URI is being used

2. **Test the OAuth Endpoint:**
   - Visit: `https://web-production-776f1.up.railway.app/api/auth/google/login`
   - This will redirect to Google
   - Check the URL in the browser address bar - it will show the `redirect_uri` parameter
   - Compare it to what's in Google Cloud Console

3. **Verify Environment Variables:**
   - Railway Dashboard → Backend Service → **Variables**
   - Ensure:
     - `BACKEND_URL` = `https://web-production-776f1.up.railway.app`
     - `GOOGLE_CLIENT_ID` is set
     - `GOOGLE_CLIENT_SECRET` is set
   - If `GOOGLE_REDIRECT_URI` is set, it should be: `https://web-production-776f1.up.railway.app/api/auth/google/callback`

4. **Restart Backend:**
   - After changing environment variables, restart the backend service
   - Railway Dashboard → Backend Service → **Settings** → **Restart**

## Summary

The fix is simple:
1. ✅ Ensure `BACKEND_URL` in Railway is: `https://web-production-776f1.up.railway.app`
2. ✅ Add redirect URI in Google Cloud Console: `https://web-production-776f1.up.railway.app/api/auth/google/callback`
3. ✅ Save and wait 1-2 minutes
4. ✅ Test the login flow

The redirect URI must match **exactly** between:
- What your backend sends to Google (from `BACKEND_URL` or `GOOGLE_REDIRECT_URI`)
- What's configured in Google Cloud Console

