"""
Valuation API routes for calculating z-scores of mean-reverting indicators.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Dict, Any, List, Optional
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy.orm import Session

from backend.core.data_loader import load_crypto_data, fetch_crypto_data_smart, load_crypto_data_from_database
from backend.core.indicators import (
    rsi, cci, stochastic, williams_r, macd, roc, momentum, chande_momentum_oscillator,
    bb_percent, tsi, ema, zscore
)
from backend.core.pinescript_indicators import (
    rsi_zscore_signal, macd_zscore_signal, cmo_zscore_signal, roc_zscore_signal,
    mom_zscore_signal, cci_zscore_signal, chandeMO_zscore_signal, rapr_combined_signal,
    ema_zscore_signal
)
# Removed fundamental indicators import - valuation page now only uses technical indicators from PineScript
from backend.core.valuation import (
    calculate_indicator_zscore,
    calculate_average_zscore,
    get_latest_zscore,
    calculate_average_indicator_zscore
)
from backend.core.database import get_db
from backend.core.auth import get_current_user
from backend.api.models.db_models import Valuation, User
from backend.api.models.valuation_models import (
    ValuationZScoreRequest,
    ValuationZScoreResponse,
    ValuationIndicatorsResponse,
    ValuationIndicator,
    ValuationDataResponse,
    SaveValuationRequest,
    UpdateValuationRequest,
    ValuationListResponse,
    ValuationListItem,
    ValuationResponse
)

router = APIRouter(prefix="/api/valuation", tags=["valuation"])
logger = logging.getLogger(__name__)


# Define available technical indicators (PineScript valuation model)
# Based on: f_zscore_valuation function and RAPR calculations
TECHNICAL_INDICATORS = {
    'rsi_zscore': {
        'name': 'RSI Z-Score',
        'description': 'RSI with z-score normalization',
        'default_params': {'lookback': 14, 'zscore_length': 20}
    },
    'macd_zscore': {
        'name': 'MACD Z-Score',
        'description': 'MACD histogram with z-score normalization',
        'default_params': {'fast': 12, 'slow': 26, 'signal_period': 9, 'zscore_length': 20}
    },
    'cmo_zscore': {
        'name': 'CMO Z-Score',
        'description': 'Chande Momentum Oscillator with z-score normalization',
        'default_params': {'lookback': 14, 'zscore_length': 20}
    },
    'bb_zscore': {
        'name': 'Bollinger Band Z-Score',
        'description': 'Bollinger Band Percent with z-score normalization',
        'default_params': {'bb_len': 20, 'bb_mul': 2.0, 'bb_zlen': 20}
    },
    'tsi_zscore': {
        'name': 'TSI Z-Score',
        'description': 'True Strength Index with z-score normalization',
        'default_params': {'tsi_long': 25, 'tsi_short': 13, 'tsi_zlen': 20}
    },
    'roc_zscore': {
        'name': 'ROC Z-Score',
        'description': 'Rate of Change with z-score normalization',
        'default_params': {'lookback': 10, 'zscore_length': 20}
    },
    'mom_zscore': {
        'name': 'Momentum Z-Score',
        'description': 'Momentum with z-score normalization',
        'default_params': {'lookback': 10, 'zscore_length': 20}
    },
    'cci_zscore': {
        'name': 'CCI Z-Score',
        'description': 'Commodity Channel Index with z-score normalization',
        'default_params': {'lookback': 20, 'zscore_length': 20}
    },
    'chandeMO_zscore': {
        'name': 'Chande MO Z-Score',
        'description': 'Chande Momentum Oscillator with z-score normalization',
        'default_params': {'lookback': 14, 'zscore_length': 20}
    },
    'rapr_metrics1': {
        'name': 'RAPR Metrics 1',
        'description': 'Average of Sharpe, Sortino, and Omega z-scores from RAPR1',
        'default_params': {'metric_lookback': 20, 'valuation_lookback': 0}
    },
    'rapr_metrics2': {
        'name': 'RAPR Metrics 2',
        'description': 'Average of Sharpe, Sortino, and Omega z-scores from RAPR2',
        'default_params': {'metric_lookback': 20, 'valuation_lookback': 0}
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
        Pandas Series with indicator values (for z-score indicators, returns the z-score values)
    """
    if params is None:
        params = TECHNICAL_INDICATORS.get(indicator_id, {}).get('default_params', {})
    
    # Z-Score indicators - return the z-score values directly
    elif indicator_id == 'rsi_zscore':
        lookback = params.get('lookback', 14)
        zscore_length = params.get('zscore_length', 20)
        rsi_val = rsi(df['Close'], lookback)
        return zscore(rsi_val, zscore_length)
    elif indicator_id == 'macd_zscore':
        fast = params.get('fast', 12)
        slow = params.get('slow', 26)
        signal_period = params.get('signal_period', 9)
        zscore_length = params.get('zscore_length', 20)
        macd_line, signal_line, histogram = macd(df['Close'], fast, slow, signal_period)
        return zscore(histogram, zscore_length)
    elif indicator_id == 'cmo_zscore':
        lookback = params.get('lookback', 14)
        zscore_length = params.get('zscore_length', 20)
        cmo_val = chande_momentum_oscillator(df['Close'], lookback)
        return zscore(cmo_val, zscore_length)
    elif indicator_id == 'bb_zscore':
        bb_len = params.get('bb_len', 20)
        bb_mul = params.get('bb_mul', 2.0)
        bb_zlen = params.get('bb_zlen', 20)
        return bb_percent(df['Close'], bb_len, bb_mul, bb_zlen)
    elif indicator_id == 'tsi_zscore':
        tsi_long = params.get('tsi_long', 25)
        tsi_short = params.get('tsi_short', 13)
        tsi_zlen = params.get('tsi_zlen', 20)
        return tsi(df['Close'], tsi_long, tsi_short, tsi_zlen)
    elif indicator_id == 'roc_zscore':
        lookback = params.get('lookback', 10)
        zscore_length = params.get('zscore_length', 20)
        roc_val = roc(df['Close'], lookback)
        return zscore(roc_val, zscore_length)
    elif indicator_id == 'mom_zscore':
        lookback = params.get('lookback', 10)
        zscore_length = params.get('zscore_length', 20)
        mom_val = momentum(df['Close'], lookback)
        return zscore(mom_val, zscore_length)
    elif indicator_id == 'cci_zscore':
        lookback = params.get('lookback', 20)
        zscore_length = params.get('zscore_length', 20)
        cci_val = cci(df['High'], df['Low'], df['Close'], lookback)
        return zscore(cci_val, zscore_length)
    elif indicator_id == 'chandeMO_zscore':
        lookback = params.get('lookback', 14)
        zscore_length = params.get('zscore_length', 20)
        chandeMO_val = chande_momentum_oscillator(df['Close'], lookback)
        return zscore(chandeMO_val, zscore_length)
    elif indicator_id == 'ema_zscore':
        len_period = params.get('len', 14)
        src = params.get('src', 0.0)
        lookback = params.get('lookback', 20)
        threshold_l = params.get('threshold_l', 1.0)
        threshold_s = params.get('threshold_s', -1.0)
        # Calculate EMA z-score
        ema_val = ema(df['Close'] if src == 0.0 else df['Close'], len_period)
        mean = ema(ema_val, lookback)
        std_dev = ema_val.rolling(window=lookback).std()
        z_score = (ema_val - mean) / std_dev.replace(0, np.nan)
        return z_score
    elif indicator_id == 'rapr_metrics1':
        metric_lookback = params.get('metric_lookback', 20)
        valuation_lookback = params.get('valuation_lookback', 0)
        from backend.core.indicators import rapr_1
        rapr1_results = rapr_1(df['Close'], metric_lookback, valuation_lookback)
        # Average of Sharpe, Sortino, and Omega z-scores from RAPR1 (metrics1)
        metrics1 = (
            rapr1_results['z_sharpe'].fillna(0) +
            rapr1_results['z_sortino'].fillna(0) +
            rapr1_results['z_omega'].fillna(0)
        ) / 3
        return metrics1
    elif indicator_id == 'rapr_metrics2':
        metric_lookback = params.get('metric_lookback', 20)
        valuation_lookback = params.get('valuation_lookback', 0)
        from backend.core.indicators import rapr_2
        rapr2_results = rapr_2(df['Close'], metric_lookback, valuation_lookback)
        # Average of Sharpe, Sortino, and Omega z-scores from RAPR2 (metrics2)
        metrics2 = (
            rapr2_results['z_sharpe'].fillna(0) +
            rapr2_results['z_sortino'].fillna(0) +
            rapr2_results['z_omega'].fillna(0)
        ) / 3
        return metrics2
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
        
        # Add technical indicators (PineScript valuation model only)
        for indicator_id, metadata in TECHNICAL_INDICATORS.items():
            indicators.append(ValuationIndicator(
                id=indicator_id,
                name=metadata['name'],
                category='technical',
                description=metadata['description']
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
        # Validate request
        if not request.indicators or len(request.indicators) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one indicator must be selected"
            )
        
        # Validate that all requested indicators are available
        invalid_indicators = [ind for ind in request.indicators if ind not in TECHNICAL_INDICATORS]
        if invalid_indicators:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid indicators: {invalid_indicators}. Available indicators: {list(TECHNICAL_INDICATORS.keys())}"
            )
        
        # Load price data from CoinGlass API (primary) with fallbacks
        try:
            start_date_dt = pd.to_datetime(request.start_date) if request.start_date else None
            end_date_dt = pd.to_datetime(request.end_date) if request.end_date else None
            df, data_source, quality_metrics = fetch_crypto_data_smart(
                symbol=request.symbol,
                start_date=start_date_dt,
                end_date=end_date_dt,
                use_cache=True,  # Use cache if available
                cross_validate=False
            )
            logger.info(f"Using price data from {data_source} for valuation calculations")
        except Exception as e:
            logger.warning(f"Failed to fetch from CoinGlass API, falling back to CSV: {e}")
            # Fallback to CSV if CoinGlass API fails
            df = load_crypto_data(symbol=request.symbol)
            
            # Filter by date range if provided
            if request.start_date:
                start_date = pd.to_datetime(request.start_date)
                df = df[df.index >= start_date]
            
            if request.end_date:
                end_date = pd.to_datetime(request.end_date)
                df = df[df.index <= end_date]
        
        if df is None or len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No price data available for symbol {request.symbol}"
            )
        
        if len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail="No data available for the specified date range"
            )
        
        logger.info(f"Processing {len(request.indicators)} indicators for {len(df)} data points")
        
        # Calculate indicators and z-scores
        # Note: All indicators in TECHNICAL_INDICATORS already return z-scores (PineScript f_zscore_valuation model)
        indicator_values = {}
        indicator_zscores = {}
        
        for indicator_id in request.indicators:
            try:
                # Calculate indicator values (only technical indicators for PineScript valuation model)
                if indicator_id in TECHNICAL_INDICATORS:
                    indicator_series = calculate_technical_indicator(df, indicator_id)
                else:
                    logger.warning(f"Unknown indicator: {indicator_id}, skipping")
                    continue
                
                # Validate the calculated series
                if indicator_series is None or len(indicator_series) == 0:
                    logger.warning(f"Indicator {indicator_id} returned empty series, skipping")
                    continue
                
                # Ensure index alignment
                indicator_series = indicator_series.reindex(df.index)
                
                # Replace Inf and NaN with 0
                indicator_series = indicator_series.replace([np.inf, -np.inf], 0).fillna(0)
                
                # All indicators already return z-scores, so use them directly
                # No need to recalculate z-scores on top of z-scores
                zscore_series = indicator_series
                
                indicator_values[indicator_id] = indicator_series
                indicator_zscores[indicator_id] = zscore_series
                
                logger.info(f"Successfully calculated indicator {indicator_id}: {len(indicator_series)} values")
                
            except Exception as e:
                logger.error(f"Error calculating indicator {indicator_id}: {e}", exc_info=True)
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                continue
        
        if not indicator_zscores:
            error_msg = f"No valid indicators could be calculated. Requested indicators: {request.indicators}. Available indicators: {list(TECHNICAL_INDICATORS.keys())}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )
        
        # Calculate average z-score if requested
        average_zscore_series = None
        if request.show_average and indicator_zscores:
            average_zscore_series = calculate_average_indicator_zscore(
                indicator_zscores,
                average_window=request.average_window
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
            
            # Add average z-score if requested
            if request.show_average and average_zscore_series is not None:
                if date in average_zscore_series.index:
                    avg_zscore = average_zscore_series.loc[date]
                    if not pd.isna(avg_zscore):
                        from backend.api.models.valuation_models import IndicatorZScore
                        indicators_dict['average'] = IndicatorZScore(
                            value=float(avg_zscore),  # Average z-score value
                            zscore=float(avg_zscore)
                        )
            
            if indicators_dict:  # Only add if we have at least one indicator
                from backend.api.models.valuation_models import ValuationDataPoint
                data_points.append(ValuationDataPoint(
                    date=date_str,
                    price=price,
                    indicators=indicators_dict
                ))
        
        if not data_points:
            error_msg = f"No data points could be generated. This might be due to all values being NaN or invalid date range."
            logger.error(error_msg)
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )
        
        # Calculate averages
        averages = calculate_average_zscore(indicator_zscores)
        
        # Add average z-score to averages dict if requested
        if request.show_average and average_zscore_series is not None:
            valid_avg = average_zscore_series.dropna()
            if len(valid_avg) > 0:
                averages['average'] = float(valid_avg.mean())
        
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
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    exchange: Optional[str] = Query(default="Binance", description="Exchange name (e.g., Binance, Coinbase)")
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
        # Load price data - try database first (fastest), then CoinGlass API
        start_date_dt = pd.to_datetime(start_date) if start_date else None
        end_date_dt = pd.to_datetime(end_date) if end_date else None
        
        # First try database (optimized for speed)
        df = load_crypto_data_from_database(
            symbol=symbol,
            exchange=exchange,
            start_date=start_date_dt,
            end_date=end_date_dt
        )
        
        if df is not None and len(df) > 0:
            data_source = "database"
            quality_metrics = {"quality_score": 1.0, "source": "database"}
            logger.info(f"Loaded {len(df)} rows from database for {symbol} on {exchange}")
        else:
            # Fallback to CoinGlass API if database doesn't have data
            try:
                df, data_source, quality_metrics = fetch_crypto_data_smart(
                    symbol=symbol,
                    start_date=start_date_dt,
                    end_date=end_date_dt,
                    exchange=exchange,
                    interval="1d",
                    use_cache=True,  # Use cache if available
                    cross_validate=False
                )
                logger.info(f"Using price data from {data_source} for valuation data endpoint")
            except Exception as e:
                logger.warning(f"Failed to fetch from CoinGlass API, falling back to CSV: {e}")
                # Fallback to CSV if CoinGlass API fails
                df = load_crypto_data(symbol=symbol, exchange=exchange)
                data_source = "csv"
                quality_metrics = {"quality_score": 0.8, "source": "csv"}
                
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


