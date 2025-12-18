"""
Pydantic models for Valuation API endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal


class IndicatorZScore(BaseModel):
    """Z-score data for a single indicator."""
    value: float = Field(..., description="Raw indicator value")
    zscore: float = Field(..., description="Z-score of the indicator")


class ValuationDataPoint(BaseModel):
    """Single data point in valuation time series."""
    date: str = Field(..., description="Date in ISO format")
    price: float = Field(..., description="Price at this date")
    indicators: Dict[str, IndicatorZScore] = Field(
        ..., 
        description="Dictionary mapping indicator IDs to their values and z-scores"
    )


class ValuationZScoreRequest(BaseModel):
    """Request model for calculating z-scores."""
    indicators: List[str] = Field(
        ..., 
        description="List of indicator IDs to calculate z-scores for",
        min_items=1
    )
    symbol: str = Field(
        default="BTCUSDT",
        description="Trading pair symbol"
    )
    zscore_method: Literal["rolling", "all_time"] = Field(
        default="rolling",
        description="Method for calculating z-scores"
    )
    rolling_window: int = Field(
        default=200,
        description="Rolling window size (only used if zscore_method is 'rolling')",
        ge=10,
        le=1000
    )
    start_date: Optional[str] = Field(
        default=None,
        description="Start date in YYYY-MM-DD format"
    )
    end_date: Optional[str] = Field(
        default=None,
        description="End date in YYYY-MM-DD format"
    )


class ValuationZScoreResponse(BaseModel):
    """Response model for z-score calculation."""
    success: bool = Field(..., description="Whether the request was successful")
    data: List[ValuationDataPoint] = Field(
        ..., 
        description="Time series data with z-scores"
    )
    averages: Dict[str, float] = Field(
        ..., 
        description="Average z-score for each indicator"
    )


class ValuationIndicator(BaseModel):
    """Metadata for a valuation indicator."""
    id: str = Field(..., description="Unique indicator identifier")
    name: str = Field(..., description="Human-readable indicator name")
    category: Literal["technical", "fundamental"] = Field(
        ..., 
        description="Indicator category"
    )
    description: str = Field(..., description="Indicator description")


class ValuationIndicatorsResponse(BaseModel):
    """Response model for available indicators."""
    success: bool = Field(..., description="Whether the request was successful")
    indicators: List[ValuationIndicator] = Field(
        ..., 
        description="List of available indicators"
    )


class ValuationDataRequest(BaseModel):
    """Request model for fetching valuation data."""
    symbol: str = Field(
        default="BTCUSDT",
        description="Trading pair symbol"
    )
    indicators: List[str] = Field(
        default=[],
        description="List of indicator IDs to include"
    )
    start_date: Optional[str] = Field(
        default=None,
        description="Start date in YYYY-MM-DD format"
    )
    end_date: Optional[str] = Field(
        default=None,
        description="End date in YYYY-MM-DD format"
    )


class ValuationDataResponse(BaseModel):
    """Response model for valuation data."""
    success: bool = Field(..., description="Whether the request was successful")
    data: List[Dict] = Field(
        ..., 
        description="Time series data with price and indicator values"
    )
