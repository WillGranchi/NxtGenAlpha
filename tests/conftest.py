"""
Pytest configuration and fixtures for the test suite.

This module contains shared fixtures and configuration for all tests.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))


@pytest.fixture
def sample_price_data():
    """Create sample price data for testing."""
    dates = pd.date_range('2020-01-01', periods=100, freq='D')
    
    # Create realistic price data with trend and volatility
    np.random.seed(42)  # For reproducible tests
    returns = np.random.normal(0.001, 0.02, 100)  # Daily returns
    prices = 100 * np.exp(np.cumsum(returns))  # Price series
    
    data = pd.DataFrame({
        'Close': prices,
        'Open': prices * (1 + np.random.normal(0, 0.001, 100)),
        'High': prices * (1 + np.abs(np.random.normal(0, 0.005, 100))),
        'Low': prices * (1 - np.abs(np.random.normal(0, 0.005, 100))),
        'Volume': np.random.randint(1000, 10000, 100)
    }, index=dates)
    
    return data


@pytest.fixture
def sample_signals_data():
    """Create sample data with trading signals."""
    dates = pd.date_range('2020-01-01', periods=50, freq='D')
    
    # Create price data
    prices = 100 + np.arange(50) * 0.5  # Upward trend
    
    # Create signals (buy at day 10, sell at day 30)
    signals = np.zeros(50)
    signals[10] = 1   # Buy signal
    signals[30] = -1  # Sell signal
    
    # Create positions
    positions = np.zeros(50)
    positions[10:30] = 1  # Long position from day 10 to 30
    
    data = pd.DataFrame({
        'Close': prices,
        'Open': prices * 0.999,
        'High': prices * 1.001,
        'Low': prices * 0.998,
        'Volume': np.random.randint(1000, 10000, 50),
        'Signal': signals,
        'Position': positions
    }, index=dates)
    
    return data


@pytest.fixture
def sample_equity_curve():
    """Create sample equity curve data."""
    dates = pd.date_range('2020-01-01', periods=50, freq='D')
    
    # Create equity curve with some growth
    initial_capital = 10000
    prices = 100 + np.arange(50) * 0.5
    portfolio_values = initial_capital + np.cumsum(np.random.normal(10, 50, 50))
    
    data = pd.DataFrame({
        'Portfolio_Value': portfolio_values,
        'Price': prices,
        'Position': np.concatenate([np.zeros(25), np.ones(25)]),  # Cash then long
        'Capital': np.concatenate([portfolio_values[:25], np.zeros(25)])
    }, index=dates)
    
    return data


@pytest.fixture
def sample_metrics():
    """Create sample performance metrics."""
    return {
        'total_return': 0.15,
        'cagr': 0.12,
        'sharpe_ratio': 1.2,
        'sortino_ratio': 1.5,
        'max_drawdown': -0.08,
        'win_rate': 0.65,
        'var_95': -0.05,
        'cvar_95': -0.07,
        'calmar_ratio': 1.5,
        'omega_ratio': 1.1
    }


@pytest.fixture
def sample_trades():
    """Create sample trade data."""
    return [
        {
            'Date': datetime(2020, 1, 10),
            'Type': 'BUY',
            'Price': 105.0,
            'Quantity': 95.24,
            'Value': 10000.0,
            'Commission': 10.0,
            'Capital_After': 0.0,
            'Position_After': 1
        },
        {
            'Date': datetime(2020, 1, 30),
            'Type': 'SELL',
            'Price': 120.0,
            'Quantity': 95.24,
            'Value': 11428.8,
            'Commission': 11.43,
            'Capital_After': 11417.37,
            'Position_After': 0
        }
    ]


@pytest.fixture
def sample_backtest_results(sample_equity_curve, sample_metrics, sample_trades):
    """Create sample backtest results."""
    return {
        'equity_curve': sample_equity_curve,
        'trades': sample_trades,
        'metrics': sample_metrics,
        'initial_capital': 10000,
        'final_capital': 11417.37,
        'total_return': 0.15
    }


# Pytest configuration
def pytest_configure(config):
    """Configure pytest settings."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers."""
    for item in items:
        # Mark tests that take longer than 1 second as slow
        if "test_backtest" in item.name or "test_strategies" in item.name:
            item.add_marker(pytest.mark.slow)
        
        # Mark tests that test multiple components as integration
        if "test_comprehensive" in item.name or "test_end_to_end" in item.name:
            item.add_marker(pytest.mark.integration)
