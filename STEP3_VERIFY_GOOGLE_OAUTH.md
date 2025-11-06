# Step 3: Verify Google OAuth Configuration

## Overview

Google OAuth allows users to sign in with their Google accounts. This requires:
1. **Railway Configuration:** Environment variables for OAuth credentials
2. **Google Cloud Console Configuration:** OAuth client ID and redirect URIs

## Current Configuration

**Backend URL:** `https://web-production-776f1.up.railway.app`  
**Callback URL:** `https://web-production-776f1.up.railway.app/api/auth/google/callback`

## Part A: Railway Configuration

### 1. Access Railway Dashboard

1. Go to: https://railway.app
2. Log in to your account
3. Select your project
4. Find the **Backend** service

### 2. Check Required Variables

**Navigate to:** Backend Service → **Variables** tab

**Required variables:**

#### A. GOOGLE_CLIENT_ID

**Check if it exists:**
- **Name:** `GOOGLE_CLIENT_ID`
- **Value:** Should be your Google OAuth Client ID (from Google Cloud Console)
- **Format:** Usually looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`

**If missing or wrong:**
1. Click **"New Variable"**
2. **Name:** `GOOGLE_CLIENT_ID`
3. **Value:** Your Google OAuth Client ID (you'll get this from Google Cloud Console)
4. Click **Add**

#### B. GOOGLE_CLIENT_SECRET

**Check if it exists:**
- **Name:** `GOOGLE_CLIENT_SECRET`
- **Value:** Should be your Google OAuth Client Secret (from Google Cloud Console)
- **Format:** Usually looks like: `GOCSPX-xxxxxxxxxxxxxxxxxxxx`

**If missing or wrong:**
1. Click **"New Variable"**
2. **Name:** `GOOGLE_CLIENT_SECRET`
3. **Value:** Your Google OAuth Client Secret (you'll get this from Google Cloud Console)
4. Click **Add**

**⚠️ Security Note:** Keep this secret! Never commit it to version control.

#### C. BACKEND_URL

**Check if it exists:**
- **Name:** `BACKEND_URL`
- **Value:** Should be: `https://web-production-776f1.up.railway.app`

**If missing or wrong:**
1. Click **"New Variable"** (or edit existing)
2. **Name:** `BACKEND_URL`
3. **Value:** `https://web-production-776f1.up.railway.app`
4. Click **Add** or **Save**

**Note:** This is used to construct the redirect URI for Google OAuth.

### 3. Verify All Variables Are Set

After setting, you should see:
```
GOOGLE_CLIENT_ID = <your-client-id>
GOOGLE_CLIENT_SECRET = <your-client-secret>
BACKEND_URL = https://web-production-776f1.up.railway.app
```

### 4. Restart Backend Service

**After setting OAuth variables, restart the backend:**

1. Railway Dashboard → Backend Service → **Settings**
2. Click **"Restart"** button
3. Wait for service to restart (30-60 seconds)

## Part B: Google Cloud Console Configuration

### 1. Access Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Log in with your Google account
3. Select your project (or create a new one)

### 2. Navigate to OAuth Credentials

1. In the left sidebar, click **"APIs & Services"**
2. Click **"Credentials"**
3. You'll see a list of OAuth 2.0 Client IDs

### 3. Create or Edit OAuth Client

**If you don't have an OAuth client yet:**

