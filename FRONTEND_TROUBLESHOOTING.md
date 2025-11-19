# Frontend Not Working - Troubleshooting Guide

## 🚨 "Application failed to respond" Error

If you see Railway's error page saying **"Application failed to respond"**, this means the container crashed or isn't starting. Follow these steps **immediately**:

### Immediate Checks:

1. **Check Deployment Status:**
   - Railway → Frontend Service → **Deployments** tab
   - Is the latest deployment **"Active"** or **"Failed"**?
   - If **"Failed"**, check build logs below

2. **Check Build Logs:**
   - Railway → Frontend Service → **Deployments** → Latest → **Build Logs**
   - Look for:
     - ❌ `npm run build` errors
     - ❌ TypeScript compilation errors
     - ❌ `COPY --from=build /app/dist` failures
     - ❌ Docker build failures

3. **Check Runtime Logs:**
   - Railway → Frontend Service → **Logs** tab
   - Look for:
     - ❌ No logs at all → Container crashed immediately
     - ❌ `nginx: [emerg]` → Nginx config error
     - ❌ `exec: /docker-entrypoint.sh: not found` → Script not created
     - ❌ Port binding errors

4. **Common Causes:**
   - **Build failed** → TypeScript errors or missing dependencies
   - **Missing dist folder** → Build didn't complete
   - **Nginx config error** → Syntax error in `nginx.conf`
   - **Missing environment variables** → `PORT` or `BACKEND_URL` not set
   - **Health check failing** → Container keeps restarting

### Quick Fixes:

1. **If build failed:**
   - Check build logs for specific errors
   - Ensure all TypeScript errors are fixed
   - Verify `package.json` dependencies are correct

2. **If container crashes:**
   - Check runtime logs for error messages
   - Verify `PORT` environment variable is set (Railway auto-sets this)
   - Verify `BACKEND_URL` is set correctly

3. **Redeploy:**
   - Frontend → Deployments → **Redeploy**
   - Wait for build to complete
   - Check logs again

---

## Step 1: Check What "Not Working" Means

What exactly do you see when visiting the frontend URL?

- ❌ **"Application failed to respond"** → Container crashed (see above)
- ❌ **Blank white page** → JavaScript error or build issue
- ❌ **502 Bad Gateway** → Nginx not running or misconfigured
- ❌ **404 Not Found** → Files not copied correctly
- ❌ **Backend JSON instead of React app** → Domain routing issue
- ❌ **Page loads but shows errors** → Check browser console
- ❌ **"Cannot connect to server"** → API URL misconfigured

## Step 2: Check Frontend Deployment Status

1. **Railway Dashboard** → **Frontend Service** → **Deployments** tab
2. Check latest deployment:
   - ✅ **"Active"** or **"Success"** → Frontend deployed, check Step 3
   - ❌ **"Failed"** → Check build logs (Step 4)
   - ⏳ **"Building"** → Wait for it to finish
   - ⏳ **"Queued"** → Wait for build slot

## Step 3: Check Frontend Logs

1. **Railway Dashboard** → **Frontend Service** → **Logs** tab
2. Look for these indicators:

### ✅ Frontend is Running (Good Signs):
```
nginx/1.x.x
start worker processes
```

### ❌ Frontend Build Failed (Bad Signs):
- `npm run build` errors
- TypeScript compilation errors
- Missing dependencies
- Build timeout

### ❌ Nginx Not Running (Bad Signs):
- No nginx startup messages
- Port binding errors
- Missing files errors

## Step 4: Common Issues & Fixes

### Issue 1: Build Failed - TypeScript Errors

**Symptoms:**
- Build logs show TypeScript compilation errors
- `error TS2304: Cannot find name`
- `error TS2322: Type ... is not assignable`

**Fix:**
- All TypeScript errors should already be fixed
- If new errors appear, check the specific error message
- Ensure all files are committed and pushed

### Issue 2: VITE_API_URL Not Set

**Symptoms:**
- Frontend loads but API calls fail
- Console shows: `API URL is HTTP but page is HTTPS`
- Network requests fail

**Fix:**
1. **Frontend** → **Variables** tab
2. Ensure `VITE_API_URL` is set:
   ```
   VITE_API_URL=https://backend-production-e240a.up.railway.app
   ```
3. **Must be HTTPS** (not HTTP)
4. **No trailing slash**
5. After setting, frontend will auto-rebuild

### Issue 3: Build Files Not Copied

**Symptoms:**
- Nginx running but shows 404
- Logs show nginx started but files missing

