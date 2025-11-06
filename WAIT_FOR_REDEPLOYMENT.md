# Waiting for Frontend Redeployment - Troubleshooting Guide

## Why You Need to Wait

**Vite environment variables are baked into the build:**
- When you set `VITE_API_URL`, Railway must rebuild the frontend
- The old build still has the old API URL
- Only after rebuild + redeploy will the new URL be used

## How to Check if Frontend Has Redeployed

### Step 1: Check Railway Dashboard

**Railway Dashboard → Frontend Service → Deployments:**

1. Look at the **latest deployment**
2. Check the **timestamp** - when was it deployed?
3. **If timestamp is BEFORE you set VITE_API_URL:**
   - Frontend hasn't redeployed yet
   - Wait 2-5 more minutes
   - Or manually trigger redeploy

4. **If timestamp is AFTER you set VITE_API_URL:**
   - Deployment should be complete
   - Check deployment status:
     - ✅ "Deployed" (green) = Ready
     - ⚠️ "Building" = Still deploying
     - ❌ "Failed" = Check build logs

### Step 2: Check Build Logs

**Railway Dashboard → Frontend Service → Deployments → Latest → Build Logs:**

Look for:
- ✅ `npm run build` completed
- ✅ `built in Xms` or similar success message
- ✅ Build completed successfully
- ❌ Any build errors

### Step 3: Verify New Build Has New API URL

**Railway Dashboard → Frontend Service → Logs:**

After deployment, check if the service started:
- ✅ `INFO  Accepting connections at http://0.0.0.0:8080`
- ✅ Service running

## How to Verify VITE_API_URL is Being Used

### Test in Browser Console

1. Visit: `https://nxtgenalpha.com`
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Run:
   ```javascript
   // Check what API URL is being used
   console.log('API URL:', import.meta.env.VITE_API_URL);
   ```
5. **Expected:** Should show `https://web-production-776f1.up.railway.app`
6. **If shows:** `undefined` or old URL → Frontend hasn't redeployed yet

### Test in Network Tab

1. Open **Network** tab in DevTools
2. Reload page (F5)
3. Look for request to `/api/backtest/indicators`
4. Click on the request
5. Check **Request URL**:
   - ✅ Should be: `https://web-production-776f1.up.railway.app/api/backtest/indicators`
   - ❌ If shows: `https://nxtgenalpha.com/api/backtest/indicators` → Old build still deployed

## How Long to Wait

**Typical Timeline:**
- Setting `VITE_API_URL` variable: Instant
- Railway detecting change: ~30 seconds
- Triggering rebuild: ~1 minute
- Building frontend: 2-5 minutes
- Deploying: ~1 minute
- **Total: 3-7 minutes**

**If it's been more than 10 minutes:**
- Check if deployment failed
- Manually trigger redeploy
- Check build logs for errors

## Force Redeployment

If waiting doesn't work:

**Railway Dashboard → Frontend Service → Settings:**

1. Click **"Redeploy"** or **"Deploy"** button
2. Or change any variable (even temporarily) to trigger rebuild
3. Wait for deployment to complete

## Clear Browser Cache

Even after redeployment, browser might cache old build:

1. **Hard Refresh:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Or Clear Cache:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Or use Incognito/Private window

## Quick Diagnostic Steps

Run these in order:

### 1. Check Frontend Deployment Status
```bash
# Via Railway Dashboard - check latest deployment timestamp
```

### 2. Test API Directly (Should Work)
```bash
curl https://web-production-776f1.up.railway.app/api/backtest/indicators
```
**Expected:** JSON response ✅

### 3. Test in Browser Console
```javascript
// Should show backend URL
console.log(import.meta.env.VITE_API_URL);

// Should work
fetch('https://web-production-776f1.up.railway.app/api/backtest/indicators')
  .then(r => r.json())
  .then(d => console.log('✅ API works:', Object.keys(d.indicators)))
  .catch(e => console.error('❌ API failed:', e));
```

### 4. Check Network Tab
- Open DevTools → Network
- Reload page
- Find request to `/api/backtest/indicators`
- Check Request URL column
- Should show backend URL, not `nxtgenalpha.com`

## Common Issues

### Issue: Frontend Shows Old API URL

**Cause:** Frontend hasn't redeployed yet or browser cache

**Fix:**
1. Verify frontend redeployed (check timestamp)
2. Hard refresh browser (Ctrl+Shift+R)
3. Or clear browser cache

### Issue: Frontend Deployment Stuck

**Cause:** Build might be failing

**Fix:**
1. Check build logs for errors
2. Manually trigger redeploy
3. Check Railway service status

### Issue: Still Getting Errors After Redeploy

**Cause:** Browser cache or deployment not complete

**Fix:**
1. Hard refresh (Ctrl+Shift+R)
2. Try incognito/private window
3. Verify deployment status is "Deployed" (green)

## Expected Timeline

**Minimum Wait:** 3-5 minutes after setting `VITE_API_URL`

**If longer than 10 minutes:**
- Check deployment status
- Check build logs
- Manually trigger redeploy

## Next Steps

1. **Check Railway Dashboard** → Frontend Service → Deployments
2. **Verify latest deployment** is recent (after VITE_API_URL was set)
3. **Wait for "Deployed" status** (green checkmark)
4. **Hard refresh browser** (Ctrl+Shift+R)
5. **Test again**

