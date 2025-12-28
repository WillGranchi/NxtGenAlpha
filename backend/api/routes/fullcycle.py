"""
Full Cycle API routes for calculating BTC full cycle indicators with z-scores.
"""

from fastapi import APIRouter, HTTPException, Query, Body, Depends
from typing import Dict, Any, List, Optional
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy.orm import Session

from backend.core.data_loader import load_crypto_data, update_crypto_data
from backend.core.fullcycle_indicators import (
    FULL_CYCLE_INDICATORS,
    get_fullcycle_indicator
)
from backend.core.database import get_db
from backend.api.models.db_models import FullCyclePreset
from backend.core.auth import get_current_user

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
    roc_days: int = Body(default=7, description="ROC (Rate of Change) period in days"),
    sdca_in: float = Body(default=-2.0, description="SDCA In threshold (oversold, DCA in signal)"),
    sdca_out: float = Body(default=2.0, description="SDCA Out threshold (overbought, DCA out signal)"),
    force_refresh: bool = Body(default=False, description="Force refresh of price data from API")
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
        
        # Force refresh if requested, otherwise use cached data
        if force_refresh:
            logger.info(f"Force refreshing {symbol} data from API...")
            # Update data to ensure we have full historical range
            # This will fetch from Yahoo Finance/CoinGecko if needed
            df = update_crypto_data(symbol=symbol, force=True)
        else:
            df = load_crypto_data(symbol=symbol)
        
        # Determine the actual date range we have
        actual_start = df.index.min()
        actual_end = df.index.max()
        logger.info(f"Loaded data range: {actual_start.strftime('%Y-%m-%d')} to {actual_end.strftime('%Y-%m-%d')}")
        
        # If start_date is provided but data doesn't go back that far, use actual start
        requested_start = pd.to_datetime(start_date) if start_date else None
        if requested_start and actual_start > requested_start:
            logger.warning(f"Requested start date {start_date} is before available data. Using actual start: {actual_start.strftime('%Y-%m-%d')}")
            # Use actual start date instead
            start_date = actual_start.strftime('%Y-%m-%d')
        
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
        
        # Calculate z-scores for each selected indicator with validation
        indicator_values: Dict[str, pd.Series] = {}
        calculation_errors: Dict[str, str] = {}
        
        for indicator_id in indicators:
            if indicator_id not in FULL_CYCLE_INDICATORS:
                logger.warning(f"Unknown indicator: {indicator_id}, skipping")
                calculation_errors[indicator_id] = "Unknown indicator"
                continue
            
            try:
                params = None
                if indicator_params and indicator_id in indicator_params:
                    params = indicator_params[indicator_id]
                
                zscore_values = get_fullcycle_indicator(df, indicator_id, params)
                
                # Validate the calculated values
                if zscore_values is None or len(zscore_values) == 0:
                    raise ValueError(f"Indicator {indicator_id} returned empty series")
                
                # Check for invalid values (NaN, Inf)
                invalid_count = (zscore_values.isna() | np.isinf(zscore_values)).sum()
                if invalid_count > len(zscore_values) * 0.1:  # More than 10% invalid
                    logger.warning(f"Indicator {indicator_id} has {invalid_count} invalid values out of {len(zscore_values)}")
                
                # Replace NaN and Inf with 0
                zscore_values = zscore_values.replace([np.inf, -np.inf], 0).fillna(0)
                
                # Check for reasonable z-score range (-10 to +10)
                extreme_values = ((zscore_values < -10) | (zscore_values > 10)).sum()
                if extreme_values > 0:
                    logger.warning(f"Indicator {indicator_id} has {extreme_values} extreme values outside [-10, 10] range")
                
                # Ensure date alignment
                if len(zscore_values) != len(df):
                    logger.warning(f"Indicator {indicator_id} length ({len(zscore_values)}) doesn't match data length ({len(df)})")
                    # Align indices
                    zscore_values = zscore_values.reindex(df.index, fill_value=0)
                
                indicator_values[indicator_id] = zscore_values
                logger.debug(f"Successfully calculated {indicator_id}: {len(zscore_values)} values, range [{zscore_values.min():.2f}, {zscore_values.max():.2f}]")
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Error calculating {indicator_id}: {error_msg}", exc_info=True)
                calculation_errors[indicator_id] = error_msg
                continue
        
        if not indicator_values:
            error_detail = "No valid indicators were calculated."
            if calculation_errors:
                error_detail += f" Errors: {', '.join([f'{k}: {v}' for k, v in calculation_errors.items()])}"
            raise HTTPException(
                status_code=400,
                detail=error_detail
            )
        
        # Calculate averages
        fundamental_indicators = [
            'mvrv', 'nupl', 'sopr'
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
        
        # Validate price data
        if len(prices) == 0:
            raise HTTPException(
                status_code=400,
                detail="No price data available"
            )
        
        # Check for invalid prices
        invalid_prices = np.isnan(prices) | np.isinf(prices) | (prices <= 0)
        if invalid_prices.sum() > 0:
            logger.warning(f"Found {invalid_prices.sum()} invalid price values, replacing with forward fill")
            prices_series = pd.Series(prices, index=df.index)
            # Use forward fill then backward fill (pandas 2.0+ compatible)
            prices_series = prices_series.ffill().bfill()
            prices = prices_series.values
        response_data = []
        for i, date in enumerate(dates):
            # Validate price
            price = float(prices[i])
            if price <= 0 or np.isnan(price) or np.isinf(price):
                logger.warning(f"Invalid price at {date}, skipping data point")
                continue
            
            data_point: Dict[str, Any] = {
                'date': date.strftime('%Y-%m-%d'),
                'price': price,
                'indicators': {}
            }
            
            # Add individual indicator z-scores
            for indicator_id, values in indicator_values.items():
                if i < len(values):
                    zscore_val = values.iloc[i]
                    # Ensure valid numeric value
                    if pd.isna(zscore_val) or np.isinf(zscore_val):
                        zscore_val = 0.0
                    data_point['indicators'][indicator_id] = {
                        'zscore': float(zscore_val)
                    }
            
            # Add averages
            if fundamental_avg is not None and i < len(fundamental_avg):
                avg_val = fundamental_avg.iloc[i]
                if pd.isna(avg_val) or np.isinf(avg_val):
                    avg_val = 0.0
                data_point['indicators']['fundamental_average'] = {
                    'zscore': float(avg_val)
                }
            
            if technical_avg is not None and i < len(technical_avg):
                avg_val = technical_avg.iloc[i]
                if pd.isna(avg_val) or np.isinf(avg_val):
                    avg_val = 0.0
                data_point['indicators']['technical_average'] = {
                    'zscore': float(avg_val)
                }
            
            if overall_avg is not None and i < len(overall_avg):
                avg_val = overall_avg.iloc[i]
                if pd.isna(avg_val) or np.isinf(avg_val):
                    avg_val = 0.0
                data_point['indicators']['average'] = {
                    'zscore': float(avg_val)
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
        
        # Prepare warnings if any indicators failed
        warnings = []
        if calculation_errors:
            warnings.append(f"Some indicators failed to calculate: {', '.join(calculation_errors.keys())}")
        
        # Check data quality
        if actual_start > pd.to_datetime('2014-01-01'):
            warnings.append(f"Limited historical data: earliest date is {actual_start.strftime('%Y-%m-%d')}")
        
        return {
            "success": True,
            "data": response_data,
            "roc": roc_values,
            "date_range": {
                "start": dates.min().strftime('%Y-%m-%d'),
                "end": dates.max().strftime('%Y-%m-%d')
            },
            "symbol": symbol,
            "sdca_in": sdca_in,
            "sdca_out": sdca_out,
            "indicators_calculated": len(indicator_values),
            "indicators_requested": len(indicators),
            "warnings": warnings if warnings else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating full cycle z-scores: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate z-scores: {str(e)}"
        )


@router.post("/presets")
async def create_fullcycle_preset(
    name: str = Body(..., description="Preset name"),
    description: Optional[str] = Body(default=None, description="Preset description"),
    indicator_params: Dict[str, Dict[str, Any]] = Body(..., description="Indicator parameters"),
    selected_indicators: List[str] = Body(..., description="Selected indicator IDs"),
    start_date: Optional[str] = Body(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Body(default=None, description="End date (YYYY-MM-DD)"),
    roc_days: int = Body(default=7, description="ROC period in days"),
    show_fundamental_average: bool = Body(default=True, description="Show fundamental average"),
    show_technical_average: bool = Body(default=True, description="Show technical average"),
    show_overall_average: bool = Body(default=True, description="Show overall average"),
    sdca_in: float = Body(default=-2.0, description="SDCA In threshold"),
    sdca_out: float = Body(default=2.0, description="SDCA Out threshold"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new Full Cycle preset.
    """
    try:
        preset = FullCyclePreset(
            user_id=current_user.id,
            name=name,
            description=description,
            indicator_params=indicator_params,
            selected_indicators=selected_indicators,
            start_date=start_date,
            end_date=end_date,
            roc_days=roc_days,
            show_fundamental_average=show_fundamental_average,
            show_technical_average=show_technical_average,
            show_overall_average=show_overall_average,
            sdca_in=sdca_in,
            sdca_out=sdca_out,
        )
        db.add(preset)
        db.commit()
        db.refresh(preset)
        
        return {
            "success": True,
            "preset": {
                "id": preset.id,
                "name": preset.name,
                "description": preset.description,
                "indicator_params": preset.indicator_params,
                "selected_indicators": preset.selected_indicators,
                "start_date": preset.start_date,
                "end_date": preset.end_date,
                "roc_days": preset.roc_days,
                "show_fundamental_average": preset.show_fundamental_average,
                "show_technical_average": preset.show_technical_average,
                "show_overall_average": preset.show_overall_average,
                "sdca_in": preset.sdca_in,
                "sdca_out": preset.sdca_out,
                "created_at": preset.created_at.isoformat(),
                "updated_at": preset.updated_at.isoformat(),
            }
        }
    except Exception as e:
        logger.error(f"Error creating full cycle preset: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create preset: {str(e)}"
        )


@router.get("/presets")
async def list_fullcycle_presets(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List all Full Cycle presets for the current user.
    """
    try:
        presets = db.query(FullCyclePreset).filter(
            FullCyclePreset.user_id == current_user.id
        ).order_by(FullCyclePreset.created_at.desc()).all()
        
        return {
            "success": True,
            "presets": [
                {
                    "id": preset.id,
                    "name": preset.name,
                    "description": preset.description,
                    "created_at": preset.created_at.isoformat(),
                    "updated_at": preset.updated_at.isoformat(),
                }
                for preset in presets
            ],
            "count": len(presets)
        }
    except Exception as e:
        logger.error(f"Error listing full cycle presets: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list presets: {str(e)}"
        )


@router.get("/presets/{preset_id}")
async def get_fullcycle_preset(
    preset_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get a specific Full Cycle preset by ID.
    """
    try:
        preset = db.query(FullCyclePreset).filter(
            FullCyclePreset.id == preset_id,
            FullCyclePreset.user_id == current_user.id
        ).first()
        
        if not preset:
            raise HTTPException(
                status_code=404,
                detail="Preset not found"
            )
        
        return {
            "success": True,
            "preset": {
                "id": preset.id,
                "name": preset.name,
                "description": preset.description,
                "indicator_params": preset.indicator_params,
                "selected_indicators": preset.selected_indicators,
                "start_date": preset.start_date,
                "end_date": preset.end_date,
                "roc_days": preset.roc_days,
                "show_fundamental_average": preset.show_fundamental_average,
                "show_technical_average": preset.show_technical_average,
                "show_overall_average": preset.show_overall_average,
                "sdca_in": preset.sdca_in,
                "sdca_out": preset.sdca_out,
                "created_at": preset.created_at.isoformat(),
                "updated_at": preset.updated_at.isoformat(),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting full cycle preset: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get preset: {str(e)}"
        )


@router.delete("/presets/{preset_id}")
async def delete_fullcycle_preset(
    preset_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete a Full Cycle preset.
    """
    try:
        preset = db.query(FullCyclePreset).filter(
            FullCyclePreset.id == preset_id,
            FullCyclePreset.user_id == current_user.id
        ).first()
        
        if not preset:
            raise HTTPException(
                status_code=404,
                detail="Preset not found"
            )
        
        db.delete(preset)
        db.commit()
        
        return {
            "success": True,
            "message": "Preset deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting full cycle preset: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete preset: {str(e)}"
        )

