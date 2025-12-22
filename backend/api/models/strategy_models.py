"""
Pydantic models for strategy-related API requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional


class StrategyParameter(BaseModel):
    """Model for strategy parameter definition."""
    
    type: str = Field(..., description="Parameter type (int, float, str)")
    min: Optional[float] = Field(None, description="Minimum value")
    max: Optional[float] = Field(None, description="Maximum value")
    default: Any = Field(..., description="Default value")
    description: Optional[str] = Field(None, description="Parameter description")


class StrategyDefinition(BaseModel):
    """Model for strategy definition."""
    
    name: str = Field(..., description="Strategy display name")
    description: str = Field(..., description="Strategy description")
    parameters: Dict[str, StrategyParameter] = Field(..., description="Strategy parameters")
    category: str = Field(..., description="Strategy category")


class StrategyListResponse(BaseModel):
    """Response model for strategy list."""
    
    success: bool = Field(True, description="Whether the request was successful")
    strategies: Dict[str, StrategyDefinition] = Field(..., description="Available strategies")
    total_count: int = Field(..., description="Total number of strategies")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "strategies": {
                    "SMA": {
                        "name": "Simple Moving Average Crossover",
                        "description": "Buy when fast SMA crosses above slow SMA, sell when it crosses below",
                        "parameters": {
                            "fast_window": {
                                "type": "int",
                                "min": 5,
                                "max": 50,
                                "default": 20,
                                "description": "Fast moving average period"
                            },
                            "slow_window": {
                                "type": "int",
                                "min": 50,
                                "max": 200,
                                "default": 50,
                                "description": "Slow moving average period"
                            }
                        },
                        "category": "Trend Following"
                    }
                },
                "total_count": 5
            }
        }
