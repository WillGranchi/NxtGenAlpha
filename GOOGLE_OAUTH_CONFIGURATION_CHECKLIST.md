# Google OAuth Configuration Checklist

## Current Backend Configuration ✅

**Railway Backend Service Variables:**
- ✅ `GOOGLE_CLIENT_ID` = Set
- ✅ `GOOGLE_CLIENT_SECRET` = Set  
- ✅ `BACKEND_URL` = `https://web-production-776f1.up.railway.app`

**Redirect URI (auto-constructed):**
```
https://web-production-776f1.up.railway.app/api/auth/google/callback
```

## Required: Google Cloud Console Configuration

### Step 1: Access Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Sign in with your Google account
3. Select the correct project (or create one)

### Step 2: Navigate to OAuth Credentials

1. Go to: **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID
3. Client ID should be: `775998997595-qrjp2qakru8nep1k7fjd7mn157u6vbl6.apps.googleusercontent.com`
4. Click on it to edit

### Step 3: Configure Authorized JavaScript Origins

Under **"Authorized JavaScript origins"**, click **"+ ADD URI"** and add:

1. `https://nxtgenalpha.com`
2. `https://web-production-776f1.up.railway.app`

**Important:** 
- Must use `https://` (not `http://`)
- No trailing slashes
- Must match exactly

### Step 4: Configure Authorized Redirect URIs

Under **"Authorized redirect URIs"**, click **"+ ADD URI"** and add:

1. `https://web-production-776f1.up.railway.app/api/auth/google/callback`

**Critical:** This URI must match EXACTLY what the backend constructs:
- ✅ Correct: `https://web-production-776f1.up.railway.app/api/auth/google/callback`
- ❌ Wrong: `http://web-production-776f1.up.railway.app/api/auth/google/callback` (missing s)
- ❌ Wrong: `https://web-production-776f1.up.railway.app/api/auth/google/callback/` (trailing slash)
- ❌ Wrong: `https://nxtgenalpha.com/api/auth/google/callback` (wrong domain, unless backend also serves on this domain)

### Step 5: Save Configuration

1. Click **"Save"** button
2. Wait a few seconds for changes to propagate

## Verification

### Test 1: OAuth Login Endpoint

After updating Google Cloud Console, test:

```bash
curl -I https://web-production-776f1.up.railway.app/api/auth/google/login
```

**Expected:** Should redirect to Google (302 redirect) or show authorization URL

**If 503 error:** Check backend logs for OAuth configuration errors

### Test 2: Browser Test

1. Visit: `https://nxtgenalpha.com`
2. Click "Sign in with Google"
3. Should redirect to Google login page
4. After authentication, should redirect back to site
5. User should be logged in

## Common Issues

### Issue: "redirect_uri_mismatch" Error

**Symptom:** Google shows error: "redirect_uri_mismatch"

**Fix:**
- Verify redirect URI in Google Cloud Console matches exactly:
  `https://web-production-776f1.up.railway.app/api/auth/google/callback`
- Check for typos, http vs https, trailing slashes
- Ensure you saved changes in Google Cloud Console

### Issue: "OAuth not configured" Error

**Symptom:** Backend returns 503 with "Google OAuth is not configured"

**Fix:**
- Check Railway backend variables have `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Verify variables are not empty
- Check backend logs for specific error messages

### Issue: Redirect After Login Fails

**Symptom:** Google authentication succeeds but redirect back to site fails

**Fix:**
- Check `FRONTEND_URL` is set in backend service
- Should be: `https://nxtgenalpha.com`
- Backend redirects to: `{FRONTEND_URL}/?token={jwt_token}`

## Current Status

✅ Backend OAuth variables configured
✅ BACKEND_URL set correctly
⚠️ Google Cloud Console redirect URI needs to be added (manual step)

**After completing Google Cloud Console configuration:**
- Google sign-in should work ✅
- Users can authenticate ✅
- JWT tokens will be set ✅

