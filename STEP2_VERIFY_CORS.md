# Step 2: Verify CORS Configuration

## Overview

CORS (Cross-Origin Resource Sharing) allows your frontend (`https://nxtgenalpha.com`) to make requests to your backend (`https://web-production-776f1.up.railway.app`). Without proper CORS configuration, the browser will block API requests.

## Current Configuration

**Backend URL:** `https://web-production-776f1.up.railway.app`  
**Frontend URL:** `https://nxtgenalpha.com`

## Step-by-Step Instructions

### 1. Access Railway Dashboard

1. Go to: https://railway.app
2. Log in to your account
3. Select your project
4. Find the **Backend** service (the service running your FastAPI app)

### 2. Navigate to Variables

1. Click on the **Backend** service
2. Click on the **Variables** tab (in the top menu)
3. You'll see a list of environment variables

### 3. Check for CORS_ORIGINS

**Look for a variable named:** `CORS_ORIGINS`

**If it exists:**
- Check the value
- Should include: `https://nxtgenalpha.com`
- **Recommended value:**
  ```
  https://nxtgenalpha.com,https://www.nxtgenalpha.com
  ```
- **If it's missing or wrong:**
  - Click the variable
  - Edit the value
  - Set it to: `https://nxtgenalpha.com,https://www.nxtgenalpha.com`
  - Click **Save** or **Update**

**If it doesn't exist:**
- Click **"New Variable"** or **"Add Variable"** button
- **Name:** `CORS_ORIGINS`
- **Value:** `https://nxtgenalpha.com,https://www.nxtgenalpha.com`
- **Important:** 
  - Do NOT include quotes around the value
  - Separate multiple origins with commas (no spaces)
  - Include both `https://nxtgenalpha.com` and `https://www.nxtgenalpha.com`
- Click **Add** or **Save**

### 4. Check for FRONTEND_URL

**Also check for:** `FRONTEND_URL`

**If it exists:**
- Should be: `https://nxtgenalpha.com`
- **If different:** Update it

**If it doesn't exist:**
- Click **"New Variable"**
- **Name:** `FRONTEND_URL`
- **Value:** `https://nxtgenalpha.com`
- Click **Add** or **Save**

**Note:** `FRONTEND_URL` is used by the backend to add the frontend URL to allowed origins if it's not already in `CORS_ORIGINS`.

### 5. Verify Variables Are Set

After saving, you should see:
```
CORS_ORIGINS = https://nxtgenalpha.com,https://www.nxtgenalpha.com
FRONTEND_URL = https://nxtgenalpha.com
```

### 6. Restart Backend Service

**After changing CORS variables, restart the backend:**

1. Railway Dashboard → Backend Service → **Settings**
2. Scroll down to find **"Restart"** button
3. Click **"Restart"**
4. Wait for service to restart (usually 30-60 seconds)

**OR:**

1. Railway Dashboard → Backend Service → **Deployments**
2. Click on the latest deployment
3. Click **"Redeploy"** or **"Restart"**

### 7. Verify CORS in Backend Logs

**After restart, check backend logs:**

1. Railway Dashboard → Backend Service → **Logs**
2. Look for a line that says:
   ```
   CORS allowed origins: ['https://nxtgenalpha.com', 'https://www.nxtgenalpha.com']
   ```

**If you see this:** ✅ CORS is configured correctly

**If you see different origins or an error:** ❌ Check variables again

### 8. Test CORS from Browser

**Test CORS configuration:**

1. Visit: `https://nxtgenalpha.com`
2. Open browser console: Press **F12** → Click **Console** tab
3. Run this command:
   ```javascript
   fetch('https://web-production-776f1.up.railway.app/api/backtest/indicators', {
     method: 'GET',
     mode: 'cors',
     credentials: 'include'
   })
     .then(r => {
       console.log('✅ CORS works! Status:', r.status);
       return r.json();
     })
     .then(data => console.log('Data:', Object.keys(data.indicators || {})))
     .catch(err => {
       console.error('❌ CORS failed:', err.message);
       if (err.message.includes('CORS') || err.message.includes('Network')) {
         console.error('This is a CORS error. Check CORS_ORIGINS in Railway.');
       }
     });
   ```

**Expected result:**
- ✅ No CORS error
- ✅ Status 200
- ✅ JSON response with indicators

**If you get a CORS error:**
- ❌ `CORS_ORIGINS` is not set correctly
- ❌ Backend didn't restart after changing variables
- ❌ Check backend logs for CORS configuration

## Additional CORS Origins (If Needed)

**If your frontend also uses a Railway URL** (e.g., `https://frontend-production-xxxx.up.railway.app`):

Add it to `CORS_ORIGINS`:
```
https://nxtgenalpha.com,https://www.nxtgenalpha.com,https://frontend-production-xxxx.up.railway.app
```

**To find your frontend Railway URL:**
1. Railway Dashboard → Frontend Service → **Settings**
2. Look for **"Public Domain"** or **"Railway URL"**
3. Copy the URL
4. Add it to `CORS_ORIGINS` in backend variables

## Troubleshooting

### Issue: CORS error in browser console

**Error message might be:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Possible causes:**
1. `CORS_ORIGINS` doesn't include frontend URL
2. Backend didn't restart after changing variables
3. Typo in `CORS_ORIGINS` value

**Fix:**
1. Verify `CORS_ORIGINS` includes `https://nxtgenalpha.com`
2. Restart backend service
3. Check backend logs for CORS allowed origins
4. Hard refresh browser

### Issue: Backend logs show wrong origins

**If backend logs show:**
```
CORS allowed origins: ['http://localhost:3000', ...]
```

**This means:**
- `CORS_ORIGINS` variable is not set or not being read
- Backend is using default development origins

**Fix:**
1. Verify `CORS_ORIGINS` is set in Railway backend variables
2. Check for typos in variable name (must be exactly `CORS_ORIGINS`)
3. Restart backend service
4. Check logs again

### Issue: CORS works but requests still fail

**Possible causes:**
- Wrong API URL in frontend (`VITE_API_URL`)
- Backend API endpoint not responding
- Network issue

**Fix:**
1. Check `VITE_API_URL` in frontend (Step 1)
2. Test backend API directly (see Step 4)
3. Check backend logs for errors

## Verification Checklist

After completing Step 2, verify:

- [ ] `CORS_ORIGINS` is set in Railway Backend service variables
- [ ] Value includes: `https://nxtgenalpha.com,https://www.nxtgenalpha.com`
- [ ] `FRONTEND_URL` is set to: `https://nxtgenalpha.com`
- [ ] Backend service restarted after setting variables
- [ ] Backend logs show correct CORS allowed origins
- [ ] Browser console test shows no CORS errors
- [ ] API requests work from frontend

## Next Steps

After completing Step 2, proceed to:
- **Step 3:** Verify Google OAuth Configuration
- **Step 4:** Test API Directly from Browser

