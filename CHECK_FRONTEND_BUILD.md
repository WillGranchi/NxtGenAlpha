# How to Check if Frontend Has Redeployed

## Quick Check in Browser

**Visit your site and open browser console (F12):**

```javascript
// This will show what API URL is baked into the current build
console.log('Current API URL:', import.meta.env.VITE_API_URL);
```

**What you should see:**
- ✅ `https://web-production-776f1.up.railway.app` = New build deployed
- ❌ `undefined` or `https://nxtgenalpha.com` = Old build still running

## Check Railway Dashboard

1. **Go to:** Railway Dashboard → Your Project → Frontend Service
2. **Click:** "Deployments" tab
3. **Look at:** Latest deployment
4. **Check:**
   - **Status:** Should be "Deployed" (green)
   - **Timestamp:** Should be **AFTER** you set `VITE_API_URL`
   - **If timestamp is old:** Frontend hasn't redeployed yet

## If Frontend Hasn't Redeployed

**Option 1: Wait Longer (Recommended)**
- Railway can take 3-7 minutes to rebuild
- Check back in 5 minutes

**Option 2: Force Redeploy**
1. Railway Dashboard → Frontend Service → Settings
2. Click "Redeploy" button
3. Wait for build to complete

**Option 3: Trigger by Changing Variable**
1. Railway Dashboard → Frontend Service → Variables
2. Temporarily change `VITE_API_URL` (add a space)
3. Save
4. Change it back to correct value
5. Save again
6. This triggers a rebuild

## After Redeployment

**Don't forget to:**
1. **Hard refresh browser:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Or clear cache:** Or use incognito/private window
3. **Test again:** Check if indicators load

## How to Know It's Working

**In browser console:**
```javascript
// Should show backend URL
console.log(import.meta.env.VITE_API_URL);
// Expected: "https://web-production-776f1.up.railway.app"

// Should work
fetch('/api/backtest/indicators')
  .then(r => r.json())
  .then(d => console.log('✅ Success!', Object.keys(d.indicators)))
  .catch(e => console.error('❌ Failed:', e));
```

**Expected result:**
- No "Failed to fetch indicators" error
- Indicators load
- Google sign-in redirects correctly

