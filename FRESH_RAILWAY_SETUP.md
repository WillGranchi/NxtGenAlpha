# Fresh Railway Deployment Guide

Complete step-by-step guide to deploy from scratch on Railway.

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository with your code pushed
- Domain name (optional, e.g., nxtgenalpha.com)

---

## Step 1: Create New Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `WillGranchi/NxtGenAlpha`
5. Railway will create a new project

---

## Step 2: Add PostgreSQL Database

1. In Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will create a PostgreSQL service
4. **IMPORTANT:** Note the service name (e.g., "Postgres")

---

## Step 3: Deploy Backend Service

### 3.1: Create Backend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select the same repository: `WillGranchi/NxtGenAlpha`
3. Railway will create a new service
4. **Rename** it to "Backend" (optional but helpful)

### 3.2: Configure Backend Settings

1. Click on **Backend** service
2. Go to **Settings** tab
3. Configure:

   **Root Directory:** `/` (repo root)
   
   **Dockerfile Path:** `Dockerfile.backend`
   
   **Builder:** `Dockerfile`

4. **Save** settings

### 3.3: Link Database to Backend

1. Still in **Backend** → **Settings**
2. Scroll to **"Variables"** section
3. Click **"New Variable"**
4. Railway should auto-detect PostgreSQL and add `DATABASE_URL`
   - If not, click **"Add Reference"** → Select your PostgreSQL service → `DATABASE_URL`
5. Verify `DATABASE_URL` is set (should be auto-populated)

### 3.4: Set Backend Environment Variables

In **Backend** → **Variables** tab, add these:

```
# Database (should be auto-added from PostgreSQL service)
DATABASE_URL=<auto-populated>

# JWT Configuration
JWT_SECRET_KEY=<generate-a-random-secret-key-here>
# Generate one using: openssl rand -hex 32
# Or use: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Example: JWT_SECRET_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_ALGORITHM=HS256
# HS256 is the standard algorithm - keep this as-is

# Frontend URL (update after frontend is deployed)
FRONTEND_URL=https://your-frontend-url.up.railway.app

# Backend URL (update after deployment)
BACKEND_URL=https://your-backend-url.up.railway.app

# CORS Origins (update after frontend is deployed)
CORS_ORIGINS=https://your-frontend-url.up.railway.app

# Environment
ENVIRONMENT=production

# Cookie Settings
COOKIE_SECURE=true
COOKIE_SAMESITE=lax

# Google OAuth (optional - leave empty if not using)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

**Note:** Generate a secure JWT_SECRET_KEY:
```bash
# Run this locally to generate a secret:
openssl rand -hex 32
```

### 3.5: Wait for Backend Deployment

1. Go to **Backend** → **Deployments** tab
2. Wait for deployment to complete (2-5 minutes)
3. Check **Logs** tab - should see:
   - `Uvicorn running on http://0.0.0.0:XXXX`
   - `Application startup complete`
   - `Database initialized successfully`

### 3.6: Enable Public Networking & Get Backend URL

1. **Backend** → **Settings** → **Networking**
2. Look for **"Public Networking"** section
3. If you see **"Generate Domain"** or **"Enable Public Networking"** button:
   - Click it to generate a public domain
   - If Railway asks for a **"Target Port"** or **"Port"**:
     - **Use: `8080`** (or whatever port Railway suggests)
     - Railway automatically sets the `PORT` environment variable
     - Your app listens on whatever port Railway assigns (via `$PORT` env var)
     - The port you enter here is just for Railway's routing configuration
   - Railway will create a public URL like `https://backend-production-xxxx.up.railway.app`
4. Copy the **Railway-generated public URL**
5. **Save this URL** - you'll need it for frontend configuration

