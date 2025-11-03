"""
Data API routes for Bitcoin trading strategy backtesting.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging

from backend.core.data_loader import load_btc_data, get_data_summary, validate_data
from backend.api.models.backtest_models import DataInfoResponse, ErrorResponse

router = APIRouter(prefix="/api/data", tags=["data"])
logger = logging.getLogger(__name__)


@router.get("/info", response_model=DataInfoResponse)
async def get_data_info() -> DataInfoResponse:
    """
    Get information about the Bitcoin dataset.
    
    Returns:
        DataInfoResponse: Dataset information including total records, date range, columns, and sample data
    """
    try:
        # Load Bitcoin data with caching
        df = load_btc_data()
        
        # Validate data
        if not validate_data(df):
            raise HTTPException(
                status_code=422, 
                detail="Data validation failed. Please check the data file."
            )
        
        # Get data summary
        summary = get_data_summary(df)
        
        # Prepare sample data (first 5 rows as JSON-safe)
        sample_data = df.head().to_dict('index')
        
        # Convert datetime index to string for JSON serialization
        sample_data_str = {}
        for date, row in sample_data.items():
            sample_data_str[date.strftime('%Y-%m-%d')] = {
                k: float(v) if isinstance(v, (int, float)) else v 
                for k, v in row.items()
            }
        
        data_info = {
            "total_records": len(df),
            "date_range": {
                "start": df.index.min().strftime('%Y-%m-%d'),
                "end": df.index.max().strftime('%Y-%m-%d')
            },
            "columns": list(df.columns),
            "sample_data": sample_data_str,
            "price_range": {
                "min": float(df['Close'].min()),
                "max": float(df['Close'].max()),
                "current": float(df['Close'].iloc[-1])
            }
        }
        
        logger.info(f"Data info requested: {len(df)} records from {data_info['date_range']['start']} to {data_info['date_range']['end']}")
        
        return DataInfoResponse(
            success=True,
            data_info=data_info
        )
        
    except FileNotFoundError as e:
        logger.error(f"Data file not found: {e}")
        raise HTTPException(
            status_code=404,
            detail=f"Data file not found: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error loading data: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint for data service.
    
    Returns:
        Dict[str, str]: Health status
    """
    try:
        # Try to load data to verify service is working
        df = load_btc_data()
        return {"status": "healthy", "records": str(len(df))}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}
