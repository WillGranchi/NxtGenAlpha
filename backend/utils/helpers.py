"""
Helper utilities and configuration for the Bitcoin Trading Strategy Backtesting Tool.

This module contains configuration settings, utility functions, and common constants
used throughout the application.
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any
from datetime import datetime, date

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
OUTPUTS_DIR = PROJECT_ROOT / "outputs"
REPORTS_DIR = OUTPUTS_DIR / "reports"
LOGS_DIR = OUTPUTS_DIR / "logs"

# Ensure output directories exist
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Default configuration
DEFAULT_CONFIG = {
    "initial_capital": 10000.0,
    "trading_fee": 0.001,  # 0.1%
    "data_file": "btc_price.csv",
    "default_strategy": "SMA",
    "default_start_date": "2018-01-01",
    "default_end_date": None,  # Use latest available data
    "output_format": "html",  # html, png, or both
    "chart_width": 1200,
    "chart_height": 600,
}

# Strategy configurations
STRATEGY_CONFIGS = {
    "SMA": {
        "fast_window": 50,
        "slow_window": 200,
        "description": "Simple Moving Average Crossover Strategy"
    },
    "RSI": {
        "period": 14,
        "oversold": 30,
        "overbought": 70,
        "description": "Relative Strength Index Strategy"
    },
    "MACD": {
        "fast_period": 12,
        "slow_period": 26,
        "signal_period": 9,
        "description": "MACD Crossover Strategy"
    },
    "Bollinger": {
        "period": 20,
        "std_dev": 2,
        "description": "Bollinger Bands Strategy"
    },
    "Combined": {
        "weights": {
            "sma": 0.3,
            "rsi": 0.3,
            "macd": 0.2,
            "bollinger": 0.2
        },
        "description": "Combined Multi-Indicator Strategy"
    }
}

def get_data_path() -> Path:
    """Get the path to the Bitcoin data file."""
    return DATA_DIR / DEFAULT_CONFIG["data_file"]

def get_output_path(filename: str, subdir: str = "reports") -> Path:
    """Get the path to an output file."""
    output_dir = OUTPUTS_DIR / subdir
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / filename

def format_currency(value: float, currency: str = "$") -> str:
    """Format a number as currency."""
    if abs(value) >= 1e9:
        return f"{currency}{value/1e9:.2f}B"
    elif abs(value) >= 1e6:
        return f"{currency}{value/1e6:.2f}M"
    elif abs(value) >= 1e3:
        return f"{currency}{value/1e3:.2f}K"
    else:
        return f"{currency}{value:.2f}"

def format_percentage(value: float, decimals: int = 2) -> str:
    """Format a number as percentage."""
    return f"{value:.{decimals}f}%"

def format_number(value: float, decimals: int = 2) -> str:
    """Format a number with specified decimal places."""
    return f"{value:.{decimals}f}"

def get_timestamp() -> str:
    """Get current timestamp as string."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def validate_date_range(start_date: str, end_date: str) -> tuple:
    """Validate and parse date range strings."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None
        
        if end and start >= end:
            raise ValueError("Start date must be before end date")
            
        return start, end
    except ValueError as e:
        raise ValueError(f"Invalid date format. Use YYYY-MM-DD. Error: {e}")

def get_strategy_config(strategy_name: str) -> Dict[str, Any]:
    """Get configuration for a specific strategy."""
    if strategy_name not in STRATEGY_CONFIGS:
        raise ValueError(f"Unknown strategy: {strategy_name}. Available: {list(STRATEGY_CONFIGS.keys())}")
    return STRATEGY_CONFIGS[strategy_name]

def create_log_filename(prefix: str = "backtest") -> str:
    """Create a log filename with timestamp."""
    return f"{prefix}_{get_timestamp()}.log"

def ensure_output_directories():
    """Ensure all output directories exist."""
    for directory in [OUTPUTS_DIR, REPORTS_DIR, LOGS_DIR]:
        directory.mkdir(parents=True, exist_ok=True)

# Performance metric thresholds for color coding
PERFORMANCE_THRESHOLDS = {
    "excellent": {"sharpe": 2.0, "sortino": 2.0, "cagr": 0.20},
    "good": {"sharpe": 1.0, "sortino": 1.0, "cagr": 0.10},
    "average": {"sharpe": 0.5, "sortino": 0.5, "cagr": 0.05},
    "poor": {"sharpe": 0.0, "sortino": 0.0, "cagr": 0.0}
}

def get_performance_rating(metrics: Dict[str, float]) -> str:
    """Get performance rating based on metrics."""
    sharpe = metrics.get("sharpe_ratio", 0)
    sortino = metrics.get("sortino_ratio", 0)
    cagr = metrics.get("cagr", 0)
    
    if sharpe >= PERFORMANCE_THRESHOLDS["excellent"]["sharpe"] and \
       sortino >= PERFORMANCE_THRESHOLDS["excellent"]["sortino"] and \
       cagr >= PERFORMANCE_THRESHOLDS["excellent"]["cagr"]:
        return "Excellent"
    elif sharpe >= PERFORMANCE_THRESHOLDS["good"]["sharpe"] and \
         sortino >= PERFORMANCE_THRESHOLDS["good"]["sortino"] and \
         cagr >= PERFORMANCE_THRESHOLDS["good"]["cagr"]:
        return "Good"
    elif sharpe >= PERFORMANCE_THRESHOLDS["average"]["sharpe"] and \
         sortino >= PERFORMANCE_THRESHOLDS["average"]["sortino"] and \
         cagr >= PERFORMANCE_THRESHOLDS["average"]["cagr"]:
        return "Average"
    else:
        return "Poor"


def get_logger(name: str = __name__) -> logging.Logger:
    """
    Get a configured logger instance.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        logging.Logger: Configured logger
    """
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        # Create console handler
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    
    return logger