**Note:** 
- If Railway requires a port, use `8080` (Railway's common default)
- Your Dockerfile already handles the PORT environment variable correctly
- Railway will automatically route traffic to your app on the correct port
- If you only see "Private Networking", you need to enable public networking for the backend to be accessible from the frontend

---

## Step 4: Deploy Frontend Service

### 4.1: Create Frontend Service

1. In Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select the same repository: `WillGranchi/NxtGenAlpha`
3. Railway will create a new service
4. **Rename** it to "Frontend"

### 4.2: Configure Frontend Settings

1. Click on **Frontend** service
2. Go to **Settings** tab
3. Configure:

   **Root Directory:** `/` (repo root)
   
   **Dockerfile Path:** `Dockerfile.frontend`
   
   **Builder:** `Dockerfile`

4. **Save** settings

### 4.3: Set Frontend Environment Variables

In **Frontend** → **Variables** tab, add these:

```
# Backend API URL (use the backend PUBLIC URL from Step 3.6)
VITE_API_URL=https://backend-production-e240a.up.railway.app

# Backend URL for nginx proxy (same as above)
BACKEND_URL=https://backend-production-e240a.up.railway.app
```

**IMPORTANT:** 
- Use the **actual public URL** from Step 3.6 (e.g., `https://backend-production-e240a.up.railway.app`)
- **DO NOT** use variable references like `${{Backend.BACKEND_URL}}` - use the actual URL
- **Must include `https://`** at the beginning
- **No trailing slashes** in URLs
- Must be **HTTPS** (not HTTP)
- If backend only shows "Private Networking", you MUST enable public networking first (see Step 3.6)

**Example (using your actual backend URL):**
```
VITE_API_URL=https://backend-production-e240a.up.railway.app
BACKEND_URL=https://backend-production-e240a.up.railway.app
```

### 4.4: Wait for Frontend Deployment

1. Go to **Frontend** → **Deployments** tab
2. Wait for deployment to complete (3-7 minutes)
3. Check **Logs** tab - should see:
   - `nginx/1.x.x`
   - `start worker processes`
   - **NO** errors

### 4.5: Get Frontend URL

1. **Frontend** → **Settings** → **Networking**
2. Copy the **Railway-generated URL** (e.g., `https://frontend-production-xxxx.up.railway.app`)
3. **Save this URL**

---

## Step 5: Update Backend CORS Configuration

Now that you have the frontend URL:

1. Go to **Backend** → **Variables**
2. Update these variables:

```
FRONTEND_URL=https://your-frontend-url.up.railway.app
CORS_ORIGINS=https://your-frontend-url.up.railway.app
```

3. **Restart Backend Service:**
   - **Backend** → **Settings** → Scroll down → **Restart**
   - Wait 30-60 seconds

---

## Step 6: Test Deployment

### 6.1: Test Backend

1. Visit: `https://your-backend-url.up.railway.app/health`
   - Should return: `{"status": "ok"}` or `{"status": "healthy", ...}`
   - If you get 404, try: `https://your-backend-url.up.railway.app/` (root endpoint)
   - Root endpoint should return: `{"message": "Bitcoin Trading Strategy API", "status": "running", ...}`

2. Visit: `https://your-backend-url.up.railway.app/docs`
   - Should show FastAPI documentation (Swagger UI)
   - If this works, your backend is running correctly

3. Alternative health check endpoints:
   - `https://your-backend-url.up.railway.app/api/data/health`
   - `https://your-backend-url.up.railway.app/api/backtest/health`

### 6.2: Test Frontend

1. Visit: `https://your-frontend-url.up.railway.app`
   - Should see React app (dashboard)
   - **NOT** backend JSON

2. Test signup/login:
   - Try creating an account
   - Should work without CORS errors

---

## Step 7: Set Up Custom Domain (Optional)

### 7.1: Add Domain to Frontend

1. **Frontend** → **Settings** → **Networking**
2. Click **"+ Custom Domain"** or **"Add Domain"**
3. Enter your domain: `nxtgenalpha.com`
4. Railway will show DNS configuration instructions

### 7.2: Configure DNS

1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Open DNS management for your domain
3. Add the DNS record Railway provides:

   **Most Common: CNAME Record**
   ```
   Type: CNAME
   Name: @ (or leave blank)
   Value: your-frontend-service.up.railway.app
   TTL: 3600 (or Auto)
   ```

4. **Save** DNS records

### 7.3: Wait for DNS & SSL

1. Wait 5-60 minutes for DNS propagation
   - Check: https://dnschecker.org (search for your domain)

2. Railway will automatically provision SSL certificate
   - Usually takes 5-10 minutes after DNS resolves
   - Check Railway → **Frontend** → **Settings** → **Networking**
   - Domain should show **"Active"** or **"Provisioned"**

### 7.4: Update CORS for Custom Domain

1. **Backend** → **Variables**
2. Update `CORS_ORIGINS`:

```
CORS_ORIGINS=https://your-frontend-url.up.railway.app,https://nxtgenalpha.com,https://www.nxtgenalpha.com
```

3. Update `FRONTEND_URL`:

```
FRONTEND_URL=https://nxtgenalpha.com
```

4. **Restart Backend Service**

### 7.5: Test Custom Domain

1. Visit: `https://nxtgenalpha.com`
2. Should see React app
3. Test signup/login - should work

---

## Step 8: Verify Everything Works

### Checklist

- [ ] Backend health check returns `{"status": "healthy"}`
- [ ] Frontend loads React app (not backend JSON)
- [ ] Signup works without errors
- [ ] Login works without errors
- [ ] Custom domain works (if configured)
- [ ] No CORS errors in browser console
- [ ] API requests succeed

### Common Issues

**Issue: Frontend shows backend JSON**
- **Fix:** Domain might be attached to Backend service
- **Solution:** Remove domain from Backend, add to Frontend

**Issue: CORS errors**
- **Fix:** Check `CORS_ORIGINS` includes frontend URL
- **Solution:** Update `CORS_ORIGINS`, restart backend

**Issue: Signup/Login fails**
- **Fix:** Check `VITE_API_URL` is set correctly in Frontend
- **Solution:** Ensure it's HTTPS and matches backend URL

**Issue: Custom domain not working**
- **Fix:** Check DNS records and domain attachment
- **Solution:** Verify domain is on Frontend service, DNS is correct

---

## Environment Variables Summary

### Backend Service Variables

```
DATABASE_URL=<auto-from-postgres>
JWT_SECRET_KEY=<your-secret-key>
JWT_ALGORITHM=HS256
FRONTEND_URL=https://your-frontend-url.up.railway.app
BACKEND_URL=https://your-backend-url.up.railway.app
CORS_ORIGINS=https://your-frontend-url.up.railway.app
ENVIRONMENT=production
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
GOOGLE_CLIENT_ID=<optional>
GOOGLE_CLIENT_SECRET=<optional>
```

### Frontend Service Variables

```
VITE_API_URL=https://your-backend-url.up.railway.app
BACKEND_URL=https://your-backend-url.up.railway.app
```

---

## Quick Reference

### Service URLs

- **Backend:** `https://backend-production-xxxx.up.railway.app`
- **Frontend:** `https://frontend-production-xxxx.up.railway.app`
- **Custom Domain:** `https://nxtgenalpha.com` (if configured)

### Important Notes

1. **Always use HTTPS** in production URLs
2. **No trailing slashes** in environment variables
3. **Restart backend** after changing CORS variables
4. **Custom domain** should only be on Frontend service
5. **Wait for deployments** to complete before testing

---

## Need Help?

1. Check Railway logs:
   - **Backend** → **Logs** tab
   - **Frontend** → **Logs** tab

2. Check browser console:
   - Open DevTools → Console
   - Look for errors

3. Test endpoints directly:
   - Backend: `curl https://your-backend-url/health`
   - Frontend: `curl https://your-frontend-url/`

4. Railway Support:
   - Railway Dashboard → Help → Support

