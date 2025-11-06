# Getting Your Site Operational Online - Step-by-Step Checklist

## Current Status Summary

✅ **Completed:**
- Backend CORS configuration fixed (accepts requests from nxtgenalpha.com)
- Backend service running and healthy
- Database tables exist (created via init_db())
- Frontend build configuration correct (uses `serve` package)

⚠️ **Needs Attention:**
- Frontend service deployment/routing (502 error suggests issue here)
- Environment variables may need final verification
- Domain routing configuration
- Google OAuth production setup

---

## Step 1: Verify Frontend Service Deployment (CRITICAL)

The 502 error suggests the frontend service may not be running or configured correctly.

### 1.1 Check Frontend Service Status

1. Go to Railway dashboard: https://railway.app
2. Select project: **comfortable-imagination**
3. Look for **Frontend service** (or check if it exists)
4. Go to **Deployments** tab → Check latest deployment:
   - ✅ Should show "Deployed" status
   - ⚠️ If "Failed" or "Building", check logs

### 1.2 Verify Frontend Service Configuration

**Railway Dashboard → Frontend Service → Settings:**

1. **Root Directory:** Should be `frontend/`
   - If not set, click "Edit" and set to `frontend/`

2. **Start Command:** Should be `npm start` (or auto-detected)
   - This runs: `serve -s dist -l ${PORT:-3000}`
   - Verify in Settings → Start Command

3. **Build Command:** Should be `npm run build` (auto-detected)
   - This runs: `tsc && vite build`

### 1.3 Check Frontend Service Logs

**Railway Dashboard → Frontend Service → Logs:**

Look for:
- ✅ `"Serving!"` message from serve package
- ✅ `"→ Local: http://localhost:PORT/"`
- ✅ `"→ Network: http://0.0.0.0:PORT/"`
- ❌ Any build errors
- ❌ Any startup errors

**If you see errors:**
- Build errors → Check `package-lock.json` is in sync (we fixed this earlier)
- "serve: command not found" → Check `package.json` has `serve` in dependencies (we added this)
- Port binding errors → Check PORT environment variable is set (Railway sets this automatically)

---

## Step 2: Verify Environment Variables

### 2.1 Backend Service Variables

**Railway Dashboard → Backend Service → Variables:**

Verify these are set (we already set CORS_ORIGINS and FRONTEND_URL):

```
✅ CORS_ORIGINS=https://nxtgenalpha.com,https://www.nxtgenalpha.com
✅ FRONTEND_URL=https://nxtgenalpha.com
✅ PYTHONPATH=/app
✅ DATABASE_URL=${{Postgres.DATABASE_URL}} (or actual connection string)
✅ JWT_SECRET_KEY=hPHgbVWmwt9KWFAbqBWOajDTr96yE-D3EH8J_yudIWQ
✅ JWT_ALGORITHM=HS256
✅ BACKEND_URL=https://nxtgenalpha.com
✅ ENVIRONMENT=production
✅ COOKIE_SECURE=true
✅ COOKIE_SAMESITE=lax
⚠️ GOOGLE_CLIENT_ID=<your-production-client-id> (needs Google OAuth setup)
⚠️ GOOGLE_CLIENT_SECRET=<your-production-client-secret> (needs Google OAuth setup)
```

**Mark as Secret:** Click eye icon (👁️) next to:
- `JWT_SECRET_KEY`
- `GOOGLE_CLIENT_SECRET`

### 2.2 Frontend Service Variables

**Railway Dashboard → Frontend Service → Variables:**

Verify this is set:
```
✅ VITE_API_URL=https://nxtgenalpha.com
```

**Note:** If your domain isn't working yet, you can temporarily use the Railway backend URL:
```
VITE_API_URL=https://web-production-776f1.up.railway.app
```

Then update to `https://nxtgenalpha.com` after domain is configured.

---

## Step 3: Configure Domain Routing

The 502 error might be because `nxtgenalpha.com` isn't properly routed to your services.

### 3.1 Add Domain to Railway

**Option A: Single Service (Backend serves both API and frontend)**

If you want `nxtgenalpha.com` to serve the backend API:

1. Railway Dashboard → Backend Service → Settings → Domains
2. Click "Generate Domain" or "Add Custom Domain"
3. Enter: `nxtgenalpha.com`
4. Railway will provide DNS instructions

**Option B: Separate Services (Recommended)**

If you have separate frontend and backend services:

1. **Frontend Domain:**
   - Railway Dashboard → Frontend Service → Settings → Domains
   - Add custom domain: `nxtgenalpha.com`
   - Railway provides DNS instructions

2. **Backend Domain (if needed):**
   - Railway Dashboard → Backend Service → Settings → Domains
   - You can use Railway-generated URL or add `api.nxtgenalpha.com`

### 3.2 Configure DNS Records

1. Go to your domain registrar (where you bought nxtgenalpha.com)
2. Add DNS records as instructed by Railway:
   - Usually a **CNAME** record pointing to Railway's domain
   - Or **A** records with Railway's IP addresses
3. Wait for DNS propagation (5 minutes to 48 hours)
4. Railway will automatically provision SSL certificate once DNS resolves

### 3.3 Verify Domain is Active

After DNS propagates:
- Railway Dashboard → Service → Settings → Domains
- Should show green checkmark ✓
- Should show "SSL Active" or similar

---

## Step 4: Verify Services Are Running

### 4.1 Test Backend API

```bash
# Test backend health endpoint
curl https://web-production-776f1.up.railway.app/api/health

# Or if domain is configured:
curl https://nxtgenalpha.com/api/health
```

**Expected:** JSON response with status

### 4.2 Test Frontend

