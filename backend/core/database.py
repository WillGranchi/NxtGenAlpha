"""
Database connection and session management.
"""

from sqlalchemy import create_engine
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
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

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
    Base.metadata.create_all(bind=engine)


def drop_db():
    """
    Drop all database tables.
    Use with caution - deletes all data!
    """
    Base.metadata.drop_all(bind=engine)

