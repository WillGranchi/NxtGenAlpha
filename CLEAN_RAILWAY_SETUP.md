# Clean Railway Setup - Start From Scratch

This guide will help you delete existing services and set up everything correctly from the beginning.

## ⚠️ IMPORTANT: Save These Before Deleting

Before deleting services, **save these values** (you'll need them later):

### 1. Environment Variable Values
Go to each service → Variables tab and copy these values:

**From Backend Service:**
- `GOOGLE_CLIENT_ID` (your-client-id-here)
- `GOOGLE_CLIENT_SECRET` (your-client-secret-here)
- `JWT_SECRET_KEY` (your-jwt-secret-here)
- `DATABASE_URL` (or note the PostgreSQL service name)
- `FRONTEND_URL` 
- `BACKEND_URL`
- `CORS_ORIGINS`

**From Frontend Service:**
- `VITE_API_URL`
- `BACKEND_URL`

### 2. PostgreSQL Database
**DO NOT DELETE THE DATABASE SERVICE** - Keep it! You'll reuse it.

If you accidentally delete it, you'll lose all your data. Just delete the **Backend** and **Frontend** services.

---

## Step 1: Delete Services (Keep Database!)

### Delete Backend Service
1. Go to Railway Dashboard
2. Click on **Backend** service
3. Go to **Settings** tab
4. Scroll to bottom
5. Click **"Delete Service"** or **"Remove Service"**
6. Confirm deletion

### Delete Frontend Service
1. Go to Railway Dashboard
2. Click on **Frontend** service
3. Go to **Settings** tab
4. Scroll to bottom
5. Click **"Delete Service"** or **"Remove Service"**
6. Confirm deletion

### ✅ Keep PostgreSQL Service
**DO NOT DELETE** the PostgreSQL database service!

---

## Step 2: Create Backend Service (Fresh Start)

### 2.1: Create New Backend Service
1. In Railway project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Select your repository: `WillGranchi/NxtGenAlpha`
4. Railway will create a new service

### 2.2: Configure Backend Service Settings
1. Click on the new service (Railway may name it something generic)
2. Go to **Settings** tab
3. **Rename service** to "Backend" (optional but helpful)
4. Configure these settings:

   **Root Directory:** `/` (repo root)
   
   **Dockerfile Path:** `Dockerfile.backend` (manually set this - root railway.json was renamed)
   
   **Builder:** `Dockerfile` (should auto-detect, but verify)

5. **Save** settings

### 2.3: Set Backend Environment Variables
1. Go to **Variables** tab
2. Add these variables one by one:

```
PYTHONPATH=/app
```

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```
*(Replace "Postgres" with your actual PostgreSQL service name - check in Railway)*

```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
```
*(Paste the value you saved earlier)*

```
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```
*(Paste the value you saved earlier - Mark as Secret)*

```
JWT_SECRET_KEY=hPHgbVWmwt9KWFAbqBWOajDTr96yE-D3EH8J_yudIWQ
```
*(Mark as Secret)*

```
JWT_ALGORITHM=HS256
```

```
FRONTEND_URL=https://nxtgenalpha.com
```
*(Or your actual frontend domain)*

```
BACKEND_URL=https://web-production-776f1.up.railway.app
```
*(You'll update this after deployment - use the Railway-generated URL)*

```
CORS_ORIGINS=https://nxtgenalpha.com
```
*(Or your actual frontend domain)*

```
ENVIRONMENT=production
```
*(Note: ENVIRONMENT, not ENVIROMENT)*

```
COOKIE_SECURE=true
```

```
COOKIE_SAMESITE=lax
```

3. **Mark secrets:** Click the eye icon for `JWT_SECRET_KEY` and `GOOGLE_CLIENT_SECRET`

### 2.4: Get Backend URL
1. After deployment starts, go to **Settings** → **Networking**
2. Find the **Public Domain** or Railway-generated URL
3. Copy it (e.g., `https://web-production-XXXX.up.railway.app`)
4. **Update `BACKEND_URL` variable** with this URL (no trailing slash)

---

## Step 3: Create Frontend Service (Fresh Start)

### 3.1: Create New Frontend Service
1. In Railway project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Select your repository: `WillGranchi/NxtGenAlpha`
4. Railway will create a new service

### 3.2: Configure Frontend Service Settings
1. Click on the new service
2. Go to **Settings** tab
3. **Rename service** to "Frontend" (optional but helpful)
4. Configure these settings:

   **Option A (Recommended):**
   - **Root Directory:** `frontend/`
   - **Dockerfile Path:** (leave empty or auto-detect - will use `frontend/railway.json`)
   - **Builder:** `Dockerfile`
   
   **Option B (Alternative):**
   - **Root Directory:** `/` (repo root)
   - **Dockerfile Path:** `Dockerfile.frontend` (manually set this)
   - **Builder:** `Dockerfile`

5. **Save** settings

### 3.3: Set Frontend Environment Variables
1. Go to **Variables** tab
2. Add these variables:

```
VITE_API_URL=https://web-production-776f1.up.railway.app
```
*(Use the backend URL from Step 2.4 - no trailing slash)*

```
BACKEND_URL=https://web-production-776f1.up.railway.app
```
*(Same as above - for nginx proxy)*

**Note:** Update these URLs after backend deployment completes and you have the actual backend URL.

---

## Step 4: Wait for Deployments

### Backend Deployment
1. Go to **Backend Service** → **Deployments**
2. Wait for deployment to complete (2-5 minutes)
3. Check **Logs** tab - should see:
   - `Uvicorn running on http://0.0.0.0:XXXX` (with actual port)
   - `Application startup complete`
   - **NO** "Invalid value for '--port'" errors

### Frontend Deployment
1. Go to **Frontend Service** → **Deployments**
2. Wait for deployment to complete (3-7 minutes)
3. Check **Logs** tab - should see:
   - `nginx/1.29.3`
   - `start worker processes`
   - **NO** uvicorn errors

---

## Step 5: Update URLs After Deployment

### 5.1: Get Actual Backend URL
1. Railway → **Backend Service** → **Settings** → **Networking**
2. Copy the Railway-generated URL
3. Update these variables:

**Backend Service Variables:**
- `BACKEND_URL` = `https://YOUR-ACTUAL-BACKEND-URL` (no trailing slash)

**Frontend Service Variables:**
- `VITE_API_URL` = `https://YOUR-ACTUAL-BACKEND-URL` (no trailing slash)
- `BACKEND_URL` = `https://YOUR-ACTUAL-BACKEND-URL` (no trailing slash)

### 5.2: Redeploy Frontend
After updating `VITE_API_URL`, the frontend needs to rebuild:
1. Go to **Frontend Service** → **Deployments**
2. Click **"Redeploy"**
3. Wait for rebuild (3-7 minutes)

---

## Step 6: Verify Everything Works

### 6.1: Test Backend
```bash
curl https://YOUR-BACKEND-URL/health
```
Should return: `{"status":"healthy"}`

### 6.2: Test Frontend
1. Visit your frontend Railway URL
2. Should see the React app (not 502 error)
3. Open DevTools → Console
4. Should see no major errors

### 6.3: Test API Proxy
1. Visit: `https://YOUR-FRONTEND-URL/api/health`
2. Should proxy to backend and return health status

---

## Troubleshooting

### If Backend Still Shows PORT Errors
- Check that Railway is using `Dockerfile.backend` (not Procfile)
- Verify `railway.json` exists in repo root with correct config

### If Frontend Shows Backend Code
- Verify Dockerfile Path is `Dockerfile.frontend` (not `Dockerfile.backend`)
- Check Root Directory is `/` (not `frontend/`)

### If Database Connection Fails
- Verify `DATABASE_URL` uses correct service name: `${{Postgres.DATABASE_URL}}`
- Check PostgreSQL service is running
- Verify service name matches (might be "Postgres", "PostgreSQL", etc.)

---

## Quick Checklist

- [ ] Saved all environment variable values
- [ ] Deleted Backend service (kept Database)
- [ ] Deleted Frontend service (kept Database)
- [ ] Created new Backend service
- [ ] Set Backend Root Directory = `/`
- [ ] Set Backend Dockerfile Path = `Dockerfile.backend`
- [ ] Set all 12 Backend environment variables
- [ ] Marked secrets (JWT_SECRET_KEY, GOOGLE_CLIENT_SECRET)
- [ ] Created new Frontend service
- [ ] Set Frontend Root Directory = `/`
- [ ] Set Frontend Dockerfile Path = `Dockerfile.frontend`
- [ ] Set Frontend environment variables (VITE_API_URL, BACKEND_URL)
- [ ] Updated URLs after deployment
- [ ] Redeployed frontend after URL updates
- [ ] Tested backend health endpoint
- [ ] Tested frontend loads correctly
- [ ] Tested API proxy works

---

## Files Already Fixed in Code

✅ `Dockerfile.backend` - Fixed PORT expansion  
✅ `Dockerfile.frontend` - Added trailing slash fix  
✅ `frontend/nginx.conf` - Added DNS resolver and proxy config  
✅ `frontend/Dockerfile` - Added trailing slash fix  
✅ `.dockerignore` - Removed Dockerfile ignore  
✅ `Procfile` - Fixed PORT expansion  
✅ `railway.json` - Backend configuration  
✅ `frontend/railway.json` - Frontend configuration  

All code is ready. Just configure Railway correctly!

