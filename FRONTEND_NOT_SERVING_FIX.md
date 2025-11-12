# Fix: Frontend Not Serving React App

If you're seeing backend API JSON instead of the React dashboard, follow these steps:

## Step 1: Verify Domain Attachment (CRITICAL)

1. **Go to Railway → Frontend Service → Settings → Networking**
2. **Check "Public Networking" section:**
   - Is `nxtgenalpha.com` listed under the **Frontend** service?
   - If it's NOT there, that's the problem!

3. **Go to Railway → Backend Service → Settings → Networking**
4. **Check "Public Networking" section:**
   - Is `nxtgenalpha.com` listed under the **Backend** service?
   - If it IS there, that's the problem! Remove it.

## Step 2: Fix Domain Attachment

### If domain is on Backend (WRONG):
1. Railway → Backend Service → Settings → Networking
2. Find `nxtgenalpha.com` in the list
3. Click the delete/trash icon next to it
4. Confirm deletion

### If domain is NOT on Frontend:
1. Railway → Frontend Service → Settings → Networking
2. Click "+ Custom Domain"
3. Enter: `nxtgenalpha.com`
4. Follow Railway's DNS instructions if needed

## Step 3: Verify Frontend Service is Running

1. **Check Frontend Service Status:**
   - Railway → Frontend Service → Deployments
   - Is the latest deployment "Active" or "Success"?
   - If it's "Failed", check the build logs

2. **Check Frontend Service Logs:**
   - Railway → Frontend Service → Logs
   - Look for nginx startup messages
   - Should see: `nginx started` or similar
   - If you see errors about PORT or missing files, that's the issue

3. **Test Frontend Railway URL Directly:**
   - Visit: `https://frontend-production-4df3.up.railway.app` (your frontend Railway URL)
   - Do you see the React app there?
   - If YES: Domain routing issue (go back to Step 1)
   - If NO: Frontend service issue (continue to Step 4)

## Step 4: Check Frontend Build

1. **Check Build Logs:**
   - Railway → Frontend Service → Deployments → Latest deployment → Build Logs
   - Look for: `npm run build` success
   - Should see: `dist/` directory created
   - If build failed, fix the build errors

2. **Verify Dockerfile is Being Used:**
   - Build logs should show: `FROM node:18-alpine as build`
   - Should NOT see NIXPACKS detection messages
   - If you see NIXPACKS, Railway isn't using the Dockerfile

3. **Check Railway Settings:**
   - Railway → Frontend Service → Settings
   - "Dockerfile Path" should be: `Dockerfile.frontend`
   - "Root Directory" should be: `/` (repo root)
   - "Build Method" should be: `Dockerfile`

## Step 5: Check Environment Variables

1. **Frontend Service Variables:**
   - Railway → Frontend Service → Variables
   - Verify:
     - `VITE_API_URL` = `https://web-production-776f1.up.railway.app` (HTTPS)
     - `BACKEND_URL` = `https://web-production-776f1.up.railway.app` (HTTPS)
   - If missing, add them

2. **After changing variables:**
   - Redeploy the frontend service
   - Railway → Frontend Service → Deployments → Redeploy

## Step 6: Verify Nginx is Serving Files

If the frontend service is running but still not serving:

1. **Check if dist files exist:**
   - Railway → Frontend Service → Deployments → Latest → Shell (if available)
   - Run: `ls -la /usr/share/nginx/html`
   - Should see `index.html` and other React build files
   - If empty or missing, the build didn't copy files correctly

2. **Check nginx configuration:**
   - The Dockerfile should copy `nginx.conf` correctly
   - Verify PORT substitution is working
   - Check logs for nginx errors

## Step 7: Force Clean Rebuild

If nothing else works:

1. **Clear Railway build cache:**
   - Railway → Frontend Service → Settings
   - Look for "Clear Cache" or "Rebuild" option
   - Or make a small code change and push:
     ```bash
     echo "# Rebuild trigger" >> frontend/src/main.tsx
     git add frontend/src/main.tsx
     git commit -m "Trigger frontend rebuild"
     git push
     ```

2. **Wait for deployment:**
   - Watch Railway → Frontend Service → Deployments
   - Wait for "Active" status
   - Check logs for any errors

## Quick Diagnostic Commands

Test these URLs to isolate the issue:

1. **Backend Railway URL:** `https://web-production-776f1.up.railway.app`
   - Should return: `{"message":"Bitcoin Trading Strategy API"...}` ✅

2. **Frontend Railway URL:** `https://frontend-production-4df3.up.railway.app`
   - Should return: React app HTML ✅
   - If it returns JSON, frontend isn't serving correctly

3. **Custom Domain:** `https://nxtgenalpha.com`
   - Should return: React app HTML ✅
   - If it returns JSON, domain is pointing to backend

## Most Common Issue

**90% of the time, the domain is attached to the wrong service.**

Double-check:
- Railway → Frontend Service → Networking → `nxtgenalpha.com` should be there
- Railway → Backend Service → Networking → `nxtgenalpha.com` should NOT be there

