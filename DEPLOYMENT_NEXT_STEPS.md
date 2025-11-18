# Deployment Next Steps

## Current Status Check

Before proceeding, verify your current Railway deployment status:

### 1. Check Railway Dashboard
- [ ] Log into [Railway Dashboard](https://railway.app)
- [ ] Check if you have existing services:
  - Backend service
  - Frontend service  
  - PostgreSQL database service

### 2. Determine Your Path

**If you have NO services deployed yet:**
→ Follow **Path A: Fresh Deployment** below

**If you have services but they're not working:**
→ Follow **Path B: Fix Existing Deployment** below

**If services are working but need updates:**
→ Follow **Path C: Update Existing Deployment** below

---

## Path A: Fresh Deployment

### Step 1: Create Backend Service

1. **Create New Service**
   - Railway Dashboard → Click **"+ New"**
   - Select **"GitHub Repo"**
   - Connect your repository: `WillGranchi/NxtGenAlpha` (or your repo name)
   - Railway creates a new service

2. **Configure Backend Settings**
   - Click on the new service
   - Go to **Settings** tab
   - Configure:
     - **Name:** `Backend` (optional, for clarity)
     - **Root Directory:** `/` (repo root)
     - **Dockerfile Path:** `Dockerfile.backend`
     - **Builder:** `Dockerfile` (auto-detected)

3. **Set Backend Environment Variables**
   Go to **Variables** tab and add:

   ```bash
   # Python Path
   PYTHONPATH=/app
   
   # Database (replace "Postgres" with your actual PostgreSQL service name)
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   
   # Google OAuth (get from Google Cloud Console)
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   
   # JWT Configuration
   JWT_SECRET_KEY=generate-a-random-secret-key-here
   JWT_ALGORITHM=HS256
   
   # URLs (update after deployment)
   FRONTEND_URL=https://your-frontend-domain.com
   BACKEND_URL=https://your-backend-railway-url.up.railway.app
   CORS_ORIGINS=https://your-frontend-domain.com
   
   # Environment
   ENVIRONMENT=production
   COOKIE_SECURE=true
   COOKIE_SAMESITE=lax
   ```

   **Mark as Secrets:** Click the eye icon for:
   - `GOOGLE_CLIENT_SECRET`
   - `JWT_SECRET_KEY`

4. **Get Backend URL**
   - After deployment starts, go to **Settings** → **Networking**
   - Copy the Railway-generated URL (e.g., `https://web-production-XXXX.up.railway.app`)
   - **Update `BACKEND_URL` variable** with this URL (no trailing slash)

### Step 2: Create PostgreSQL Database

1. **Create Database Service**
   - Railway Dashboard → Click **"+ New"**
   - Select **"Database"** → **"Add PostgreSQL"**
   - Railway creates PostgreSQL service

2. **Get Database URL**
   - Click on PostgreSQL service
   - Go to **Variables** tab
   - Copy the `DATABASE_URL` value
   - **Update Backend's `DATABASE_URL`** variable to use: `${{Postgres.DATABASE_URL}}`
     (Replace "Postgres" with your actual service name)

### Step 3: Create Frontend Service

1. **Create New Service**
   - Railway Dashboard → Click **"+ New"**
   - Select **"GitHub Repo"**
   - Select same repository: `WillGranchi/NxtGenAlpha`

2. **Configure Frontend Settings**
   - Click on the new service
   - Go to **Settings** tab
   - Configure:
     - **Name:** `Frontend`
     - **Root Directory:** `frontend/` (recommended)
     - **Dockerfile Path:** (leave empty - auto-detects from `frontend/railway.json`)
     - **Builder:** `Dockerfile`

3. **Set Frontend Environment Variables**
   Go to **Variables** tab and add:

   ```bash
   # Backend API URL (use the backend URL from Step 1.4)
   VITE_API_URL=https://your-backend-railway-url.up.railway.app
   
   # Backend URL for nginx proxy (same as above)
   BACKEND_URL=https://your-backend-railway-url.up.railway.app
   ```

   **Important:** These URLs must match your actual backend Railway URL (no trailing slashes)

### Step 4: Wait for Deployments

1. **Monitor Backend Deployment**
   - Go to **Backend Service** → **Deployments** tab
   - Wait 2-5 minutes for build to complete
   - Check **Logs** tab - should see:
     ```
     Uvicorn running on http://0.0.0.0:XXXX
     Application startup complete
     ```

2. **Monitor Frontend Deployment**
   - Go to **Frontend Service** → **Deployments** tab
   - Wait 3-7 minutes for build to complete
   - Check **Logs** tab - should see:
     ```
     nginx/1.29.3
     start worker processes
     ```

### Step 5: Verify Deployment

1. **Test Backend Health**
   ```bash
   curl https://your-backend-url.up.railway.app/health
   ```
   Should return: `{"status":"healthy"}`

2. **Test Frontend**
   - Visit your frontend Railway URL
   - Should see the React app (not 502 error)
   - Open browser DevTools → Console
   - Check for errors

3. **Test API Proxy**
   - Visit: `https://your-frontend-url.up.railway.app/api/health`
   - Should proxy to backend and return health status

---

## Path B: Fix Existing Deployment

### Step 1: Diagnose Issues

1. **Check Service Logs**
   - Backend Service → **Logs** tab
   - Frontend Service → **Logs** tab
   - Look for error messages

2. **Common Issues:**

   **Backend Issues:**
   - ❌ "Invalid value for '--port'" → Check Dockerfile.backend is being used
   - ❌ "Database connection failed" → Check DATABASE_URL variable
   - ❌ "Module not found" → Check requirements.txt includes all dependencies

   **Frontend Issues:**
   - ❌ "502 Bad Gateway" → Check BACKEND_URL is correct
   - ❌ "nginx errors" → Check nginx.conf syntax
   - ❌ "Build failed" → Check VITE_API_URL is set

### Step 2: Fix Configuration

1. **Verify Service Settings**
   - Backend: Root Directory = `/`, Dockerfile = `Dockerfile.backend`
   - Frontend: Root Directory = `frontend/`, Dockerfile = auto-detect

2. **Verify Environment Variables**
   - Check all variables from Path A, Step 1.3 and 3.3
   - Ensure URLs have no trailing slashes
   - Ensure secrets are marked as secret

3. **Redeploy Services**
   - Backend Service → **Deployments** → **Redeploy**
   - Frontend Service → **Deployments** → **Redeploy**

---

## Path C: Update Existing Deployment

### Step 1: Update Code

1. **Commit and Push Changes**
   ```bash
   git add .
   git commit -m "Update deployment configuration"
   git push origin main
   ```

2. **Railway Auto-Deploys**
   - Railway automatically detects new commits
   - Services will redeploy automatically

### Step 2: Update Environment Variables (if needed)

1. **If Backend URL Changed**
   - Update Frontend's `VITE_API_URL` and `BACKEND_URL`
   - Frontend will auto-redeploy

2. **If Adding New Variables**
   - Add to appropriate service
   - Service will redeploy automatically

---

## Step 6: Set Up Custom Domain (Optional)

### 6.1: Add Custom Domain to Frontend

1. **Railway Dashboard** → **Frontend Service** → **Settings** → **Networking**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `nxtgenalpha.com`)
4. Railway provides DNS records to add

