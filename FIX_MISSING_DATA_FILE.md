# Fix: Missing Data File in Railway Deployment

## Problem

The backend health check is failing with:
```json
{"status":"unhealthy","error":"Data file not found: /app/backend/core/../data/Bitcoin Historical Data4.csv","api_version":"1.0.0"}
```

## Root Cause

The data file `backend/data/Bitcoin Historical Data4.csv` exists locally but is not being deployed to Railway because:

1. **`.gitignore` was excluding it:** The file was ignored by git, so it wasn't committed to the repository
2. **Railway builds from git:** Railway only has access to files that are in the git repository

## Fix Applied

### Step 1: Updated .gitignore ✅

Updated `.gitignore` to allow the Bitcoin data file:
```
backend/data/*
!backend/data/.gitkeep
!backend/data/Bitcoin Historical Data4.csv  # Allow this file
```

### Step 2: Commit and Push the File

**You need to commit the data file to git:**

```bash
# Add the data file to git
git add backend/data/Bitcoin\ Historical\ Data4.csv

# Commit the change
git commit -m "Add Bitcoin data file for Railway deployment"

# Push to repository
git push origin main
```

**Note:** Railway will automatically redeploy when you push to the repository.

### Step 3: Verify File is in Repository

After pushing, verify the file is tracked:

```bash
# Check if file is tracked by git
git ls-files | grep "Bitcoin Historical Data4.csv

# Should output: backend/data/Bitcoin Historical Data4.csv
```

## Alternative: Manual Upload (If Git Push Doesn't Work)

If you can't commit the file to git, you can upload it directly to Railway:

### Option A: Using Railway CLI

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Link to your project:**
   ```bash
   railway link
   ```

4. **Upload the file:**
   ```bash
   # Copy file to Railway service
   railway run --service web -- cat > /app/backend/data/Bitcoin\ Historical\ Data4.csv < backend/data/Bitcoin\ Historical\ Data4.csv
   ```

### Option B: Using Railway Web Interface

1. Go to Railway Dashboard → Backend Service
2. Open **Shell** or **Terminal**
3. Create the data directory (if needed):
   ```bash
   mkdir -p /app/backend/data
   ```
4. Upload the file using Railway's file upload feature (if available)

### Option C: Use Environment Variable for Data Path

If the file can't be included in deployment, you could:

1. Store the data file in a cloud storage (S3, etc.)
2. Download it on backend startup
3. Or use a different data source

**However, the recommended approach is to include it in git** (as done in Step 2).

## Verification

After deploying the fix:

1. **Check Backend Health:**
   ```bash
   curl https://web-production-776f1.up.railway.app/health
   ```

   **Expected:**
   ```json
   {
     "status": "healthy",
     "data_records": <number>,
     "api_version": "1.0.0"
   }
   ```

2. **Test Data Info Endpoint:**
   ```bash
   curl https://web-production-776f1.up.railway.app/api/data/info
   ```

   **Expected:** JSON response with data information (not 404)

3. **Check Backend Logs:**
   - Railway Dashboard → Backend Service → Logs
   - Should see: `"Loaded <number> rows of data"`
   - Should NOT see: `"Data file not found"`

## Why This Happened

The `.gitignore` file was set to ignore all CSV files in `backend/data/` to keep the repository clean. However, for deployment, we need the data file to be included. The fix allows this specific file while still ignoring other data files.

## File Size

The data file is **263KB**, which is small enough to include in git without issues. Git repositories can handle files up to 100MB without problems.

## Summary

**Quick Fix:**
1. ✅ `.gitignore` updated to allow the file
2. ⏳ **You need to:** `git add backend/data/Bitcoin\ Historical\ Data4.csv`
3. ⏳ **Then:** `git commit -m "Add Bitcoin data file" && git push`
4. ⏳ **Wait:** 3-5 minutes for Railway to redeploy
5. ✅ **Verify:** Health check should return "healthy"

After these steps, the backend should be able to load the data file and the health check should pass.

