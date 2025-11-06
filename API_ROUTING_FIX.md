# API Routing Fix - VITE_API_URL Configuration

## Problem

The frontend is trying to fetch indicators from `/api/backtest/indicators`, but it's getting HTML instead of JSON.

**Root Cause:**
- `VITE_API_URL` is set to `https://nxtgenalpha.com`
- But `nxtgenalpha.com` is attached to the **frontend service** (serves static files)
- API calls to `https://nxtgenalpha.com/api/backtest/indicators` return the frontend HTML page, not the backend API response

## Solution

Since frontend and backend are **separate services** on Railway, we need to set `VITE_API_URL` to the **backend service URL**, not the frontend domain.

### Step 1: Get Backend Service URL

**Railway Dashboard → Backend Service → Settings → Domains:**

You should see a Railway-generated URL like:
- `https://web-production-776f1.up.railway.app`

Or check the backend service URL from earlier logs.

### Step 2: Update Frontend Environment Variable

**Railway Dashboard → Frontend Service → Variables:**

Update `VITE_API_URL` to:
```
VITE_API_URL=https://web-production-776f1.up.railway.app
```

**Important:** Use the backend Railway URL, NOT `https://nxtgenalpha.com`

### Step 3: Verify and Redeploy

1. Save the variable change
2. Railway will auto-redeploy the frontend service
3. Wait for deployment to complete
4. Test the site - indicators should load

## Why This Happens

When you have separate frontend and backend services:
- **Frontend domain** (`nxtgenalpha.com`) → Serves static React app
- **Backend domain** (`web-production-776f1.up.railway.app`) → Serves API endpoints

The frontend needs to know where the backend API is located, which is why `VITE_API_URL` must point to the backend service.

## Alternative: API Proxy Setup

If you want to use `/api/*` on the same domain, you would need to:
1. Use a single service that serves both frontend and backend
2. Or set up a reverse proxy (not recommended for Railway)

**Recommended:** Keep services separate and use backend Railway URL for `VITE_API_URL`.

## Quick Test

After updating `VITE_API_URL` and redeployment:

1. Open browser DevTools → Console
2. Check for API requests to `/api/backtest/indicators`
3. Should see successful JSON response (not HTML)
4. Indicators should load in the catalog

