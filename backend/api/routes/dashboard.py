"""
Dashboard API routes for unified strategy management.

This module provides endpoints for combining and managing multiple strategy types
(Indicator, Valuation, Full Cycle) in a unified dashboard.
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import pandas as pd
import numpy as np
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.auth import get_current_user
from backend.api.models.db_models import User, Strategy, Valuation, FullCyclePreset
from backend.core.data_loader import fetch_crypto_data_smart, load_crypto_data
from backend.core.strategy_combiner import (
    combine_strategy_signals,
    map_valuation_to_signal,
    map_fullcycle_to_signal
)
from backend.core.indicator_signals import generate_indicator_signals, combine_signals_majority
from backend.core.backtest import BacktestEngine
from backend.core.metrics import calculate_all_metrics
from backend.api.routes.valuation import calculate_technical_indicator, TECHNICAL_INDICATORS
from backend.api.routes.fullcycle import get_fullcycle_indicator, FULL_CYCLE_INDICATORS
from backend.core.expression import create_signal_series
from backend.core.indicator_registry import get_available_conditions, evaluate_all_conditions

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
logger = logging.getLogger(__name__)

def _load_price_df(symbol: str, exchange: str, start_date: Optional[datetime], end_date: Optional[datetime]) -> pd.DataFrame:
    """
    Load price data for a specific market.
    Prefers CoinGlass (with cache), and falls back to CSV if configured.
    """
    try:
        df, _, _ = fetch_crypto_data_smart(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            exchange=exchange,
            interval="1d",
            use_cache=True,
            cross_validate=False
        )
        return df
    except Exception as e:
        logger.warning(f"Failed to fetch {symbol} on {exchange} from CoinGlass, falling back to CSV: {e}")
        return load_crypto_data(symbol=symbol, exchange=exchange)


class StrategySelection(BaseModel):
    """Strategy selection for combination."""
    indicator_strategy_ids: List[int] = []
    valuation_strategy_ids: List[int] = []
    fullcycle_preset_ids: List[int] = []


class CombinationRule(BaseModel):
    """Combination rule configuration."""
    method: str  # "weighted", "majority", or "custom"
    weights: Optional[Dict[str, float]] = None
    threshold: Optional[float] = None
    expression: Optional[str] = None


class CombinedSignalsRequest(BaseModel):
    """Request for calculating combined signals."""
    strategy_selection: StrategySelection
    combination_rule: CombinationRule
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    symbol: str = "BTCUSDT"
    exchange: str = "Binance"
    strategy_type: str = "long_cash"  # "long_cash" or "long_short"


class CombinedBacktestRequest(BaseModel):
    """Request for running combined backtest."""
    strategy_selection: StrategySelection
    combination_rule: CombinationRule
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    symbol: str = "BTCUSDT"
    exchange: str = "Binance"
    strategy_type: str = "long_cash"  # "long_cash" or "long_short"
    initial_capital: float = 10000.0


@router.get("/strategies/all")
async def get_all_saved_strategies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Fetch all saved strategies (Indicator, Valuation, Full Cycle) for the current user.
    
    Returns:
        Dict with three lists: indicator_strategies, valuation_strategies, fullcycle_presets
    """
    try:
        # Fetch indicator strategies
        indicator_strategies = db.query(Strategy).filter(
            Strategy.user_id == current_user.id
        ).order_by(Strategy.updated_at.desc()).all()
        
        indicator_list = [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "symbol": getattr(s, "symbol", "BTCUSDT"),
                "exchange": getattr(s, "exchange", "Binance"),
                "created_at": s.created_at.isoformat() if s.created_at else "",
                "updated_at": s.updated_at.isoformat() if s.updated_at else "",
                "type": "indicator"
            }
            for s in indicator_strategies
        ]
        
        # Fetch valuation strategies
        valuation_strategies = db.query(Valuation).filter(
            Valuation.user_id == current_user.id
        ).order_by(Valuation.updated_at.desc()).all()
        
        valuation_list = [
            {
                "id": v.id,
                "name": v.name,
                "description": v.description,
                "symbol": getattr(v, "symbol", "BTCUSDT"),
                "exchange": getattr(v, "exchange", "Binance"),
                "created_at": v.created_at.isoformat() if v.created_at else "",
                "updated_at": v.updated_at.isoformat() if v.updated_at else "",
                "type": "valuation"
            }
            for v in valuation_strategies
        ]
        
        # Fetch Full Cycle presets
        fullcycle_presets = db.query(FullCyclePreset).filter(
            FullCyclePreset.user_id == current_user.id
        ).order_by(FullCyclePreset.updated_at.desc()).all()
        
        fullcycle_list = [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "symbol": getattr(p, "symbol", "BTCUSDT"),
                "exchange": getattr(p, "exchange", "Binance"),
                "created_at": p.created_at.isoformat() if p.created_at else "",
                "updated_at": p.updated_at.isoformat() if p.updated_at else "",
                "type": "fullcycle"
            }
            for p in fullcycle_presets
        ]
        
        return {
            "success": True,
            "indicator_strategies": indicator_list,
            "valuation_strategies": valuation_list,
            "fullcycle_presets": fullcycle_list,
            "total": len(indicator_list) + len(valuation_list) + len(fullcycle_list)
        }
        
    except Exception as e:
        logger.error(f"Error fetching all strategies: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch strategies: {str(e)}"
        )


