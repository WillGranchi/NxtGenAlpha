"""
FastAPI main application for Bitcoin Trading Strategy Backtesting Tool.

This module creates the FastAPI application with CORS support, logging,
and mounts all API routes.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
import sys
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from backend.api.routes import data, strategies, backtest, auth, custom_indicators, valuation
from backend.utils.helpers import get_logger
from backend.core.database import init_db
from backend.core.data_loader import update_btc_data, update_crypto_data
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# Configure logging
logger = get_logger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Bitcoin Trading Strategy API",
    description="API for backtesting Bitcoin trading strategies using historical data",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
# Get allowed origins from environment variable or use defaults
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    # Split comma-separated list of origins
    allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    # Default development origins
    allowed_origins = [
        "http://localhost:3000",  # React dev server
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # Alternative React port
        "http://127.0.0.1:3001",
    ]

# Add frontend URL if specified (for production)
frontend_url = os.getenv("FRONTEND_URL", "")
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],  # Expose all headers including Authorization
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Initialize scheduler for daily data updates
scheduler = AsyncIOScheduler()

async def scheduled_data_update():
    """Scheduled task to update cryptocurrency data daily."""
    try:
        logger.info("Running scheduled data update for Bitcoin...")
        # Update Bitcoin data (can add more symbols here in the future)
        update_crypto_data(symbol="BTCUSDT", force=False)
        logger.info("Scheduled data update completed successfully")
    except Exception as e:
        logger.error(f"Error in scheduled data update: {e}", exc_info=True)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables, run migrations, and scheduler on application startup."""
    try:
        # Run Alembic migrations first
        try:
            import subprocess
            import sys
            result = subprocess.run(
                [sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", "upgrade", "head"],
                cwd="/app",
                capture_output=True,
                text=True,
                timeout=60
            )
            if result.returncode == 0:
                logger.info("Database migrations completed successfully")
            else:
                logger.warning(f"Migration output: {result.stdout}")
                logger.warning(f"Migration errors: {result.stderr}")
                # Try fallback migration script for profile_picture_url
                try:
                    from backend.migrations.add_profile_picture_url import add_profile_picture_url_column
                    add_profile_picture_url_column()
                    logger.info("Fallback migration script completed successfully")
                except Exception as fallback_error:
                    logger.warning(f"Fallback migration also failed: {fallback_error}")
                # Continue anyway - migrations might already be applied
        except Exception as migration_error:
            logger.warning(f"Failed to run migrations: {migration_error}")
            # Try fallback migration script
            try:
                from backend.migrations.add_profile_picture_url import add_profile_picture_url_column
                add_profile_picture_url_column()
                logger.info("Fallback migration script completed successfully")
            except Exception as fallback_error:
                logger.warning(f"Fallback migration also failed: {fallback_error}")
            # Continue - migrations might already be applied or can be run manually
        
        # Initialize database tables (creates tables if they don't exist)
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
        # Don't crash the app - database operations will fail later with proper error messages
        # This allows the app to start even if DB isn't ready yet (e.g., during Railway deployment)
        logger.warning("Application will continue without database initialization. Database operations may fail until connection is established.")
    
    # Start scheduler for daily data updates (runs at 2 AM UTC daily)
    try:
        scheduler.add_job(
            scheduled_data_update,
            trigger=CronTrigger(hour=2, minute=0),  # 2 AM UTC daily
            id='daily_data_update',
            name='Daily Bitcoin Data Update',
            replace_existing=True
        )
        scheduler.start()
        logger.info("Scheduler started for daily data updates (2 AM UTC)")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}", exc_info=True)
        logger.warning("Application will continue without scheduler. Manual data updates will still work.")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown scheduler on application shutdown."""
    try:
        scheduler.shutdown()
        logger.info("Scheduler shut down successfully")
    except Exception as e:
        logger.error(f"Error shutting down scheduler: {e}", exc_info=True)

# Include routers
app.include_router(data.router)
app.include_router(strategies.router)
app.include_router(backtest.router)
app.include_router(auth.router)
app.include_router(custom_indicators.router)
app.include_router(valuation.router)


@app.get("/")
async def root():
    """
    Root endpoint with API information.
    
    Returns:
        dict: API status and information
    """
    return {
        "message": "Bitcoin Trading Strategy API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        dict: Health status
    """
    try:
        from backend.core.data_loader import load_crypto_data
        df = load_crypto_data()
        
        return {
            "status": "healthy",
            "data_records": len(df),
            "api_version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "api_version": "1.0.0"
            }
        )


@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors."""
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": "Endpoint not found",
            "message": "The requested endpoint does not exist"
        }
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Handle 500 errors."""
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    logger.info("Starting Bitcoin Trading Strategy API server...")
    
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