1. Visit Railway-generated frontend URL (if domain not configured yet)
2. Or visit `https://nxtgenalpha.com` (after domain is configured)
3. Should see the React app loading

### 4.3 Check Service Logs

**Backend Logs** (Railway Dashboard → Backend Service → Logs):
- Should see: `CORS allowed origins: ['https://nxtgenalpha.com', ...]`
- Should see: `Application startup complete`
- Should see: `Database initialized successfully`

**Frontend Logs** (Railway Dashboard → Frontend Service → Logs):
- Should see: `Serving!` message
- Should see: Port binding confirmation
- Should NOT see build errors

---

## Step 5: Google OAuth Production Setup (For Authentication)

This is required for users to sign in and save strategies.

### 5.1 Google Cloud Console Setup

1. Go to: https://console.cloud.google.com
2. Navigate to: **APIs & Services** → **Credentials**
3. Open your OAuth 2.0 Client ID (or create new one)
4. Under **Authorized JavaScript origins**, add:
   - `https://nxtgenalpha.com`
5. Under **Authorized redirect URIs**, add:
   - `https://nxtgenalpha.com/api/auth/google/callback`
6. Click **Save**
7. Copy the **Client ID** and **Client Secret**

### 5.2 Add to Railway

1. Railway Dashboard → Backend Service → Variables
2. Add:
   - `GOOGLE_CLIENT_ID` = (paste your Client ID)
   - `GOOGLE_CLIENT_SECRET` = (paste your Client Secret)
3. Mark `GOOGLE_CLIENT_SECRET` as "Secret" (click eye icon)
4. Railway will auto-redeploy

---

## Step 6: Final Testing Checklist

Once everything is configured, test:

### 6.1 Basic Functionality

- [ ] Visit `https://nxtgenalpha.com` - site loads
- [ ] No CORS errors in browser console
- [ ] API calls succeed (check Network tab)
- [ ] Backend health endpoint works: `https://nxtgenalpha.com/api/health`

### 6.2 Core Features

- [ ] Indicator catalog loads
- [ ] Strategy builder works
- [ ] Can run a backtest
- [ ] Results display (metrics, charts, trade log)
- [ ] Date range picker works

### 6.3 Authentication (After OAuth Setup)

- [ ] "Sign in with Google" button appears
- [ ] Can click and redirect to Google
- [ ] Can authenticate and return to site
- [ ] User profile shows after login
- [ ] Can save strategies (requires login)
- [ ] Can load saved strategies

---

## Troubleshooting Common Issues

### Issue: 502 Bad Gateway

**Possible Causes:**
1. Frontend service not running
   - **Fix:** Check frontend service logs, verify deployment succeeded
2. Domain not routed correctly
   - **Fix:** Verify domain is added to correct service in Railway
3. Port binding issue
   - **Fix:** Verify `PORT` environment variable is set (Railway sets this automatically)
4. Build failed
   - **Fix:** Check build logs, verify `package-lock.json` is in sync

### Issue: CORS Errors in Browser

**Possible Causes:**
1. CORS_ORIGINS not set correctly
   - **Fix:** We already set this, but verify in Railway dashboard
2. Frontend using wrong API URL
   - **Fix:** Verify `VITE_API_URL` is set correctly in frontend service
3. Mismatch between frontend domain and CORS_ORIGINS
   - **Fix:** Ensure `CORS_ORIGINS` includes the exact frontend domain

### Issue: Frontend Shows Blank Page

**Possible Causes:**
1. Build failed
   - **Fix:** Check frontend build logs
2. JavaScript errors
   - **Fix:** Check browser console for errors
3. API URL incorrect
   - **Fix:** Verify `VITE_API_URL` environment variable

### Issue: "Application failed to respond"

**Possible Causes:**
1. Service crashed on startup
   - **Fix:** Check service logs for startup errors
2. Service not binding to port
   - **Fix:** Verify start command is correct (`npm start` for frontend)
3. Service timeout
   - **Fix:** Check Railway service is active and not sleeping

---

## Quick Verification Commands

```bash
# Check backend is responding
curl https://web-production-776f1.up.railway.app/

# Check frontend (if you have the Railway URL)
curl https://YOUR-FRONTEND-URL.up.railway.app/

# Check Railway status
railway status

# View backend logs
railway logs --service web --tail 50

# View frontend logs (if service name is different)
railway logs --service frontend --tail 50
```

---

## Priority Order

**Do these first (to get site working):**

1. ✅ Verify frontend service is deployed and running
2. ✅ Check frontend service logs for errors
3. ✅ Verify `VITE_API_URL` is set in frontend service
4. ✅ Configure domain routing (add `nxtgenalpha.com` to Railway)
5. ✅ Configure DNS records at domain registrar
6. ✅ Wait for DNS propagation and SSL certificate

**Then configure (for full functionality):**

7. Configure Google OAuth (for authentication)
8. Test all features
9. Monitor logs for any issues

---

## Success Indicators

You'll know the site is working when:

✅ Visiting `https://nxtgenalpha.com` shows the React app (not 502 error)  
✅ Browser console shows no CORS errors  
✅ Network tab shows successful API calls  
✅ Backend logs show: `CORS allowed origins: ['https://nxtgenalpha.com', ...]`  
✅ Frontend logs show: `Serving!` message  
✅ Can interact with the app (select indicators, build strategies, run backtests)

---

**Next Action:** Start with Step 1 - Verify Frontend Service Deployment

The 502 error is most likely because:
- Frontend service isn't deployed/running
- Domain isn't routed to the correct service
- Frontend service configuration is incorrect

Check the Railway dashboard first to see the actual status of your frontend service.

