# Fix Custom Domain (nxtgenalpha.com) Not Working

## Quick Diagnosis Checklist

### Step 1: Check Domain Attachment (MOST COMMON ISSUE)

1. **Railway Dashboard** → **Frontend Service** → **Settings** → **Networking**
   - ✅ Is `nxtgenalpha.com` listed under **Frontend Service**?
   - ❌ If NO → Go to Step 2A
   - ✅ If YES → Go to Step 2B

2. **Railway Dashboard** → **Backend Service** → **Settings** → **Networking**
   - ❌ Is `nxtgenalpha.com` listed under **Backend Service**?
   - ✅ If YES → **THIS IS THE PROBLEM!** Go to Step 2C
   - ❌ If NO → Continue to Step 3

### Step 2: Fix Domain Attachment

#### Option A: Add Domain to Frontend (If Missing)

1. Railway → **Frontend Service** → **Settings** → **Networking**
2. Click **"+ Custom Domain"** or **"Add Domain"**
3. Enter: `nxtgenalpha.com`
4. Railway will show DNS instructions (if needed)
5. Wait 1-2 minutes for Railway to provision SSL

#### Option B: Domain Already on Frontend - Check DNS

1. Railway → **Frontend Service** → **Settings** → **Networking**
2. Click on `nxtgenalpha.com`
3. Check the DNS status:
   - ✅ **"Active"** or **"Provisioned"** → Domain is working, check Step 3
   - ⏳ **"Pending"** → DNS not configured yet, go to Step 2D
   - ❌ **"Failed"** → DNS misconfigured, go to Step 2D

#### Option C: Remove Domain from Backend (CRITICAL!)

1. Railway → **Backend Service** → **Settings** → **Networking**
2. Find `nxtgenalpha.com` in the list
3. Click the **trash/delete icon** next to it
4. Confirm deletion
5. **IMPORTANT:** Now add it to Frontend (Step 2A)

#### Option D: Configure DNS Records

1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Open DNS management for `nxtgenalpha.com`
3. Railway will show you one of these:

   **Option 1: CNAME Record (Most Common)**
   ```
   Type: CNAME
   Name: @ (or leave blank/root)
   Value: YOUR-FRONTEND-SERVICE.up.railway.app
   TTL: 3600 (or Auto)
   ```

   **Option 2: A Record**
   ```
   Type: A
   Name: @
   Value: [IP address Railway provides]
   TTL: 3600
   ```

4. **Save** DNS records
5. Wait 5-60 minutes for DNS propagation
6. Check status: https://dnschecker.org (search for `nxtgenalpha.com`)

### Step 3: Verify Frontend Service is Running

1. **Check Frontend Service Status:**
   - Railway → **Frontend Service** → **Deployments**
   - Latest deployment should be **"Active"** or **"Success"**
   - If **"Failed"**, check build logs

2. **Test Frontend Railway URL:**
   - Visit: `https://YOUR-FRONTEND-SERVICE.up.railway.app`
   - Should see React app (not backend JSON)
   - If you see backend JSON → Domain routing issue (go back to Step 1)

3. **Check Frontend Logs:**
   - Railway → **Frontend Service** → **Logs**
   - Should see nginx startup messages
   - No errors about PORT or missing files

### Step 4: Verify SSL Certificate

1. Railway automatically provisions SSL certificates
2. Check Railway → **Frontend Service** → **Settings** → **Networking**
3. Next to `nxtgenalpha.com`, should see **"SSL Active"** or **"Certificate Provisioned"**
4. If SSL is pending, wait 5-10 minutes after DNS resolves

### Step 5: Clear Browser Cache

1. **Hard refresh:**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
   - Safari: `Cmd+Option+R`

2. **Or use Incognito/Private mode:**
   - Test `https://nxtgenalpha.com` in incognito window
   - If it works in incognito → cache issue

### Step 6: Test Custom Domain

1. Visit: `https://nxtgenalpha.com`
2. **Expected Results:**
   - ✅ React app loads → **SUCCESS!**
   - ❌ Backend JSON → Domain attached to wrong service (Step 2C)
   - ❌ SSL error → SSL not provisioned (Step 4)
   - ❌ 404/Error → Frontend not deployed (Step 3)
   - ❌ DNS error → DNS not configured (Step 2D)

## Common Issues & Solutions

### Issue: Domain Shows Backend JSON Instead of Frontend

**Cause:** Domain is attached to Backend service instead of Frontend

**Fix:**
1. Remove domain from Backend (Step 2C)
2. Add domain to Frontend (Step 2A)
3. Wait 2-3 minutes
4. Clear browser cache

### Issue: SSL Certificate Not Provisioned

**Cause:** DNS not resolving correctly

**Fix:**
1. Check DNS records at registrar
2. Verify DNS propagation: https://dnschecker.org
3. Wait 10-15 minutes after DNS is correct
4. Railway will auto-provision SSL

### Issue: Domain Shows "Pending" Status

**Cause:** DNS records not configured or not propagated

**Fix:**
1. Verify DNS records match Railway's instructions exactly
2. Check DNS propagation: https://dnschecker.org
3. Wait up to 60 minutes for full propagation
4. Try removing and re-adding domain in Railway

### Issue: Frontend Railway URL Works But Custom Domain Doesn't

**Cause:** Domain routing issue or DNS not propagated

**Fix:**
1. Verify domain is attached to Frontend (not Backend)
2. Check DNS propagation
3. Clear browser cache
4. Try accessing in incognito mode

## Verification Commands

### Check DNS Resolution
```bash
# Check if DNS resolves
nslookup nxtgenalpha.com

# Or use online tool
# Visit: https://dnschecker.org
# Search for: nxtgenalpha.com
```

### Test Frontend Directly
```bash
# Test frontend Railway URL
curl https://YOUR-FRONTEND-SERVICE.up.railway.app

# Should return HTML (React app), not JSON
```

### Test Custom Domain
```bash
# Test custom domain
curl https://nxtgenalpha.com

# Should return HTML (React app), not JSON
```

## Still Not Working?

1. **Check Railway Status Page:** https://status.railway.app
2. **Check Railway Logs:**
   - Frontend Service → Logs tab
   - Look for errors or warnings
3. **Verify Environment Variables:**
   - Frontend Service → Variables
   - Ensure `VITE_API_URL` and `BACKEND_URL` are set correctly
4. **Contact Railway Support:**
   - Railway Dashboard → Help → Support
   - Include: Service names, domain, DNS records, error messages

