"""
Strategy signal combination logic for unified dashboard.

This module combines signals from different strategy types (Indicator, Valuation, Full Cycle)
using various combination methods (weighted average, majority vote, custom expressions).
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)


def map_valuation_to_signal(
    zscore_series: pd.Series,
    oversold_threshold: float = -2.0,
    overbought_threshold: float = 2.0
) -> pd.Series:
    """
    Map valuation z-score to trading signal.
    
    Args:
        zscore_series: Z-score time series
        oversold_threshold: Z-score threshold for buy signal (default: -2.0)
        overbought_threshold: Z-score threshold for sell signal (default: 2.0)
        
    Returns:
        Signal series: -1 (sell), 0 (hold), 1 (buy)
    """
    signals = pd.Series(0, index=zscore_series.index)
    signals[zscore_series <= oversold_threshold] = 1  # Buy when oversold
    signals[zscore_series >= overbought_threshold] = -1  # Sell when overbought
    return signals


def map_fullcycle_to_signal(
    avg_zscore_series: pd.Series,
    sdca_in: float = -2.0,
    sdca_out: float = 2.0
) -> pd.Series:
    """
    Map Full Cycle average z-score to trading signal.
    
    Args:
        avg_zscore_series: Average z-score time series
        sdca_in: Z-score threshold for DCA in (buy) signal (default: -2.0)
        sdca_out: Z-score threshold for DCA out (sell) signal (default: 2.0)
        
    Returns:
        Signal series: -1 (sell), 0 (hold), 1 (buy)
    """
    signals = pd.Series(0, index=avg_zscore_series.index)
    signals[avg_zscore_series <= sdca_in] = 1  # Buy when oversold
    signals[avg_zscore_series >= sdca_out] = -1  # Sell when overbought
    return signals


def combine_signals_weighted(
    signal_dict: Dict[str, pd.Series],
    weights: Dict[str, float]
) -> pd.Series:
    """
    Combine signals using weighted average.
    
    Args:
        signal_dict: Dictionary mapping strategy names to signal series (-1, 0, 1)
        weights: Dictionary mapping strategy names to weights (must sum to 1.0)
        
    Returns:
        Combined signal series (continuous values, can be thresholded later)
    """
    if not signal_dict:
        raise ValueError("No signals provided")
    
    # Normalize weights to sum to 1.0
    total_weight = sum(weights.values())
    if total_weight == 0:
        raise ValueError("Total weight cannot be zero")
    normalized_weights = {k: v / total_weight for k, v in weights.items()}
    
    # Find common index
    common_index = signal_dict[list(signal_dict.keys())[0]].index
    for series in signal_dict.values():
        common_index = common_index.intersection(series.index)
    
    if len(common_index) == 0:
        raise ValueError("No common dates between signals")
    
    # Calculate weighted average
    combined = pd.Series(0.0, index=common_index)
    for strategy_name, signal_series in signal_dict.items():
        if strategy_name in normalized_weights:
            aligned = signal_series.reindex(common_index, fill_value=0)
            combined += aligned * normalized_weights[strategy_name]
    
    return combined


def combine_signals_majority_vote(
    signal_dict: Dict[str, pd.Series],
    threshold: Optional[float] = None
) -> pd.Series:
    """
    Combine signals using majority vote.
    
    Args:
        signal_dict: Dictionary mapping strategy names to signal series (-1, 0, 1)
        threshold: Optional threshold for agreement (e.g., 0.5 = 50% must agree)
        
    Returns:
        Combined signal series (-1, 0, 1)
    """
    if not signal_dict:
        raise ValueError("No signals provided")
    
    # Find common index
    common_index = signal_dict[list(signal_dict.keys())[0]].index
    for series in signal_dict.values():
        common_index = common_index.intersection(series.index)
    
    if len(common_index) == 0:
        raise ValueError("No common dates between signals")
    
    # Count votes for each signal type
    num_strategies = len(signal_dict)
    combined = pd.Series(0, index=common_index)
    
    for date in common_index:
        buy_votes = 0
        sell_votes = 0
        hold_votes = 0
        
        for strategy_name, signal_series in signal_dict.items():
            aligned = signal_series.reindex([date], fill_value=0)
            signal_value = int(aligned.iloc[0]) if len(aligned) > 0 else 0
            
            if signal_value == 1:
                buy_votes += 1
            elif signal_value == -1:
                sell_votes += 1
            else:
                hold_votes += 1
        
        # Determine majority
        if threshold is not None:
            # Use threshold-based agreement
            buy_ratio = buy_votes / num_strategies
            sell_ratio = sell_votes / num_strategies
            
            if buy_ratio >= threshold:
                combined.loc[date] = 1
            elif sell_ratio >= threshold:
                combined.loc[date] = -1
            else:
                combined.loc[date] = 0
        else:
            # Simple majority vote
            if buy_votes > sell_votes and buy_votes > hold_votes:
                combined.loc[date] = 1
            elif sell_votes > buy_votes and sell_votes > hold_votes:
                combined.loc[date] = -1
            else:
                combined.loc[date] = 0
    
    return combined


def combine_signals_custom_expression(
    signal_dict: Dict[str, pd.Series],
    expression: str
) -> pd.Series:
    """
    Combine signals using a custom boolean expression.
    
    Args:
        signal_dict: Dictionary mapping strategy names to signal series (-1, 0, 1)
        expression: Boolean expression like "(indicator == 1 AND valuation == 1) OR fullcycle == 1"
                   Strategy names are case-insensitive and can use underscores or spaces
                   
    Returns:
        Combined signal series (-1, 0, 1)
    """
    if not signal_dict:
        raise ValueError("No signals provided")
    
    # Find common index
    common_index = signal_dict[list(signal_dict.keys())[0]].index
    for series in signal_dict.values():
        common_index = common_index.intersection(series.index)
    
    if len(common_index) == 0:
        raise ValueError("No common dates between signals")
    
    # Normalize strategy names in expression (replace spaces with underscores, lowercase)
    normalized_dict = {}
    for key, value in signal_dict.items():
        normalized_key = key.lower().replace(' ', '_')
        normalized_dict[normalized_key] = value
    
    # Replace strategy names in expression
    expr = expression.lower()
    for original_key in signal_dict.keys():
        normalized_key = original_key.lower().replace(' ', '_')
        # Replace both with and without underscores
        expr = expr.replace(original_key.lower(), normalized_key)
        expr = expr.replace(original_key.lower().replace('_', ' '), normalized_key)
    
    # Align all signals to common index
    aligned_signals = {}
    for key, series in normalized_dict.items():
        aligned_signals[key] = series.reindex(common_index, fill_value=0)
    
    # Evaluate expression for each date
    combined = pd.Series(0, index=common_index)
    
    for date in common_index:
        # Create local variables for each strategy signal at this date
        local_vars = {}
        for key, series in aligned_signals.items():
            signal_value = int(series.loc[date]) if date in series.index else 0
            local_vars[key] = signal_value
        
        # Replace strategy names in expression with their values
        eval_expr = expr
        for key, value in local_vars.items():
            # Replace == 1, == -1, == 0 patterns
            eval_expr = re.sub(
                rf'\b{re.escape(key)}\s*==\s*1\b',
                f'({value} == 1)',
                eval_expr
            )
            eval_expr = re.sub(
                rf'\b{re.escape(key)}\s*==\s*-1\b',
                f'({value} == -1)',
                eval_expr
            )
            eval_expr = re.sub(
                rf'\b{re.escape(key)}\s*==\s*0\b',
                f'({value} == 0)',
                eval_expr
            )
            # Also handle just the variable name (treat as boolean)
            eval_expr = re.sub(
                rf'\b{re.escape(key)}\b(?!\s*==)',
                f'({value} == 1)',
                eval_expr
            )
        
        try:
            # Evaluate the expression
            result = eval(eval_expr)
            
            # Convert boolean to signal
            if result:
                # Determine if it's a buy or sell signal
                # Count buy vs sell signals in the expression
                buy_count = sum(1 for v in local_vars.values() if v == 1)
                sell_count = sum(1 for v in local_vars.values() if v == -1)
                
                if buy_count > sell_count:
                    combined.loc[date] = 1
                elif sell_count > buy_count:
                    combined.loc[date] = -1
                else:
                    combined.loc[date] = 1  # Default to buy if equal
            else:
                combined.loc[date] = 0
        except Exception as e:
            logger.warning(f"Error evaluating expression at {date}: {e}")
            combined.loc[date] = 0
    
    return combined


def combine_strategy_signals(
    indicator_signals: Optional[Dict[str, pd.Series]] = None,
    valuation_signals: Optional[Dict[str, pd.Series]] = None,
    fullcycle_signals: Optional[Dict[str, pd.Series]] = None,
    combination_method: str = "weighted",
    combination_params: Optional[Dict[str, Any]] = None
) -> Tuple[pd.Series, Dict[str, Any]]:
    """
    Combine signals from multiple strategy types.
    
    Args:
        indicator_signals: Dict mapping strategy names to signal series
        valuation_signals: Dict mapping strategy names to signal series
        fullcycle_signals: Dict mapping strategy names to signal series
        combination_method: "weighted", "majority", or "custom"
        combination_params: Parameters for combination method:
            - For "weighted": {"weights": {"strategy_name": weight, ...}}
            - For "majority": {"threshold": 0.5} (optional)
            - For "custom": {"expression": "..."}
            
    Returns:
        Tuple of (combined_signal_series, metadata_dict)
    """
    # Collect all signals
    all_signals = {}
    
    if indicator_signals:
        all_signals.update(indicator_signals)
    if valuation_signals:
        all_signals.update(valuation_signals)
    if fullcycle_signals:
        all_signals.update(fullcycle_signals)
    
    if not all_signals:
        raise ValueError("No signals provided")
    
    # Default parameters
    if combination_params is None:
        combination_params = {}
    
    # Combine based on method
    if combination_method == "weighted":
        weights = combination_params.get("weights", {})
        if not weights:
            # Default: equal weights
            num_strategies = len(all_signals)
            weights = {name: 1.0 / num_strategies for name in all_signals.keys()}
        
        combined = combine_signals_weighted(all_signals, weights)
        
        # Threshold to convert to discrete signals
        # Values > 0.3 = buy, < -0.3 = sell, else hold
        discrete_signals = pd.Series(0, index=combined.index)
        discrete_signals[combined > 0.3] = 1
        discrete_signals[combined < -0.3] = -1
        
        metadata = {
            "method": "weighted",
            "weights": weights,
            "continuous_values": combined.to_dict()
        }
        
        return discrete_signals, metadata
        
    elif combination_method == "majority":
        threshold = combination_params.get("threshold")
        combined = combine_signals_majority_vote(all_signals, threshold)
        
        metadata = {
            "method": "majority",
            "threshold": threshold,
            "num_strategies": len(all_signals)
        }
        
        return combined, metadata
        
    elif combination_method == "custom":
        expression = combination_params.get("expression", "")
        if not expression:
            raise ValueError("Custom expression is required for 'custom' method")
        
        combined = combine_signals_custom_expression(all_signals, expression)
        
        metadata = {
            "method": "custom",
            "expression": expression
        }
        
        return combined, metadata
        
    else:
        raise ValueError(f"Unknown combination method: {combination_method}")

