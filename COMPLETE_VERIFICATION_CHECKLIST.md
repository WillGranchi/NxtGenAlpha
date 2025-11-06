# Complete Verification Checklist - API Routing & OAuth Fix

This checklist covers all steps from the plan to fix API routing and Google OAuth issues.

## Step 1: Verify and Fix VITE_API_URL ✅

### Railway Frontend Service Configuration

- [ ] Accessed Railway Dashboard → Frontend Service → Variables
- [ ] Verified `VITE_API_URL` exists
- [ ] Value is exactly: `https://web-production-776f1.up.railway.app`
- [ ] If missing/wrong, added/updated the variable
- [ ] Saved changes

### Deployment Verification

- [ ] Checked Railway Dashboard → Frontend Service → Deployments
- [ ] Latest deployment timestamp is after setting/changing VITE_API_URL
- [ ] Deployment status is "Deployed" (green)
- [ ] If deployment was old, triggered redeploy (manually or by changing variable)

### Browser Verification

- [ ] Visited `https://nxtgenalpha.com`
- [ ] Opened browser console (F12)
- [ ] Ran: `console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)`
- [ ] Result shows: `https://web-production-776f1.up.railway.app`
- [ ] Hard refreshed browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)

**If VITE_API_URL is still wrong:**
- [ ] Wait longer for redeployment (5-7 minutes)
- [ ] Force redeploy in Railway
- [ ] Clear browser cache or use incognito window

---

## Step 2: Verify CORS Configuration ✅

### Railway Backend Service Configuration

- [ ] Accessed Railway Dashboard → Backend Service → Variables
- [ ] Verified `CORS_ORIGINS` exists
- [ ] Value includes: `https://nxtgenalpha.com,https://www.nxtgenalpha.com`
- [ ] If missing/wrong, added/updated the variable
- [ ] Verified `FRONTEND_URL` exists
- [ ] Value is: `https://nxtgenalpha.com`
- [ ] If missing, added the variable
- [ ] Saved changes

### Backend Service Restart

- [ ] Restarted backend service after setting CORS variables
- [ ] Waited for service to restart (30-60 seconds)

### Backend Logs Verification

- [ ] Checked Railway Dashboard → Backend Service → Logs
- [ ] Found line: `CORS allowed origins: ['https://nxtgenalpha.com', 'https://www.nxtgenalpha.com']`
- [ ] No CORS-related errors in logs

### Browser CORS Test

- [ ] Visited `https://nxtgenalpha.com`
- [ ] Opened browser console (F12)
- [ ] Ran CORS test script (from Step 4)
- [ ] No CORS errors in console
- [ ] CORS test passes

**If CORS errors persist:**
- [ ] Double-check `CORS_ORIGINS` value in Railway
- [ ] Verify backend restarted after changes
- [ ] Check backend logs for CORS configuration
- [ ] Hard refresh browser

---

## Step 3: Verify Google OAuth Configuration ✅

### Railway Backend Service - OAuth Variables

- [ ] Accessed Railway Dashboard → Backend Service → Variables
- [ ] Verified `GOOGLE_CLIENT_ID` exists
- [ ] Value is a valid Google OAuth Client ID
- [ ] If missing, added the variable
- [ ] Verified `GOOGLE_CLIENT_SECRET` exists
- [ ] Value is a valid Google OAuth Client Secret
- [ ] If missing, added the variable
- [ ] Verified `BACKEND_URL` exists
- [ ] Value is: `https://web-production-776f1.up.railway.app`
- [ ] If missing/wrong, added/updated the variable
- [ ] Saved all changes

### Backend Service Restart

- [ ] Restarted backend service after setting OAuth variables
- [ ] Waited for service to restart

### Google Cloud Console Configuration

- [ ] Accessed Google Cloud Console: https://console.cloud.google.com
- [ ] Selected correct project
- [ ] Navigated to: APIs & Services → Credentials
- [ ] Found OAuth 2.0 Client ID (or created new one)

#### Authorized JavaScript Origins

- [ ] Added: `https://web-production-776f1.up.railway.app`
- [ ] Added: `https://nxtgenalpha.com`
- [ ] Added: `https://www.nxtgenalpha.com`
- [ ] All origins saved

#### Authorized Redirect URIs

- [ ] Added: `https://web-production-776f1.up.railway.app/api/auth/google/callback`
- [ ] Redirect URI matches exactly (no typos, correct protocol)
- [ ] Saved changes

### OAuth Functionality Test

- [ ] Visited `https://nxtgenalpha.com`
- [ ] Clicked "Sign in with Google" button
- [ ] Redirected to Google sign-in page
- [ ] Signed in with Google account
- [ ] Redirected back to site
- [ ] User is logged in successfully
- [ ] No OAuth errors in console or backend logs

