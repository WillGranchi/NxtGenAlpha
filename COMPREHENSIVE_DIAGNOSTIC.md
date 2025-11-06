# Comprehensive Diagnostic - Find the Exact Issue

## Step 1: Browser Console Diagnostic (Run This First!)

**Open your site:** `https://nxtgenalpha.com`

**Open browser console:** Press F12, click "Console" tab

**Copy and paste this entire block:**

```javascript
// === COMPREHENSIVE API DIAGNOSTIC ===
console.log('=== API DIAGNOSTIC START ===');

// 1. Check what API URL is baked into build
const bakedApiUrl = import.meta.env.VITE_API_URL;
console.log('1. Baked API URL:', bakedApiUrl);
console.log('   ✅ Expected: https://web-production-776f1.up.railway.app');
console.log('   ❌ If undefined/wrong: Frontend not redeployed');

// 2. Test backend API directly
console.log('\n2. Testing backend API directly...');
fetch('https://web-production-776f1.up.railway.app/api/backtest/indicators')
  .then(r => {
    console.log('   Status:', r.status, r.statusText);
    return r.json();
  })
  .then(data => {
    console.log('   ✅ Backend API WORKS!');
    console.log('   Indicators:', Object.keys(data.indicators || {}));
  })
  .catch(err => {
    console.error('   ❌ Backend API FAILED:', err.message);
  });

// 3. Test API using frontend's configured URL
console.log('\n3. Testing API using frontend config...');
const frontendApiUrl = bakedApiUrl || 'http://localhost:8000';
console.log('   Using URL:', frontendApiUrl);
fetch(`${frontendApiUrl}/api/backtest/indicators`)
  .then(r => {
    console.log('   Status:', r.status, r.statusText);
    if (r.status === 200) {
      return r.json();
    } else {
      throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    }
  })
  .then(data => {
    console.log('   ✅ Frontend API Config WORKS!');
    console.log('   Indicators:', Object.keys(data.indicators || {}));
  })
  .catch(err => {
    console.error('   ❌ Frontend API Config FAILED:', err.message);
    console.error('   Error details:', err);
  });

// 4. Check CORS
console.log('\n4. Testing CORS...');
fetch('https://web-production-776f1.up.railway.app/api/backtest/indicators', {
  method: 'GET',
  mode: 'cors',
  credentials: 'include'
})
  .then(r => {
    console.log('   CORS headers:', {
      'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': r.headers.get('Access-Control-Allow-Credentials')
    });
    return r.json();
  })
  .then(() => {
    console.log('   ✅ CORS is working');
  })
  .catch(err => {
    console.error('   ❌ CORS issue:', err.message);
  });

// 5. Check Network tab analysis
console.log('\n=== DIAGNOSTIC COMPLETE ===');
console.log('Next: Open Network tab and check requests to /api/backtest/indicators');
console.log('Look for: Request URL, Status Code, CORS errors');
```

**Run this and copy the output!** This will tell us exactly what's wrong.

## Step 2: Check Network Tab

**DevTools → Network tab:**

1. **Reload page** (F5)
2. **Filter by:** `indicators` or `api`
3. **Look for request to:** `/api/backtest/indicators`
4. **Click on it** and check:
   - **Request URL:** What URL is it using?
   - **Status Code:** 200 = success, 404/500 = error, CORS = blocked
   - **Response:** What does the response show?

## Step 3: Verify Railway Configuration

### Frontend Service Variables

**Railway Dashboard → Frontend Service → Variables:**

Check:
```
VITE_API_URL=https://web-production-776f1.up.railway.app
```

**If missing or wrong:**
1. Set it to: `https://web-production-776f1.up.railway.app`
2. Save
3. Wait for redeploy (check Deployments tab)

### Backend Service Variables

**Railway Dashboard → Backend Service → Variables:**

Check these exist:
```
CORS_ORIGINS=https://nxtgenalpha.com,https://www.nxtgenalpha.com
FRONTEND_URL=https://nxtgenalpha.com
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
BACKEND_URL=https://web-production-776f1.up.railway.app
```

## Step 4: Check Deployment Status

**Railway Dashboard → Frontend Service → Deployments:**

1. **Latest deployment timestamp:** Is it recent?
2. **Status:** Should be "Deployed" (green)
3. **If "Building":** Wait for it to finish
4. **If "Failed":** Check build logs

**If deployment is old (before you set VITE_API_URL):**
- Frontend hasn't redeployed yet
- Either wait longer OR force redeploy

## Step 5: Force Redeploy

**Railway Dashboard → Frontend Service → Settings → Redeploy**

Or:

**Railway Dashboard → Frontend Service → Variables:**

1. Temporarily change `VITE_API_URL` (add a space at end)
2. Save
3. Change it back to correct value
4. Save
5. This triggers a rebuild

## Step 6: Clear Browser Cache

**Even after redeploy, browser might cache old build:**

1. **Hard refresh:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Or use incognito/private window:**
   - Chrome: Ctrl+Shift+N
   - Firefox: Ctrl+Shift+P
   - Safari: Cmd+Shift+N

3. **Or clear cache:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Select "Last hour" or "All time"

## Common Issues & Fixes

### Issue: `VITE_API_URL` shows `undefined`

**Cause:** Frontend wasn't built with the variable, or variable not set

**Fix:**
1. Set `VITE_API_URL` in Railway frontend variables
2. Wait for redeploy OR force redeploy
3. Hard refresh browser

### Issue: Backend API works but frontend doesn't

**Cause:** CORS blocking or wrong URL in frontend

**Fix:**
1. Check `VITE_API_URL` is set correctly
2. Check `CORS_ORIGINS` includes `https://nxtgenalpha.com`
3. Verify frontend redeployed
4. Hard refresh browser

### Issue: CORS error in console

**Cause:** Backend not allowing frontend origin

**Fix:**
1. Set `CORS_ORIGINS=https://nxtgenalpha.com,https://www.nxtgenalpha.com` in backend
2. Restart backend service
3. Check backend logs for CORS allowed origins

### Issue: Network request shows wrong URL

**Cause:** Frontend build still has old API URL

**Fix:**
1. Verify `VITE_API_URL` is set in Railway
2. Force redeploy frontend
3. Hard refresh browser

## What to Report Back

After running the diagnostic, report:

1. **What `VITE_API_URL` shows:** (from console diagnostic)
2. **What backend API test shows:** (✅ or ❌)
3. **What frontend API test shows:** (✅ or ❌)
4. **What CORS test shows:** (✅ or ❌)
5. **What Network tab shows:** (Request URL, Status Code)
6. **When was frontend last deployed:** (Railway dashboard)

This will help identify the exact issue!

