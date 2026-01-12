"""
Fundamental/On-chain indicators module.

This module provides functions for fundamental indicators that require
external on-chain data sources. All indicators require Glassnode API key.
No mock data fallbacks - indicators will raise errors if API unavailable.

Required API: Glassnode (https://docs.glassnode.com/basic-api/endpoints/indicators)
Provides: MVRV, Bitcoin Thermocap, NUPL, CVDD, SOPR, Puell Multiple, Reserve Risk, etc.

Set GLASSNODE_API_KEY environment variable to use these indicators.
"""

import pandas as pd
import numpy as np
from typing import Optional
import logging
from datetime import datetime

from .glassnode_client import get_glassnode_client

logger = logging.getLogger(__name__)


def calculate_mvrv(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Market Value to Realized Value (MVRV) ratio.
    
    MVRV compares the market cap to the realized cap, indicating whether
    Bitcoin is overvalued or undervalued relative to its on-chain value.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with MVRV values from Glassnode API
        
    Raises:
        ValueError: If Glassnode API is unavailable or API key is missing
    """
    dates = df.index
    start_date = dates.min()
    end_date = dates.max()
    
    # Try to fetch from Glassnode
    try:
        client = get_glassnode_client()
        mvrv_data = client.get_mvrv("BTC", start_date, end_date, use_cache=True)
        
        if len(mvrv_data) > 0:
            # Align with DataFrame index
            aligned = mvrv_data.reindex(dates, method='ffill')
            aligned = aligned.bfill()
            
            # Validate data
            if aligned.notna().sum() > len(dates) * 0.5:  # At least 50% valid data
                logger.info(f"Using real MVRV data from Glassnode: {len(mvrv_data)} data points")
                return aligned.fillna(1.0)  # Fill remaining NaN with neutral value
            else:
                raise ValueError("Glassnode MVRV data has too many gaps")
        else:
            raise ValueError("No MVRV data from Glassnode")
    except ValueError:
        raise
    except Exception as e:
        # No fallback - require Glassnode API
        logger.error(f"Error fetching MVRV from Glassnode: {e}")
        raise ValueError(f"MVRV requires Glassnode API key. Set GLASSNODE_API_KEY environment variable. Error: {e}")


def calculate_nupl(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Net Unrealized Profit/Loss (NUPL).
    
    NUPL measures the difference between market cap and realized cap as a
    percentage of market cap, indicating overall market profit/loss.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with NUPL values from Glassnode API
        
    Raises:
        ValueError: If Glassnode API is unavailable or API key is missing
    """
    dates = df.index
    start_date = dates.min()
    end_date = dates.max()
    
    # Try to fetch from Glassnode
    try:
        client = get_glassnode_client()
        nupl_data = client.get_nupl("BTC", start_date, end_date, use_cache=True)
        
        if len(nupl_data) > 0:
            # Align with DataFrame index
            aligned = nupl_data.reindex(dates, method='ffill')
            aligned = aligned.bfill()
            
            # Validate data
            if aligned.notna().sum() > len(dates) * 0.5:
                logger.info(f"Using real NUPL data from Glassnode: {len(nupl_data)} data points")
                return aligned.fillna(0.0)
            else:
                raise ValueError("Glassnode NUPL data has too many gaps. Data quality insufficient.")
        else:
            raise ValueError("No NUPL data returned from Glassnode API.")
    except Exception as e:
        # No fallback - require Glassnode API
        logger.error(f"Error fetching NUPL from Glassnode: {e}")
        raise ValueError(f"NUPL requires Glassnode API key. Set GLASSNODE_API_KEY environment variable. Error: {e}")


def calculate_bitcoin_thermocap(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Bitcoin Thermocap (Cumulative Miner Revenue).
    
    Bitcoin Thermocap is the cumulative sum of all miner revenue since genesis,
    representing the total value paid to miners over time. It's a long-term
    valuation indicator that helps identify cycle bottoms.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Bitcoin Thermocap values from Glassnode API
        
    Raises:
        ValueError: If Glassnode API is unavailable or API key is missing
    """
    dates = df.index
    start_date = dates.min()
    end_date = dates.max()
    
    # Try to fetch from Glassnode
    try:
        client = get_glassnode_client()
        thermocap_data = client.get_thermocap("BTC", start_date, end_date, use_cache=True)
        
        if len(thermocap_data) > 0:
            # Align with DataFrame index
            aligned = thermocap_data.reindex(dates, method='ffill')
            aligned = aligned.bfill()
            
            # Validate data
            if aligned.notna().sum() > len(dates) * 0.5:
                logger.info(f"Using real Bitcoin Thermocap data from Glassnode: {len(thermocap_data)} data points")
                return aligned.fillna(0.0)
            else:
                raise ValueError("Glassnode Bitcoin Thermocap data has too many gaps. Data quality insufficient.")
        else:
            raise ValueError("No Bitcoin Thermocap data returned from Glassnode API.")
    except Exception as e:
        # No fallback - require Glassnode API
        logger.error(f"Error fetching Bitcoin Thermocap from Glassnode: {e}")
        raise ValueError(f"Bitcoin Thermocap requires Glassnode API key. Set GLASSNODE_API_KEY environment variable. Error: {e}")


def calculate_cvdd(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Cumulative Value Days Destroyed (CVDD).
    
    CVDD is a long-term valuation indicator that accumulates value-days
    destroyed over time, helping identify long-term cycle bottoms.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with CVDD values from Glassnode API
        
    Raises:
        ValueError: If Glassnode API is unavailable or API key is missing
    """
    dates = df.index
    start_date = dates.min()
    end_date = dates.max()
    
    # Try to fetch from Glassnode
    try:
        client = get_glassnode_client()
        cvdd_data = client.get_cvdd("BTC", start_date, end_date, use_cache=True)
        
        if len(cvdd_data) > 0:
            # Align with DataFrame index
            aligned = cvdd_data.reindex(dates, method='ffill')
            aligned = aligned.bfill()
            
            # Validate data
            if aligned.notna().sum() > len(dates) * 0.5:
                logger.info(f"Using real CVDD data from Glassnode: {len(cvdd_data)} data points")
                return aligned.fillna(0.0)
            else:
                raise ValueError("Glassnode CVDD data has too many gaps. Data quality insufficient.")
        else:
            raise ValueError("No CVDD data returned from Glassnode API.")
    except Exception as e:
        # No fallback - require Glassnode API
        logger.error(f"Error fetching CVDD from Glassnode: {e}")
        raise ValueError(f"CVDD requires Glassnode API key. Set GLASSNODE_API_KEY environment variable. Error: {e}")


def calculate_puell_multiple(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Puell Multiple.
    
    Puell Multiple is the ratio of daily coin issuance value (in USD) to the
    365-day moving average of daily coin issuance value. It's excellent for
    identifying cycle bottoms when values drop below 0.5.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Puell Multiple values from Glassnode API
        
    Raises:
        ValueError: If Glassnode API is unavailable or API key is missing
    """
    dates = df.index
    start_date = dates.min()
    end_date = dates.max()
    
    # Try to fetch from Glassnode
    try:
        client = get_glassnode_client()
        puell_data = client.get_puell_multiple("BTC", start_date, end_date, use_cache=True)
        
        if len(puell_data) > 0:
            # Align with DataFrame index
            aligned = puell_data.reindex(dates, method='ffill')
            aligned = aligned.bfill()
            
            # Validate data
            if aligned.notna().sum() > len(dates) * 0.5:
                logger.info(f"Using real Puell Multiple data from Glassnode: {len(puell_data)} data points")
                return aligned.fillna(1.0)
            else:
                raise ValueError("Glassnode Puell Multiple data has too many gaps. Data quality insufficient.")
        else:
            raise ValueError("No Puell Multiple data returned from Glassnode API.")
    except Exception as e:
        # No fallback - require Glassnode API
        logger.error(f"Error fetching Puell Multiple from Glassnode: {e}")
        raise ValueError(f"Puell Multiple requires Glassnode API key. Set GLASSNODE_API_KEY environment variable. Error: {e}")


def calculate_reserve_risk(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Reserve Risk.
    
    Reserve Risk is a long-term valuation indicator that measures price confidence
    relative to network security. Low values indicate good buying opportunities.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Reserve Risk values from Glassnode API
        
    Raises:
        ValueError: If Glassnode API is unavailable or API key is missing
    """
    dates = df.index
    start_date = dates.min()
    end_date = dates.max()
    
    # Try to fetch from Glassnode
    try:
        client = get_glassnode_client()
        reserve_risk_data = client.get_reserve_risk("BTC", start_date, end_date, use_cache=True)
        
        if len(reserve_risk_data) > 0:
            # Align with DataFrame index
            aligned = reserve_risk_data.reindex(dates, method='ffill')
            aligned = aligned.bfill()
            
            # Validate data
            if aligned.notna().sum() > len(dates) * 0.5:
                logger.info(f"Using real Reserve Risk data from Glassnode: {len(reserve_risk_data)} data points")
                return aligned.fillna(0.02)
            else:
                raise ValueError("Glassnode Reserve Risk data has too many gaps. Data quality insufficient.")
        else:
            raise ValueError("No Reserve Risk data returned from Glassnode API.")
    except Exception as e:
        # No fallback - require Glassnode API
        logger.error(f"Error fetching Reserve Risk from Glassnode: {e}")
        raise ValueError(f"Reserve Risk requires Glassnode API key. Set GLASSNODE_API_KEY environment variable. Error: {e}")


def calculate_bitcoin_days_destroyed(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Bitcoin Days Destroyed (BDD).
    
    Bitcoin Days Destroyed measures the movement of old coins. High spikes
    indicate capitulation events, often marking cycle bottoms.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Bitcoin Days Destroyed values from Glassnode API
        
    Raises:
        ValueError: If Glassnode API is unavailable or API key is missing
    """
    dates = df.index
    start_date = dates.min()
    end_date = dates.max()
    
    # Try to fetch from Glassnode
    try:
        client = get_glassnode_client()
        bdd_data = client.get_days_destroyed("BTC", start_date, end_date, use_cache=True)
        
        if len(bdd_data) > 0:
            # Align with DataFrame index
            aligned = bdd_data.reindex(dates, method='ffill')
            aligned = aligned.bfill()
            
            # Validate data
            if aligned.notna().sum() > len(dates) * 0.5:
                logger.info(f"Using real Bitcoin Days Destroyed data from Glassnode: {len(bdd_data)} data points")
                return aligned.fillna(0.0)
            else:
                raise ValueError("Glassnode Bitcoin Days Destroyed data has too many gaps. Data quality insufficient.")
        else:
            raise ValueError("No Bitcoin Days Destroyed data returned from Glassnode API.")
    except Exception as e:
        # No fallback - require Glassnode API
        logger.error(f"Error fetching Bitcoin Days Destroyed from Glassnode: {e}")
        raise ValueError(f"Bitcoin Days Destroyed requires Glassnode API key. Set GLASSNODE_API_KEY environment variable. Error: {e}")


def calculate_exchange_net_position(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Exchange Net Position Change.
    
    Measures the net change in exchange balances. Negative values indicate
    accumulation (bullish), positive values indicate distribution (bearish).
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Exchange Net Position values from Glassnode API
        
    Raises:
        ValueError: If Glassnode API is unavailable or API key is missing
    """
    dates = df.index
    start_date = dates.min()
    end_date = dates.max()
    
    # Try to fetch from Glassnode
    try:
        client = get_glassnode_client()
        exchange_data = client.get_exchange_netflows("BTC", start_date, end_date, use_cache=True)
        
        if len(exchange_data) > 0:
            # Align with DataFrame index
            aligned = exchange_data.reindex(dates, method='ffill')
            aligned = aligned.bfill()
            
            # Validate data
            if aligned.notna().sum() > len(dates) * 0.5:
                logger.info(f"Using real Exchange Net Position data from Glassnode: {len(exchange_data)} data points")
                return aligned.fillna(0.0)
            else:
                logger.warning("Glassnode Exchange Net Position data has too many gaps, falling back to stub data")
        else:
            logger.warning("No Exchange Net Position data from Glassnode, falling back to stub data")
    except Exception as e:
        # No fallback - require Glassnode API
        logger.error(f"Error fetching Exchange Net Position from Glassnode: {e}")
        raise ValueError(f"Exchange Net Position requires Glassnode API key. Set GLASSNODE_API_KEY environment variable. Error: {e}")


def calculate_sopr(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Spent Output Profit Ratio (SOPR).
    
    SOPR measures the profit ratio of spent outputs, indicating whether
    holders are selling at a profit or loss.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with SOPR values from Glassnode API (or raises error if API unavailable)
    """
    dates = df.index
    start_date = dates.min()
    end_date = dates.max()
    
    # Fetch from Glassnode
    try:
        client = get_glassnode_client()
        sopr_data = client.get_sopr("BTC", start_date, end_date, use_cache=True)
        
        if len(sopr_data) > 0:
            # Align with DataFrame index
            aligned = sopr_data.reindex(dates, method='ffill')
            aligned = aligned.bfill()
            
            # Validate data
            if aligned.notna().sum() > len(dates) * 0.5:
                logger.info(f"Using real SOPR data from Glassnode: {len(sopr_data)} data points")
                return aligned.fillna(1.0)  # Neutral value
            else:
                raise ValueError("Glassnode SOPR data has too many gaps")
        else:
            raise ValueError("No SOPR data from Glassnode")
    except Exception as e:
        logger.error(f"Error fetching SOPR from Glassnode: {e}")
        raise ValueError(f"SOPR requires Glassnode API key. Set GLASSNODE_API_KEY environment variable. Error: {e}")


# Mapping of indicator IDs to calculation functions
# All indicators require Glassnode API key - no mock data fallbacks
FUNDAMENTAL_INDICATORS = {
    'mvrv': calculate_mvrv,
    'bitcoin_thermocap': calculate_bitcoin_thermocap,
    'nupl': calculate_nupl,
    'cvdd': calculate_cvdd,
    'puell_multiple': calculate_puell_multiple,
    'reserve_risk': calculate_reserve_risk,
    'bitcoin_days_destroyed': calculate_bitcoin_days_destroyed,
    'exchange_net_position': calculate_exchange_net_position,
    'sopr': calculate_sopr,
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
