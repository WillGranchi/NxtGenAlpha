"""
Indicator signal generation and majority voting logic.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from datetime import datetime
import logging

from backend.core.backtest import BacktestEngine
from backend.core.expression import create_signal_series, get_available_conditions, evaluate_all_conditions
from backend.core.metrics import calculate_all_metrics

logger = logging.getLogger(__name__)


def _make_json_serializable(obj):
    """Convert pandas/numpy objects to JSON-serializable types."""
    if isinstance(obj, (pd.Timestamp, pd.DatetimeIndex)):
        return obj.strftime('%Y-%m-%d')
    elif isinstance(obj, pd.Series):
        return obj.tolist()
    elif isinstance(obj, pd.DataFrame):
        return obj.to_dict('records')
    elif isinstance(obj, dict):
        return {k: _make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_make_json_serializable(item) for item in obj]
    elif isinstance(obj, (np.integer, np.floating)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def generate_indicator_signals(
    df: pd.DataFrame,
    indicators: List[Dict],
    expressions: Dict[str, str],
    strategy_type: str = "long_cash"
) -> Dict[str, pd.Series]:
    """
    Generate signals for individual indicators using their expressions.
    
    Args:
        df: DataFrame with OHLCV data
        indicators: List of indicator configurations
        expressions: Dictionary mapping indicator IDs to expressions
        strategy_type: "long_cash" or "long_short"
        
    Returns:
        Dictionary mapping indicator IDs to their signal Series (1=LONG, 0=CASH, -1=SHORT)
    """
    from backend.core.indicator_registry import calculate_indicator
    
    # Calculate all indicators
    df_with_indicators = df.copy()
    indicators_dict = {}
    
    for indicator_config in indicators:
        indicator_id = indicator_config['id']
        params = indicator_config.get('parameters', {})
        
        try:
            indicator_values = calculate_indicator(df, indicator_id, **params)
            df_with_indicators[indicator_id] = indicator_values
            indicators_dict[indicator_id] = indicator_values
        except Exception as e:
            logger.error(f"Error calculating indicator {indicator_id}: {e}")
            continue
    
    # Get available conditions
    available_conditions_list = get_available_conditions(indicators)
    
    # Evaluate all conditions
    all_conditions = evaluate_all_conditions(df_with_indicators, indicators)
    
    # Generate signals for each indicator
    indicator_signals = {}
    
    for indicator_config in indicators:
        indicator_id = indicator_config['id']
        expression = expressions.get(indicator_id, '')
        
        if not expression or not expression.strip():
            # No expression provided - skip this indicator
            logger.warning(f"No expression provided for indicator {indicator_id}, skipping")
            continue
        
        try:
            # Generate signal series using all conditions
            signal_series = create_signal_series(expression, all_conditions, available_conditions_list)
            
            # For long_short, we need to handle short signals
            if strategy_type == "long_short":
                # Signal series is 1 for long, 0 for no position
                # We'll need to extend this to support -1 for short if needed
                # For now, keep as 1/0
                pass
            
            indicator_signals[indicator_id] = signal_series
            
        except Exception as e:
            logger.error(f"Error generating signals for indicator {indicator_id}: {e}")
            continue
    
    return indicator_signals


def combine_signals_majority(
    indicator_signals: Dict[str, pd.Series],
    threshold: float = 0.5
) -> pd.Series:
    """
    Combine signals using threshold-based majority voting.
    
    For each timestamp:
    - Count long signals (1) and short signals (-1)
    - If long_count / total >= threshold → combined = 1
    - If short_count / total >= threshold → combined = -1
    - Otherwise → combined = 0 (no position)
    
    Signal flips only when majority changes.
    
    Args:
        indicator_signals: Dictionary mapping indicator IDs to signal Series
        threshold: Threshold for majority (0.5 = 50%, 0.6 = 60%, etc.)
        
    Returns:
        Combined signal Series (1=LONG, 0=CASH, -1=SHORT)
    """
    if not indicator_signals:
        return pd.Series(dtype=int)
    
    # Align all series to common index
    aligned_signals = []
    common_index = None
    
    for indicator_id, signal_series in indicator_signals.items():
        if len(signal_series) > 0:
            if common_index is None:
                common_index = signal_series.index
            else:
                common_index = common_index.intersection(signal_series.index)
    
    if common_index is None or len(common_index) == 0:
        return pd.Series(dtype=int)
    
    # Combine signals using majority voting
    combined_signals = []
    current_position = 0  # Track current position to prevent rapid flipping
    
    for date in common_index:
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
        
        if total_count == 0:
            combined_signals.append(current_position)
            continue
        
        # Calculate percentages
        long_ratio = long_count / total_count
        short_ratio = short_count / total_count
        
        # Determine new position based on threshold
        new_position = current_position
        
        if long_ratio >= threshold:
            new_position = 1
        elif short_ratio >= threshold:
            new_position = -1
        else:
            # No clear majority - maintain current position or set to 0
            # If we're in a position and majority doesn't flip, maintain it
            if current_position != 0:
                # Check if majority has flipped
                if current_position == 1 and long_ratio < threshold:
                    new_position = 0
                elif current_position == -1 and short_ratio < threshold:
                    new_position = 0
                else:
                    new_position = current_position  # Maintain position
            else:
                new_position = 0
        
        combined_signals.append(new_position)
        current_position = new_position
    
    return pd.Series(combined_signals, index=common_index)


def run_indicator_backtest(
    df: pd.DataFrame,
    signal_series: pd.Series,
    strategy_type: str = "long_cash",
    initial_capital: float = 10000.0
) -> Dict:
    """
    Run backtest for a signal series.
    
    Args:
        df: DataFrame with OHLCV data
        signal_series: Signal series (1=LONG, 0=CASH, -1=SHORT)
        strategy_type: "long_cash" or "long_short"
        initial_capital: Initial capital
        
    Returns:
        Backtest result dictionary
    """
    # Align signal series with dataframe
    aligned_signals = signal_series.reindex(df.index, fill_value=0)
    
    # Convert signals to positions
    # For long_cash: 1 = LONG, 0 = CASH
    # For long_short: 1 = LONG, -1 = SHORT, 0 = CASH
    positions = aligned_signals.copy()
    
    if strategy_type == "long_cash":
        # Convert -1 to 0 (no short positions in long_cash)
        positions = positions.replace(-1, 0)
    
    # Create DataFrame with Signal and Position columns
    df_with_signals = df.copy()
    df_with_signals['Signal'] = aligned_signals
    df_with_signals['Position'] = positions
    
    # Run backtest using BacktestEngine
    engine = BacktestEngine(initial_capital=initial_capital)
    backtest_results = engine.run_backtest(df_with_signals, strategy_name="Indicator")
    
    # Calculate metrics
    metrics = calculate_all_metrics(backtest_results)
    backtest_results['metrics'] = metrics
    
    # Make JSON serializable
    return _make_json_serializable(backtest_results)
