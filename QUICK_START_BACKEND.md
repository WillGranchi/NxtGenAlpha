# Quick Start - Backend Server

## Step 1: Kill any existing processes on port 8000

```bash
kill -9 $(lsof -ti:8000) 2>/dev/null
```

## Step 2: Start the backend server

**Option A: Use the startup script**
```bash
cd /Users/willgranchi/TradingPlat
./start_backend.sh
```

**Option B: Manual start**
```bash
cd backend
source ../.venv/bin/activate
python3 -m uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
```

## Step 3: Verify server is running

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## Step 4: Test the signup endpoint

In a **new terminal window**, run:
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","name":"Test User"}'
```

**Expected responses:**

✅ **Success** (if database migration is done):
```json
{
  "message": "User created successfully",
  "user": {...},
  "token": "..."
}
```

❌ **Database error** (if migration not run):
```json
{
  "detail": "column users.password_hash does not exist"
}
```
→ **Fix**: Run `cd backend && python3 migrations/add_password_hash.py`

❌ **404 Error**:
→ Server didn't start properly, check the terminal for errors

## Common Issues

### "Address already in use"
```bash
kill -9 $(lsof -ti:8000)
```

### "No module named uvicorn"
```bash
source .venv/bin/activate
pip install uvicorn[standard]
```

### Database errors
```bash
cd backend
source ../.venv/bin/activate
python3 migrations/add_password_hash.py
```

## Once server is running:

1. ✅ Backend should be accessible at `http://localhost:8000`
2. ✅ API docs at `http://localhost:8000/docs`
3. ✅ Signup endpoint at `http://localhost:8000/api/auth/signup`
4. ✅ Frontend can now connect and signup should work!

