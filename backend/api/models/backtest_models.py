"""
Pydantic models for backtest API requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List, Literal
from datetime import datetime


class BacktestRequest(BaseModel):
    """Request model for running a backtest."""
    
    strategy: str = Field(..., description="Strategy name (SMA, RSI, MACD, Bollinger, Combined)")
    parameters: Dict[str, Any] = Field(..., description="Strategy parameters")
    initial_capital: float = Field(10000, ge=1000, description="Initial capital for backtesting")
    symbol: Optional[str] = Field("BTCUSDT", description="Cryptocurrency symbol (e.g., BTCUSDT, ETHUSDT)")
    start_date: Optional[str] = Field(None, description="Start date for backtesting (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date for backtesting (YYYY-MM-DD)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "strategy": "SMA",
                "parameters": {"fast_window": 50, "slow_window": 200},
                "initial_capital": 10000,
                "start_date": "2020-01-01",
                "end_date": "2023-12-31"
            }
        }


class BacktestResponse(BaseModel):
    """Response model for backtest results."""
    
    success: bool = Field(..., description="Whether the backtest was successful")
    results: Dict[str, Any] = Field(..., description="Backtest results including metrics and equity curve")
    message: str = Field("", description="Status message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "results": {
                    "metrics": {
                        "total_return": 0.15,
                        "cagr": 0.05,
                        "sharpe_ratio": 1.2,
                        "max_drawdown": -0.08
                    },
                    "equity_curve": [
                        {
                            "Date": "2020-01-01",
                            "Portfolio_Value": 10000,
                            "Price": 50000,
                            "Position": 0,
                            "Capital": 10000,
                            "Shares": 0
                        }
                    ]
                },
                "message": "Backtest completed successfully"
            }
        }


class DataInfoResponse(BaseModel):
    """Response model for data information."""
    
    success: bool = Field(..., description="Whether the request was successful")
    data_info: Dict[str, Any] = Field(..., description="Data information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data_info": {
                    "total_records": 1000,
                    "date_range": {
                        "start": "2020-01-01",
                        "end": "2023-12-31"
                    },
                    "columns": ["Open", "High", "Low", "Close", "Volume"],
                    "sample_data": {
                        "2020-01-01": {"Open": 50000, "High": 51000, "Low": 49000, "Close": 50500}
                    }
                }
            }
        }


class StrategyInfo(BaseModel):
    """Model for strategy information."""
    
    name: str = Field(..., description="Strategy display name")
    parameters: Dict[str, Dict[str, Any]] = Field(..., description="Parameter schema")


class StrategiesResponse(BaseModel):
    """Response model for available strategies."""
    
    success: bool = Field(..., description="Whether the request was successful")
    strategies: Dict[str, StrategyInfo] = Field(..., description="Available strategies")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "strategies": {
                    "SMA": {
                        "name": "Simple Moving Average Crossover",
                        "parameters": {
                            "fast_window": {"type": "int", "min": 5, "max": 50, "default": 20},
                            "slow_window": {"type": "int", "min": 50, "max": 200, "default": 50}
                        }
                    }
                }
            }
        }


class IndicatorConfig(BaseModel):
    """Configuration for an indicator in modular backtesting."""
    
    id: str = Field(..., description="Indicator ID (RSI, MACD, SMA, EMA, Bollinger, EMA_Cross)")
    params: Dict[str, Any] = Field(..., description="Indicator parameters")
    show_on_chart: bool = Field(True, description="Whether to show this indicator on the chart")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "RSI",
                "params": {"period": 14, "oversold": 30, "overbought": 70},
                "show_on_chart": True
            }
        }


class ModularBacktestRequest(BaseModel):
    """Request model for modular backtesting with expression-based strategy building."""
    
    indicators: List[IndicatorConfig] = Field(..., description="List of indicators to use")
    strategy_type: Literal["long_cash", "long_short"] = Field("long_cash", description="Strategy type: long_cash (LONG/CASH positions) or long_short (LONG/SHORT/CASH positions)")
    expression: Optional[str] = Field(None, description="Boolean expression combining indicator conditions (legacy, use long_expression/cash_expression/short_expression instead)")
    long_expression: Optional[str] = Field(None, description="Expression for when to go LONG position")
    cash_expression: Optional[str] = Field(None, description="Expression for when to go to CASH position (used in long_cash mode)")
    short_expression: Optional[str] = Field(None, description="Expression for when to go SHORT position (used in long_short mode)")
    initial_capital: float = Field(10000, ge=1000, description="Initial capital for backtesting")
    symbol: Optional[str] = Field("BTCUSDT", description="Cryptocurrency symbol (e.g., BTCUSDT, ETHUSDT)")
    start_date: Optional[str] = Field(None, description="Start date for backtesting (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date for backtesting (YYYY-MM-DD)")
    options: Optional[Dict[str, Any]] = Field(default_factory=lambda: {"allow_short": False}, 
                                            description="Additional backtest options")
    
    class Config:
        json_schema_extra = {
            "example": {
                "indicators": [
                    {
                        "id": "RSI",
                        "params": {"period": 14, "oversold": 30, "overbought": 70},
                        "show_on_chart": True
                    },
                    {
                        "id": "MACD",
                        "params": {"fast": 12, "slow": 26, "signal": 9},
                        "show_on_chart": False
                    }
                ],
                "strategy_type": "long_cash",
                "expression": "(rsi_oversold AND macd_cross_up) OR ema_cross_up",
                "long_expression": "ema_cross_up",
                "cash_expression": "rsi_overbought",
                "short_expression": None,
                "initial_capital": 10000,
                "start_date": "2020-01-01",
                "end_date": "2023-12-31",
                "options": {"allow_short": False}
            }
        }


class BacktestResult(BaseModel):
    """Model for individual backtest results."""
    
    metrics: Dict[str, Any] = Field(..., description="Performance metrics")
    equity_curve: List[Dict[str, Any]] = Field(..., description="Portfolio equity curve over time")
    trade_log: List[Dict[str, Any]] = Field(..., description="Detailed trade log")
    
    class Config:
        json_schema_extra = {
            "example": {
                "metrics": {
                    "net_profit_pct": 15.2,
                    "max_drawdown_pct": -8.5,
                    "sharpe_ratio": 1.65,
                    "sortino_ratio": 2.03,
                    "omega_ratio": 1.87,
                    "num_trades": 42,
                    "profit_factor": 1.92
                },
                "equity_curve": [
                    {
                        "Date": "2020-01-01",
                        "Portfolio_Value": 10000,
                        "Price": 50000,
                        "Position": 0,
                        "Capital": 10000,
                        "Shares": 0
                    }
                ],
                "trade_log": [
                    {
                        "entry_date": "2020-01-15",
                        "exit_date": "2020-01-22",
                        "entry_price": 48230.22,
                        "exit_price": 50100.00,
                        "return_pct": 3.88,
                        "duration": 7,
                        "direction": "LONG"
                    }
                ]
            }
        }


class ModularBacktestResponse(BaseModel):
    """Response model for modular backtest results."""
    
    success: bool = Field(..., description="Whether the backtest was successful")
    combined_result: BacktestResult = Field(..., description="Results for the combined strategy")
    individual_results: Dict[str, BacktestResult] = Field(..., description="Results for each individual indicator")
    info: Dict[str, Any] = Field(..., description="Additional information about the backtest")
    message: str = Field("", description="Status message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "combined_result": {
                    "metrics": {
                        "net_profit_pct": 25.4,
                        "max_drawdown_pct": -12.3,
                        "sharpe_ratio": 1.45,
                        "num_trades": 38
                    },
                    "equity_curve": [],
                    "trade_log": []
                },
                "individual_results": {
                    "RSI": {
                        "metrics": {
                            "net_profit_pct": 18.2,
                            "max_drawdown_pct": -15.1,
                            "sharpe_ratio": 1.12,
                            "num_trades": 25
                        },
                        "equity_curve": [],
                        "trade_log": []
                    },
                    "MACD": {
                        "metrics": {
                            "net_profit_pct": 22.7,
                            "max_drawdown_pct": -9.8,
                            "sharpe_ratio": 1.38,
                            "num_trades": 31
                        },
                        "equity_curve": [],
                        "trade_log": []
                    }
                },
                "info": {
                    "indicators": [
                        {"id": "RSI", "params": {"period": 14}, "show_on_chart": True},
                        {"id": "MACD", "params": {"fast": 12, "slow": 26, "signal": 9}, "show_on_chart": False}
                    ],
                    "expression": "(rsi_oversold AND macd_cross_up) OR ema_cross_up",
                    "duration_s": 3.4
                },
                "message": "Modular backtest completed successfully"
            }
        }


class ExpressionValidationRequest(BaseModel):
    """Request model for expression validation."""
    
    indicators: List[IndicatorConfig] = Field(..., description="List of indicators to use for validation")
    expression: str = Field(..., description="Expression string to validate")
    
    class Config:
        json_schema_extra = {
            "example": {
                "indicators": [
                    {
                        "id": "RSI",
                        "params": {"period": 14, "oversold": 30, "overbought": 70},
                        "show_on_chart": True
                    }
                ],
                "expression": "rsi_oversold"
            }
        }


class ExpressionValidationResponse(BaseModel):
    """Response model for expression validation."""
    
    is_valid: bool = Field(..., description="Whether the expression is valid")
    error_message: str = Field("", description="Error message if validation failed")
    error_position: int = Field(-1, description="Character position of error if validation failed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_valid": True,
                "error_message": "",
                "error_position": -1
            }
        }


class ErrorResponse(BaseModel):
    """Response model for errors."""
    
    success: bool = Field(False, description="Always false for errors")
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Additional error details")


# Strategy CRUD Models

class SaveStrategyRequest(BaseModel):
    """Request model for saving a strategy."""
    
    name: str = Field(..., min_length=1, max_length=255, description="Strategy name")
    description: Optional[str] = Field(None, max_length=2000, description="Optional strategy description")
    indicators: List[IndicatorConfig] = Field(..., description="List of indicators")
    expressions: Dict[str, Optional[str]] = Field(..., description="Dictionary containing expression, long_expression, cash_expression, short_expression, strategy_type")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Additional strategy parameters (initial_capital, date range, etc.)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "My RSI Strategy",
                "description": "RSI oversold strategy with MACD confirmation",
                "indicators": [
                    {
                        "id": "RSI",
                        "params": {"period": 14, "oversold": 30, "overbought": 70},
                        "show_on_chart": True
                    }
                ],
                "expressions": {
                    "expression": "rsi_oversold",
                    "long_expression": "rsi_oversold",
                    "cash_expression": "rsi_overbought",
                    "short_expression": None,
                    "strategy_type": "long_cash"
                },
                "parameters": {
                    "initial_capital": 10000,
                    "start_date": "2020-01-01",
                    "end_date": "2023-12-31"
                }
            }
        }


class UpdateStrategyRequest(BaseModel):
    """Request model for updating a strategy."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Strategy name")
    description: Optional[str] = Field(None, max_length=2000, description="Optional strategy description")
    indicators: Optional[List[IndicatorConfig]] = Field(None, description="List of indicators")
    expressions: Optional[Dict[str, Optional[str]]] = Field(None, description="Dictionary containing expression, long_expression, cash_expression, short_expression, strategy_type")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Additional strategy parameters")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Updated RSI Strategy",
                "description": "Updated description",
                "indicators": [
                    {
                        "id": "RSI",
                        "params": {"period": 14, "oversold": 30, "overbought": 70},
                        "show_on_chart": True
                    }
                ],
                "expressions": {
                    "expression": "rsi_oversold",
                    "long_expression": "rsi_oversold",
                    "cash_expression": "rsi_overbought",
                    "short_expression": None,
                    "strategy_type": "long_cash"
                },
                "parameters": {
                    "initial_capital": 10000
                }
            }
        }


