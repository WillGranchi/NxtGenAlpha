"""
API tests for the Bitcoin Trading Strategy Backtesting Tool.
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from backend.api.main import app

client = TestClient(app)


class TestDataAPI:
    """Test data-related API endpoints."""
    
    def test_get_data_info(self):
        """Test GET /api/data/info endpoint."""
        response = client.get("/api/data/info")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data_info" in data
        assert "total_records" in data["data_info"]
        assert "date_range" in data["data_info"]
        assert "columns" in data["data_info"]
        assert "sample_data" in data["data_info"]
    
    def test_get_data_health(self):
        """Test GET /api/data/health endpoint."""
        response = client.get("/api/data/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data


class TestStrategiesAPI:
    """Test strategy-related API endpoints."""
    
    def test_get_strategies(self):
        """Test GET /api/strategies endpoint."""
        response = client.get("/api/strategies")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "strategies" in data
        assert "total_count" in data
        assert data["total_count"] > 0
        
        # Check that expected strategies are present
        strategy_names = data["strategies"].keys()
        assert "SMA" in strategy_names
        assert "RSI" in strategy_names
        assert "MACD" in strategy_names
        assert "Bollinger" in strategy_names
        assert "Combined" in strategy_names
    
    def test_get_strategy_details(self):
        """Test GET /api/strategies/{strategy_name} endpoint."""
        response = client.get("/api/strategies/SMA")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "strategy" in data
        assert data["strategy"]["name"] == "Simple Moving Average Crossover"
    
    def test_get_nonexistent_strategy(self):
        """Test GET /api/strategies/{strategy_name} with non-existent strategy."""
        response = client.get("/api/strategies/NonexistentStrategy")
        assert response.status_code == 404


class TestBacktestAPI:
    """Test backtest-related API endpoints."""
    
    def test_run_sma_backtest(self):
        """Test POST /api/backtest with SMA strategy."""
        request_data = {
            "strategy": "SMA",
            "parameters": {
                "fast_window": 20,
                "slow_window": 50
            },
            "initial_capital": 10000
        }
        
        response = client.post("/api/backtest", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "results" in data
        assert "metrics" in data["results"]
        assert "equity_curve" in data["results"]
        assert "trades" in data["results"]
        
        # Check that metrics are present
        metrics = data["results"]["metrics"]
        assert "total_return" in metrics
        assert "cagr" in metrics
        assert "sharpe_ratio" in metrics
        assert "max_drawdown" in metrics
        assert "win_rate" in metrics
    
    def test_run_rsi_backtest(self):
        """Test POST /api/backtest with RSI strategy."""
        request_data = {
            "strategy": "RSI",
            "parameters": {
                "rsi_period": 14,
                "oversold": 30,
                "overbought": 70
            },
            "initial_capital": 10000
        }
        
        response = client.post("/api/backtest", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "results" in data
    
    def test_run_backtest_with_date_range(self):
        """Test POST /api/backtest with date range filtering."""
        request_data = {
            "strategy": "SMA",
            "parameters": {
                "fast_window": 20,
                "slow_window": 50
            },
            "initial_capital": 10000,
            "start_date": "2020-01-01",
            "end_date": "2022-12-31"
        }
        
        response = client.post("/api/backtest", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    def test_run_backtest_invalid_strategy(self):
        """Test POST /api/backtest with invalid strategy."""
        request_data = {
            "strategy": "InvalidStrategy",
            "parameters": {},
            "initial_capital": 10000
        }
        
        response = client.post("/api/backtest", json=request_data)
        assert response.status_code == 400
        
        data = response.json()
        assert "Unknown strategy" in data["detail"]
    
    def test_run_backtest_invalid_parameters(self):
        """Test POST /api/backtest with invalid parameters."""
        request_data = {
            "strategy": "SMA",
            "parameters": {
                "fast_window": "invalid",
                "slow_window": 50
            },
            "initial_capital": 10000
        }
        
        response = client.post("/api/backtest", json=request_data)
        assert response.status_code == 400
    
    def test_run_backtest_insufficient_capital(self):
        """Test POST /api/backtest with insufficient capital."""
        request_data = {
            "strategy": "SMA",
            "parameters": {
                "fast_window": 20,
                "slow_window": 50
            },
            "initial_capital": 100  # Too low
        }
        
        response = client.post("/api/backtest", json=request_data)
        assert response.status_code == 422  # Validation error
    
    def test_get_backtest_health(self):
        """Test GET /api/backtest/health endpoint."""
        response = client.get("/api/backtest/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data


class TestMainAPI:
    """Test main API endpoints."""
    
    def test_root_endpoint(self):
        """Test GET / endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "status" in data
        assert data["status"] == "running"
    
    def test_health_endpoint(self):
        """Test GET /health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
    
    def test_nonexistent_endpoint(self):
        """Test non-existent endpoint returns 404."""
        response = client.get("/nonexistent")
        assert response.status_code == 404
