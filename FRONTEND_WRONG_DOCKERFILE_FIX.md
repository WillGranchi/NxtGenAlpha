# Fix: Frontend Service Using Backend Dockerfile

## Problem Identified

Your frontend service logs show backend code running:
- `backend.api.main` (backend Python code)
- `Uvicorn running` (FastAPI backend server)
- Database connection errors (backend trying to connect)

This means Railway is using `Dockerfile.backend` for the frontend service instead of `Dockerfile.frontend`.

## Solution: Fix Dockerfile Path in Railway

### Step 1: Check Current Settings

1. **Railway → Frontend Service → Settings**
2. Look for **"Dockerfile Path"** or **"Dockerfile"** setting
3. What does it currently say?
   - If it says `Dockerfile.backend` → That's the problem!
   - If it says `Dockerfile` → Railway might be auto-detecting wrong
   - If it says `Dockerfile.frontend` → Check Root Directory

### Step 2: Fix the Dockerfile Path

1. **Railway → Frontend Service → Settings**
2. Find **"Dockerfile Path"** or **"Dockerfile"** field
3. Change it to: `Dockerfile.frontend`
4. **Save** the settings

### Step 3: Verify Root Directory

1. **Railway → Frontend Service → Settings**
2. Find **"Root Directory"** field
3. Should be: `/` (repo root) or `.` (current directory)
4. If it's `frontend/`, change it to `/`

### Step 4: Verify Build Method

1. **Railway → Frontend Service → Settings**
2. Find **"Build Method"** or **"Builder"** field
3. Should be: `Dockerfile` (not NIXPACKS)
4. If it's NIXPACKS, change it to `Dockerfile`

### Step 5: Redeploy

1. **Railway → Frontend Service → Deployments**
2. Click **"Redeploy"** on the latest deployment
3. Or make a small change and push to trigger redeploy:
   ```bash
   echo "# Fix frontend Dockerfile" >> README.md
   git add README.md
   git commit -m "Trigger frontend rebuild with correct Dockerfile"
   git push
   ```

### Step 6: Verify Build Logs

After redeploy, check:
1. **Railway → Frontend Service → Deployments → Latest → Build Logs**
2. Should see: `FROM node:18-alpine as build` (frontend Dockerfile)
3. Should NOT see: `FROM python:3.11-slim` (backend Dockerfile)
4. Should see: `npm run build` (frontend build)
5. Should NOT see: `pip install` (backend install)

### Step 7: Verify Runtime Logs

After deployment completes:
1. **Railway → Frontend Service → Logs**
2. Should see: `nginx started` or nginx-related messages
3. Should NOT see: `backend.api.main` or `Uvicorn running`

## Alternative: Create Service-Specific railway.json

If Railway keeps auto-detecting the wrong Dockerfile, you can create a service-specific config:

1. Create `frontend/railway.json`:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "DOCKERFILE",
       "dockerfilePath": "Dockerfile.frontend"
     }
   }
   ```

2. But this only works if Railway's Root Directory is `/` (repo root)

3. If Root Directory is `frontend/`, Railway won't see `Dockerfile.frontend` in the root

## Quick Checklist

- [ ] Frontend Service → Settings → Dockerfile Path = `Dockerfile.frontend`
- [ ] Frontend Service → Settings → Root Directory = `/` (repo root)
- [ ] Frontend Service → Settings → Build Method = `Dockerfile`
- [ ] Redeploy frontend service
- [ ] Build logs show `FROM node:18-alpine` (not `FROM python:3.11-slim`)
- [ ] Runtime logs show nginx (not uvicorn)

## Expected Result

After fixing:
- Frontend service should build with Node.js and nginx
- Frontend service logs should show nginx messages
- Visiting frontend Railway URL should show React app (not backend JSON)

