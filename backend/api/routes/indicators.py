"""
Indicator signal generation API routes.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import logging
import pandas as pd

from backend.core.data_loader import load_crypto_data
from backend.core.indicator_signals import (
    generate_indicator_signals,
    combine_signals_majority,
    run_indicator_backtest
)
from backend.api.models.indicator_models import (
    IndicatorSignalRequest,
    IndicatorSignalResponse,
    CombinedSignalRequest,
    CombinedSignalResponse
)
from backend.api.models.backtest_models import BacktestResult

router = APIRouter(prefix="/api/indicators", tags=["indicators"])
logger = logging.getLogger(__name__)


@router.post("/signals", response_model=IndicatorSignalResponse)
async def generate_indicator_signals_endpoint(request: IndicatorSignalRequest) -> IndicatorSignalResponse:
    """
    Generate signals for individual indicators and run backtests.
    
    Args:
        request: IndicatorSignalRequest with indicators, expressions, and settings
        
    Returns:
        IndicatorSignalResponse: Individual backtest results and price data
    """
    try:
        logger.info(f"Generating signals for {len(request.indicators)} indicators")
        
        # Load cryptocurrency data
        symbol = request.symbol or "BTCUSDT"
        try:
            df = load_crypto_data(symbol=symbol)
        except ValueError as e:
            logger.error(f"Failed to load data for {symbol}: {e}")
            raise HTTPException(
                status_code=404,
                detail=f"Failed to load data for {symbol}: {str(e)}"
            )
        
        # Apply date filtering
        if request.start_date:
            start_date = pd.to_datetime(request.start_date)
            df = df[df.index >= start_date]
        
        if request.end_date:
            end_date = pd.to_datetime(request.end_date)
            df = df[df.index <= end_date]
        
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="No data available for the specified date range"
            )
        
        # Convert indicators to dict format
        indicators_dict = [ind.dict() for ind in request.indicators]
        
        # Generate signals for each indicator
        indicator_signals = generate_indicator_signals(
            df=df,
            indicators=indicators_dict,
            expressions=request.expressions,
            strategy_type=request.strategy_type
        )
        
        if not indicator_signals:
            raise HTTPException(
                status_code=400,
                detail="No valid signals could be generated for any indicator"
            )
        
        # Run backtest for each indicator
        results: Dict[str, BacktestResult] = {}
        
        for indicator_id, signal_series in indicator_signals.items():
            try:
                backtest_result = run_indicator_backtest(
                    df=df,
                    signal_series=signal_series,
                    strategy_type=request.strategy_type,
                    initial_capital=request.initial_capital
                )
                
                # Convert to BacktestResult format
                results[indicator_id] = BacktestResult(**backtest_result)
                
            except Exception as e:
                logger.error(f"Error running backtest for {indicator_id}: {e}", exc_info=True)
                continue
        
        # Prepare price data with signals for charting
        price_data = []
        dates = df.index
        
        for date in dates:
            date_str = date.strftime('%Y-%m-%d') if isinstance(date, pd.Timestamp) else str(date)
            price = float(df.loc[date, 'Close'])
            
            point = {
                'Date': date_str,
                'Price': price,
                'Position': 0,  # Default position
            }
            
            # Add signal positions for each indicator
            for indicator_id, signal_series in indicator_signals.items():
                if date in signal_series.index:
                    signal_value = signal_series.loc[date]
                    if pd.notna(signal_value):
                        point[f'{indicator_id}_Position'] = int(signal_value)
            
            price_data.append(point)
        
        return IndicatorSignalResponse(
            success=True,
            results=results,
            price_data=price_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating indicator signals: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate indicator signals: {str(e)}"
        )


@router.post("/combined", response_model=CombinedSignalResponse)
async def generate_combined_signals_endpoint(request: CombinedSignalRequest) -> CombinedSignalResponse:
    """
    Generate combined signals using majority voting and run backtest.
    
    Args:
        request: CombinedSignalRequest with indicator signals and threshold
        
    Returns:
        CombinedSignalResponse: Combined backtest results and agreement statistics
    """
    try:
        logger.info(f"Generating combined signals with threshold {request.threshold}")
        
        # Convert signal lists to pandas Series
        indicator_signals: Dict[str, pd.Series] = {}
        dates_index = pd.to_datetime(request.dates)
        
        for indicator_id, signal_list in request.indicator_signals.items():
            indicator_signals[indicator_id] = pd.Series(signal_list, index=dates_index)
        
        # Combine signals using majority voting
        combined_signals = combine_signals_majority(
            indicator_signals=indicator_signals,
            threshold=request.threshold
        )
        
        if len(combined_signals) == 0:
            raise HTTPException(
                status_code=400,
                detail="No combined signals could be generated"
            )
        
        # Create DataFrame for backtesting
        df = pd.DataFrame({
            'Close': request.prices,
            'Open': request.prices,  # Use close as open for simplicity
            'High': request.prices,
            'Low': request.prices,
            'Volume': [0] * len(request.prices)  # Volume not needed for backtest
        }, index=dates_index)
        
        # Run backtest on combined signals
        backtest_result = run_indicator_backtest(
            df=df,
            signal_series=combined_signals,
            strategy_type=request.strategy_type,
            initial_capital=request.initial_capital
        )
        
        # Calculate agreement statistics
        agreement_stats = {
            'total_points': len(combined_signals),
            'agreement_by_point': []
        }
        
        for i, date in enumerate(combined_signals.index):
            long_count = 0
            short_count = 0
            total_count = 0
            
            for signal_series in indicator_signals.values():
                if date in signal_series.index:
                    signal_value = signal_series.loc[date]
                    if pd.notna(signal_value):
                        total_count += 1
                        if signal_value == 1:
                            long_count += 1
                        elif signal_value == -1:
                            short_count += 1
            
            agreement_stats['agreement_by_point'].append({
                'date': date.strftime('%Y-%m-%d') if isinstance(date, pd.Timestamp) else str(date),
                'long_count': long_count,
                'short_count': short_count,
                'total_count': total_count,
                'combined_signal': int(combined_signals.loc[date])
            })
        
        return CombinedSignalResponse(
            success=True,
            combined_result=BacktestResult(**backtest_result),
            combined_signals=combined_signals.tolist(),
            agreement_stats=agreement_stats
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating combined signals: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate combined signals: {str(e)}"
        )