def _get_indicator_strategy_signals(
    strategy: Strategy,
    df: pd.DataFrame,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> pd.Series:
    """Get signals from an indicator strategy."""
    try:
        # Filter by date range
        if start_date:
            df = df[df.index >= start_date]
        if end_date:
            df = df[df.index <= end_date]
        
        if len(df) == 0:
            return pd.Series(dtype=float)
        
        # Get strategy configuration
        indicators = strategy.indicators
        expressions = strategy.expressions
        strategy_type = expressions.get("strategy_type", "long_cash")
        
        # Generate signals
        indicator_signals_dict = generate_indicator_signals(
            df, indicators, expressions, strategy_type
        )
        
        # Combine indicator signals using majority vote
        if indicator_signals_dict:
            combined = combine_signals_majority(indicator_signals_dict)
            return combined
        else:
            return pd.Series(0, index=df.index)
            
    except Exception as e:
        logger.error(f"Error getting indicator strategy signals: {e}")
        return pd.Series(dtype=float)


def _get_valuation_strategy_signals(
    valuation: Valuation,
    df: pd.DataFrame,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> pd.Series:
    """Get signals from a valuation strategy."""
    try:
        # Filter by date range
        if start_date:
            df = df[df.index >= start_date]
        if end_date:
            df = df[df.index <= end_date]
        
        if len(df) == 0:
            return pd.Series(dtype=float)
        
        # Get valuation configuration
        indicators = valuation.indicators
        oversold_threshold = valuation.oversold_threshold
        overbought_threshold = valuation.overbought_threshold
        
        # Calculate z-scores for selected indicators
        zscore_series_list = []
        for indicator_id in indicators:
            if indicator_id in TECHNICAL_INDICATORS:
                zscore_series = calculate_technical_indicator(df, indicator_id)
                if zscore_series is not None and len(zscore_series) > 0:
                    zscore_series = zscore_series.reindex(df.index, fill_value=0)
                    zscore_series = zscore_series.replace([np.inf, -np.inf], 0).fillna(0)
                    zscore_series_list.append(zscore_series)
        
        if not zscore_series_list:
            return pd.Series(0, index=df.index)
        
        # Average z-scores
        avg_zscore = pd.concat(zscore_series_list, axis=1).mean(axis=1)
        
        # Map to signals
        signals = map_valuation_to_signal(avg_zscore, oversold_threshold, overbought_threshold)
        return signals
        
    except Exception as e:
        logger.error(f"Error getting valuation strategy signals: {e}")
        return pd.Series(dtype=float)


def _get_fullcycle_strategy_signals(
    preset: FullCyclePreset,
    df: pd.DataFrame,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> pd.Series:
    """Get signals from a Full Cycle preset."""
    try:
        # Filter by date range
        if start_date:
            df = df[df.index >= start_date]
        if end_date:
            df = df[df.index <= end_date]
        
        if len(df) == 0:
            return pd.Series(dtype=float)
        
        # Get preset configuration
        indicators = preset.selected_indicators
        indicator_params = preset.indicator_params
        sdca_in = preset.sdca_in
        sdca_out = preset.sdca_out
        
        # Calculate z-scores for selected indicators
        zscore_series_list = []
        for indicator_id in indicators:
            if indicator_id in FULL_CYCLE_INDICATORS:
                params = indicator_params.get(indicator_id, {}) if indicator_params else {}
                zscore_series = get_fullcycle_indicator(df, indicator_id, params)
                if zscore_series is not None and len(zscore_series) > 0:
                    zscore_series = zscore_series.reindex(df.index, fill_value=0)
                    zscore_series = zscore_series.replace([np.inf, -np.inf], 0).fillna(0)
                    zscore_series_list.append(zscore_series)
        
        if not zscore_series_list:
            return pd.Series(0, index=df.index)
        
        # Average z-scores
        avg_zscore = pd.concat(zscore_series_list, axis=1).mean(axis=1)
        
        # Map to signals
        signals = map_fullcycle_to_signal(avg_zscore, sdca_in, sdca_out)
        return signals
        
    except Exception as e:
        logger.error(f"Error getting fullcycle strategy signals: {e}")
        return pd.Series(dtype=float)


@router.post("/calculate-combined-signals")
async def calculate_combined_signals(
    request: CombinedSignalsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Calculate combined signals from selected strategies.
    
    Returns:
        Dict with combined signals, individual strategy signals, and metadata
    """
    try:
        # Parse date range
        start_date_dt = pd.to_datetime(request.start_date) if request.start_date else None
        end_date_dt = pd.to_datetime(request.end_date) if request.end_date else None

        # Load price data for the dashboard context (used for chart/backtest context in the frontend)
        dashboard_symbol = request.symbol or "BTCUSDT"
        dashboard_exchange = request.exchange or "Binance"
        df_dashboard = _load_price_df(dashboard_symbol, dashboard_exchange, start_date_dt, end_date_dt)

        if df_dashboard is None or len(df_dashboard) == 0:
            raise HTTPException(status_code=400, detail=f"No price data available for {dashboard_symbol} on {dashboard_exchange}")
        
        # Collect signals from each selected strategy
        indicator_signals = {}
        valuation_signals = {}
        fullcycle_signals = {}
        selected_markets = []
        
        # Get indicator strategy signals
        for strategy_id in request.strategy_selection.indicator_strategy_ids:
            strategy = db.query(Strategy).filter(
                Strategy.id == strategy_id,
                Strategy.user_id == current_user.id
            ).first()
            
            if strategy:
                s_symbol = getattr(strategy, "symbol", "BTCUSDT") or "BTCUSDT"
                s_exchange = getattr(strategy, "exchange", "Binance") or "Binance"
                selected_markets.append({"type": "indicator", "id": strategy.id, "name": strategy.name, "symbol": s_symbol, "exchange": s_exchange})
                df_s = _load_price_df(s_symbol, s_exchange, start_date_dt, end_date_dt)
                signals = _get_indicator_strategy_signals(strategy, df_s, start_date_dt, end_date_dt)
                if len(signals) > 0:
                    indicator_signals[f"Indicator_{strategy.name}"] = signals
        
        # Get valuation strategy signals
        for valuation_id in request.strategy_selection.valuation_strategy_ids:
            valuation = db.query(Valuation).filter(
                Valuation.id == valuation_id,
                Valuation.user_id == current_user.id
            ).first()
            
            if valuation:
                v_symbol = getattr(valuation, "symbol", "BTCUSDT") or "BTCUSDT"
                v_exchange = getattr(valuation, "exchange", "Binance") or "Binance"
                selected_markets.append({"type": "valuation", "id": valuation.id, "name": valuation.name, "symbol": v_symbol, "exchange": v_exchange})
                df_v = _load_price_df(v_symbol, v_exchange, start_date_dt, end_date_dt)
                signals = _get_valuation_strategy_signals(valuation, df_v, start_date_dt, end_date_dt)
                if len(signals) > 0:
                    valuation_signals[f"Valuation_{valuation.name}"] = signals
        
        # Get Full Cycle preset signals
        for preset_id in request.strategy_selection.fullcycle_preset_ids:
            preset = db.query(FullCyclePreset).filter(
                FullCyclePreset.id == preset_id,
                FullCyclePreset.user_id == current_user.id
            ).first()
            
            if preset:
                p_symbol = getattr(preset, "symbol", "BTCUSDT") or "BTCUSDT"
                p_exchange = getattr(preset, "exchange", "Binance") or "Binance"
                selected_markets.append({"type": "fullcycle", "id": preset.id, "name": preset.name, "symbol": p_symbol, "exchange": p_exchange})
                df_p = _load_price_df(p_symbol, p_exchange, start_date_dt, end_date_dt)
                signals = _get_fullcycle_strategy_signals(preset, df_p, start_date_dt, end_date_dt)
                if len(signals) > 0:
                    fullcycle_signals[f"FullCycle_{preset.name}"] = signals
        
        # Combine signals
        # Enforce strategy semantics:
        # - long_cash: -1 means CASH (neutral), not SHORT
        # - long_short: -1 means SHORT
        strategy_type = request.strategy_type or "long_cash"
        if strategy_type not in ("long_cash", "long_short"):
            raise HTTPException(status_code=400, detail="strategy_type must be 'long_cash' or 'long_short'")

        if strategy_type == "long_cash":
            for d in (indicator_signals, valuation_signals, fullcycle_signals):
                for k, s in list(d.items()):
                    d[k] = s.replace(-1, 0)

        combination_params = {}
        if request.combination_rule.method == "weighted":
            combination_params["weights"] = request.combination_rule.weights or {}
        elif request.combination_rule.method == "majority":
            if request.combination_rule.threshold is not None:
                combination_params["threshold"] = request.combination_rule.threshold
        elif request.combination_rule.method == "custom":
            combination_params["expression"] = request.combination_rule.expression or ""
        
        combined_signals, metadata = combine_strategy_signals(
            indicator_signals if indicator_signals else None,
            valuation_signals if valuation_signals else None,
            fullcycle_signals if fullcycle_signals else None,
            request.combination_rule.method,
            combination_params
        )

        # Add market metadata + warnings (warn but allow)
        unique_markets = sorted({f"{m['symbol']}@{m['exchange']}" for m in selected_markets})
        warnings: List[str] = []
        if len(unique_markets) > 1:
            warnings.append(f"Selected strategies span multiple markets: {', '.join(unique_markets)}")
        context_market = f"{dashboard_symbol}@{dashboard_exchange}"
        if any(f"{m['symbol']}@{m['exchange']}" != context_market for m in selected_markets):
            warnings.append(f"Dashboard context market is {context_market}; some strategies were computed on different markets.")
        metadata = metadata or {}
        metadata.update({
            "dashboard_market": {"symbol": dashboard_symbol, "exchange": dashboard_exchange},
            "selected_strategy_markets": selected_markets,
            "warnings": warnings or None
        })
        
        # Prepare response
        response = {
            "success": True,
            "combined_signals": {
                "dates": [d.strftime("%Y-%m-%d") for d in combined_signals.index],
                "values": combined_signals.tolist()
            },
            "individual_signals": {},
            "metadata": metadata
        }
        
        # Add individual signals
        for name, series in {**indicator_signals, **valuation_signals, **fullcycle_signals}.items():
            response["individual_signals"][name] = {
                "dates": [d.strftime("%Y-%m-%d") for d in series.index],
                "values": series.tolist()
            }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating combined signals: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate combined signals: {str(e)}"
        )


@router.post("/combined-backtest")
async def run_combined_backtest(
    request: CombinedBacktestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Run backtest using combined strategy signals.
    
    Returns:
        Dict with backtest results including metrics and equity curve
    """
    try:
        # Parse date range
        start_date_dt = pd.to_datetime(request.start_date) if request.start_date else None
        end_date_dt = pd.to_datetime(request.end_date) if request.end_date else None

        # Load price data for the dashboard context (this is the market we backtest on)
        dashboard_symbol = request.symbol or "BTCUSDT"
        dashboard_exchange = request.exchange or "Binance"
        df = _load_price_df(dashboard_symbol, dashboard_exchange, start_date_dt, end_date_dt)

        if df is None or len(df) == 0:
            raise HTTPException(status_code=400, detail=f"No price data available for {dashboard_symbol} on {dashboard_exchange}")
        
        # Collect signals from each selected strategy
        indicator_signals = {}
        valuation_signals = {}
        fullcycle_signals = {}
        selected_markets = []
        
        # Get indicator strategy signals
        for strategy_id in request.strategy_selection.indicator_strategy_ids:
            strategy = db.query(Strategy).filter(
                Strategy.id == strategy_id,
                Strategy.user_id == current_user.id
            ).first()
            
            if strategy:
                s_symbol = getattr(strategy, "symbol", "BTCUSDT") or "BTCUSDT"
                s_exchange = getattr(strategy, "exchange", "Binance") or "Binance"
                selected_markets.append({"type": "indicator", "id": strategy.id, "name": strategy.name, "symbol": s_symbol, "exchange": s_exchange})
                df_s = _load_price_df(s_symbol, s_exchange, start_date_dt, end_date_dt)
                signals = _get_indicator_strategy_signals(strategy, df_s, start_date_dt, end_date_dt)
                if len(signals) > 0:
                    indicator_signals[f"Indicator_{strategy.name}"] = signals
        
        # Get valuation strategy signals
        for valuation_id in request.strategy_selection.valuation_strategy_ids:
            valuation = db.query(Valuation).filter(
                Valuation.id == valuation_id,
                Valuation.user_id == current_user.id
            ).first()
            
            if valuation:
                v_symbol = getattr(valuation, "symbol", "BTCUSDT") or "BTCUSDT"
                v_exchange = getattr(valuation, "exchange", "Binance") or "Binance"
                selected_markets.append({"type": "valuation", "id": valuation.id, "name": valuation.name, "symbol": v_symbol, "exchange": v_exchange})
                df_v = _load_price_df(v_symbol, v_exchange, start_date_dt, end_date_dt)
                signals = _get_valuation_strategy_signals(valuation, df_v, start_date_dt, end_date_dt)
                if len(signals) > 0:
                    valuation_signals[f"Valuation_{valuation.name}"] = signals
        
        # Get Full Cycle preset signals
        for preset_id in request.strategy_selection.fullcycle_preset_ids:
            preset = db.query(FullCyclePreset).filter(
                FullCyclePreset.id == preset_id,
                FullCyclePreset.user_id == current_user.id
            ).first()
            
            if preset:
                p_symbol = getattr(preset, "symbol", "BTCUSDT") or "BTCUSDT"
                p_exchange = getattr(preset, "exchange", "Binance") or "Binance"
                selected_markets.append({"type": "fullcycle", "id": preset.id, "name": preset.name, "symbol": p_symbol, "exchange": p_exchange})
                df_p = _load_price_df(p_symbol, p_exchange, start_date_dt, end_date_dt)
                signals = _get_fullcycle_strategy_signals(preset, df_p, start_date_dt, end_date_dt)
                if len(signals) > 0:
                    fullcycle_signals[f"FullCycle_{preset.name}"] = signals
        
        # Combine signals
        strategy_type = request.strategy_type or "long_cash"
        if strategy_type not in ("long_cash", "long_short"):
            raise HTTPException(status_code=400, detail="strategy_type must be 'long_cash' or 'long_short'")

        if strategy_type == "long_cash":
            for d in (indicator_signals, valuation_signals, fullcycle_signals):
                for k, s in list(d.items()):
                    d[k] = s.replace(-1, 0)

        combination_params = {}
        if request.combination_rule.method == "weighted":
            combination_params["weights"] = request.combination_rule.weights or {}
        elif request.combination_rule.method == "majority":
            if request.combination_rule.threshold is not None:
                combination_params["threshold"] = request.combination_rule.threshold
        elif request.combination_rule.method == "custom":
            combination_params["expression"] = request.combination_rule.expression or ""
        
        combined_signals, metadata = combine_strategy_signals(
            indicator_signals if indicator_signals else None,
            valuation_signals if valuation_signals else None,
            fullcycle_signals if fullcycle_signals else None,
            request.combination_rule.method,
            combination_params
        )

        # Add market metadata + warnings (warn but allow)
        unique_markets = sorted({f"{m['symbol']}@{m['exchange']}" for m in selected_markets})
        warnings: List[str] = []
        if len(unique_markets) > 1:
            warnings.append(f"Selected strategies span multiple markets: {', '.join(unique_markets)}")
        context_market = f"{dashboard_symbol}@{dashboard_exchange}"
        if any(f"{m['symbol']}@{m['exchange']}" != context_market for m in selected_markets):
            warnings.append(f"Backtest context market is {context_market}; some strategies were computed on different markets.")
        metadata = metadata or {}
        metadata.update({
            "dashboard_market": {"symbol": dashboard_symbol, "exchange": dashboard_exchange},
            "selected_strategy_markets": selected_markets,
            "warnings": warnings or None
        })
        
        # Align signals with dataframe
        aligned_signals = combined_signals.reindex(df.index, fill_value=0)
        if strategy_type == "long_cash":
            aligned_signals = aligned_signals.replace(-1, 0)
        
        # Create DataFrame with signals for backtest
        df_with_signals = df.copy()
        df_with_signals['Signal'] = aligned_signals
        df_with_signals['Position'] = aligned_signals
        
        # Run backtest
        engine = BacktestEngine(initial_capital=request.initial_capital)
        backtest_results = engine.run_backtest(df_with_signals, strategy_name="Combined Strategy")
        
        # Calculate metrics
        metrics = calculate_all_metrics(backtest_results)
        
        # Make JSON serializable
        def make_serializable(obj):
            if isinstance(obj, (pd.Timestamp, pd.DatetimeIndex)):
                return obj.strftime('%Y-%m-%d')
            elif isinstance(obj, pd.Series):
                return obj.tolist()
            elif isinstance(obj, pd.DataFrame):
                return obj.to_dict('records')
            elif isinstance(obj, dict):
                return {k: make_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [make_serializable(item) for item in obj]
            elif isinstance(obj, (np.integer, np.floating)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            return obj
        
        return {
            "success": True,
            "backtest_results": make_serializable(backtest_results),
            "metrics": make_serializable(metrics),
            "metadata": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running combined backtest: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to run combined backtest: {str(e)}"
        )

