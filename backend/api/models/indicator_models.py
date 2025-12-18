"""
Pydantic models for Indicator signal generation API endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal
from backend.api.models.backtest_models import IndicatorConfig, BacktestResult


class IndicatorSignalRequest(BaseModel):
    """Request model for generating signals for individual indicators."""
    indicators: List[IndicatorConfig] = Field(
        ..., 
        description="List of indicator configurations",
        min_items=1
    )
    expressions: Dict[str, str] = Field(
        ..., 
        description="Dictionary mapping indicator IDs to their signal expressions"
    )
    symbol: str = Field(
        default="BTCUSDT",
        description="Trading pair symbol"
    )
    strategy_type: Literal["long_cash", "long_short"] = Field(
        default="long_cash",
        description="Strategy type: long_cash or long_short"
    )
    initial_capital: float = Field(
        default=10000.0,
        description="Initial capital for backtesting",
        gt=0
    )
    start_date: Optional[str] = Field(
        default=None,
        description="Start date in YYYY-MM-DD format"
    )
    end_date: Optional[str] = Field(
        default=None,
        description="End date in YYYY-MM-DD format"
    )


class IndicatorSignalResponse(BaseModel):
    """Response model for individual indicator signals."""
    success: bool = Field(..., description="Whether the request was successful")
    results: Dict[str, BacktestResult] = Field(
        ..., 
        description="Dictionary mapping indicator IDs to their backtest results"
    )
    price_data: List[Dict] = Field(
        ..., 
        description="Price data with signals for charting"
    )


class CombinedSignalRequest(BaseModel):
    """Request model for generating combined signals with majority voting."""
    indicator_signals: Dict[str, List[int]] = Field(
        ..., 
        description="Dictionary mapping indicator IDs to their signal series (list of 0/1/-1)"
    )
    dates: List[str] = Field(
        ..., 
        description="List of dates corresponding to signal series"
    )
    prices: List[float] = Field(
        ..., 
        description="List of prices corresponding to signal series"
    )
    threshold: float = Field(
        default=0.5,
        description="Threshold for majority voting (0.5 = 50%, 0.6 = 60%, etc.)",
        ge=0.0,
        le=1.0
    )
    strategy_type: Literal["long_cash", "long_short"] = Field(
        default="long_cash",
        description="Strategy type: long_cash or long_short"
    )
    initial_capital: float = Field(
        default=10000.0,
        description="Initial capital for backtesting",
        gt=0
    )


class CombinedSignalResponse(BaseModel):
    """Response model for combined signals."""
    success: bool = Field(..., description="Whether the request was successful")
    combined_result: BacktestResult = Field(
        ..., 
        description="Backtest result for combined signals"
    )
    combined_signals: List[int] = Field(
        ..., 
        description="Combined signal series (0/1/-1)"
    )
    agreement_stats: Dict[str, any] = Field(
        ..., 
        description="Statistics about indicator agreement at each point"
    )
