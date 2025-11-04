# Railway Deployment Guide for nxtgenalpha.com

This is a step-by-step guide for deploying the Trading Platform to Railway.

## Quick Start Checklist

- [ ] Railway account created
- [ ] GitHub repo connected
- [ ] Backend service deployed
- [ ] Frontend service deployed
- [ ] PostgreSQL database added
- [ ] Environment variables configured
- [ ] Google OAuth production setup
- [ ] Domain nxtgenalpha.com configured
- [ ] Database migrations run
- [ ] End-to-end testing completed

## Step-by-Step Instructions

### Step 1: Create Railway Project (5 minutes)

1. Go to https://railway.app
2. Sign up or log in (use GitHub for easy repo connection)
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your GitHub account if prompted
6. Select repository: `WillGranchi/NxtGenAlpha`
7. Railway will attempt to auto-detect services

### Step 2: Add PostgreSQL Database (2 minutes)

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway creates a managed PostgreSQL instance
4. Click on the database service
5. Go to "Connect" tab
6. Copy the `DATABASE_URL` (you'll need this for Step 3)

### Step 3: Configure Backend Service (10 minutes)

#### 3.1 Create Backend Service (if not auto-detected)

1. In Railway project, click "+ New"
2. Select "GitHub Repo" → select `NxtGenAlpha`
3. Railway will detect Python and use Procfile or railway.json

#### 3.2 Set Environment Variables

Go to backend service → "Variables" tab → Add these variables:

```
PYTHONPATH=/app
DATABASE_URL=${{Postgres.DATABASE_URL}}
GOOGLE_CLIENT_ID=your-production-client-id-here
GOOGLE_CLIENT_SECRET=your-production-client-secret-here
JWT_SECRET_KEY=hPHgbVWmwt9KWFAbqBWOajDTr96yE-D3EH8J_yudIWQ
JWT_ALGORITHM=HS256
FRONTEND_URL=https://nxtgenalpha.com
BACKEND_URL=https://nxtgenalpha.com
CORS_ORIGINS=https://nxtgenalpha.com
ENVIRONMENT=production
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
```

**Important Notes:**
- Replace `${{Postgres.DATABASE_URL}}` with the actual DATABASE_URL from Step 2, OR use Railway's variable reference: `${{Postgres.DATABASE_URL}}`
- Replace `your-production-client-id-here` and `your-production-client-secret-here` with your actual Google OAuth credentials
- Mark `JWT_SECRET_KEY` and `GOOGLE_CLIENT_SECRET` as "Secret" (click the eye icon)

#### 3.3 Verify Start Command

1. Go to backend service → "Settings" tab
2. Check "Start Command" - should be: `uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT`
3. If not set, add it manually

### Step 4: Configure Frontend Service (5 minutes)

#### 4.1 Create Frontend Service

1. In Railway project, click "+ New"
2. Select "GitHub Repo" → select `NxtGenAlpha`
3. Set "Root Directory" to `frontend/`
4. Railway should detect Node.js and auto-build

#### 4.2 Set Environment Variables

Go to frontend service → "Variables" tab → Add:

```
VITE_API_URL=https://nxtgenalpha.com
```

**Note:** If your backend and frontend are on different Railway URLs initially, you may need to use the Railway-generated backend URL first, then update after domain setup.

### Step 5: Google OAuth Production Setup (10 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Open your OAuth 2.0 Client ID
4. Under **Authorized JavaScript origins**, click "+ ADD URI":
   - Add: `https://nxtgenalpha.com`
5. Under **Authorized redirect URIs**, click "+ ADD URI":
   - Add: `https://nxtgenalpha.com/api/auth/google/callback`
6. Click **Save**
7. Copy the **Client ID** and **Client Secret**
8. Update Railway backend environment variables with these values

### Step 6: Run Database Migrations (5 minutes)

1. In Railway, open your backend service
2. Go to "Deployments" tab
3. Click on the latest deployment
4. Click "Shell" tab (or use Railway CLI)
5. Run:
   ```bash
   alembic upgrade head
   ```
6. Verify tables created:
   ```bash
   psql $DATABASE_URL -c "\dt"
   ```

### Step 7: Configure Domain (15-30 minutes)

#### 7.1 Add Domain in Railway

1. Select your **frontend service** in Railway
2. Go to "Settings" tab
3. Scroll to "Domains" section
4. Click "Custom Domain"
5. Enter: `nxtgenalpha.com`
6. Railway will provide DNS configuration instructions

#### 7.2 Configure DNS at Your Registrar

Railway will show you either:

**Option A: CNAME Record (Most Common)**
- Type: CNAME
- Name: @ (or leave blank)
- Value: `xxx.up.railway.app` (Railway-provided)
- TTL: 3600

**Option B: A Record**
- Type: A
- Name: @
- Value: IP address (Railway-provided)
- TTL: 3600

#### 7.3 Wait for DNS Propagation

- DNS changes can take 5 minutes to 48 hours
- Check status: https://dnschecker.org (search for `nxtgenalpha.com`)
- Railway automatically provisions SSL certificate once DNS resolves

### Step 8: Verify Deployment (10 minutes)

1. **Check Backend Health:**
   ```bash
   curl https://nxtgenalpha.com/api/health
   ```
   Should return: `{"status": "ok"}`

2. **Check Frontend:**
   - Visit `https://nxtgenalpha.com` in browser
   - Should see the application loading

3. **Check Logs:**
   - In Railway, check service logs for errors
   - Backend logs should show successful startup
   - No critical errors should appear

### Step 9: Test Authentication (5 minutes)

1. Visit `https://nxtgenalpha.com`
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Verify you're redirected back and authenticated

### Step 10: Test Core Features (15 minutes)

- [ ] Load indicator catalog
- [ ] Add indicators to strategy
- [ ] Configure indicator parameters
- [ ] Build strategy expression
- [ ] Select date range (Jan 1, 2018 to most recent)
- [ ] Run backtest
- [ ] Verify results display (metrics, charts, trade log)
- [ ] Test saving a strategy (requires authentication)
- [ ] Test loading a saved strategy

## Troubleshooting

### Backend Won't Start

**Check:**
1. Railway logs for errors
2. Procfile exists and is correct
3. PYTHONPATH is set to `/app`
4. DATABASE_URL is correct
5. All required environment variables are set

**Common Fixes:**
- Verify start command: `uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT`
- Check that `requirements.txt` is in the root directory
- Ensure backend code is in `backend/` directory

### OAuth Not Working

**Check:**
1. Google Console redirect URI matches exactly: `https://nxtgenalpha.com/api/auth/google/callback`
2. FRONTEND_URL and BACKEND_URL are set correctly
3. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
4. HTTPS is enabled (Railway handles this automatically)

### Frontend Can't Connect to Backend

**Check:**
1. VITE_API_URL is set to `https://nxtgenalpha.com`
2. CORS_ORIGINS includes `https://nxtgenalpha.com`
3. Backend service is running
4. Check browser console for CORS errors

### Database Connection Fails

**Check:**
1. DATABASE_URL format is correct
2. Database service is running in Railway
3. Network connectivity between services
4. Try connecting from Railway shell: `psql $DATABASE_URL`

## Environment Variables Reference

### Backend Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `PYTHONPATH` | `/app` | Python module path |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Railway PostgreSQL reference |
| `GOOGLE_CLIENT_ID` | Your OAuth Client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Your OAuth Client Secret | From Google Cloud Console (mark as Secret) |
| `JWT_SECRET_KEY` | `hPHgbVWmwt9KWFAbqBWOajDTr96yE-D3EH8J_yudIWQ` | Mark as Secret |
| `JWT_ALGORITHM` | `HS256` | |
| `FRONTEND_URL` | `https://nxtgenalpha.com` | |
| `BACKEND_URL` | `https://nxtgenalpha.com` | |
| `CORS_ORIGINS` | `https://nxtgenalpha.com` | |
| `ENVIRONMENT` | `production` | |
| `COOKIE_SECURE` | `true` | HTTPS only |
| `COOKIE_SAMESITE` | `lax` | |

### Frontend Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://nxtgenalpha.com` | Backend API URL |

## Railway-Specific Tips

1. **Service References:** Use `${{ServiceName.VARIABLE}}` to reference variables from other services
2. **Ports:** Railway automatically sets `$PORT` - don't hardcode port numbers
3. **Builds:** Railway auto-detects build commands, but you can override in settings
4. **Logs:** Access real-time logs in Railway dashboard
5. **Redeploy:** Railway auto-redeploys on git push (if configured)

## Post-Deployment

After successful deployment:

1. Monitor logs for first 24 hours
2. Test all features with real usage
3. Set up Railway alerts for service failures
4. Document any Railway-specific configurations
5. Plan for scaling if needed

## Support

If you encounter issues:
1. Check Railway service logs
2. Review this guide's troubleshooting section
3. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for general deployment info
4. Check [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for OAuth issues

