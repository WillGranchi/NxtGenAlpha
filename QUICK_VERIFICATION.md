# Quick Verification Checklist

Now that both backend and frontend are running, follow these steps to verify everything works:

## ✅ Step 1: Verify Frontend is Serving (Not Backend API)

1. **Visit your domain:**
   - Go to: `https://nxtgenalpha.com`
   - **Expected:** You should see the React app (dashboard with strategy builder)
   - **NOT:** You should NOT see JSON like `{"message":"Bitcoin Trading Strategy API"...}`

2. **Check the page source:**
   - Right-click → "View Page Source"
   - Should see HTML with React app structure
   - Should NOT see just JSON

3. **Check browser console:**
   - Press F12 → Console tab
   - Look for: `[API] Base URL: https://web-production-776f1.up.railway.app`
   - Should NOT see errors about CORS or mixed content

## ✅ Step 2: Test Google OAuth Login

1. **Click "Sign in with Google"** button
2. **Complete Google login:**
   - Select your Google account
   - Grant permissions if prompted
3. **Verify redirect:**
   - Should redirect back to `https://nxtgenalpha.com`
   - Should show your profile/name instead of "Sign in"
   - Should NOT show "Sign in" button anymore
4. **Check browser console:**
   - Should see successful API calls
   - Should NOT see 401/403 errors

## ✅ Step 3: Test Strategy Features

1. **Load available strategies:**
   - Should see strategy list (SMA, RSI, MACD, etc.)
   - Should NOT see errors in console

2. **Build a strategy:**
   - Select a strategy (e.g., "SMA")
   - Configure parameters
   - Set date range (e.g., Jan 1, 2018 to today)
   - Click "Run Backtest"

3. **Verify results:**
   - Should see metrics (Total Return, Sharpe Ratio, etc.)
   - Should see charts/graphs
   - Should see trade log
   - Should NOT see error messages

## ✅ Step 4: Test Strategy Saving (Requires Login)

1. **Save a strategy:**
   - After running a backtest, click "Save Strategy"
   - Give it a name (e.g., "My Test Strategy")
   - Add a description
   - Click "Save"

2. **Verify it's saved:**
   - Should see success message
   - Strategy should appear in "Saved Strategies" list
   - Should NOT see error messages

3. **Load a saved strategy:**
   - Click on a saved strategy from the list
   - Should load the strategy configuration
   - Should be able to run it again

4. **Verify persistence:**
   - Refresh the page
   - Log out and log back in
   - Your saved strategies should still be there

## ✅ Step 5: Test API Connectivity

1. **Check Network tab:**
   - Press F12 → Network tab
   - Filter by "XHR" or "Fetch"
   - Visit different pages/features
   - All API calls should return 200 (success) or 401 (if not logged in)
   - Should NOT see 404, 500, or CORS errors

2. **Test specific endpoints:**
   - `/api/strategies` - Should return list of available strategies
   - `/api/strategies/saved/list` - Should return your saved strategies (if logged in)
   - `/api/health` - Should return `{"status":"healthy"}`

## ✅ Step 6: Verify Environment Variables

### Frontend Service (Railway):
- ✅ `VITE_API_URL` = `https://web-production-776f1.up.railway.app` (HTTPS, not HTTP)
- ✅ `BACKEND_URL` = `https://web-production-776f1.up.railway.app` (HTTPS)

### Backend Service (Railway):
- ✅ `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` or actual connection string
- ✅ `CORS_ORIGINS` = `https://nxtgenalpha.com,https://www.nxtgenalpha.com`
- ✅ `FRONTEND_URL` = `https://nxtgenalpha.com`
- ✅ `BACKEND_URL` = `https://web-production-776f1.up.railway.app`
- ✅ `GOOGLE_CLIENT_ID` = Your Google OAuth client ID
- ✅ `GOOGLE_CLIENT_SECRET` = Your Google OAuth client secret
- ✅ `ENVIRONMENT` = `production`
- ✅ `COOKIE_SECURE` = `true`

## 🐛 Common Issues & Quick Fixes

### Issue: Still seeing backend API JSON instead of frontend
**Fix:** 
- Clear browser cache (F12 → Application → Clear storage)
- Check Railway frontend service is actually running
- Verify domain is attached to frontend service (not backend)

### Issue: "Sign in" button still shows after login
**Fix:**
- Check browser console for errors
- Verify `CORS_ORIGINS` includes your domain
- Check backend logs for authentication errors
- Try clearing cookies and logging in again

### Issue: Can't save strategies
**Fix:**
- Make sure you're logged in (check if your name/profile shows)
- Check browser console for API errors
- Verify `DATABASE_URL` is set correctly in Railway
- Check backend logs for database errors

### Issue: API calls failing with CORS errors
**Fix:**
- Verify `CORS_ORIGINS` in backend includes `https://nxtgenalpha.com`
- Restart backend service after changing `CORS_ORIGINS`
- Check that `VITE_API_URL` uses HTTPS (not HTTP)

## ✅ Success Criteria

You're all set when:
- ✅ `https://nxtgenalpha.com` shows the React app (not JSON)
- ✅ Google login works and shows your profile
- ✅ You can run backtests and see results
- ✅ You can save strategies and they persist
- ✅ No errors in browser console
- ✅ All API calls return success (200) or auth errors (401), not 404/500

## Next Steps

Once everything is verified:
1. Test with different strategies
2. Test with different date ranges
3. Share with users for beta testing
4. Monitor Railway logs for any issues
5. Set up monitoring/alerts if needed

