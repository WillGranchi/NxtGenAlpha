# API Routing and Google OAuth Fix Guide

## Current Issues

1. **Indicators failing to fetch** - Frontend can't access backend API
2. **Google sign-in not working** - OAuth configuration missing or incorrect

## Step 1: Fix VITE_API_URL (Critical for Indicators)

### Problem
Frontend is trying to call API on `https://nxtgenalpha.com/api/...` but that domain serves the frontend (static files), not the backend API.

### Solution

**Using Railway CLI:**
```bash
# Find your frontend service name first
railway status

# Then set VITE_API_URL to backend URL
railway variables --set "VITE_API_URL=https://web-production-776f1.up.railway.app" --service <FRONTEND_SERVICE_NAME>
```

**Or via Railway Dashboard:**
1. Railway Dashboard → Frontend Service → Variables
2. Find or add `VITE_API_URL`
3. Set value to: `https://web-production-776f1.up.railway.app`
4. Save (frontend will auto-redeploy)

**Important:** Vite environment variables are baked into the build at build time. After changing `VITE_API_URL`, the frontend MUST rebuild. Railway will automatically rebuild when you save the variable.

### Verify
After deployment, check browser console. API calls should go to:
- `https://web-production-776f1.up.railway.app/api/backtest/indicators`
- NOT `https://nxtgenalpha.com/api/backtest/indicators`

## Step 2: Verify CORS Configuration

CORS is already configured, but let's verify it includes all necessary origins:

**Railway Dashboard → Backend Service → Variables:**

Should have:
```
CORS_ORIGINS=https://nxtgenalpha.com,https://www.nxtgenalpha.com
```

**Using Railway CLI:**
```bash
railway variables --service web --kv | grep CORS_ORIGINS
```

If frontend uses a Railway URL (not just custom domain), add it:
```
CORS_ORIGINS=https://nxtgenalpha.com,https://www.nxtgenalpha.com,https://FRONTEND-URL.up.railway.app
```

## Step 3: Configure Google OAuth

### Step 3.1: Set Railway Environment Variables

**Railway Dashboard → Backend Service → Variables:**

Required variables:
```
GOOGLE_CLIENT_ID=<your-production-client-id-from-google>
GOOGLE_CLIENT_SECRET=<your-production-client-secret-from-google>
BACKEND_URL=https://web-production-776f1.up.railway.app
```

**Using Railway CLI:**
```bash
# Set Google OAuth credentials (replace with your actual values)
railway variables --set "GOOGLE_CLIENT_ID=YOUR_CLIENT_ID" --service web
railway variables --set "GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET" --service web --secret
railway variables --set "BACKEND_URL=https://web-production-776f1.up.railway.app" --service web
```

**Note:** Mark `GOOGLE_CLIENT_SECRET` as "Secret" in Railway dashboard (click eye icon).

### Step 3.2: Configure Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Navigate: **APIs & Services** → **Credentials**
3. Open your OAuth 2.0 Client ID (or create new one)

4. **Authorized JavaScript origins**, click "+ ADD URI":
   - `https://nxtgenalpha.com`
   - `https://web-production-776f1.up.railway.app`

5. **Authorized redirect URIs**, click "+ ADD URI":
   - `https://web-production-776f1.up.railway.app/api/auth/google/callback`
   - `https://nxtgenalpha.com/api/auth/google/callback` (if backend also serves on this domain)

6. Click **Save**

### Step 3.3: Verify Redirect URI Construction

The backend constructs the redirect URI from `BACKEND_URL`:
```
GOOGLE_REDIRECT_URI = {BACKEND_URL}/api/auth/google/callback
```

So if `BACKEND_URL=https://web-production-776f1.up.railway.app`, the redirect URI is:
```
https://web-production-776f1.up.railway.app/api/auth/google/callback
```

**This must match exactly** what's in Google Cloud Console.

## Step 4: Testing

### Test 1: Backend API (Should Work)
```bash
curl https://web-production-776f1.up.railway.app/api/backtest/indicators
```
Expected: JSON response with indicators

### Test 2: Frontend API Call (After VITE_API_URL Fix)
Open browser console on `https://nxtgenalpha.com`:
```javascript
fetch('https://web-production-776f1.up.railway.app/api/backtest/indicators')
  .then(r => r.json())
  .then(data => console.log('✅ Success:', data))
  .catch(err => console.error('❌ Error:', err))
```

Expected: Should work without CORS errors

### Test 3: Google Sign-In
1. Click "Sign in with Google" button
2. Should redirect to Google login page
3. After authentication, should redirect back to site
4. Check backend logs for OAuth errors

## Troubleshooting

### Indicators Still Failing

**Check:**
1. Frontend has redeployed after VITE_API_URL change
   - Railway Dashboard → Frontend Service → Deployments
   - Latest deployment should be recent (after variable change)

2. Browser console shows correct API URL
   - Open DevTools → Network tab
   - Look for request to `/api/backtest/indicators`
   - URL should be: `https://web-production-776f1.up.railway.app/api/backtest/indicators`
   - NOT: `https://nxtgenalpha.com/api/backtest/indicators`

3. CORS errors in console
   - If you see CORS errors, check `CORS_ORIGINS` includes frontend domain
   - Check backend logs for CORS rejection messages

### Google Sign-In Still Failing

**Check:**
1. Backend logs for errors:
   - Railway Dashboard → Backend Service → Logs
   - Look for "Google OAuth not configured" or redirect URI errors

2. Google Cloud Console redirect URI matches exactly:
   - Must be: `https://web-production-776f1.up.railway.app/api/auth/google/callback`
   - Check for typos, http vs https, trailing slashes

3. Railway variables are set:
   - `GOOGLE_CLIENT_ID` is set and not empty
   - `GOOGLE_CLIENT_SECRET` is set and not empty
   - `BACKEND_URL` is set correctly

4. Browser console for redirect errors:
   - Open DevTools → Console
   - Click "Sign in with Google"
   - Check for redirect errors or OAuth errors

## Quick Verification Checklist

- [ ] `VITE_API_URL` is set to backend Railway URL in frontend service
- [ ] Frontend service has redeployed after VITE_API_URL change
- [ ] `CORS_ORIGINS` includes `https://nxtgenalpha.com` in backend service
- [ ] `GOOGLE_CLIENT_ID` is set in backend service
- [ ] `GOOGLE_CLIENT_SECRET` is set in backend service (marked as Secret)
- [ ] `BACKEND_URL` is set to `https://web-production-776f1.up.railway.app` in backend service
- [ ] Google Cloud Console has correct JavaScript origins
- [ ] Google Cloud Console has correct redirect URIs
- [ ] Backend logs show no OAuth configuration errors

## Next Steps After Fixes

1. Wait for frontend redeployment (2-3 minutes)
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Test indicators loading
4. Test Google sign-in
5. Check browser console for any remaining errors

