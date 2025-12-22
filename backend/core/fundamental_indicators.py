"""
Fundamental/On-chain indicators module.

This module provides stub functions for fundamental indicators that require
external data sources. These functions return mock data for now and should be
replaced with real data sources in the future.

TODO: Connect to real data sources:
- MVRV: Market Value to Realized Value ratio (requires on-chain data)
- NUPL: Net Unrealized Profit/Loss (requires UTXO data)
- CVDD: Cumulative Value Days Destroyed (requires on-chain data)
- NVTS: Network Value to Transactions ratio (requires transaction volume data)
- SOPR: Spent Output Profit Ratio (requires UTXO data)
- Realized PnL Momentum: Requires on-chain profit/loss data
"""

import pandas as pd
import numpy as np
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def calculate_mvrv(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Market Value to Realized Value (MVRV) ratio.
    
    MVRV compares the market cap to the realized cap, indicating whether
    Bitcoin is overvalued or undervalued relative to its on-chain value.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with MVRV values (stub - returns mock data)
        
    TODO: Replace with real MVRV calculation from on-chain data sources
    """
    logger.warning("Using stub MVRV data - replace with real on-chain data source")
    
    # Generate mock MVRV values (typically ranges from 0.5 to 5.0)
    # Mock data oscillates around 1.0 with some volatility
    dates = df.index
    n = len(dates)
    
    # Create oscillating pattern with some randomness
    trend = np.sin(np.linspace(0, 4 * np.pi, n))
    noise = np.random.normal(0, 0.3, n)
    mvrv_values = 1.0 + trend * 0.5 + noise
    
    # Ensure values stay in reasonable range
    mvrv_values = np.clip(mvrv_values, 0.3, 4.0)
    
    return pd.Series(mvrv_values, index=dates, name='MVRV')


def calculate_nupl(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Net Unrealized Profit/Loss (NUPL).
    
    NUPL measures the difference between market cap and realized cap as a
    percentage of market cap, indicating overall market profit/loss.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with NUPL values (stub - returns mock data)
        
    TODO: Replace with real NUPL calculation from UTXO data
    """
    logger.warning("Using stub NUPL data - replace with real UTXO data source")
    
    dates = df.index
    n = len(dates)
    
    # NUPL typically ranges from -0.5 to 0.75
    trend = np.sin(np.linspace(0, 3 * np.pi, n))
    noise = np.random.normal(0, 0.1, n)
    nupl_values = trend * 0.3 + noise
    
    # Ensure values stay in reasonable range
    nupl_values = np.clip(nupl_values, -0.5, 0.75)
    
    return pd.Series(nupl_values, index=dates, name='NUPL')


def calculate_cvdd(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Cumulative Value Days Destroyed (CVDD).
    
    CVDD is a long-term valuation indicator that accumulates value-days
    destroyed over time, helping identify long-term cycle bottoms.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with CVDD values (stub - returns mock data)
        
    TODO: Replace with real CVDD calculation from on-chain data
    """
    logger.warning("Using stub CVDD data - replace with real on-chain data source")
    
    dates = df.index
    n = len(dates)
    
    # CVDD is cumulative, so it should generally trend upward
    # Generate cumulative sum with some variation
    daily_values = np.random.exponential(0.1, n)
    cvdd_values = np.cumsum(daily_values)
    
    # Normalize to reasonable range
    cvdd_values = (cvdd_values - cvdd_values.min()) / (cvdd_values.max() - cvdd_values.min()) * 100
    
    return pd.Series(cvdd_values, index=dates, name='CVDD')


def calculate_nvts(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Network Value to Transactions (NVTS) ratio.
    
    NVTS compares market cap to transaction volume, indicating whether
    Bitcoin is overvalued relative to its usage.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with NVTS values (stub - returns mock data)
        
    TODO: Replace with real NVTS calculation from transaction volume data
    """
    logger.warning("Using stub NVTS data - replace with real transaction volume data source")
    
    dates = df.index
    n = len(dates)
    
    # NVTS typically ranges from 10 to 200
    trend = np.sin(np.linspace(0, 2 * np.pi, n))
    noise = np.random.normal(0, 20, n)
    nvts_values = 50 + trend * 30 + noise
    
    # Ensure values stay in reasonable range
    nvts_values = np.clip(nvts_values, 10, 200)
    
    return pd.Series(nvts_values, index=dates, name='NVTS')


def calculate_sopr(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Spent Output Profit Ratio (SOPR).
    
    SOPR measures the profit ratio of spent outputs, indicating whether
    holders are selling at a profit or loss.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with SOPR values (stub - returns mock data)
        
    TODO: Replace with real SOPR calculation from UTXO data
    """
    logger.warning("Using stub SOPR data - replace with real UTXO data source")
    
    dates = df.index
    n = len(dates)
    
    # SOPR typically ranges from 0.8 to 1.2
    # Values > 1.0 indicate profit-taking, < 1.0 indicate loss-taking
    trend = np.sin(np.linspace(0, 4 * np.pi, n))
    noise = np.random.normal(0, 0.05, n)
    sopr_values = 1.0 + trend * 0.15 + noise
    
    # Ensure values stay in reasonable range
    sopr_values = np.clip(sopr_values, 0.8, 1.2)
    
    return pd.Series(sopr_values, index=dates, name='SOPR')


def calculate_realized_pnl_momentum(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Realized Profit/Loss Momentum.
    
    Measures the momentum of realized profits/losses, indicating trend
    changes in profit-taking behavior.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Realized PnL Momentum values (stub - returns mock data)
        
    TODO: Replace with real Realized PnL Momentum calculation from on-chain data
    """
    logger.warning("Using stub Realized PnL Momentum data - replace with real on-chain data source")
    
    dates = df.index
    n = len(dates)
    
    # Momentum can be positive or negative
    trend = np.sin(np.linspace(0, 5 * np.pi, n))
    noise = np.random.normal(0, 0.2, n)
    momentum_values = trend * 0.5 + noise
    
    # Clip to reasonable range
    momentum_values = np.clip(momentum_values, -2.0, 2.0)
    
    return pd.Series(momentum_values, index=dates, name='Realized_PnL_Momentum')


def calculate_pi_cycle_top_risk(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Pi-Cycle Top Risk indicator.
    
    A long-term indicator that uses moving averages to identify potential
    cycle tops based on the mathematical constant Pi.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Pi-Cycle Top Risk values (stub - returns mock data)
        
    TODO: Replace with real Pi-Cycle Top Risk calculation
    """
    logger.warning("Using stub Pi-Cycle Top Risk data - replace with real calculation")
    
    dates = df.index
    n = len(dates)
    
    # Pi-Cycle Top Risk typically ranges from -2 to 2
    trend = np.sin(np.linspace(0, 2 * np.pi, n))
    noise = np.random.normal(0, 0.3, n)
    risk_values = trend * 1.0 + noise
    
    # Clip to reasonable range
    risk_values = np.clip(risk_values, -2.0, 2.0)
    
    return pd.Series(risk_values, index=dates, name='Pi_Cycle_Top_Risk')


# Mapping of indicator IDs to calculation functions
FUNDAMENTAL_INDICATORS = {
    'mvrv': calculate_mvrv,
    'nupl': calculate_nupl,
    'cvdd': calculate_cvdd,
    'nvts': calculate_nvts,
    'sopr': calculate_sopr,
    'realized_pnl_momentum': calculate_realized_pnl_momentum,
    'pi_cycle_top_risk': calculate_pi_cycle_top_risk,
}


def get_fundamental_indicator(df: pd.DataFrame, indicator_id: str) -> pd.Series:
    """
    Get a fundamental indicator by ID.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        indicator_id: Indicator identifier (e.g., 'mvrv', 'nupl')
        
    Returns:
        Pandas Series with indicator values
        
    Raises:
        ValueError: If indicator_id is not found
    """
    if indicator_id not in FUNDAMENTAL_INDICATORS:
        raise ValueError(f"Unknown fundamental indicator: {indicator_id}")
    
    return FUNDAMENTAL_INDICATORS[indicator_id](df)
