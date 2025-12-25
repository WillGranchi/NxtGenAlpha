"""
Full Cycle API routes for calculating BTC full cycle indicators with z-scores.
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List, Optional
import logging
import pandas as pd
import numpy as np
from datetime import datetime

from backend.core.data_loader import load_crypto_data
from backend.core.fullcycle_indicators import (
    FULL_CYCLE_INDICATORS,
    get_fullcycle_indicator
)

router = APIRouter(prefix="/api/fullcycle", tags=["fullcycle"])
logger = logging.getLogger(__name__)


@router.get("/indicators")
async def get_fullcycle_indicators() -> Dict[str, Any]:
    """
    Get list of available full cycle indicators.
    
    Returns:
        Dict: List of indicators with metadata and default parameters
    """
    try:
        indicators = []
        
        for indicator_id, info in FULL_CYCLE_INDICATORS.items():
            indicators.append({
                'id': indicator_id,
                'name': info['name'],
                'category': info['category'],
                'default_params': info['default_params']
            })
        
        return {
            "success": True,
            "indicators": indicators,
            "count": len(indicators)
        }
    except Exception as e:
        logger.error(f"Error getting full cycle indicators: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get indicators: {str(e)}"
        )


@router.post("/zscores")
async def calculate_fullcycle_zscores(
    indicators: List[str] = Body(..., description="List of indicator IDs to calculate"),
    indicator_params: Optional[Dict[str, Dict[str, Any]]] = Body(
        default=None,
        description="Custom parameters for each indicator (optional)"
    ),
    start_date: Optional[str] = Body(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Body(default=None, description="End date (YYYY-MM-DD)"),
    roc_days: int = Body(default=7, description="ROC (Rate of Change) period in days")
) -> Dict[str, Any]:
    """
    Calculate z-scores for selected full cycle indicators.
    
    Args:
        indicators: List of indicator IDs to calculate
        indicator_params: Optional custom parameters for each indicator
        start_date: Start date filter (defaults to 2010-01-01)
        end_date: End date filter (defaults to today)
        roc_days: ROC period in days (default: 7)
        
    Returns:
        Dict: Time series data with price and indicator z-scores, plus averages
    """
    try:
        # Load BTC data (hardcoded to BTCUSDT)
        symbol = "BTCUSDT"
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
        
        # Calculate z-scores for each selected indicator
        indicator_values: Dict[str, pd.Series] = {}
        
        for indicator_id in indicators:
            if indicator_id not in FULL_CYCLE_INDICATORS:
                logger.warning(f"Unknown indicator: {indicator_id}, skipping")
                continue
            
            try:
                params = None
                if indicator_params and indicator_id in indicator_params:
                    params = indicator_params[indicator_id]
                
                zscore_values = get_fullcycle_indicator(df, indicator_id, params)
                indicator_values[indicator_id] = zscore_values
            except Exception as e:
                logger.error(f"Error calculating {indicator_id}: {e}", exc_info=True)
                continue
        
        if not indicator_values:
            raise HTTPException(
                status_code=400,
                detail="No valid indicators were calculated"
            )
        
        # Calculate averages
        fundamental_indicators = [
            'mvrv', 'bitcoin_thermocap', 'nupl', 'cvdd', 'sopr'
        ]
        technical_indicators = [
            'rsi', 'cci', 'multiple_ma', 'sharpe', 'pi_cycle', 'nhpf', 'vwap'
        ]
        
        # Get selected fundamental and technical indicators
        selected_fundamental = [id for id in indicators if id in fundamental_indicators and id in indicator_values]
        selected_technical = [id for id in indicators if id in technical_indicators and id in indicator_values]
        
        # Calculate averages
        fundamental_avg = None
        if selected_fundamental:
            fundamental_series = [indicator_values[id] for id in selected_fundamental]
            fundamental_df = pd.DataFrame(fundamental_series).T
            fundamental_avg = fundamental_df.mean(axis=1)
        
        technical_avg = None
        if selected_technical:
            technical_series = [indicator_values[id] for id in selected_technical]
            technical_df = pd.DataFrame(technical_series).T
            technical_avg = technical_df.mean(axis=1)
        
        overall_avg = None
        if indicator_values:
            all_series = list(indicator_values.values())
            all_df = pd.DataFrame(all_series).T
            overall_avg = all_df.mean(axis=1)
        
        # Prepare response data
        dates = df.index
        prices = df['Close'].values
        
        response_data = []
        for i, date in enumerate(dates):
            data_point: Dict[str, Any] = {
                'date': date.strftime('%Y-%m-%d'),
                'price': float(prices[i]),
                'indicators': {}
            }
            
            # Add individual indicator z-scores
            for indicator_id, values in indicator_values.items():
                if i < len(values):
                    data_point['indicators'][indicator_id] = {
                        'zscore': float(values.iloc[i]) if not pd.isna(values.iloc[i]) else 0.0
                    }
            
            # Add averages
            if fundamental_avg is not None and i < len(fundamental_avg):
                data_point['indicators']['fundamental_average'] = {
                    'zscore': float(fundamental_avg.iloc[i]) if not pd.isna(fundamental_avg.iloc[i]) else 0.0
                }
            
            if technical_avg is not None and i < len(technical_avg):
                data_point['indicators']['technical_average'] = {
                    'zscore': float(technical_avg.iloc[i]) if not pd.isna(technical_avg.iloc[i]) else 0.0
                }
            
            if overall_avg is not None and i < len(overall_avg):
                data_point['indicators']['average'] = {
                    'zscore': float(overall_avg.iloc[i]) if not pd.isna(overall_avg.iloc[i]) else 0.0
                }
            
            response_data.append(data_point)
        
        # Calculate ROC values (Rate of Change)
        roc_values: Dict[str, float] = {}
        for indicator_id, values in indicator_values.items():
            if len(values) > roc_days:
                current = values.iloc[-1]
                past = values.iloc[-roc_days-1] if len(values) > roc_days else values.iloc[0]
                roc_values[indicator_id] = float(current - past) if not (pd.isna(current) or pd.isna(past)) else 0.0
        
        if fundamental_avg is not None and len(fundamental_avg) > roc_days:
            current = fundamental_avg.iloc[-1]
            past = fundamental_avg.iloc[-roc_days-1] if len(fundamental_avg) > roc_days else fundamental_avg.iloc[0]
            roc_values['fundamental_average'] = float(current - past) if not (pd.isna(current) or pd.isna(past)) else 0.0
        
        if technical_avg is not None and len(technical_avg) > roc_days:
            current = technical_avg.iloc[-1]
            past = technical_avg.iloc[-roc_days-1] if len(technical_avg) > roc_days else technical_avg.iloc[0]
            roc_values['technical_average'] = float(current - past) if not (pd.isna(current) or pd.isna(past)) else 0.0
        
        if overall_avg is not None and len(overall_avg) > roc_days:
            current = overall_avg.iloc[-1]
            past = overall_avg.iloc[-roc_days-1] if len(overall_avg) > roc_days else overall_avg.iloc[0]
            roc_values['average'] = float(current - past) if not (pd.isna(current) or pd.isna(past)) else 0.0
        
        return {
            "success": True,
            "data": response_data,
            "roc": roc_values,
            "date_range": {
                "start": dates.min().strftime('%Y-%m-%d'),
                "end": dates.max().strftime('%Y-%m-%d')
            },
            "symbol": symbol
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating full cycle z-scores: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate z-scores: {str(e)}"
        )

