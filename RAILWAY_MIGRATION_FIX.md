# Fix for "No module named alembic" on Railway

## The Problem

When running `railway run --service web python -m alembic ...`, Railway is using `/opt/anaconda3/bin/python` which doesn't have alembic installed. This is because `railway run` uses a different Python environment than the build.

## Solutions

### Solution 1: Use the Migration Script (Recommended)

The script automatically finds the correct Python:

```bash
railway run --service web bash scripts/run_migrations.sh
```

### Solution 2: Install Alembic in Runtime (Quick Fix)

If the script doesn't work, install alembic first:

```bash
railway run --service web python3 -m pip install --user alembic sqlalchemy psycopg2-binary
railway run --service web python3 -m alembic -c backend/alembic.ini upgrade head
```

### Solution 3: Use the Python from the Running Process

If your app is running, we can find the Python it uses:

```bash
railway run --service web sh -c "which python3 && python3 -m pip list | grep alembic"
```

### Solution 4: Check Build Logs

1. Go to Railway → Your backend service
2. Click "Deployments" tab
3. Check the build logs to see where Python packages were installed
4. Use that Python path in your migration command

## Why This Happens

Railway's `railway run` command creates a new shell session that may not have the same environment variables or Python paths as the build process. The build process (Nixpacks) installs packages, but `railway run` might use the system Python.

## Best Practice

Use the migration script (`scripts/run_migrations.sh`) which handles all these cases automatically.
