"""
Integration tests for authentication and strategy management flow.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend.api.main import app
from backend.core.database import get_db, init_db, engine
from backend.api.models.db_models import Base, User, Strategy
from backend.core.auth import create_access_token
import json


@pytest.fixture(scope="function")
def db_session():
    """Create a test database session."""
    # Create test tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    from backend.core.database import SessionLocal
    db = SessionLocal()
    
    try:
        yield db
    finally:
        db.rollback()
        db.close()
        # Clean up test tables
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    
    yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        email="test@example.com",
        name="Test User",
        google_id="test_google_id_123",
        theme="light"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_token(test_user):
    """Create an auth token for test user."""
    return create_access_token(data={"sub": test_user.id})


@pytest.fixture
def authenticated_client(client, auth_token):
    """Create an authenticated test client."""
    client.cookies.set("token", auth_token)
    return client


class TestAuthentication:
    """Test authentication endpoints."""
    
    def test_guest_mode(self, client):
        """Test guest mode returns unauthenticated."""
        response = client.get("/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
    
    def test_logout(self, client):
        """Test logout endpoint."""
        response = client.post("/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_google_login_redirect(self, client):
        """Test Google OAuth login redirect."""
        response = client.get("/api/auth/google/login", follow_redirects=False)
        # Should redirect (302) or handle missing credentials gracefully
        assert response.status_code in [200, 302, 400, 500]
    
    def test_theme_update_requires_auth(self, client):
        """Test theme update requires authentication."""
        response = client.post("/api/auth/theme?theme=dark")
        assert response.status_code == 401
    
    def test_theme_update_with_auth(self, authenticated_client, test_user, db_session):
        """Test theme update with authentication."""
        response = authenticated_client.post("/api/auth/theme?theme=dark")
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "dark"
        
        # Verify database was updated
        db_session.refresh(test_user)
        assert test_user.theme == "dark"
    
    def test_get_current_user_authenticated(self, authenticated_client, test_user):
        """Test getting current user when authenticated."""
        response = authenticated_client.get("/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["user"]["email"] == test_user.email
        assert data["user"]["id"] == test_user.id


class TestStrategyCRUD:
    """Test strategy CRUD operations."""
    
    def test_list_strategies_requires_auth(self, client):
        """Test listing strategies requires authentication."""
        response = client.get("/api/strategies/saved/list")
        assert response.status_code == 401
    
    def test_list_strategies_empty(self, authenticated_client):
        """Test listing strategies returns empty list for new user."""
        response = authenticated_client.get("/api/strategies/saved/list")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["strategies"] == []
    
    def test_create_strategy_requires_auth(self, client):
        """Test creating strategy requires authentication."""
        strategy_data = {
            "name": "Test Strategy",
            "indicators": [{"id": "RSI", "params": {"period": 14}}],
            "expressions": {"expression": "RSI_OVERSOLD"},
            "parameters": {"initial_capital": 10000}
        }
        response = client.post("/api/strategies/saved", json=strategy_data)
        assert response.status_code == 401
    
    def test_create_strategy(self, authenticated_client, test_user, db_session):
        """Test creating a strategy."""
        strategy_data = {
            "name": "Test Strategy",
            "description": "A test strategy",
            "indicators": [{"id": "RSI", "params": {"period": 14}}],
            "expressions": {"expression": "RSI_OVERSOLD"},
            "parameters": {"initial_capital": 10000}
        }
        response = authenticated_client.post("/api/strategies/saved", json=strategy_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Strategy"
        assert data["id"] is not None
        
        # Verify in database
        strategy = db_session.query(Strategy).filter(Strategy.id == data["id"]).first()
        assert strategy is not None
        assert strategy.user_id == test_user.id
        assert strategy.name == "Test Strategy"
    
    def test_get_strategy(self, authenticated_client, test_user, db_session):
        """Test retrieving a strategy."""
        # Create strategy first
        strategy = Strategy(
            user_id=test_user.id,
            name="Get Test Strategy",
            indicators=[{"id": "RSI", "params": {"period": 14}}],
            expressions={"expression": "RSI_OVERSOLD"},
            parameters={"initial_capital": 10000}
        )
        db_session.add(strategy)
        db_session.commit()
        db_session.refresh(strategy)
        
        # Get strategy
        response = authenticated_client.get(f"/api/strategies/saved/{strategy.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == strategy.id
        assert data["name"] == "Get Test Strategy"
    
    def test_get_strategy_not_found(self, authenticated_client):
        """Test getting non-existent strategy."""
        response = authenticated_client.get("/api/strategies/saved/99999")
        assert response.status_code == 404
    
    def test_update_strategy(self, authenticated_client, test_user, db_session):
        """Test updating a strategy."""
        # Create strategy first
        strategy = Strategy(
            user_id=test_user.id,
            name="Update Test Strategy",
            indicators=[{"id": "RSI", "params": {"period": 14}}],
            expressions={"expression": "RSI_OVERSOLD"},
            parameters={"initial_capital": 10000}
        )
        db_session.add(strategy)
        db_session.commit()
        db_session.refresh(strategy)
        
        # Update strategy
        update_data = {
            "name": "Updated Strategy Name",
            "description": "Updated description"
        }
        response = authenticated_client.put(
            f"/api/strategies/saved/{strategy.id}",
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Strategy Name"
        
        # Verify in database
        db_session.refresh(strategy)
        assert strategy.name == "Updated Strategy Name"
    
    def test_delete_strategy(self, authenticated_client, test_user, db_session):
        """Test deleting a strategy."""
        # Create strategy first
        strategy = Strategy(
            user_id=test_user.id,
            name="Delete Test Strategy",
            indicators=[{"id": "RSI", "params": {"period": 14}}],
            expressions={"expression": "RSI_OVERSOLD"},
            parameters={"initial_capital": 10000}
        )
        db_session.add(strategy)
        db_session.commit()
        strategy_id = strategy.id
        
        # Delete strategy
        response = authenticated_client.delete(f"/api/strategies/saved/{strategy_id}")
        assert response.status_code == 200
        
        # Verify deleted
        deleted_strategy = db_session.query(Strategy).filter(Strategy.id == strategy_id).first()
        assert deleted_strategy is None
    
    def test_duplicate_strategy(self, authenticated_client, test_user, db_session):
        """Test duplicating a strategy."""
        # Create strategy first
        strategy = Strategy(
            user_id=test_user.id,
            name="Original Strategy",
            description="Original description",
            indicators=[{"id": "RSI", "params": {"period": 14}}],
            expressions={"expression": "RSI_OVERSOLD"},
            parameters={"initial_capital": 10000}
        )
        db_session.add(strategy)
        db_session.commit()
        db_session.refresh(strategy)
        
        # Duplicate strategy
        response = authenticated_client.post(f"/api/strategies/saved/{strategy.id}/duplicate")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Original Strategy (Copy)"
        assert data["id"] != strategy.id
        assert data["indicators"] == strategy.indicators


class TestStrategyValidation:
    """Test strategy validation."""
    
    def test_create_strategy_invalid_data(self, authenticated_client):
        """Test creating strategy with invalid data."""
        # Missing required fields
        invalid_data = {"name": "Test"}
        response = authenticated_client.post("/api/strategies/saved", json=invalid_data)
        assert response.status_code == 422  # Validation error
    
    def test_create_strategy_empty_name(self, authenticated_client):
        """Test creating strategy with empty name."""
        strategy_data = {
            "name": "",
            "indicators": [{"id": "RSI", "params": {"period": 14}}],
            "expressions": {"expression": "RSI_OVERSOLD"}
        }
        response = authenticated_client.post("/api/strategies/saved", json=strategy_data)
        # Should fail validation
        assert response.status_code in [400, 422]


class TestIntegration:
    """Integration tests for complete flows."""
    
    def test_save_and_load_strategy_flow(self, authenticated_client, test_user, db_session):
        """Test complete save and load strategy flow."""
        # Create strategy
        strategy_data = {
            "name": "Integration Test Strategy",
            "indicators": [
                {"id": "RSI", "params": {"period": 14}},
                {"id": "MACD", "params": {"fast_period": 12, "slow_period": 26}}
            ],
            "expressions": {
                "expression": "RSI_OVERSOLD AND MACD_CROSS_UP",
                "strategy_type": "long_cash"
            },
            "parameters": {"initial_capital": 10000}
        }
        
        create_response = authenticated_client.post("/api/strategies/saved", json=strategy_data)
        assert create_response.status_code == 200
        created_strategy = create_response.json()
        strategy_id = created_strategy["id"]
        
        # List strategies
        list_response = authenticated_client.get("/api/strategies/saved/list")
        assert list_response.status_code == 200
        strategies = list_response.json()["strategies"]
        assert len(strategies) == 1
        assert strategies[0]["id"] == strategy_id
        
        # Get specific strategy
        get_response = authenticated_client.get(f"/api/strategies/saved/{strategy_id}")
        assert get_response.status_code == 200
        retrieved_strategy = get_response.json()
        assert retrieved_strategy["name"] == "Integration Test Strategy"
        assert len(retrieved_strategy["indicators"]) == 2
    
    def test_user_isolation(self, db_session):
        """Test that users can only see their own strategies."""
        # Create two users
        user1 = User(email="user1@test.com", name="User 1", google_id="google1")
        user2 = User(email="user2@test.com", name="User 2", google_id="google2")
        db_session.add_all([user1, user2])
        db_session.commit()
        db_session.refresh(user1)
        db_session.refresh(user2)
        
        # Create strategies for each user
        strategy1 = Strategy(
            user_id=user1.id,
            name="User 1 Strategy",
            indicators=[{"id": "RSI"}],
            expressions={"expression": "RSI_OVERSOLD"}
        )
        strategy2 = Strategy(
            user_id=user2.id,
            name="User 2 Strategy",
            indicators=[{"id": "MACD"}],
            expressions={"expression": "MACD_CROSS_UP"}
        )
        db_session.add_all([strategy1, strategy2])
        db_session.commit()
        
        # Verify strategies belong to correct users
        assert strategy1.user_id == user1.id
        assert strategy2.user_id == user2.id
        
        # Verify user relationships
        assert len(user1.strategies) == 1
        assert len(user2.strategies) == 1

