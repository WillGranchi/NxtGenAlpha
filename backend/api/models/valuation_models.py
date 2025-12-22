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
    show_average: bool = Field(
        default=False,
        description="Whether to calculate and include average z-score across all indicators"
    )
    average_window: Optional[int] = Field(
        default=None,
        description="Window size for smoothing the average z-score (if None, no smoothing)",
        ge=1,
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
        description="Average z-score for each indicator (includes 'average' key if show_average is true)"
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


# Saved Valuation CRUD Models

class SaveValuationRequest(BaseModel):
    """Request model for saving a valuation."""
    name: str = Field(..., description="Valuation name", min_length=1, max_length=255)
    description: Optional[str] = Field(None, description="Valuation description")
    indicators: List[str] = Field(..., description="List of selected indicator IDs", min_items=1)
    zscore_method: Literal["rolling", "all_time"] = Field(..., description="Z-score calculation method")
    rolling_window: int = Field(..., description="Rolling window size", ge=10, le=1000)
    average_window: Optional[int] = Field(None, description="Average window size for smoothing", ge=1, le=1000)
    show_average: bool = Field(default=False, description="Whether to show average z-score")
    overbought_threshold: float = Field(..., description="Overbought threshold")
    oversold_threshold: float = Field(..., description="Oversold threshold")
    symbol: str = Field(..., description="Trading pair symbol", max_length=20)
    start_date: Optional[str] = Field(None, description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format")


class UpdateValuationRequest(BaseModel):
    """Request model for updating a valuation."""
    name: Optional[str] = Field(None, description="Valuation name", min_length=1, max_length=255)
    description: Optional[str] = Field(None, description="Valuation description")
    indicators: Optional[List[str]] = Field(None, description="List of selected indicator IDs", min_items=1)
    zscore_method: Optional[Literal["rolling", "all_time"]] = Field(None, description="Z-score calculation method")
    rolling_window: Optional[int] = Field(None, description="Rolling window size", ge=10, le=1000)
    average_window: Optional[int] = Field(None, description="Average window size for smoothing", ge=1, le=1000)
    show_average: Optional[bool] = Field(None, description="Whether to show average z-score")
    overbought_threshold: Optional[float] = Field(None, description="Overbought threshold")
    oversold_threshold: Optional[float] = Field(None, description="Oversold threshold")
    symbol: Optional[str] = Field(None, description="Trading pair symbol", max_length=20)
    start_date: Optional[str] = Field(None, description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format")


class ValuationListItem(BaseModel):
    """Valuation list item model."""
    id: int = Field(..., description="Valuation ID")
    name: str = Field(..., description="Valuation name")
    description: Optional[str] = Field(None, description="Valuation description")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")


class ValuationListResponse(BaseModel):
    """Response model for listing valuations."""
    success: bool = Field(..., description="Whether the request was successful")
    valuations: List[ValuationListItem] = Field(..., description="List of valuations")


class ValuationResponse(BaseModel):
    """Response model for a single valuation."""
    id: int = Field(..., description="Valuation ID")
    name: str = Field(..., description="Valuation name")
    description: Optional[str] = Field(None, description="Valuation description")
    indicators: List[str] = Field(..., description="List of selected indicator IDs")
    zscore_method: str = Field(..., description="Z-score calculation method")
    rolling_window: int = Field(..., description="Rolling window size")
    average_window: Optional[int] = Field(None, description="Average window size")
    show_average: bool = Field(..., description="Whether to show average z-score")
    overbought_threshold: float = Field(..., description="Overbought threshold")
    oversold_threshold: float = Field(..., description="Oversold threshold")
    symbol: str = Field(..., description="Trading pair symbol")
    start_date: Optional[str] = Field(None, description="Start date")
    end_date: Optional[str] = Field(None, description="End date")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
