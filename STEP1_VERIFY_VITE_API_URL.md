# Step 1: Verify and Fix VITE_API_URL

## Overview

The `VITE_API_URL` environment variable is **baked into the frontend build** at build time. This means:
- After changing `VITE_API_URL`, the frontend **must be rebuilt**
- The old build continues to use the old API URL until redeployment
- Typical rebuild time: 3-7 minutes

## Current Backend URL

**Your backend URL is:**
```
https://web-production-776f1.up.railway.app
```

## Step-by-Step Instructions

### 1. Access Railway Dashboard

1. Go to: https://railway.app
2. Log in to your account
3. Select your project
4. Find the **Frontend** service (or the service running your React app)

### 2. Navigate to Variables

1. Click on the **Frontend** service
2. Click on the **Variables** tab (in the top menu)
3. You'll see a list of environment variables

### 3. Check for VITE_API_URL

**Look for a variable named:** `VITE_API_URL`

**If it exists:**
- Check the value
- Should be: `https://web-production-776f1.up.railway.app`
- **If it's different or wrong:**
  - Click the variable
  - Edit the value
  - Set it to: `https://web-production-776f1.up.railway.app`
  - Click **Save** or **Update**

**If it doesn't exist:**
- Click **"New Variable"** or **"Add Variable"** button
- **Name:** `VITE_API_URL`
- **Value:** `https://web-production-776f1.up.railway.app`
- **Important:** Do NOT include quotes around the value
- Click **Add** or **Save**

### 4. Verify the Variable is Set

After saving, you should see:
```
VITE_API_URL = https://web-production-776f1.up.railway.app
```

### 5. Wait for Redeployment

**After setting/changing `VITE_API_URL`:**

1. Railway will automatically detect the change
2. It will trigger a rebuild of the frontend
3. **This takes 3-7 minutes**

**How to check if redeployment is happening:**
- Go to **Deployments** tab in the Frontend service
- You should see a new deployment starting
- Status will show "Building" then "Deployed"

### 6. Verify Deployment Completed

**Railway Dashboard → Frontend Service → Deployments:**

1. Look at the **latest deployment**
2. **Status should be:** "Deployed" (green checkmark)
3. **Timestamp should be:** Recent (after you set/changed VITE_API_URL)
4. **If status is "Building":** Wait for it to complete
5. **If status is "Failed":** Click on it to see error logs

### 7. Verify in Browser (After Redeploy)

**After frontend redeploys, test in browser:**

1. Visit: `https://nxtgenalpha.com`
2. Open browser console: Press **F12** → Click **Console** tab
3. Run this command:
   ```javascript
   console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
   ```

**Expected result:**
```
VITE_API_URL: https://web-production-776f1.up.railway.app
```

**If it shows:**
- `undefined` → Frontend hasn't redeployed yet (wait longer)
- `https://nxtgenalpha.com` → Wrong value (check Railway variables again)
- Old URL → Frontend hasn't redeployed yet (wait longer)

### 8. Hard Refresh Browser

**Even after redeploy, browser may cache old build:**

1. **Hard refresh:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Or use incognito/private window:**
   - Chrome: `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
   - Firefox: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
   - Safari: `Cmd+Shift+N` (Mac)

## Force Redeployment (If Needed)

**If Railway didn't automatically redeploy:**

### Option 1: Manual Redeploy

1. Railway Dashboard → Frontend Service → **Settings**
2. Scroll down to find **"Redeploy"** button
3. Click **"Redeploy"**
4. Wait for deployment to complete

### Option 2: Trigger by Changing Variable

1. Railway Dashboard → Frontend Service → **Variables**
2. Edit `VITE_API_URL`
3. Add a space at the end: `https://web-production-776f1.up.railway.app `
4. Click **Save**
5. Edit again
6. Remove the space
7. Click **Save**
8. This triggers a rebuild

## Troubleshooting

### Issue: Variable not saving

**Possible causes:**
- Network issue
- Railway dashboard glitch

**Fix:**
1. Refresh Railway dashboard
2. Try again
3. Check if variable appears in list

### Issue: Deployment not triggering

**Possible causes:**
- Railway didn't detect change
- Service is paused

**Fix:**
1. Check service status (should be "Active")
2. Manually trigger redeploy (see above)
3. Check deployment logs for errors

### Issue: Build failing

**Possible causes:**
- Build error in code
- Missing dependencies

**Fix:**
1. Check deployment logs
2. Look for error messages
3. Fix any build errors
4. Redeploy

### Issue: Still shows old URL after redeploy

**Possible causes:**
- Browser cache
- Redeployment not complete

**Fix:**
1. Hard refresh browser (`Ctrl+Shift+R`)
2. Use incognito window
3. Clear browser cache
4. Verify deployment completed (check timestamp)

## Verification Checklist

After completing Step 1, verify:

- [ ] `VITE_API_URL` is set in Railway Frontend service variables
- [ ] Value is exactly: `https://web-production-776f1.up.railway.app`
- [ ] Frontend redeployed after setting variable (check Deployments tab)
- [ ] Latest deployment status is "Deployed" (green)
- [ ] Browser console shows correct URL: `import.meta.env.VITE_API_URL`
- [ ] Hard refreshed browser after redeploy

## Next Steps

After completing Step 1, proceed to:
- **Step 2:** Verify CORS Configuration
- **Step 3:** Verify Google OAuth Configuration
- **Step 4:** Test API Directly from Browser

