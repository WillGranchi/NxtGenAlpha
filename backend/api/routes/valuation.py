"""
Valuation API routes for calculating z-scores of mean-reverting indicators.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
import logging
import pandas as pd
from datetime import datetime

from backend.core.data_loader import load_crypto_data
from backend.core.indicators import (
    rsi, cci, stochastic, williams_r
)
from backend.core.fundamental_indicators import (
    FUNDAMENTAL_INDICATORS,
    get_fundamental_indicator
)
from backend.core.valuation import (
    calculate_indicator_zscore,
    calculate_average_zscore,
    get_latest_zscore
)
from backend.api.models.valuation_models import (
    ValuationZScoreRequest,
    ValuationZScoreResponse,
    ValuationIndicatorsResponse,
    ValuationIndicator,
    ValuationDataResponse
)

router = APIRouter(prefix="/api/valuation", tags=["valuation"])
logger = logging.getLogger(__name__)


# Define available technical indicators
TECHNICAL_INDICATORS = {
    'rsi': {
        'name': 'RSI',
        'description': 'Relative Strength Index - Momentum oscillator measuring speed and magnitude of price changes',
        'default_params': {'period': 14}
    },
    'cci': {
        'name': 'CCI',
        'description': 'Commodity Channel Index - Identifies cyclical trends in price movements',
        'default_params': {'period': 20}
    },
    'stochastic': {
        'name': 'Stochastic',
        'description': 'Stochastic Oscillator - Compares closing price to price range over a period',
        'default_params': {'k_period': 14, 'd_period': 3}
    },
    'williams_r': {
        'name': 'Williams %R',
        'description': 'Williams %R - Momentum indicator measuring overbought/oversold levels',
        'default_params': {'period': 14}
    },
}


def calculate_technical_indicator(df: pd.DataFrame, indicator_id: str, params: Dict[str, Any] = None) -> pd.Series:
    """
    Calculate a technical indicator by ID.
    
    Args:
        df: DataFrame with OHLCV data
        indicator_id: Indicator identifier
        params: Indicator parameters
        
    Returns:
        Pandas Series with indicator values
    """
    if params is None:
        params = TECHNICAL_INDICATORS.get(indicator_id, {}).get('default_params', {})
    
    if indicator_id == 'rsi':
        period = params.get('period', 14)
        return rsi(df['Close'], period)
    elif indicator_id == 'cci':
        period = params.get('period', 20)
        return cci(df['High'], df['Low'], df['Close'], period)
    elif indicator_id == 'stochastic':
        k_period = params.get('k_period', 14)
        d_period = params.get('d_period', 3)
        stoch_k, stoch_d = stochastic(df['High'], df['Low'], df['Close'], k_period, d_period)
        return stoch_k  # Return %K for z-score calculation
    elif indicator_id == 'williams_r':
        period = params.get('period', 14)
        return williams_r(df['High'], df['Low'], df['Close'], period)
    else:
        raise ValueError(f"Unknown technical indicator: {indicator_id}")


@router.get("/indicators", response_model=ValuationIndicatorsResponse)
async def get_valuation_indicators() -> ValuationIndicatorsResponse:
    """
    Get list of available valuation indicators.
    
    Returns:
        ValuationIndicatorsResponse: List of technical and fundamental indicators
    """
    try:
        indicators = []
        
        # Add technical indicators
        for indicator_id, metadata in TECHNICAL_INDICATORS.items():
            indicators.append(ValuationIndicator(
                id=indicator_id,
                name=metadata['name'],
                category='technical',
                description=metadata['description']
            ))
        
        # Add fundamental indicators
        for indicator_id in FUNDAMENTAL_INDICATORS.keys():
            # Format name from ID (e.g., 'pi_cycle_top_risk' -> 'Pi-Cycle Top Risk')
            name = indicator_id.replace('_', ' ').title()
            if indicator_id == 'mvrv':
                name = 'MVRV'
            elif indicator_id == 'nupl':
                name = 'NUPL'
            elif indicator_id == 'cvdd':
                name = 'CVDD'
            elif indicator_id == 'nvts':
                name = 'NVTS'
            elif indicator_id == 'sopr':
                name = 'SOPR'
            
            indicators.append(ValuationIndicator(
                id=indicator_id,
                name=name,
                category='fundamental',
                description=f'{name} - On-chain indicator (stub data)'
            ))
        
        return ValuationIndicatorsResponse(
            success=True,
            indicators=indicators
        )
    except Exception as e:
        logger.error(f"Error getting valuation indicators: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get indicators: {str(e)}"
        )


@router.post("/zscores", response_model=ValuationZScoreResponse)
async def calculate_valuation_zscores(request: ValuationZScoreRequest) -> ValuationZScoreResponse:
    """
    Calculate z-scores for selected indicators.
    
    Args:
        request: ValuationZScoreRequest with indicator IDs and calculation parameters
        
    Returns:
        ValuationZScoreResponse: Time series data with z-scores
    """
    try:
        # Load price data
        df = load_crypto_data(symbol=request.symbol)
        
        # Filter by date range if provided
        if request.start_date:
            start_date = pd.to_datetime(request.start_date)
            df = df[df.index >= start_date]
        
        if request.end_date:
            end_date = pd.to_datetime(request.end_date)
            df = df[df.index <= end_date]
        
        if len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail="No data available for the specified date range"
            )
        
        # Calculate indicators and z-scores
        indicator_values = {}
        indicator_zscores = {}
        
        for indicator_id in request.indicators:
            try:
                # Calculate indicator values
                if indicator_id in TECHNICAL_INDICATORS:
                    indicator_series = calculate_technical_indicator(df, indicator_id)
                elif indicator_id in FUNDAMENTAL_INDICATORS:
                    indicator_series = get_fundamental_indicator(df, indicator_id)
                else:
                    logger.warning(f"Unknown indicator: {indicator_id}")
                    continue
                
                # Ensure index alignment
                indicator_series = indicator_series.reindex(df.index)
                
                # Calculate z-score
                zscore_series = calculate_indicator_zscore(
                    indicator_series,
                    method=request.zscore_method,
                    window=request.rolling_window
                )
                
                indicator_values[indicator_id] = indicator_series
                indicator_zscores[indicator_id] = zscore_series
                
            except Exception as e:
                logger.error(f"Error calculating indicator {indicator_id}: {e}", exc_info=True)
                continue
        
        if not indicator_zscores:
            raise HTTPException(
                status_code=400,
                detail="No valid indicators could be calculated"
            )
        
        # Build response data
        data_points = []
        dates = df.index
        
        for date in dates:
            date_str = date.strftime('%Y-%m-%d') if isinstance(date, pd.Timestamp) else str(date)
            price = float(df.loc[date, 'Close'])
            
            indicators_dict = {}
            for indicator_id in indicator_zscores.keys():
                if date in indicator_values[indicator_id].index:
                    value = float(indicator_values[indicator_id].loc[date])
                    zscore = float(indicator_zscores[indicator_id].loc[date])
                    
                    # Handle NaN values
                    if pd.isna(value) or pd.isna(zscore):
                        continue
                    
                    from backend.api.models.valuation_models import IndicatorZScore
                    indicators_dict[indicator_id] = IndicatorZScore(
                        value=value,
                        zscore=zscore
                    )
            
            if indicators_dict:  # Only add if we have at least one indicator
                from backend.api.models.valuation_models import ValuationDataPoint
                data_points.append(ValuationDataPoint(
                    date=date_str,
                    price=price,
                    indicators=indicators_dict
                ))
        
        # Calculate averages
        averages = calculate_average_zscore(indicator_zscores)
        
        return ValuationZScoreResponse(
            success=True,
            data=data_points,
            averages=averages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating z-scores: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate z-scores: {str(e)}"
        )


@router.get("/data", response_model=ValuationDataResponse)
async def get_valuation_data(
    symbol: str = Query(default="BTCUSDT", description="Trading pair symbol"),
    indicators: Optional[List[str]] = Query(default=None, description="List of indicator IDs"),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)")
) -> ValuationDataResponse:
    """
    Get price data with indicator values (without z-scores).
    
    Args:
        symbol: Trading pair symbol
        indicators: List of indicator IDs to include
        start_date: Start date filter
        end_date: End date filter
        
    Returns:
        ValuationDataResponse: Time series data with price and indicator values
    """
    try:
        # Load price data
        df = load_crypto_data(symbol=symbol)
        
        # Filter by date range if provided
        if start_date:
            start_date_dt = pd.to_datetime(start_date)
            df = df[df.index >= start_date_dt]
        
        if end_date:
            end_date_dt = pd.to_datetime(end_date)
            df = df[df.index <= end_date_dt]
        
        if len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail="No data available for the specified date range"
            )
        
        # Calculate indicators if requested
        indicator_data = {}
        if indicators:
            for indicator_id in indicators:
                try:
                    if indicator_id in TECHNICAL_INDICATORS:
                        indicator_series = calculate_technical_indicator(df, indicator_id)
                    elif indicator_id in FUNDAMENTAL_INDICATORS:
                        indicator_series = get_fundamental_indicator(df, indicator_id)
                    else:
                        continue
                    
                    indicator_series = indicator_series.reindex(df.index)
                    indicator_data[indicator_id] = indicator_series
                except Exception as e:
                    logger.warning(f"Error calculating indicator {indicator_id}: {e}")
                    continue
        
        # Build response data
        data_points = []
        for date in df.index:
            date_str = date.strftime('%Y-%m-%d') if isinstance(date, pd.Timestamp) else str(date)
            point = {
                'date': date_str,
                'price': float(df.loc[date, 'Close']),
                'indicators': {}
            }
            
            for indicator_id, indicator_series in indicator_data.items():
                if date in indicator_series.index:
                    value = indicator_series.loc[date]
                    if not pd.isna(value):
                        point['indicators'][indicator_id] = float(value)
            
            data_points.append(point)
        
        return ValuationDataResponse(
            success=True,
            data=data_points
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting valuation data: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get valuation data: {str(e)}"
        )
