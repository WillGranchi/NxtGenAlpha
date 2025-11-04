# Railway Environment Variables Checklist

Use this checklist when configuring environment variables in Railway.

## Backend Service Environment Variables

Copy and paste these into Railway backend service → Variables tab:

### Required Variables (Copy these exactly)

```
PYTHONPATH=/app
DATABASE_URL=${{Postgres.DATABASE_URL}}
GOOGLE_CLIENT_ID=PASTE_YOUR_PRODUCTION_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=PASTE_YOUR_PRODUCTION_CLIENT_SECRET_HERE
JWT_SECRET_KEY=hPHgbVWmwt9KWFAbqBWOajDTr96yE-D3EH8J_yudIWQ
JWT_ALGORITHM=HS256
FRONTEND_URL=https://nxtgenalpha.com
BACKEND_URL=https://nxtgenalpha.com
CORS_ORIGINS=https://nxtgenalpha.com
ENVIRONMENT=production
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
```

### Step-by-Step Instructions

1. **PYTHONPATH**
   - Value: `/app`
   - Purpose: Ensures Python can find backend modules

2. **DATABASE_URL**
   - Value: `${{Postgres.DATABASE_URL}}` (Railway reference)
   - OR: Use the actual connection string from PostgreSQL service "Connect" tab
   - Format: `postgresql://user:password@host:5432/dbname`
   - Purpose: Database connection string

3. **GOOGLE_CLIENT_ID**
   - Get from: Google Cloud Console → APIs & Services → Credentials
   - Value: Your OAuth 2.0 Client ID (production credentials)
   - Purpose: Google OAuth authentication

4. **GOOGLE_CLIENT_SECRET**
   - Get from: Google Cloud Console → APIs & Services → Credentials
   - Value: Your OAuth 2.0 Client Secret (production credentials)
   - **IMPORTANT:** Mark as "Secret" in Railway (click eye icon)
   - Purpose: Google OAuth authentication

5. **JWT_SECRET_KEY**
   - Value: `hPHgbVWmwt9KWFAbqBWOajDTr96yE-D3EH8J_yudIWQ`
   - **IMPORTANT:** Mark as "Secret" in Railway
   - Purpose: Signing JWT tokens for authentication

6. **JWT_ALGORITHM**
   - Value: `HS256`
   - Purpose: JWT token algorithm

7. **FRONTEND_URL**
   - Value: `https://nxtgenalpha.com`
   - Purpose: Where to redirect after OAuth login

8. **BACKEND_URL**
   - Value: `https://nxtgenalpha.com`
   - Purpose: Base URL for OAuth redirect URI construction

9. **CORS_ORIGINS**
   - Value: `https://nxtgenalpha.com`
   - Purpose: Allow frontend to make API requests

10. **ENVIRONMENT**
    - Value: `production`
    - Purpose: Enables production optimizations

11. **COOKIE_SECURE**
    - Value: `true`
    - Purpose: Cookies only sent over HTTPS

12. **COOKIE_SAMESITE**
    - Value: `lax`
    - Purpose: Cookie security settings

## Frontend Service Environment Variables

Copy and paste this into Railway frontend service → Variables tab:

```
VITE_API_URL=https://nxtgenalpha.com
```

### Step-by-Step Instructions

1. **VITE_API_URL**
   - Value: `https://nxtgenalpha.com`
   - Purpose: Tells frontend where the backend API is located
   - **Note:** This must match BACKEND_URL used in backend service

## Marking Variables as Secret

In Railway, mark these variables as "Secret" (click the eye icon):
- ✅ JWT_SECRET_KEY
- ✅ GOOGLE_CLIENT_SECRET
- ✅ DATABASE_URL (if using actual connection string instead of reference)

## Verification

After setting all variables:

1. **Check Backend Service:**
   - Go to backend service → Variables tab
   - Verify all 12 variables are listed
   - Verify secrets are marked (eye icon)

2. **Check Frontend Service:**
   - Go to frontend service → Variables tab
   - Verify VITE_API_URL is set

3. **Test Deployment:**
   - Redeploy backend service
   - Check logs for environment variable errors
   - Verify backend starts successfully

## Common Mistakes to Avoid

1. ❌ Forgetting to mark secrets as "Secret"
2. ❌ Using development OAuth credentials instead of production
3. ❌ Wrong DATABASE_URL format
4. ❌ Mismatch between FRONTEND_URL and CORS_ORIGINS
5. ❌ Forgetting to update VITE_API_URL after domain setup
6. ❌ Using `http://` instead of `https://` in production URLs

## Quick Copy-Paste Template

For backend service, use this template (replace placeholders):

```
PYTHONPATH=/app
DATABASE_URL=${{Postgres.DATABASE_URL}}
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
JWT_SECRET_KEY=hPHgbVWmwt9KWFAbqBWOajDTr96yE-D3EH8J_yudIWQ
JWT_ALGORITHM=HS256
FRONTEND_URL=https://nxtgenalpha.com
BACKEND_URL=https://nxtgenalpha.com
CORS_ORIGINS=https://nxtgenalpha.com
ENVIRONMENT=production
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
```

For frontend service:

```
VITE_API_URL=https://nxtgenalpha.com
```

