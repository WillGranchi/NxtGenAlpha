"""
Data quality validation module for cryptocurrency price data.

This module provides functions to validate data quality, cross-validate sources,
and calculate quality scores for cryptocurrency OHLCV data.
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional, Tuple, List
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


def validate_data_quality(df: pd.DataFrame, symbol: str = "BTCUSDT") -> Dict[str, float]:
    """
    Validate data quality for cryptocurrency OHLCV DataFrame.
    
    Args:
        df: DataFrame with OHLCV data (Date index, Open, High, Low, Close, Volume columns)
        symbol: Symbol name for logging
        
    Returns:
        Dict with quality metrics:
        - completeness_score: Percentage of expected data points present (0-1)
        - consistency_score: Volume/price consistency score (0-1)
        - freshness_score: Data recency score (0-1)
        - quality_score: Overall quality score (0-1)
        - issues: List of detected issues
    """
    if df.empty:
        return {
            'completeness_score': 0.0,
            'consistency_score': 0.0,
            'freshness_score': 0.0,
            'quality_score': 0.0,
            'issues': ['Empty DataFrame']
        }
    
    issues = []
    
    # 1. Completeness Score (40% weight)
    # Check for missing OHLCV values
    required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
    missing_cols = [col for col in required_columns if col not in df.columns]
    if missing_cols:
        issues.append(f"Missing columns: {missing_cols}")
        completeness_score = 0.0
    else:
        # Count missing values
        missing_values = df[required_columns].isna().sum().sum()
        total_values = len(df) * len(required_columns)
        missing_pct = missing_values / total_values if total_values > 0 else 1.0
        completeness_score = 1.0 - missing_pct
        
        if missing_pct > 0.01:  # More than 1% missing
            issues.append(f"High missing data: {missing_pct*100:.2f}%")
    
    # Check for date gaps
    if len(df) > 1:
        df_sorted = df.sort_index()
        date_diffs = df_sorted.index.to_series().diff().dt.days
        large_gaps = (date_diffs > 1).sum()
        if large_gaps > 0:
            max_gap = date_diffs.max()
            issues.append(f"Date gaps detected: {large_gaps} gaps, max {max_gap} days")
            # Penalize completeness for large gaps
            gap_penalty = min(large_gaps / len(df), 0.2)  # Max 20% penalty
            completeness_score = max(0.0, completeness_score - gap_penalty)
    
    # 2. Consistency Score (20% weight)
    consistency_score = 1.0
    
    # Check OHLC relationships: High >= Low, High >= Open, High >= Close, Low <= Open, Low <= Close
    if all(col in df.columns for col in ['Open', 'High', 'Low', 'Close']):
        invalid_ohlc = (
            (df['High'] < df['Low']) |
            (df['High'] < df['Open']) |
            (df['High'] < df['Close']) |
            (df['Low'] > df['Open']) |
            (df['Low'] > df['Close'])
        ).sum()
        
        if invalid_ohlc > 0:
            issues.append(f"Invalid OHLC relationships: {invalid_ohlc} rows")
            consistency_score -= min(invalid_ohlc / len(df), 0.5)  # Max 50% penalty
        
        # Check for negative prices
        negative_prices = (df[['Open', 'High', 'Low', 'Close']] < 0).any(axis=1).sum()
        if negative_prices > 0:
            issues.append(f"Negative prices detected: {negative_prices} rows")
            consistency_score -= min(negative_prices / len(df), 0.3)  # Max 30% penalty
        
        # Check for zero prices (may be valid for some tokens, but flag)
        zero_prices = (df[['Open', 'High', 'Low', 'Close']] == 0).any(axis=1).sum()
        if zero_prices > 0:
            issues.append(f"Zero prices detected: {zero_prices} rows")
            consistency_score -= min(zero_prices / len(df), 0.2)  # Max 20% penalty
    
    # Check volume consistency
    if 'Volume' in df.columns:
        negative_volume = (df['Volume'] < 0).sum()
        if negative_volume > 0:
            issues.append(f"Negative volume detected: {negative_volume} rows")
            consistency_score -= min(negative_volume / len(df), 0.2)  # Max 20% penalty
    
    # Check for unusual price movements (>50% in single day)
    if 'Close' in df.columns and len(df) > 1:
        price_changes = df['Close'].pct_change().abs()
        extreme_moves = (price_changes > 0.5).sum()
        if extreme_moves > 0:
            issues.append(f"Extreme price movements (>50%): {extreme_moves} days")
            # Don't penalize too much - these may be valid (e.g., flash crashes)
            consistency_score -= min(extreme_moves / len(df) * 0.1, 0.1)  # Max 10% penalty
    
    consistency_score = max(0.0, consistency_score)
    
    # 3. Freshness Score (10% weight)
    if len(df) > 0:
        last_date = df.index.max()
        if isinstance(last_date, pd.Timestamp):
            days_old = (datetime.now() - last_date.to_pydatetime()).days
            # Fresh if < 1 day old, decreasing score for older data
            freshness_score = max(0.0, 1.0 - (days_old / 7.0))  # 0 score if > 7 days old
        else:
            freshness_score = 0.5  # Unknown freshness
    else:
        freshness_score = 0.0
    
    # 4. Overall Quality Score
    quality_score = (
        completeness_score * 0.4 +
        consistency_score * 0.2 +
        freshness_score * 0.1 +
        # Accuracy score (30%) will be added by cross-validation
        0.3  # Placeholder, will be updated by cross_validate_sources
    )
    
    return {
        'completeness_score': completeness_score,
        'consistency_score': consistency_score,
        'freshness_score': freshness_score,
        'quality_score': quality_score,
        'issues': issues,
        'data_points': len(df),
        'date_range': {
            'start': df.index.min().strftime('%Y-%m-%d') if len(df) > 0 else None,
            'end': df.index.max().strftime('%Y-%m-%d') if len(df) > 0 else None,
        }
    }


def cross_validate_sources(
    source1_df: pd.DataFrame,
    source2_df: pd.DataFrame,
    source1_name: str = "Source1",
    source2_name: str = "Source2",
    tolerance: float = 0.01  # 1% tolerance for price differences
) -> Dict[str, float]:
    """
    Cross-validate data from two sources by comparing prices.
    
    Args:
        source1_df: DataFrame from first source
        source2_df: DataFrame from second source
        source1_name: Name of first source
        source2_name: Name of second source
        tolerance: Tolerance for price differences (default 1%)
        
    Returns:
        Dict with cross-validation metrics:
        - accuracy_score: Agreement score between sources (0-1)
        - discrepancies: Number of discrepancies found
        - avg_price_diff: Average price difference percentage
        - max_price_diff: Maximum price difference percentage
    """
    if source1_df.empty or source2_df.empty:
        return {
            'accuracy_score': 0.0,
            'discrepancies': 0,
            'avg_price_diff': 0.0,
            'max_price_diff': 0.0,
            'overlap_days': 0
        }
    
    # Find overlapping dates
    common_dates = source1_df.index.intersection(source2_df.index)
    
    if len(common_dates) == 0:
        logger.warning(f"No overlapping dates between {source1_name} and {source2_name}")
        return {
            'accuracy_score': 0.0,
            'discrepancies': 0,
            'avg_price_diff': 0.0,
            'max_price_diff': 0.0,
            'overlap_days': 0
        }
    
    # Compare Close prices (most reliable)
    if 'Close' not in source1_df.columns or 'Close' not in source2_df.columns:
        logger.warning("Close price column not found in one or both sources")
        return {
            'accuracy_score': 0.5,  # Unknown accuracy
            'discrepancies': 0,
            'avg_price_diff': 0.0,
            'max_price_diff': 0.0,
            'overlap_days': len(common_dates)
        }
    
    source1_prices = source1_df.loc[common_dates, 'Close']
    source2_prices = source2_df.loc[common_dates, 'Close']
    
    # Calculate price differences
    price_diffs = ((source1_prices - source2_prices) / source2_prices).abs()
    
    # Count discrepancies (> tolerance)
    discrepancies = (price_diffs > tolerance).sum()
    avg_price_diff = price_diffs.mean()
    max_price_diff = price_diffs.max()
    
    # Calculate accuracy score (higher = better agreement)
    # Perfect agreement = 1.0, decreases with discrepancies
    accuracy_score = max(0.0, 1.0 - (discrepancies / len(common_dates)))
    
    if discrepancies > 0:
        logger.warning(
            f"Found {discrepancies} discrepancies between {source1_name} and {source2_name} "
            f"(avg diff: {avg_price_diff*100:.2f}%, max diff: {max_price_diff*100:.2f}%)"
        )
    
    return {
        'accuracy_score': accuracy_score,
        'discrepancies': int(discrepancies),
        'avg_price_diff': float(avg_price_diff),
        'max_price_diff': float(max_price_diff),
        'overlap_days': len(common_dates)
    }


def calculate_quality_score(
    completeness_score: float,
    consistency_score: float,
    freshness_score: float,
    accuracy_score: float = 1.0
) -> float:
    """
    Calculate overall quality score from component scores.
    
    Args:
        completeness_score: Data completeness (0-1)
        consistency_score: Data consistency (0-1)
        freshness_score: Data freshness (0-1)
        accuracy_score: Cross-validation accuracy (0-1), default 1.0 if not validated
        
    Returns:
        Overall quality score (0-1)
    """
    return (
        completeness_score * 0.4 +
        accuracy_score * 0.3 +
        consistency_score * 0.2 +
        freshness_score * 0.1
    )


def detect_data_issues(df: pd.DataFrame) -> List[str]:
    """
    Detect and return list of data quality issues.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        List of issue descriptions
    """
    issues = []
    
    if df.empty:
        issues.append("Empty DataFrame")
        return issues
    
    # Check required columns
    required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
    missing_cols = [col for col in required_columns if col not in df.columns]
    if missing_cols:
        issues.append(f"Missing columns: {missing_cols}")
    
    # Check for missing values
    for col in required_columns:
        if col in df.columns:
            missing_count = df[col].isna().sum()
            if missing_count > 0:
                issues.append(f"Missing values in {col}: {missing_count} ({missing_count/len(df)*100:.1f}%)")
    
    # Check date gaps
    if len(df) > 1:
        df_sorted = df.sort_index()
        date_diffs = df_sorted.index.to_series().diff().dt.days
        large_gaps = date_diffs[date_diffs > 1]
        if len(large_gaps) > 0:
            issues.append(f"Date gaps: {len(large_gaps)} gaps, largest {large_gaps.max()} days")
    
    # Check OHLC relationships
    if all(col in df.columns for col in ['Open', 'High', 'Low', 'Close']):
        invalid = (
            (df['High'] < df['Low']) |
            (df['High'] < df['Open']) |
            (df['High'] < df['Close']) |
            (df['Low'] > df['Open']) |
            (df['Low'] > df['Close'])
        ).sum()
        if invalid > 0:
            issues.append(f"Invalid OHLC relationships: {invalid} rows")
        
        # Check for negative or zero prices
        negative = (df[['Open', 'High', 'Low', 'Close']] < 0).any(axis=1).sum()
        if negative > 0:
            issues.append(f"Negative prices: {negative} rows")
        
        zero = (df[['Open', 'High', 'Low', 'Close']] == 0).any(axis=1).sum()
        if zero > 0:
            issues.append(f"Zero prices: {zero} rows")
    
    # Check volume
    if 'Volume' in df.columns:
        negative_vol = (df['Volume'] < 0).sum()
        if negative_vol > 0:
            issues.append(f"Negative volume: {negative_vol} rows")
    
    return issues

