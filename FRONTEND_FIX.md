# Frontend Host Error Fix

## Issue
When visiting `nxtgenalpha.com`, you get:
```
Blocked request. This host ("nxtgenalpha.com") is not allowed.
To allow this host, add "nxtgenalpha.com" to `server.allowedHosts` in vite.config.js.
```

## Root Cause
Railway is running the Vite dev server instead of serving built static files. The `start` script in `package.json` was running `vite` (dev server) instead of serving the built files.

## Solution Applied

### 1. Updated `vite.config.ts`
- Added `allowedHosts` to `server` config (for dev mode)
- Added `allowedHosts` to `preview` config (for production preview mode)
- Added domains: `nxtgenalpha.com`, `www.nxtgenalpha.com`, `.railway.app`, `localhost`

### 2. Updated `package.json`
- Changed `start` script from `vite` to `vite preview --host --port $PORT`
- This ensures Railway serves the built static files instead of running dev server
- The `preview` command serves the built files from the `dist` directory

## Next Steps

1. **Commit and push the changes:**
   ```bash
   git add frontend/vite.config.ts frontend/package.json
   git commit -m "Fix: Configure Vite for production with allowed hosts"
   git push origin main
   ```

2. **Railway will auto-redeploy** the frontend service

3. **Wait for deployment** to complete (check Railway dashboard)

4. **Test the site** at `https://nxtgenalpha.com`

## How It Works

- **Build phase:** Railway runs `npm run build` which creates static files in `dist/`
- **Start phase:** Railway runs `npm start` which now runs `vite preview`
- **Vite preview:** Serves the built static files (not dev server)
- **Allowed hosts:** Allows requests from `nxtgenalpha.com` and Railway domains

## Alternative Solution (If This Doesn't Work)

If you still have issues, you can use a static file server:

1. Install `serve` package:
   ```json
   "scripts": {
     "start": "serve -s dist -l $PORT"
   }
   ```
   And add to dependencies: `"serve": "^14.2.0"`

But the Vite preview solution should work fine for now.

## Verification

After deployment:
1. Visit `https://nxtgenalpha.com`
2. Should load without host blocking error
3. Check browser console for any other errors
4. Verify API calls are working

