# Port Mismatch Fix - Railway Domain Routing

## Problem Identified

**Railway Dashboard shows:**
- Domain `nxtgenalpha.com` → Port 3000

**Frontend Service logs show:**
- Service listening on → Port 8080 (via `$PORT` environment variable)

**Result:** Railway's edge proxy tries to connect to port 3000, but service is on 8080 → **502 Bad Gateway**

## Why This Happens

Railway automatically sets the `$PORT` environment variable to 8080 (or another port), but the domain configuration might have been set before the service started, or Railway's routing cache needs to be refreshed.

## Solution

### Option 1: Remove and Re-add Domain (Recommended)

This forces Railway to re-detect the correct port:

1. **Railway Dashboard → Frontend Service → Settings → Domains**
2. Click the **trash icon** (delete) next to `nxtgenalpha.com`
3. Confirm deletion
4. Wait 1-2 minutes
5. Click **"Custom Domain"** button
6. Enter: `nxtgenalpha.com`
7. Railway will now detect the correct port (8080) from the running service

### Option 2: Restart Frontend Service

Sometimes restarting forces Railway to update port routing:

1. **Railway Dashboard → Frontend Service → Settings**
2. Click **"Restart"** button
3. Wait for service to restart
4. Check if domain routing updates to port 8080

### Option 3: Check Railway Service Port Configuration

**Railway Dashboard → Frontend Service → Settings → Networking:**

1. Check if there's a port configuration option
2. Verify it's set to use `$PORT` (automatic)
3. If there's a hardcoded port, remove it

## Verify Fix

After applying the fix:

1. **Railway Dashboard → Frontend Service → Settings → Domains**
2. Should now show: `→ Port 8080` (or the actual port Railway assigns)
3. **Test the domain:**
   ```bash
   curl -I https://nxtgenalpha.com
   ```
4. Should return `HTTP/2 200` instead of `HTTP/2 502`

## Expected Behavior

After fix:
- Railway detects service is on port 8080 (via `$PORT`)
- Domain routing updates to port 8080
- Traffic routes correctly → 502 error resolved

## Important Notes

- Railway's `$PORT` environment variable is automatically set
- Your `package.json` correctly uses `${PORT:-3000}` as fallback
- The service is correctly binding to `0.0.0.0:8080`
- The issue is Railway's domain routing configuration, not your code

## Quick Test

To verify the service is working on port 8080:

**Railway Dashboard → Frontend Service → Logs:**

Should see:
```
INFO  Accepting connections at http://0.0.0.0:8080
```

And Railway dashboard should match this port.

