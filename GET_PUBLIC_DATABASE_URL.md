# How to Get Public Railway PostgreSQL URL

## The Problem
The URL you have (`postgres.railway.internal`) only works **inside Railway's network**. For local development, you need the **public URL**.

## Solution: Get the Public URL from Railway

### Option 1: Railway Dashboard (Easiest)

1. **Go to Railway Dashboard**: https://railway.app
2. **Click on your PostgreSQL service**
3. **Click on the "Connect" tab** (or "Variables" tab)
4. **Look for "Public Network"** section
5. **Copy the connection string** - it should look like:
   ```
   postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
   ```
   OR
   ```
   postgresql://postgres:password@xxxxx.railway.app:5432/railway
   ```

### Option 2: Railway CLI (Alternative)

If you have Railway CLI installed:
```bash
railway connect postgres
```

### Option 3: Check Variables Tab

1. Go to PostgreSQL service in Railway
2. Click "Variables" tab
3. Look for variables like:
   - `DATABASE_URL` (public)
   - `POSTGRES_URL` (public)
   - `PUBLIC_URL`

## Once You Have the Public URL

Update your `.env` file:
```bash
DATABASE_URL=postgresql://postgres:vFbxBglzIoSBuHZMWKdWHeLmEXJfxrdt@PUBLIC_HOSTNAME.railway.app:5432/railway
```

Replace `PUBLIC_HOSTNAME` with the actual public hostname from Railway.

## Alternative: Use Railway CLI Tunnel (For Testing)

If you can't find the public URL, you can create a tunnel:

```bash
# Install Railway CLI if needed
npm i -g @railway/cli

# Login
railway login

# Create tunnel to PostgreSQL
railway connect postgres
```

This will give you a local connection string you can use.

## After Updating .env

1. **Restart your backend server** (the one running uvicorn)
2. **Run the migration**:
   ```bash
   cd /Users/willgranchi/TradingPlat
   source .venv/bin/activate
   python3 backend/migrations/add_password_hash.py
   ```
3. **Test signup** in your frontend

