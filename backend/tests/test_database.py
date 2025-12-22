"""
Database initialization and schema validation tests.
"""
import pytest
from sqlalchemy import inspect, text
from backend.core.database import engine, Base, init_db, get_db, SessionLocal
from backend.api.models.db_models import User, Strategy


class TestDatabaseInitialization:
    """Test database initialization and schema."""
    
    def test_database_connection(self):
        """Test database connection works."""
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            assert result.fetchone()[0] == 1
    
    def test_init_db_creates_tables(self):
        """Test that init_db creates all required tables."""
        # Drop all tables first
        Base.metadata.drop_all(bind=engine)
        
        # Initialize database
        init_db()
        
        # Check tables exist
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        assert "users" in tables
        assert "strategies" in tables
    
    def test_users_table_schema(self):
        """Test users table has correct schema."""
        # Ensure tables exist
        init_db()
        inspector = inspect(engine)
        columns = {col["name"]: col for col in inspector.get_columns("users")}
        
        # Check required columns
        assert "id" in columns
        # PostgreSQL uses 'autoincrement' to indicate primary keys, not 'primary_key'
        # Check for either primary_key=True or autoincrement=True
        assert columns["id"].get("primary_key") is True or columns["id"].get("autoincrement") is True
        assert "email" in columns
        assert "name" in columns
        assert "google_id" in columns
        assert "theme" in columns
        assert "created_at" in columns
        assert "updated_at" in columns
        
        # Check indexes
        indexes = {idx["name"]: idx for idx in inspector.get_indexes("users")}
        # Should have indexes on email and google_id (unique indexes)
        assert any("email" in str(idx) for idx in inspector.get_indexes("users"))
    
    def test_strategies_table_schema(self):
        """Test strategies table has correct schema."""
        # Ensure tables exist
        init_db()
        inspector = inspect(engine)
        columns = {col["name"]: col for col in inspector.get_columns("strategies")}
        
        # Check required columns
        assert "id" in columns
        # PostgreSQL uses 'autoincrement' to indicate primary keys, not 'primary_key'
        # Check for either primary_key=True or autoincrement=True
        assert columns["id"].get("primary_key") is True or columns["id"].get("autoincrement") is True
        assert "user_id" in columns
        assert "name" in columns
        assert "indicators" in columns
        assert "expressions" in columns
        assert "parameters" in columns
        assert "created_at" in columns
        assert "updated_at" in columns
        
        # Check foreign key
        foreign_keys = inspector.get_foreign_keys("strategies")
        user_fk = next((fk for fk in foreign_keys if fk["referred_table"] == "users"), None)
        assert user_fk is not None
        assert "user_id" in user_fk["constrained_columns"]
    
    def test_table_relationships(self):
        """Test table relationships are properly defined."""
        # Verify SQLAlchemy relationships
        assert hasattr(User, "strategies")
        assert hasattr(Strategy, "user")


class TestDatabaseOperations:
    """Test basic database operations."""
    
    def test_create_user(self):
        """Test creating a user."""
        db = SessionLocal()
        try:
            user = User(
                email="test_db@example.com",
                name="Test DB User",
                google_id="test_db_google_id",
                theme="dark"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            assert user.id is not None
            assert user.email == "test_db@example.com"
            assert user.theme == "dark"
            
            # Clean up
            db.delete(user)
            db.commit()
        finally:
            db.close()
    
    def test_create_strategy(self):
        """Test creating a strategy."""
        db = SessionLocal()
        try:
            # Create user first
            user = User(
                email="strategy_test@example.com",
                name="Strategy Test User",
                google_id="strategy_test_google_id"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create strategy
            strategy = Strategy(
                user_id=user.id,
                name="Test Strategy",
                indicators=[{"id": "RSI", "params": {"period": 14}}],
                expressions={"expression": "RSI_OVERSOLD"},
                parameters={"initial_capital": 10000}
            )
            db.add(strategy)
            db.commit()
            db.refresh(strategy)
            
            assert strategy.id is not None
            assert strategy.user_id == user.id
            assert strategy.name == "Test Strategy"
            assert isinstance(strategy.indicators, list)
            assert isinstance(strategy.expressions, dict)
            
            # Test relationship
            assert strategy.user == user
            assert strategy in user.strategies
            
            # Clean up
            db.delete(strategy)
            db.delete(user)
            db.commit()
        finally:
            db.close()
    
    def test_cascade_delete(self):
        """Test that deleting user cascades to strategies."""
        db = SessionLocal()
        try:
            # Create user with strategy
            user = User(
                email="cascade_test@example.com",
                name="Cascade Test User",
                google_id="cascade_test_google_id"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            strategy = Strategy(
                user_id=user.id,
                name="Cascade Test Strategy",
                indicators=[{"id": "RSI"}],
                expressions={"expression": "RSI_OVERSOLD"}
            )
            db.add(strategy)
            db.commit()
            db.refresh(strategy)
            strategy_id = strategy.id
            
            # Delete user (should cascade to strategy)
            db.delete(user)
            db.commit()
            
            # Verify strategy is also deleted
            deleted_strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
            assert deleted_strategy is None
        finally:
            db.close()
    
    def test_unique_constraints(self):
        """Test unique constraints on email and google_id."""
        db = SessionLocal()
        try:
            # Create first user
            user1 = User(
                email="unique_test@example.com",
                name="Unique Test User 1",
                google_id="unique_google_id_1"
            )
            db.add(user1)
            db.commit()
            
            # Try to create user with same email (should fail)
            user2 = User(
                email="unique_test@example.com",
                name="Unique Test User 2",
                google_id="unique_google_id_2"
            )
            db.add(user2)
            try:
                db.commit()
                assert False, "Should have raised integrity error for duplicate email"
            except Exception:
                db.rollback()
            
            # Try to create user with same google_id (should fail)
            user3 = User(
                email="unique_test2@example.com",
                name="Unique Test User 3",
                google_id="unique_google_id_1"
            )
            db.add(user3)
            try:
                db.commit()
                assert False, "Should have raised integrity error for duplicate google_id"
            except Exception:
                db.rollback()
            
            # Clean up
            db.delete(user1)
            db.commit()
        finally:
            db.close()