### 6.2: Configure DNS

1. Go to your domain registrar (e.g., Namecheap, GoDaddy)
2. Add the CNAME record Railway provides
3. Wait for DNS propagation (5-60 minutes)

### 6.3: Update Environment Variables

After domain is active, update:
- **Backend:** `FRONTEND_URL` and `CORS_ORIGINS` to your custom domain
- **Frontend:** No changes needed (uses Railway URL internally)

---

## Step 7: Database Migrations

### 7.1: Run Migrations

If you have database migrations (e.g., for `password_hash` column):

1. **Option A: Local Migration Script**
   ```bash
   python3 backend/migrations/add_password_hash.py
   ```
   (Ensure DATABASE_URL is set to Railway database)

2. **Option B: Railway CLI**
   ```bash
   railway run python3 backend/migrations/add_password_hash.py
   ```

3. **Option C: Manual SQL**
   - Railway → PostgreSQL Service → **Data** tab
   - Run SQL commands directly

---

## Step 8: Final Verification Checklist

- [ ] Backend health endpoint returns `{"status":"healthy"}`
- [ ] Frontend loads without errors
- [ ] API proxy works (`/api/health` returns backend response)
- [ ] Can sign up with email/password
- [ ] Can log in with email/password
- [ ] Can log in with Google OAuth
- [ ] Can add indicators to strategy builder
- [ ] Can run backtest
- [ ] Results display correctly
- [ ] Custom domain works (if configured)
- [ ] SSL certificate is active (HTTPS)

---

## Troubleshooting Quick Reference

### Backend Won't Start
- Check `Dockerfile.backend` is being used
- Verify `PORT` environment variable is set by Railway
- Check logs for Python errors

### Frontend Shows 502 Error
- Verify `BACKEND_URL` is correct (no trailing slash)
- Check backend is running and healthy
- Verify nginx.conf has DNS resolver

### Database Connection Fails
- Verify `DATABASE_URL` uses correct service reference: `${{Postgres.DATABASE_URL}}`
- Check PostgreSQL service is running
- Verify service name matches (case-sensitive)

### Build Fails
- Check Dockerfile syntax
- Verify all required files exist
- Check build logs for specific errors

---

## Getting Help

If you encounter issues:

1. **Check Logs First**
   - Railway → Service → **Logs** tab
   - Look for error messages

2. **Verify Configuration**
   - Compare with `CLEAN_RAILWAY_SETUP.md`
   - Double-check environment variables

3. **Test Locally**
   - Run backend: `uvicorn backend.api.main:app`
   - Run frontend: `npm run dev`
   - Verify local setup works before deploying

---

## Next Steps After Deployment

Once deployment is working:

1. **Monitor Performance**
   - Check Railway metrics
   - Monitor error rates
   - Watch resource usage

2. **Set Up Monitoring** (Optional)
   - Add error tracking (Sentry, etc.)
   - Set up uptime monitoring
   - Configure alerts

3. **Optimize**
   - Enable caching
   - Optimize Docker images
   - Review resource limits

4. **Backup Strategy**
   - Set up database backups
   - Document recovery procedures

---

## Files Ready for Deployment

✅ All code is ready:
- `Dockerfile.backend` - Backend container
- `frontend/Dockerfile` - Frontend container  
- `frontend/nginx.conf` - Nginx configuration
- `railway.backend.json` - Backend Railway config
- `frontend/railway.json` - Frontend Railway config
- All environment variable handling is in place

Just configure Railway correctly and deploy!

