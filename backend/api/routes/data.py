"""
Data API routes for Bitcoin trading strategy backtesting.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
import logging

from backend.core.data_loader import (
    load_btc_data, load_crypto_data, get_data_summary, validate_data, 
    update_btc_data, update_crypto_data, get_last_update_time,
    get_available_symbols
)
from backend.core.data_quality import validate_data_quality
from backend.api.models.backtest_models import DataInfoResponse, ErrorResponse
from datetime import datetime

router = APIRouter(prefix="/api/data", tags=["data"])
logger = logging.getLogger(__name__)


@router.get("/symbols")
async def get_available_crypto_symbols() -> Dict[str, Any]:
    """
    Get list of available cryptocurrency symbols.
    
    Returns:
        Dict: List of available symbols with metadata
    """
    try:
        symbols = get_available_symbols()
        return {
            "success": True,
            "symbols": symbols,
            "count": len(symbols)
        }
    except Exception as e:
        logger.error(f"Error getting symbols: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get symbols: {str(e)}"
        )


@router.get("/info", response_model=DataInfoResponse)
async def get_data_info(symbol: Optional[str] = Query(default="BTCUSDT", description="Cryptocurrency symbol (e.g., BTCUSDT, ETHUSDT)")) -> DataInfoResponse:
    """
    Get information about the cryptocurrency dataset.
    
    Args:
        symbol: Trading pair symbol (default: BTCUSDT for backward compatibility)
    
    Returns:
        DataInfoResponse: Dataset information including total records, date range, columns, and sample data
    """
    try:
        # Load cryptocurrency data with caching
        df = load_crypto_data(symbol=symbol)
        
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
        
        # Add last update time and symbol to response
        last_update = get_last_update_time(symbol=symbol)
        if last_update:
            data_info['last_update'] = last_update.isoformat()
            time_since_update = datetime.now() - last_update
            data_info['hours_since_update'] = time_since_update.total_seconds() / 3600
        
        data_info['symbol'] = symbol
        
        # Infer data source and quality from columns
        # Full OHLCV with Volume indicates Yahoo Finance or Binance
        # Close-only indicates CoinGecko
        has_full_ohlcv = all(col in df.columns for col in ['Open', 'High', 'Low', 'Close'])
        if has_full_ohlcv and 'Volume' in df.columns:
            # Yahoo Finance is primary source, but could also be Binance
            # Check data range - Yahoo Finance typically has data from ~2014-2015 for BTC
            data_start_year = df.index.min().year
            if data_start_year >= 2014:
                data_info['data_source'] = 'yahoo_finance'
            else:
                data_info['data_source'] = 'binance'
            data_info['data_quality'] = 'full_ohlcv'
        elif 'Close' in df.columns and not has_full_ohlcv:
            data_info['data_source'] = 'coingecko'
            data_info['data_quality'] = 'close_only'
        else:
            data_info['data_source'] = 'unknown'
            data_info['data_quality'] = 'unknown'
        
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


@router.post("/refresh")
async def refresh_data(
    symbol: Optional[str] = Query(default="BTCUSDT", description="Cryptocurrency symbol to refresh"),
    force: bool = Query(default=False, description="Force refresh even if data is fresh"),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD) to fetch historical data from (e.g., 2016-01-01)"),
    include_additional_metrics: bool = Query(default=False, description="Include additional metrics from CoinGlass (funding rates, open interest, etc.)")
) -> Dict[str, Any]:
    """
    Manually trigger a data refresh from CoinGlass API (primary source, with Yahoo Finance/CoinGecko fallback).
    
    Args:
        symbol: Trading pair symbol (default: BTCUSDT)
        force: Force refresh even if data is fresh
        start_date: Start date (YYYY-MM-DD) to fetch historical data from (defaults to token launch date)
        include_additional_metrics: Include additional metrics from CoinGlass (funding rates, open interest, etc.)
        
    Returns:
        Dict: Refresh status and data info
    """
    try:
        from datetime import datetime as dt
        from backend.core.data_loader import _dataframe_cache
        
        # Clear cache BEFORE refresh to ensure we get fresh data
        # Clear all cache entries for this symbol
        keys_to_remove = [k for k in _dataframe_cache.keys() if k.startswith(f"{symbol}_")]
        for key in keys_to_remove:
            del _dataframe_cache[key]
        logger.info(f"Cache cleared before manual refresh for {symbol} ({len(keys_to_remove)} entries)")
        
        start_dt = None
        if start_date:
            try:
                start_dt = dt.strptime(start_date, '%Y-%m-%d')
                logger.info(f"Fetching historical data from {start_date}")
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid start_date format. Use YYYY-MM-DD (e.g., 2016-01-01)"
                )
        
        logger.info(f"Manual data refresh requested for {symbol} (force={force}, start_date={start_date}, include_additional_metrics={include_additional_metrics})")
        df = update_crypto_data(symbol=symbol, force=force, start_date=start_dt, include_additional_metrics=include_additional_metrics)
        
        # Clear cache AFTER refresh to ensure fresh data is available
        keys_to_remove = [k for k in _dataframe_cache.keys() if k.startswith(f"{symbol}_")]
        for key in keys_to_remove:
            del _dataframe_cache[key]
        logger.info(f"Cache cleared after manual refresh for {symbol} ({len(keys_to_remove)} entries)")
        
        summary = get_data_summary(df)
        last_update = get_last_update_time(symbol=symbol)
        
        # Verify the refresh actually worked
        data_start = df.index.min()
        data_end = df.index.max()
        days_available = (data_end - data_start).days
        
        # Get quality metrics
        quality_metrics = validate_data_quality(df, symbol)
        
        return {
            "success": True,
            "message": f"{symbol} data refreshed successfully",
            "symbol": symbol,
            "records": len(df),
            "date_range": summary['date_range'],
            "days_available": days_available,
            "years_available": round(days_available / 365.0, 2),
            "data_source": summary.get('data_source', 'unknown'),
            "last_update": last_update.isoformat() if last_update else None,
            "quality": {
                "quality_score": quality_metrics.get('quality_score', 0.0),
                "completeness_score": quality_metrics.get('completeness_score', 0.0),
                "consistency_score": quality_metrics.get('consistency_score', 0.0),
                "freshness_score": quality_metrics.get('freshness_score', 0.0),
                "issues": quality_metrics.get('issues', [])
            }
        }
    except Exception as e:
        logger.error(f"Error refreshing data: {e}", exc_info=True)
        error_msg = str(e)
        # Provide more helpful error messages
        if "CoinGlass" in error_msg:
            detail_msg = f"Failed to refresh data from CoinGlass: {error_msg}. Falling back to Yahoo Finance/CoinGecko."
        elif "Yahoo Finance" in error_msg or "yfinance" in error_msg.lower():
            detail_msg = f"Failed to refresh data from Yahoo Finance: {error_msg}. Falling back to CoinGecko."
        elif "CoinGecko" in error_msg:
            detail_msg = f"Failed to refresh data from CoinGecko: {error_msg}"
        else:
            detail_msg = f"Failed to refresh data: {error_msg}"
        raise HTTPException(
            status_code=500,
            detail=detail_msg
        )


@router.get("/test-coinglass")
async def test_coinglass_connection() -> Dict[str, Any]:
    """
    Test CoinGlass API connection and endpoint availability.
    
    Returns:
        Dict: Connection test results
    """
    try:
        from backend.core.coinglass_client import get_coinglass_client
        
        client = get_coinglass_client()
        
        # Test connection (now returns dict with detailed results)
        connection_result = client.test_connection()
        
        # Try to fetch a small amount of data
        test_data = None
        test_error = None
        try:
            from datetime import datetime, timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)  # Just 7 days for testing
            
            test_data = client.get_price_history(
                symbol="BTCUSDT",
                start_date=start_date,
                end_date=end_date,
                interval="1d"
            )
        except Exception as e:
            test_error = str(e)
            logger.error(f"CoinGlass data fetch test failed: {e}", exc_info=True)
        
        return {
            "success": True,
            "connection_test": {
                "success": connection_result.get("success", False),
                "endpoint": connection_result.get("endpoint"),
                "error": connection_result.get("error"),
                "response_preview": connection_result.get("response"),
                "api_key_configured": connection_result.get("api_key_configured", False),
                "base_url": connection_result.get("base_url")
            },
            "api_key_configured": bool(client.api_key),
            "api_key_preview": client.api_key[:8] + "..." if client.api_key else "Not set",
            "base_url": client.base_url,
            "test_data_fetch": {
                "success": test_data is not None and not test_data.empty,
                "records": len(test_data) if test_data is not None else 0,
                "error": test_error
            }
        }
    except Exception as e:
        logger.error(f"Error testing CoinGlass connection: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to test CoinGlass connection: {str(e)}"
        )


@router.get("/status")
async def get_data_status(symbol: Optional[str] = Query(default="BTCUSDT", description="Cryptocurrency symbol")) -> Dict[str, Any]:
    """
    Get data freshness status and last update time.
    
    Args:
        symbol: Trading pair symbol (default: BTCUSDT)
    
    Returns:
        Dict: Status information including last update time
    """
    try:
        df = load_crypto_data(symbol=symbol)
        last_update = get_last_update_time(symbol=symbol)
        summary = get_data_summary(df)
        
        # Calculate freshness
        is_fresh = False
        hours_since_update = None
        if last_update:
            time_since_update = datetime.now() - last_update
            hours_since_update = time_since_update.total_seconds() / 3600
            is_fresh = hours_since_update < 24
        
        return {
            "success": True,
            "symbol": symbol,
            "last_update": last_update.isoformat() if last_update else None,
            "is_fresh": is_fresh,
            "hours_since_update": hours_since_update,
            "total_records": len(df),
            "date_range": summary['date_range'],
            "current_price": summary['price_range']['current']
        }
    except Exception as e:
        logger.error(f"Error getting data status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get data status: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint for data service.
    
    Returns:
        Dict[str, str]: Health status
    """
    try:
        # Try to load Bitcoin data to verify service is working (backward compatibility)
        df = load_btc_data()
        return {"status": "healthy", "records": str(len(df)), "symbol": "BTCUSDT"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}