# Saved Valuation CRUD Routes

@router.get("/saved/list", response_model=ValuationListResponse)
async def list_saved_valuations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ValuationListResponse:
    """
    List all saved valuations for the current user.
    """
    try:
        valuations = db.query(Valuation).filter(
            Valuation.user_id == current_user.id
        ).order_by(Valuation.updated_at.desc()).all()
        
        valuation_items = [
            ValuationListItem(
                id=valuation.id,
                name=valuation.name,
                description=valuation.description,
                created_at=valuation.created_at.isoformat() if valuation.created_at else "",
                updated_at=valuation.updated_at.isoformat() if valuation.updated_at else ""
            )
            for valuation in valuations
        ]
        
        return ValuationListResponse(
            success=True,
            valuations=valuation_items
        )
    except Exception as e:
        logger.error(f"Error listing saved valuations: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error listing saved valuations: {str(e)}"
        )


@router.get("/saved/{valuation_id}", response_model=ValuationResponse)
async def get_saved_valuation(
    valuation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ValuationResponse:
    """
    Get a specific saved valuation by ID.
    """
    try:
        valuation = db.query(Valuation).filter(
            Valuation.id == valuation_id,
            Valuation.user_id == current_user.id
        ).first()
        
        if not valuation:
            raise HTTPException(
                status_code=404,
                detail=f"Valuation with ID {valuation_id} not found"
            )
        
        return ValuationResponse(
            id=valuation.id,
            name=valuation.name,
            description=valuation.description,
            indicators=valuation.indicators,
            zscore_method=valuation.zscore_method,
            rolling_window=valuation.rolling_window,
            average_window=valuation.average_window,
            show_average=valuation.show_average,
            overbought_threshold=valuation.overbought_threshold,
            oversold_threshold=valuation.oversold_threshold,
            symbol=valuation.symbol,
            start_date=valuation.start_date,
            end_date=valuation.end_date,
            created_at=valuation.created_at.isoformat() if valuation.created_at else "",
            updated_at=valuation.updated_at.isoformat() if valuation.updated_at else ""
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting saved valuation {valuation_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error getting saved valuation: {str(e)}"
        )


@router.post("/saved", response_model=ValuationResponse, status_code=201)
async def save_valuation(
    request: SaveValuationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ValuationResponse:
    """
    Save a new valuation configuration.
    """
    try:
        # Check if valuation with same name already exists for this user
        existing = db.query(Valuation).filter(
            Valuation.user_id == current_user.id,
            Valuation.name == request.name
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Valuation with name '{request.name}' already exists"
            )
        
        valuation = Valuation(
            user_id=current_user.id,
            name=request.name,
            description=request.description,
            indicators=request.indicators,
            zscore_method=request.zscore_method,
            rolling_window=request.rolling_window,
            average_window=request.average_window,
            show_average=request.show_average,
            overbought_threshold=request.overbought_threshold,
            oversold_threshold=request.oversold_threshold,
            symbol=request.symbol,
            start_date=request.start_date,
            end_date=request.end_date
        )
        
        db.add(valuation)
        db.commit()
        db.refresh(valuation)
        
        logger.info(f"Valuation '{request.name}' saved for user {current_user.id}")
        
        return ValuationResponse(
            id=valuation.id,
            name=valuation.name,
            description=valuation.description,
            indicators=valuation.indicators,
            zscore_method=valuation.zscore_method,
            rolling_window=valuation.rolling_window,
            average_window=valuation.average_window,
            show_average=valuation.show_average,
            overbought_threshold=valuation.overbought_threshold,
            oversold_threshold=valuation.oversold_threshold,
            symbol=valuation.symbol,
            start_date=valuation.start_date,
            end_date=valuation.end_date,
            created_at=valuation.created_at.isoformat() if valuation.created_at else "",
            updated_at=valuation.updated_at.isoformat() if valuation.updated_at else ""
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving valuation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error saving valuation: {str(e)}"
        )


@router.put("/saved/{valuation_id}", response_model=ValuationResponse)
async def update_valuation(
    valuation_id: int,
    request: UpdateValuationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ValuationResponse:
    """
    Update an existing valuation configuration.
    """
    try:
        valuation = db.query(Valuation).filter(
            Valuation.id == valuation_id,
            Valuation.user_id == current_user.id
        ).first()
        
        if not valuation:
            raise HTTPException(
                status_code=404,
                detail=f"Valuation with ID {valuation_id} not found"
            )
        
        # Check if name is being changed and conflicts with another valuation
        if request.name and request.name != valuation.name:
            existing = db.query(Valuation).filter(
                Valuation.user_id == current_user.id,
                Valuation.name == request.name,
                Valuation.id != valuation_id
            ).first()
            
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Valuation with name '{request.name}' already exists"
                )
        
        # Update fields
        if request.name is not None:
            valuation.name = request.name
        if request.description is not None:
            valuation.description = request.description
        if request.indicators is not None:
            valuation.indicators = request.indicators
        if request.zscore_method is not None:
            valuation.zscore_method = request.zscore_method
        if request.rolling_window is not None:
            valuation.rolling_window = request.rolling_window
        if request.average_window is not None:
            valuation.average_window = request.average_window
        if request.show_average is not None:
            valuation.show_average = request.show_average
        if request.overbought_threshold is not None:
            valuation.overbought_threshold = request.overbought_threshold
        if request.oversold_threshold is not None:
            valuation.oversold_threshold = request.oversold_threshold
        if request.symbol is not None:
            valuation.symbol = request.symbol
        if request.start_date is not None:
            valuation.start_date = request.start_date
        if request.end_date is not None:
            valuation.end_date = request.end_date
        
        valuation.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(valuation)
        
        logger.info(f"Valuation {valuation_id} updated for user {current_user.id}")
        
        return ValuationResponse(
            id=valuation.id,
            name=valuation.name,
            description=valuation.description,
            indicators=valuation.indicators,
            zscore_method=valuation.zscore_method,
            rolling_window=valuation.rolling_window,
            average_window=valuation.average_window,
            show_average=valuation.show_average,
            overbought_threshold=valuation.overbought_threshold,
            oversold_threshold=valuation.oversold_threshold,
            symbol=valuation.symbol,
            start_date=valuation.start_date,
            end_date=valuation.end_date,
            created_at=valuation.created_at.isoformat() if valuation.created_at else "",
            updated_at=valuation.updated_at.isoformat() if valuation.updated_at else ""
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating valuation {valuation_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error updating valuation: {str(e)}"
        )


@router.delete("/saved/{valuation_id}")
async def delete_valuation(
    valuation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Delete a saved valuation.
    """
    try:
        valuation = db.query(Valuation).filter(
            Valuation.id == valuation_id,
            Valuation.user_id == current_user.id
        ).first()
        
        if not valuation:
            raise HTTPException(
                status_code=404,
                detail=f"Valuation with ID {valuation_id} not found"
            )
        
        db.delete(valuation)
        db.commit()
        
        logger.info(f"Valuation {valuation_id} deleted for user {current_user.id}")
        
        return {
            "success": True,
            "message": f"Valuation '{valuation.name}' deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting valuation {valuation_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting valuation: {str(e)}"
        )