**If OAuth fails:**
- [ ] Check backend logs for OAuth errors
- [ ] Verify credentials in Railway match Google Cloud Console
- [ ] Verify redirect URI matches exactly
- [ ] Check for "redirect_uri_mismatch" error
- [ ] Check for "invalid_client" error

---

## Step 4: Test API Directly from Browser ✅

### Browser Console Test

- [ ] Visited `https://nxtgenalpha.com`
- [ ] Opened browser console (F12)
- [ ] Ran complete test script from Step 4
- [ ] All tests pass (✅)

### Individual Test Results

- [ ] **Test 1 - VITE_API_URL:** Shows correct backend URL
- [ ] **Test 2 - Backend API:** Returns 200 with indicators
- [ ] **Test 3 - Frontend API Config:** Works using frontend URL
- [ ] **Test 4 - CORS:** Shows CORS headers and works
- [ ] **Test 5 - OAuth Endpoint:** Redirects to Google (302/307)

### Network Tab Analysis

- [ ] Opened Network tab (F12)
- [ ] Reloaded page
- [ ] Filtered by `api` or `indicators`
- [ ] Checked requests to `/api/backtest/indicators`
- [ ] Request URL is correct: `https://web-production-776f1.up.railway.app/api/backtest/indicators`
- [ ] Status code is 200 (not 404, 500, or CORS error)
- [ ] Response shows JSON with indicators

### Manual Functionality Tests

- [ ] **Indicators Load:** No "Failed to fetch indicators" error
- [ ] **Google Sign-In:** Button works and redirects correctly
- [ ] **Backtest Runs:** Can run a backtest successfully
- [ ] **User Authentication:** User can sign in and stay logged in

---

## Final Verification

### Overall Status

- [ ] All steps completed
- [ ] All checkboxes above checked
- [ ] No errors in browser console
- [ ] No errors in Railway backend logs
- [ ] All functionality works as expected

### Expected Outcomes

✅ **Indicators load successfully**  
✅ **Google sign-in redirects to Google and returns correctly**  
✅ **All API calls work from frontend**  
✅ **No CORS errors**  
✅ **No "Failed to fetch" errors**  
✅ **User authentication works**

### If Issues Persist

**If indicators still fail:**
1. [ ] Check browser console for exact error
2. [ ] Verify frontend redeployed after VITE_API_URL change
3. [ ] Check Network tab - is request going to correct URL?
4. [ ] Check for CORS errors

**If Google sign-in still fails:**
1. [ ] Check backend logs for OAuth errors
2. [ ] Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
3. [ ] Verify redirect URI matches exactly in Google Cloud Console
4. [ ] Check browser console for redirect errors

**If API calls fail:**
1. [ ] Run test script from Step 4
2. [ ] Check which specific test fails
3. [ ] Refer back to the corresponding step
4. [ ] Fix the configuration issue
5. [ ] Re-test

---

## Quick Reference

### Railway URLs

- **Dashboard:** https://railway.app
- **Backend URL:** `https://web-production-776f1.up.railway.app`
- **Frontend URL:** `https://nxtgenalpha.com`

### Required Railway Variables

**Frontend Service:**
- `VITE_API_URL=https://web-production-776f1.up.railway.app`

**Backend Service:**
- `CORS_ORIGINS=https://nxtgenalpha.com,https://www.nxtgenalpha.com`
- `FRONTEND_URL=https://nxtgenalpha.com`
- `BACKEND_URL=https://web-production-776f1.up.railway.app`
- `GOOGLE_CLIENT_ID=<your-client-id>`
- `GOOGLE_CLIENT_SECRET=<your-client-secret>`

### Google Cloud Console

- **URL:** https://console.cloud.google.com
- **Path:** APIs & Services → Credentials
- **Authorized JavaScript Origins:**
  - `https://web-production-776f1.up.railway.app`
  - `https://nxtgenalpha.com`
  - `https://www.nxtgenalpha.com`
- **Authorized Redirect URIs:**
  - `https://web-production-776f1.up.railway.app/api/auth/google/callback`

---

## Success Criteria

**All of these must be true:**

✅ Frontend uses correct API URL (`VITE_API_URL`)  
✅ Backend allows CORS from frontend domain  
✅ Google OAuth credentials are configured  
✅ Google Cloud Console redirect URI matches backend  
✅ Indicators load without errors  
✅ Google sign-in works end-to-end  
✅ All API calls succeed  
✅ No console errors  
✅ No Network errors  

**If all criteria are met, the configuration is correct!** 🎉

