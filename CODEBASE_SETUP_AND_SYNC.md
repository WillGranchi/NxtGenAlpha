## What this doc is
This is a **quick, reproducible guide** to download this repo from GitHub and run it on another computer (frontend + backend), using the current **CoinGlass-first** data flow and the existing DB migration setup.

## 1) Prerequisites
- **Git**
- **Node.js**: LTS recommended
- **Python**: 3.11 recommended
- **Postgres** (recommended for performance) or use the app’s CSV fallback where supported

## 2) Clone the repo
```bash
git clone https://github.com/WillGranchi/NxtGenAlpha.git
cd NxtGenAlpha
```

## 3) Configure environment variables

### Backend (`backend/.env`)
Create `backend/.env`:
```bash
mkdir -p backend
cat > backend/.env <<'EOF'
# Required
COINGLASS_API_KEY=REPLACE_ME

# Recommended (Postgres)
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DBNAME

# CORS / URLs
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF
```

Notes:
- **CoinGlass**: put your real `COINGLASS_API_KEY` here.
- **DATABASE_URL**: if you skip this, DB features may not be available; some routes may fall back to CSV depending on configuration.

### Frontend (`frontend/.env`)
Create `frontend/.env`:
```bash
cat > frontend/.env <<'EOF'
VITE_API_URL=http://localhost:8000
EOF
```

## 4) Run the backend (FastAPI)
From repo root:
```bash
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

# Run API
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000
```

Confirm:
- API health: `http://localhost:8000/health`
- Docs: `http://localhost:8000/docs`

## 5) Run the frontend (Vite)
In a second terminal:
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Open:
- `http://localhost:3000`

## 6) Common issues

### Mixed-content / CORS
- If your frontend is **HTTPS** and backend is **HTTP**, browsers will block requests.
  - Fix by setting `VITE_API_URL` to the backend’s HTTPS URL (in production).
- Ensure `CORS_ORIGINS` includes your frontend domain.

### CoinGlass symbols not loading
- Use the UI’s CoinGlass test (where available) or call:
  - `GET /api/data/test-coinglass`
- Verify `COINGLASS_API_KEY` is set in `backend/.env`.

### DB migrations
The backend attempts to run Alembic migrations on startup in production environments. Locally, if you want to run them explicitly:
```bash
python -m alembic -c backend/alembic.ini upgrade head
```

## 7) Working on another computer (recommended workflow)
- Create a feature branch:
```bash
git checkout -b my-work
```
- Commit frequently:
```bash
git add -A
git commit -m "Your message"
```
- Push and open PR (or push to main if you prefer):
```bash
git push origin my-work
```

## 8) What pages are considered “core” right now
- Dashboard (Unified)
- Full Cycle Model
- Indicators
- Valuation
- Auth/Settings
- CoinGlass data pipeline + caching + DB price_data model/migrations


