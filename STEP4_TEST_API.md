# Step 4: Test API Directly from Browser

## Overview

After configuring `VITE_API_URL`, CORS, and Google OAuth, test that everything works correctly from the browser.

## Quick Test Script

**Open your site:** `https://nxtgenalpha.com`

**Press F12 → Console tab → Paste this entire block:**

```javascript
// === COMPREHENSIVE API TEST ===
console.log('=== API TEST START ===\n');

// 1. Check VITE_API_URL
const apiUrl = import.meta.env.VITE_API_URL;
console.log('1. VITE_API_URL:', apiUrl || 'NOT SET');
console.log('   Expected: https://web-production-776f1.up.railway.app');
if (!apiUrl || apiUrl.includes('nxtgenalpha.com')) {
  console.error('   ❌ VITE_API_URL is not set correctly!');
  console.error('   Fix: Set VITE_API_URL in Railway Frontend variables');
} else {
  console.log('   ✅ VITE_API_URL is set correctly');
}

// 2. Test backend API directly
console.log('\n2. Testing backend API directly...');
fetch('https://web-production-776f1.up.railway.app/api/backtest/indicators')
  .then(r => {
    console.log('   Status:', r.status, r.statusText);
    if (r.ok) {
      return r.json();
    } else {
      throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    }
  })
  .then(data => {
    const indicators = Object.keys(data.indicators || {});
    console.log('   ✅ Backend API works!');
    console.log(`   Found ${indicators.length} indicators:`, indicators.slice(0, 5).join(', '), '...');
  })
  .catch(err => {
    console.error('   ❌ Backend API failed:', err.message);
    console.error('   This suggests a backend issue, not a frontend/routing issue');
  });

// 3. Test API using frontend's configured URL
console.log('\n3. Testing API using frontend config...');
const frontendApiUrl = apiUrl || 'http://localhost:8000';
console.log('   Using URL:', frontendApiUrl);
fetch(`${frontendApiUrl}/api/backtest/indicators`, {
  method: 'GET',
  mode: 'cors',
  credentials: 'include'
})
  .then(r => {
    console.log('   Status:', r.status, r.statusText);
    console.log('   Request URL:', r.url);
    if (r.ok) {
      return r.json();
    } else {
      throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    }
  })
  .then(data => {
    const indicators = Object.keys(data.indicators || {});
    console.log('   ✅ Frontend API config works!');
    console.log(`   Found ${indicators.length} indicators`);
  })
  .catch(err => {
    console.error('   ❌ Frontend API config failed:', err.message);
    if (err.message.includes('CORS') || err.message.includes('Network')) {
      console.error('   This is a CORS error. Check CORS_ORIGINS in Railway Backend variables');
    } else if (err.message.includes('404')) {
      console.error('   This is a 404 error. Check if API endpoint exists');
    } else {
      console.error('   Error details:', err);
    }
  });

// 4. Test CORS headers
console.log('\n4. Testing CORS headers...');
fetch('https://web-production-776f1.up.railway.app/api/backtest/indicators', {
  method: 'GET',
  mode: 'cors',
  credentials: 'include'
})
  .then(r => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': r.headers.get('Access-Control-Allow-Credentials'),
    };
    console.log('   CORS Headers:', corsHeaders);
    if (corsHeaders['Access-Control-Allow-Origin']) {
      console.log('   ✅ CORS is configured');
    } else {
      console.error('   ⚠️ CORS headers not found');
    }
    return r.json();
  })
  .then(() => {
    console.log('   ✅ CORS test passed');
  })
  .catch(err => {
    console.error('   ❌ CORS test failed:', err.message);
  });

// 5. Test Google OAuth endpoint
console.log('\n5. Testing Google OAuth endpoint...');
fetch('https://web-production-776f1.up.railway.app/api/auth/google/login', {
  method: 'GET',
  redirect: 'manual' // Don't follow redirect
})
  .then(r => {
    console.log('   Status:', r.status, r.statusText);
    if (r.status === 302 || r.status === 307) {
      const location = r.headers.get('Location');
      console.log('   ✅ OAuth endpoint works!');
      console.log('   Redirects to:', location);
      if (location && location.includes('accounts.google.com')) {
        console.log('   ✅ Redirecting to Google (correct)');
      } else {
        console.error('   ⚠️ Redirect location unexpected:', location);
      }
    } else if (r.status === 503) {
      console.error('   ❌ OAuth not configured (503 Service Unavailable)');
      console.error('   Fix: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Railway');
    } else {
      console.error('   ⚠️ Unexpected status:', r.status);
    }
  })
  .catch(err => {
    console.error('   ❌ OAuth endpoint test failed:', err.message);
  });

console.log('\n=== API TEST COMPLETE ===');
console.log('\nSummary:');
console.log('- If all tests pass (✅), your configuration is correct!');
console.log('- If any test fails (❌), check the error message and fix the issue');
console.log('- Check Network tab (F12) for detailed request/response information');
```

