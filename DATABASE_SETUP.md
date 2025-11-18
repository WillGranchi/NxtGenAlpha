# Database Setup for Signup/Login

## Issue
The backend is trying to connect to a local PostgreSQL database, but you're using Railway's PostgreSQL database.

## Solution

You need to set the `DATABASE_URL` environment variable to point to your Railway database.

### Option 1: Set Environment Variable (Recommended for Local Testing)

**In the terminal where you're running the backend server**, set the DATABASE_URL:

```bash
export DATABASE_URL="your_railway_postgresql_url_here"
```

You can find your Railway PostgreSQL URL in:
1. Railway dashboard → Your PostgreSQL service → Variables tab
2. Look for `DATABASE_URL` or `POSTGRES_URL`

It should look like:
```
postgresql://postgres:password@hostname.railway.app:5432/railway
```

### Option 2: Create .env File

Create a `.env` file in the project root (`/Users/willgranchi/TradingPlat/.env`):

```bash
DATABASE_URL=your_railway_postgresql_url_here
```

Then install python-dotenv if not already installed:
```bash
pip install python-dotenv
```

And update `backend/core/database.py` to load from .env:
```python
from dotenv import load_dotenv
load_dotenv()
```

### Option 3: Use Railway's Environment Variables

If you're running on Railway, the `DATABASE_URL` should already be set automatically. Make sure your Railway backend service is linked to the PostgreSQL service.

## After Setting DATABASE_URL

1. **Restart your backend server** (the one running uvicorn)
2. **Run the migration** to add the password_hash column:
   ```bash
   cd /Users/willgranchi/TradingPlat
   source .venv/bin/activate
   python3 backend/migrations/add_password_hash.py
   ```
3. **Test signup again** in your frontend

## Quick Check

To verify your DATABASE_URL is set correctly, run:
```bash
echo $DATABASE_URL
```

If it's empty or shows the local database URL, you need to set it to your Railway database URL.

