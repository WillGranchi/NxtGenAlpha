"""
Valuation module for calculating z-scores of mean-reverting indicators.

This module provides functions to calculate z-scores for technical and fundamental
indicators to identify overbought and oversold states.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Literal
import logging

logger = logging.getLogger(__name__)


def calculate_zscore_rolling(series: pd.Series, window: int) -> pd.Series:
    """
    Calculate rolling window z-score.
    
    Args:
        series: Pandas Series with indicator values
        window: Rolling window size for mean/std calculation
        
    Returns:
        Pandas Series with z-scores
    """
    rolling_mean = series.rolling(window=window, min_periods=1).mean()
    rolling_std = series.rolling(window=window, min_periods=1).std()
    
    # Avoid division by zero
    rolling_std = rolling_std.replace(0, np.nan)
    zscore = (series - rolling_mean) / rolling_std
    
    return zscore


def calculate_zscore_alltime(series: pd.Series) -> pd.Series:
    """
    Calculate all-time z-score using entire series mean and std.
    
    Args:
        series: Pandas Series with indicator values
        
    Returns:
        Pandas Series with z-scores
    """
    mean = series.mean()
    std = series.std()
    
    # Avoid division by zero
    if std == 0 or pd.isna(std):
        return pd.Series(index=series.index, data=0.0)
    
    zscore = (series - mean) / std
    return zscore


def calculate_indicator_zscore(
    indicator_values: pd.Series,
    method: Literal["rolling", "all_time"] = "rolling",
    window: int = 200
) -> pd.Series:
    """
    Calculate z-score for an indicator using specified method.
    
    Args:
        indicator_values: Pandas Series with indicator values
        method: "rolling" for rolling window or "all_time" for all-time z-score
        window: Rolling window size (only used if method is "rolling")
        
    Returns:
        Pandas Series with z-scores
    """
    if method == "rolling":
        return calculate_zscore_rolling(indicator_values, window)
    elif method == "all_time":
        return calculate_zscore_alltime(indicator_values)
    else:
        raise ValueError(f"Unknown z-score method: {method}")


def get_overbought_oversold_regions(
    zscores: pd.Series,
    threshold: float = 1.0
) -> Dict[str, List[Tuple[pd.Timestamp, pd.Timestamp]]]:
    """
    Identify continuous regions where z-score exceeds thresholds.
    
    Args:
        zscores: Pandas Series with z-scores indexed by date
        threshold: Z-score threshold for overbought/oversold (default: 1.0)
        
    Returns:
        Dictionary with "overbought" and "oversold" lists of (start, end) tuples
    """
    overbought_mask = zscores > threshold
    oversold_mask = zscores < -threshold
    
    def get_continuous_regions(mask: pd.Series) -> List[Tuple[pd.Timestamp, pd.Timestamp]]:
        """Convert boolean mask to list of continuous regions."""
        regions = []
        in_region = False
        start_date = None
        
        for date, is_in_region in mask.items():
            if is_in_region and not in_region:
                # Start of new region
                start_date = date
                in_region = True
            elif not is_in_region and in_region:
                # End of region
                if start_date is not None:
                    regions.append((start_date, date))
                in_region = False
        
        # Handle case where region extends to end of series
        if in_region and start_date is not None:
            regions.append((start_date, mask.index[-1]))
        
        return regions
    
    return {
        "overbought": get_continuous_regions(overbought_mask),
        "oversold": get_continuous_regions(oversold_mask)
    }


def calculate_average_zscore(zscores: Dict[str, pd.Series]) -> Dict[str, float]:
    """
    Calculate average z-score across all indicators.
    
    Args:
        zscores: Dictionary mapping indicator IDs to their z-score Series
        
    Returns:
        Dictionary mapping indicator IDs to their average z-scores
    """
    averages = {}
    for indicator_id, zscore_series in zscores.items():
        # Use only non-null values for average
        valid_values = zscore_series.dropna()
        if len(valid_values) > 0:
            averages[indicator_id] = float(valid_values.mean())
        else:
            averages[indicator_id] = 0.0
    
    return averages


def get_latest_zscore(zscores: pd.Series) -> float:
    """
    Get the most recent (latest) z-score value.
    
    Args:
        zscores: Pandas Series with z-scores indexed by date
        
    Returns:
        Latest z-score value (or 0.0 if no valid values)
    """
    # Get last non-null value
    valid_values = zscores.dropna()
    if len(valid_values) > 0:
        return float(valid_values.iloc[-1])
    return 0.0
