# Running Database Migrations on Railway

This guide provides step-by-step instructions for running Alembic database migrations on Railway.

## Prerequisites

- Railway CLI installed: `npm install -g @railway/cli`
- Logged into Railway: `railway login`
- Project linked: `railway link`
- Backend service deployed and running
- PostgreSQL database service added and `DATABASE_URL` configured

## Quick Start

### Method 1: Railway CLI (Easiest)

```bash
railway run --service web python -m alembic -c backend/alembic.ini upgrade head
```

### Method 2: Using Migration Script

```bash
railway run --service web bash scripts/run_migrations.sh
```

## Troubleshooting

### Error: "No module named alembic"

This means Alembic isn't available in the Python environment. Solutions:

1. **Check requirements.txt is included**: Ensure `alembic>=1.12.0` is in `requirements.txt`

2. **Verify build succeeded**: Check Railway build logs to ensure packages were installed

3. **Try installing manually** (not recommended for production):
   ```bash
   railway run --service web python -m pip install alembic
   ```

### Error: "No such file or directory"

This usually means:
- The working directory is wrong - use `-c backend/alembic.ini` flag
- The alembic.ini file is in the wrong location - it should be in `backend/alembic.ini`

### Error: "Can't locate revision identified by 'head'"

This means migrations haven't been created yet. You need to:

1. **Create initial migration** (run this once):
   ```bash
   railway run --service web python -m alembic -c backend/alembic.ini revision --autogenerate -m "Initial migration"
   ```

2. **Then run migrations**:
   ```bash
   railway run --service web python -m alembic -c backend/alembic.ini upgrade head
   ```

### Error: Database connection failed

This means `DATABASE_URL` is not set correctly. Check:

1. Go to Railway → Your PostgreSQL service → Variables
2. Copy the `DATABASE_URL` value
3. Go to Railway → Your backend service → Variables
4. Ensure `DATABASE_URL` is set to the PostgreSQL connection string

## Verification

After running migrations, verify tables were created:

1. **Check backend logs** for any errors
2. **Test API endpoints** that require database (e.g., `/api/auth/me`)
3. **Check database directly** (if you have psql access):
   ```bash
   railway run --service postgres psql $DATABASE_URL -c "\dt"
   ```

## Common Commands

### Create a new migration
```bash
railway run --service web python -m alembic -c backend/alembic.ini revision --autogenerate -m "Description of changes"
```

### Run migrations to head
```bash
railway run --service web python -m alembic -c backend/alembic.ini upgrade head
```

### Rollback one migration
```bash
railway run --service web python -m alembic -c backend/alembic.ini downgrade -1
```

### Show current migration version
```bash
railway run --service web python -m alembic -c backend/alembic.ini current
```

### Show migration history
```bash
railway run --service web python -m alembic -c backend/alembic.ini history
```

## Notes

- Railway's working directory is typically the project root (`/app` or project root)
- Always use `python -m alembic` instead of just `alembic` to ensure correct Python environment
- Use `-c backend/alembic.ini` to specify the config file location
- Migrations are stored in `backend/alembic/versions/` directory