**Fix:**
1. Check build logs for: `COPY --from=build /app/dist /usr/share/nginx/html`
2. Verify `npm run build` completed successfully
3. Check if `dist/` directory was created

### Issue 4: Nginx Configuration Error

**Symptoms:**
- Logs show nginx errors
- Port binding failures
- Configuration syntax errors

**Fix:**
1. Verify `nginx.conf` syntax is correct
2. Check `PORT` environment variable is set (Railway auto-sets this)
3. Verify `BACKEND_URL` is set correctly

### Issue 5: Blank White Page

**Symptoms:**
- Page loads but shows blank white screen
- No errors in Railway logs
- Browser console shows JavaScript errors

**Fix:**
1. **Open browser DevTools** (F12)
2. **Console tab** - Look for errors:
   - `Uncaught ReferenceError`
   - `Failed to load resource`
   - `Mixed Content` errors
3. **Network tab** - Check if files are loading:
   - `index.html` should load
   - `index-xxxxx.js` should load
   - `index-xxxxx.css` should load

### Issue 6: Shows Backend JSON Instead of React App

**Symptoms:**
- Visiting frontend URL shows backend API response
- JSON data instead of HTML

**Fix:**
1. **Domain routing issue:**
   - Railway → Frontend → Settings → Networking
   - Ensure frontend has public domain
   - Railway → Backend → Settings → Networking
   - Ensure backend domain is DIFFERENT from frontend

2. **Test Railway URLs directly:**
   - Frontend Railway URL: `https://frontend-production-xxxx.up.railway.app`
   - Backend Railway URL: `https://backend-production-xxxx.up.railway.app`
   - They should be different!

## Step 5: Verify Frontend Configuration

### Check Environment Variables:

**Frontend Service** → **Variables** tab:

```
VITE_API_URL=https://backend-production-e240a.up.railway.app
BACKEND_URL=https://backend-production-e240a.up.railway.app
```

**Important:**
- Both should be the **backend** URL (not frontend)
- Must include `https://`
- No trailing slashes
- Use actual Railway backend URL

### Check Service Settings:

**Frontend Service** → **Settings** tab:

- **Root Directory:** `/` (repo root)
- **Dockerfile Path:** `Dockerfile.frontend`
- **Builder:** `Dockerfile`

## Step 6: Test Frontend Directly

1. **Get Frontend Railway URL:**
   - Railway → Frontend → Settings → Networking
   - Copy the public URL (e.g., `https://frontend-production-xxxx.up.railway.app`)

2. **Visit the URL:**
   - Should see React app (dashboard/login page)
   - Should NOT see backend JSON

3. **Check Browser Console:**
   - Open DevTools (F12)
   - Console tab - Look for errors
   - Network tab - Check API requests

4. **Test API Connection:**
   - Try logging in or signing up
   - Check if API requests succeed
   - Look for CORS errors

## Step 7: Quick Fixes

### Fix 1: Rebuild Frontend

1. **Frontend** → **Deployments** → **Redeploy**
2. Wait for build to complete
3. Check logs for errors

### Fix 2: Update Environment Variables

1. **Frontend** → **Variables**
2. Verify `VITE_API_URL` and `BACKEND_URL` are correct
3. Frontend will auto-rebuild after saving

### Fix 3: Check Build Logs

1. **Frontend** → **Deployments** → Latest → **Build Logs**
2. Look for:
   - `npm run build` completion
   - `dist/` directory creation
   - Any errors or warnings

## Step 8: Diagnostic Checklist

- [ ] Frontend deployment is "Active" or "Success"
- [ ] Frontend logs show nginx running
- [ ] `VITE_API_URL` is set correctly (HTTPS, backend URL)
- [ ] `BACKEND_URL` is set correctly (HTTPS, backend URL)
- [ ] Frontend Railway URL shows React app (not backend JSON)
- [ ] Browser console shows no critical errors
- [ ] Network requests to `/api/` succeed

## Still Not Working?

1. **Share Frontend Logs:**
   - Copy last 50-100 lines from Frontend → Logs
   - Look for errors or warnings

2. **Share Build Logs:**
   - Frontend → Deployments → Latest → Build Logs
   - Look for build failures

3. **Share Browser Console:**
   - Open DevTools → Console
   - Copy any error messages

4. **Check Service URLs:**
   - Frontend URL: `https://frontend-production-xxxx.up.railway.app`
   - Backend URL: `https://backend-production-e240a.up.railway.app`
   - They should be different!