## What to Look For

### Expected Results

**All tests should pass (✅):**

1. **VITE_API_URL:** Should show `https://web-production-776f1.up.railway.app`
2. **Backend API:** Should return status 200 with indicators
3. **Frontend API Config:** Should work using frontend's configured URL
4. **CORS:** Should show CORS headers and work correctly
5. **OAuth Endpoint:** Should redirect to Google (status 302/307)

### Common Issues

#### Issue: VITE_API_URL is undefined or wrong

**Symptoms:**
- Test 1 shows `NOT SET` or wrong URL

**Fix:**
- Complete **Step 1:** Verify and Fix VITE_API_URL
- Wait for frontend redeployment
- Hard refresh browser

#### Issue: Backend API test fails

**Symptoms:**
- Test 2 shows error (not 200 status)

**Fix:**
- Check backend service is running (Railway dashboard)
- Check backend logs for errors
- Verify backend URL is correct

#### Issue: Frontend API config fails with CORS error

**Symptoms:**
- Test 3 shows CORS error

**Fix:**
- Complete **Step 2:** Verify CORS Configuration
- Verify `CORS_ORIGINS` includes `https://nxtgenalpha.com`
- Restart backend service

#### Issue: OAuth endpoint returns 503

**Symptoms:**
- Test 5 shows "503 Service Unavailable"

**Fix:**
- Complete **Step 3:** Verify Google OAuth Configuration
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway
- Restart backend service

#### Issue: OAuth redirect fails

**Symptoms:**
- Test 5 redirects to wrong URL or shows error

**Fix:**
- Check `BACKEND_URL` in Railway backend variables
- Check redirect URI in Google Cloud Console
- Must match exactly: `https://web-production-776f1.up.railway.app/api/auth/google/callback`

## Network Tab Analysis

**For more detailed debugging:**

1. Open **DevTools** (F12)
2. Go to **Network** tab
3. Reload page (F5)
4. Filter by: `api` or `indicators` or `auth`
5. Click on requests to see:
   - **Request URL:** What URL is being used?
   - **Status Code:** 200 = success, 404/500 = error, CORS = blocked
   - **Response:** What does the response show?
   - **Headers:** Check CORS headers

## Manual Testing

### Test 1: Check Indicators Load

1. Visit: `https://nxtgenalpha.com`
2. Open browser console (F12)
3. Look for errors
4. Check if indicators section loads
5. **Expected:** No "Failed to fetch indicators" error

### Test 2: Check Google Sign-In

1. Visit: `https://nxtgenalpha.com`
2. Click **"Sign in with Google"** button
3. **Expected:** Redirects to Google sign-in page
4. Sign in with Google account
5. **Expected:** Redirects back to your site and you're logged in

### Test 3: Check API Calls Work

1. Visit: `https://nxtgenalpha.com`
2. Open **Network** tab (F12)
3. Try to run a backtest or load data
4. **Expected:** API calls succeed (status 200)

## Troubleshooting

### If all tests pass but frontend still doesn't work

**Possible causes:**
1. Browser cache
2. Service worker cache
3. Old build still deployed

**Fix:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Use incognito/private window
3. Clear browser cache
4. Check Railway deployment status

### If some tests fail

**Follow the error messages:**
- Each test reports what's wrong
- Fix the specific issue mentioned
- Re-run the test script

## Verification Checklist

After completing Step 4, verify:

- [ ] All tests in the script pass (✅)
- [ ] VITE_API_URL shows correct backend URL
- [ ] Backend API test succeeds
- [ ] Frontend API config test succeeds
- [ ] CORS test passes
- [ ] OAuth endpoint test passes
- [ ] Indicators load on frontend (no errors)
- [ ] Google sign-in works
- [ ] Network tab shows successful API requests

## Next Steps

After completing all 4 steps:

1. **Verify all functionality works:**
   - Indicators load
   - Google sign-in works
   - Backtest runs successfully
   - User authentication works

2. **Monitor for issues:**
   - Check Railway logs periodically
   - Monitor for errors in browser console
   - Test user sign-in flow

3. **Document any remaining issues:**
   - If something still doesn't work, note the error
   - Check which step's configuration might be wrong
   - Re-run the test script to identify the issue

