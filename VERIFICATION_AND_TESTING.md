# Verification and Testing Guide

## ✅ Configuration Status

### Backend Service ✅
- `BACKEND_URL` = `https://web-production-776f1.up.railway.app` ✅
- `CORS_ORIGINS` = `https://nxtgenalpha.com,https://www.nxtgenalpha.com` ✅
- `GOOGLE_CLIENT_ID` = Set ✅
- `GOOGLE_CLIENT_SECRET` = Set ✅

### Frontend Service ✅
- `VITE_API_URL` = `https://web-production-776f1.up.railway.app` ✅

### API Endpoints ✅
- Backend API: `https://web-production-776f1.up.railway.app`
- Indicators endpoint: `/api/backtest/indicators` ✅ Working
- CORS headers: ✅ Correct

## Manual Actions Required

### 1. Verify Frontend Redeployment

**Railway Dashboard → Frontend Service → Deployments:**

- Check if latest deployment is after `VITE_API_URL` was set
- If not recent, wait for deployment or trigger manual redeploy
- Deployment should complete in 2-3 minutes

### 2. Update Google Cloud Console

**Action:** Add redirect URI to Google Cloud Console

**URL to add:**
```
https://web-production-776f1.up.railway.app/api/auth/google/callback
```

**See:** `GOOGLE_OAUTH_CONFIGURATION_CHECKLIST.md` for detailed steps

## Testing Commands

### Test 1: Backend API (Should Work)
```bash
curl https://web-production-776f1.up.railway.app/api/backtest/indicators
```
**Expected:** JSON response with indicators

### Test 2: CORS Headers (Should Work)
```bash
curl -H "Origin: https://nxtgenalpha.com" \
  -I https://web-production-776f1.up.railway.app/api/backtest/indicators
```
**Expected:** Response includes `access-control-allow-origin: https://nxtgenalpha.com`

### Test 3: Browser Console Test

Open browser console on `https://nxtgenalpha.com` and run:

```javascript
// Test indicators API
fetch('https://web-production-776f1.up.railway.app/api/backtest/indicators')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Indicators API works!');
    console.log('Available indicators:', Object.keys(data.indicators));
  })
  .catch(err => {
    console.error('❌ Indicators API failed:', err);
  });
```

**Expected:** Should log indicators without CORS errors

## Expected Results After Fixes

### Indicators Should Load
- ✅ Indicator catalog displays
- ✅ No "Failed to fetch indicators" error
- ✅ API calls succeed in browser console

### Google Sign-In Should Work
- ✅ "Sign in with Google" button redirects to Google
- ✅ After authentication, redirects back to site
- ✅ User is logged in
- ✅ User profile shows in UI

## Troubleshooting

If issues persist after all fixes:

1. **Check browser console** (F12) for specific errors
2. **Check Network tab** - see what URLs are being called
3. **Check backend logs** - Railway Dashboard → Backend Service → Logs
4. **Hard refresh browser** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
5. **Verify frontend redeployed** - Check deployment timestamp