class StrategyResponse(BaseModel):
    """Response model for a saved strategy."""
    
    id: int = Field(..., description="Strategy ID")
    name: str = Field(..., description="Strategy name")
    description: Optional[str] = Field(None, description="Strategy description")
    indicators: List[IndicatorConfig] = Field(..., description="List of indicators")
    expressions: Dict[str, Any] = Field(..., description="Expression configuration")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Additional parameters")
    created_at: str = Field(..., description="Creation timestamp (ISO format)")
    updated_at: str = Field(..., description="Last update timestamp (ISO format)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "My RSI Strategy",
                "description": "RSI oversold strategy",
                "indicators": [
                    {
                        "id": "RSI",
                        "params": {"period": 14, "oversold": 30, "overbought": 70},
                        "show_on_chart": True
                    }
                ],
                "expressions": {
                    "expression": "rsi_oversold",
                    "long_expression": "rsi_oversold",
                    "cash_expression": "rsi_overbought",
                    "short_expression": None,
                    "strategy_type": "long_cash"
                },
                "parameters": {
                    "initial_capital": 10000
                },
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }


class StrategyListItem(BaseModel):
    """Model for strategy list items (summary)."""
    
    id: int = Field(..., description="Strategy ID")
    name: str = Field(..., description="Strategy name")
    description: Optional[str] = Field(None, description="Strategy description")
    created_at: str = Field(..., description="Creation timestamp (ISO format)")
    updated_at: str = Field(..., description="Last update timestamp (ISO format)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "My RSI Strategy",
                "description": "RSI oversold strategy",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }


class StrategyListResponse(BaseModel):
    """Response model for listing user strategies."""
    
    success: bool = Field(..., description="Whether the request was successful")
    strategies: List[StrategyListItem] = Field(..., description="List of strategies")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "strategies": [
                    {
                        "id": 1,
                        "name": "My RSI Strategy",
                        "description": "RSI oversold strategy",
                        "created_at": "2024-01-01T00:00:00",
                        "updated_at": "2024-01-01T00:00:00"
                    }
                ]
            }
        }
