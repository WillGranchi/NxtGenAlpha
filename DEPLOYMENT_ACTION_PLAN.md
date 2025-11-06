# Deployment Action Plan - Step-by-Step Instructions

## Current Status Summary

✅ **Completed:**
- Code pushed to GitHub
- Railway project created and linked
- Backend service deployed
- Frontend service deployed
- PostgreSQL database added
- Railway CLI installed and connected

⚠️ **Needs Verification/Configuration:**
- Database tables (likely exist via `init_db()`)
- Environment variables
- Google OAuth production setup
- Domain configuration
- End-to-end testing

---

## Phase 1: Verify Current Deployment Status

### ⚠️ IMPORTANT: Railway CLI `railway run` executes locally

The `railway run` command executes on your local machine, not on Railway servers. Use the Railway web interface for verification.

### Step 1.1: Verify Database Tables (Railway Web Interface)

1. Go to: https://railway.app
2. Select project: **comfortable-imagination**
3. Click **backend service** (named "web")
4. Go to **"Deployments"** tab → Latest deployment
5. Click **"Shell"** or **"Terminal"** tab
6. Run:
   ```bash
   python3 << 'PYTHON_EOF'
   import sys
   sys.path.insert(0, '/app')
   from backend.core.database import engine
   from sqlalchemy import inspect
   inspector = inspect(engine)
   tables = inspector.get_table_names()
   print("Tables:", ', '.join(tables) if tables else 'None')
   if 'users' in tables and 'strategies' in tables:
       print("✅ Required tables exist!")
   else:
       print("❌ Tables missing")
   PYTHON_EOF
   ```

**Expected Result:** Tables `users` and `strategies` should exist (created by `init_db()` on startup)

### Step 1.2: Check Backend Service

1. Railway dashboard → Backend service → **"Logs"** tab
2. Look for:
   - ✅ `"Application startup complete"`
   - ✅ `"Database initialized successfully"`
   - ❌ No database connection errors

### Step 1.3: Get Service URLs

1. **Backend URL:**
   - Railway dashboard → Backend service → **"Settings"** → **"Domains"**
   - Or: **"Deployments"** → Latest deployment → Check URL
   - Format: `https://xxx.up.railway.app`
   - **Write this down!**

2. **Frontend URL:**
   - Railway dashboard → Frontend service → **"Settings"** → **"Domains"**
   - Or: **"Deployments"** → Latest deployment → Check URL
   - Format: `https://yyy.up.railway.app`
   - **Write this down!**

3. **Test Backend Health:**
   ```bash
   curl https://YOUR-BACKEND-URL.up.railway.app/api/health
   ```
   Expected: `{"status": "ok"}`

---

## Phase 2: Configure Environment Variables

### Step 2.1: Backend Environment Variables

1. Railway dashboard → Backend service → **"Variables"** tab
2. Add/verify these variables (click "New Variable" for each):

   ```
   PYTHONPATH=/app
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET_KEY=hPHgbVWmwt9KWFAbqBWOajDTr96yE-D3EH8J_yudIWQ
   JWT_ALGORITHM=HS256
   FRONTEND_URL=https://YOUR-FRONTEND-URL.up.railway.app
   BACKEND_URL=https://YOUR-BACKEND-URL.up.railway.app
   CORS_ORIGINS=https://YOUR-FRONTEND-URL.up.railway.app
   ENVIRONMENT=production
   COOKIE_SECURE=true
   COOKIE_SAMESITE=lax
   ```

3. **For Google OAuth** (set in Phase 3):
   - `GOOGLE_CLIENT_ID` (leave empty for now)
   - `GOOGLE_CLIENT_SECRET` (leave empty for now)

4. **Mark Secrets:**
   - Click the eye icon (👁️) next to:
     - `JWT_SECRET_KEY`
     - `GOOGLE_CLIENT_SECRET` (when you add it)

5. **DATABASE_URL:**
   - Option A: Use Railway reference: `${{Postgres.DATABASE_URL}}`
   - Option B: Get actual URL from PostgreSQL service → "Connect" tab → Copy connection string

6. **Save** - Railway will auto-redeploy

### Step 2.2: Frontend Environment Variable

1. Railway dashboard → Frontend service → **"Variables"** tab
2. Add variable:
   - Name: `VITE_API_URL`
   - Value: `https://YOUR-BACKEND-URL.up.railway.app`
   - **Note:** Update to `https://nxtgenalpha.com` after domain setup (Phase 4)

3. **Save** - Railway will auto-redeploy

### Step 2.3: Verify Deployment

1. Wait for both services to redeploy (check "Deployments" tab)
2. Check logs for errors
3. Test backend: `curl https://YOUR-BACKEND-URL/api/health`
4. Test frontend: Visit `https://YOUR-FRONTEND-URL` in browser

---

## Phase 3: Configure Google OAuth Production

### Step 3.1: Access Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Navigate: **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID (or create new one)

### Step 3.2: Add Production Redirect URIs

1. Open your OAuth 2.0 Client ID
2. **Authorized JavaScript origins** → Click **"+ ADD URI"**:
   - `https://nxtgenalpha.com`
   - `https://YOUR-BACKEND-URL.up.railway.app` (temporary)