1. Click **"Create Credentials"** → **"OAuth client ID"**
2. **Application type:** Select **"Web application"**
3. **Name:** Give it a name (e.g., "NxtGenAlpha Production")
4. Click **"Create"**
5. **Copy the Client ID and Client Secret** (you'll need these for Railway)

**If you already have an OAuth client:**

1. Click on your OAuth client to edit it
2. You'll see the Client ID and Client Secret

### 4. Configure Authorized JavaScript Origins

**In the OAuth client settings:**

1. Find **"Authorized JavaScript origins"**
2. Click **"Add URI"**
3. Add these origins (one at a time):

   **Required:**
   - `https://web-production-776f1.up.railway.app`
   - `https://nxtgenalpha.com`
   - `https://www.nxtgenalpha.com`

4. Click **"Add"** after each one

**Why these origins are needed:**
- `https://web-production-776f1.up.railway.app` - Backend API origin
- `https://nxtgenalpha.com` - Frontend domain
- `https://www.nxtgenalpha.com` - Frontend domain (www variant)

### 5. Configure Authorized Redirect URIs

**In the OAuth client settings:**

1. Find **"Authorized redirect URIs"**
2. Click **"Add URI"**
3. Add this redirect URI:

   **Required:**
   - `https://web-production-776f1.up.railway.app/api/auth/google/callback`

4. Click **"Add"**

**⚠️ Important:** The redirect URI must match **exactly**:
- Protocol: `https://` (not `http://`)
- Domain: `web-production-776f1.up.railway.app`
- Path: `/api/auth/google/callback`
- No trailing slash

**If you want to support both frontend and backend domains:**
- `https://web-production-776f1.up.railway.app/api/auth/google/callback`
- `https://nxtgenalpha.com/api/auth/google/callback` (if backend serves same domain)

### 6. Save Changes

1. Scroll down
2. Click **"Save"** button
3. Wait for changes to take effect (usually instant, but can take a few minutes)

### 7. Copy Credentials to Railway

**If you just created the OAuth client:**

1. **Client ID:** Copy the value (looks like: `123456789-abc...apps.googleusercontent.com`)
2. **Client Secret:** Click **"Show"** and copy the value (looks like: `GOCSPX-...`)

**Go back to Railway:**
1. Railway Dashboard → Backend Service → Variables
2. Set `GOOGLE_CLIENT_ID` (if not already set)
3. Set `GOOGLE_CLIENT_SECRET` (if not already set)
4. Save and restart backend

## Part C: Verify OAuth Configuration

### 1. Test OAuth Configuration in Backend

**Check backend logs:**

1. Railway Dashboard → Backend Service → **Logs**
2. Look for any OAuth-related errors
3. If you see "Google OAuth not configured" → Check variables

### 2. Test OAuth Flow from Frontend

**Test Google Sign-In:**

1. Visit: `https://nxtgenalpha.com`
2. Click **"Sign in with Google"** button
3. **Expected behavior:**
   - Redirects to Google sign-in page
   - After signing in, redirects back to your site
   - User is logged in

**If it fails:**

**Error: "Google OAuth is not configured"**
- ❌ `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` not set in Railway
- **Fix:** Set variables in Railway and restart backend

**Error: "redirect_uri_mismatch"**
- ❌ Redirect URI in Google Cloud Console doesn't match backend URL
- **Fix:** Check redirect URI in Google Cloud Console is exactly: `https://web-production-776f1.up.railway.app/api/auth/google/callback`

**Error: "invalid_client"**
- ❌ Client ID or Secret is wrong
- **Fix:** Verify credentials in Railway match Google Cloud Console

**Error: CORS error or redirect fails**
- ❌ Frontend can't reach backend
- **Fix:** Check `VITE_API_URL` (Step 1) and CORS (Step 2)

### 3. Test OAuth Endpoint Directly

**Test backend OAuth endpoint:**

1. Open browser
2. Visit: `https://web-production-776f1.up.railway.app/api/auth/google/login`
3. **Expected:** Redirects to Google sign-in page
4. **If error:** Check backend logs and Railway variables

## Troubleshooting

### Issue: "Google OAuth is not configured"

**Error in backend logs or frontend:**
```
Google OAuth is not configured. Please contact the administrator...
```

**Possible causes:**
1. `GOOGLE_CLIENT_ID` not set in Railway
2. `GOOGLE_CLIENT_SECRET` not set in Railway
3. Backend didn't restart after setting variables

**Fix:**
1. Verify both variables are set in Railway
2. Restart backend service
3. Check backend logs to confirm variables are loaded

### Issue: "redirect_uri_mismatch"

**Error from Google:**
```
Error 400: redirect_uri_mismatch
```

**Possible causes:**
1. Redirect URI in Google Cloud Console doesn't match backend URL
2. `BACKEND_URL` not set correctly in Railway
3. Redirect URI has wrong protocol (http vs https)

**Fix:**
1. Check `BACKEND_URL` in Railway (should be: `https://web-production-776f1.up.railway.app`)
2. Check Authorized redirect URIs in Google Cloud Console
3. Must be exactly: `https://web-production-776f1.up.railway.app/api/auth/google/callback`
4. Save changes in Google Cloud Console
5. Wait a few minutes for changes to propagate

### Issue: "invalid_client"

**Error from Google:**
```
Error 401: invalid_client
```

**Possible causes:**
1. Client ID or Secret is wrong
2. Client ID or Secret was copied incorrectly
3. Client was deleted or disabled in Google Cloud Console

**Fix:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Check your OAuth client is active
3. Copy Client ID and Client Secret again
4. Update Railway variables
5. Restart backend

### Issue: OAuth works but redirects to wrong URL

**Possible causes:**
1. `BACKEND_URL` not set correctly
2. Frontend is using wrong API URL

**Fix:**
1. Check `BACKEND_URL` in Railway backend variables
2. Check `VITE_API_URL` in Railway frontend variables
3. Both should point to backend URL

### Issue: OAuth callback fails after Google sign-in

**Possible causes:**
1. CORS not configured correctly
2. Backend not running
3. Redirect URI mismatch

**Fix:**
1. Check CORS configuration (Step 2)
2. Check backend logs for errors
3. Verify redirect URI in Google Cloud Console

## Verification Checklist

After completing Step 3, verify:

**Railway Configuration:**
- [ ] `GOOGLE_CLIENT_ID` is set in Railway Backend variables
- [ ] `GOOGLE_CLIENT_SECRET` is set in Railway Backend variables
- [ ] `BACKEND_URL` is set to: `https://web-production-776f1.up.railway.app`
- [ ] Backend service restarted after setting variables

**Google Cloud Console Configuration:**
- [ ] OAuth 2.0 Client ID exists (or was created)
- [ ] Authorized JavaScript origins include:
  - [ ] `https://web-production-776f1.up.railway.app`
  - [ ] `https://nxtgenalpha.com`
  - [ ] `https://www.nxtgenalpha.com`
- [ ] Authorized redirect URIs include:
  - [ ] `https://web-production-776f1.up.railway.app/api/auth/google/callback`
- [ ] Changes saved in Google Cloud Console

**Functionality:**
- [ ] Clicking "Sign in with Google" redirects to Google
- [ ] After signing in, redirects back to site
- [ ] User is logged in successfully
- [ ] No OAuth errors in backend logs

## Next Steps

After completing Step 3, proceed to:
- **Step 4:** Test API Directly from Browser

