"""
Database connection and session management.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import os
from typing import Generator
from pathlib import Path

# Load environment variables from .env file (best-effort, non-fatal)
try:
    from dotenv import load_dotenv
    # Load .env from project root (2 levels up from this file)
    env_path = Path(__file__).parent.parent.parent / '.env'
    try:
        load_dotenv(dotenv_path=env_path)
    except Exception:
        # If .env cannot be read (e.g., permission issues in certain environments),
        # continue without failing – environment variables can still come from the
        # OS or deployment platform.
        pass
except ImportError:
    # python-dotenv not installed, skip loading .env
    pass

from backend.api.models.db_models import Base

# Get database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://tradingplat_user:tradingplat_password@localhost:5432/tradingplat"
)

# Create engine
# For SQLite: check_same_thread=False is needed
# For PostgreSQL: we don't need it
try:
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        # Use pool_pre_ping to verify connections before using them
        # Set pool_recycle to prevent stale connections
        engine = create_engine(
            DATABASE_URL, 
            pool_pre_ping=True,
            pool_recycle=300,  # Recycle connections after 5 minutes
            echo=False  # Set to True for SQL query logging in development
        )
except Exception as e:
    # Log error but don't crash - engine will be None and operations will fail gracefully
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Failed to create database engine: {e}")
    logger.warning("Database operations will fail until DATABASE_URL is configured correctly")
    raise

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for getting database session.
    
    Yields:
        Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    Creates all tables defined in Base metadata.
    """
    try:
        # Test connection first
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        # Create tables
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        raise


def drop_db():
    """
    Drop all database tables.
    Use with caution - deletes all data!
    """
    Base.metadata.drop_all(bind=engine)