3. **Authorized redirect URIs** → Click **"+ ADD URI"**:
   - `https://nxtgenalpha.com/api/auth/google/callback`
   - `https://YOUR-BACKEND-URL.up.railway.app/api/auth/google/callback` (temporary)
4. Click **"Save"**

### Step 3.3: Update Railway Variables

1. Copy **Client ID** from Google Cloud Console
2. Copy **Client Secret** from Google Cloud Console
3. Railway dashboard → Backend service → **"Variables"**
4. Update:
   - `GOOGLE_CLIENT_ID` = Your Client ID
   - `GOOGLE_CLIENT_SECRET` = Your Client Secret
   - Mark `GOOGLE_CLIENT_SECRET` as Secret (eye icon)
5. **Save** - Backend will redeploy

---

## Phase 4: Configure Domain nxtgenalpha.com

### Step 4.1: Add Domain in Railway

1. Railway dashboard → **Frontend service**
2. **"Settings"** tab → Scroll to **"Domains"** section
3. Click **"Custom Domain"** or **"Add Domain"**
4. Enter: `nxtgenalpha.com`
5. Railway will show DNS configuration instructions

### Step 4.2: Configure DNS at Registrar

1. Log in to your domain registrar (where you registered nxtgenalpha.com)
2. Go to DNS management
3. Railway will show either:

   **Option A: CNAME Record**
   - Type: CNAME
   - Name: `@` (or leave blank/root)
   - Value: `xxx.up.railway.app` (Railway-provided)
   - TTL: 3600 (or default)

   **Option B: A Record**
   - Type: A
   - Name: `@`
   - Value: IP address (Railway-provided)
   - TTL: 3600 (or default)

4. **Save** DNS changes

### Step 4.3: Wait for DNS Propagation

1. Check status: https://dnschecker.org
   - Search for: `nxtgenalpha.com`
   - Look for green checkmarks across locations
2. Railway will automatically provision SSL certificate
3. Monitor Railway dashboard → Frontend service → "Domains" for SSL status
4. **Time:** 5 minutes to 48 hours (usually 5-30 minutes)

### Step 4.4: Update Environment Variables for Domain

**After DNS resolves and SSL is active:**

1. **Backend Service Variables:**
   - Update `FRONTEND_URL` = `https://nxtgenalpha.com`
   - Update `BACKEND_URL` = `https://nxtgenalpha.com`
   - Update `CORS_ORIGINS` = `https://nxtgenalpha.com`

2. **Frontend Service Variables:**
   - Update `VITE_API_URL` = `https://nxtgenalpha.com`

3. **Save** - Both services will redeploy

4. **Update Google OAuth:**
   - Remove temporary Railway URLs from Google Cloud Console
   - Keep only: `https://nxtgenalpha.com` and `https://nxtgenalpha.com/api/auth/google/callback`

---

## Phase 5: Final Database Setup

### Step 5.1: Verify Tables (If Not Done in Phase 1)

Use Railway Shell (see Phase 1.1) to verify tables exist.

### Step 5.2: If Tables Don't Exist

1. Railway dashboard → Backend service → Deployments → Latest → **"Shell"** tab
2. Run: `python3 -m alembic -c backend/alembic.ini upgrade head`
3. Or: Restart backend service (triggers `init_db()`)

---

## Phase 6: Testing & Verification

### Step 6.1: Test Backend Health
```bash
curl https://nxtgenalpha.com/api/health
```
Expected: `{"status": "ok"}`

### Step 6.2: Test Frontend
1. Visit: `https://nxtgenalpha.com`
2. Check browser console (F12) for errors
3. Verify page loads

### Step 6.3: Test Google OAuth
1. Click "Sign in with Google"
2. Complete OAuth flow
3. Verify redirect back to app
4. Verify user is authenticated

### Step 6.4: Test Core Features
- [ ] Load indicator catalog
- [ ] Add indicators to strategy
- [ ] Configure parameters
- [ ] Build expression
- [ ] Select date range (Jan 1, 2018 to most recent)
- [ ] Run backtest
- [ ] Verify results (metrics, charts, trade log)
- [ ] Save strategy
- [ ] Load saved strategy
- [ ] Edit/delete strategy

---

## Quick Reference

**Railway Dashboard:** https://railway.app  
**Project:** comfortable-imagination  
**Backend Service:** web  
**Frontend Service:** (check your dashboard)  
**Domain:** nxtgenalpha.com

**Environment Variables Reference:**
- See `RAILWAY_ENV_CHECKLIST.md` for complete list

**Troubleshooting:**
- See `RAILWAY_DEPLOYMENT.md` for detailed guide
- See `RAILWAY_MIGRATIONS.md` for database issues

---

## Estimated Time

- Phase 1: 15 minutes
- Phase 2: 20 minutes
- Phase 3: 20 minutes
- Phase 4: 30-60 minutes (mostly waiting for DNS)
- Phase 5: 10 minutes
- Phase 6: 30 minutes

**Total:** ~2-3 hours (excluding DNS propagation)

