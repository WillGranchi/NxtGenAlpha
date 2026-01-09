"""
Fundamental/On-chain indicators module.

This module provides functions for fundamental indicators that require
external on-chain data sources. Uses Glassnode API for real data with
fallback to stub data if API is unavailable.

Recommended API: Glassnode (https://docs.glassnode.com/basic-api/endpoints/indicators)
Provides: MVRV, Bitcoin Thermocap, NUPL, CVDD, SOPR, Puell Multiple, Reserve Risk, etc.
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
        Pandas Series with MVRV values from Glassnode API (or stub data if API unavailable)
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
                logger.warning("Glassnode MVRV data has too many gaps, falling back to stub data")
        else:
            logger.warning("No MVRV data from Glassnode, falling back to stub data")
    except Exception as e:
        logger.warning(f"Error fetching MVRV from Glassnode: {e}. Using stub data.")
    
    # Fallback to stub data
    logger.warning("Using stub MVRV data - Glassnode API unavailable or no API key")
    n = len(dates)
    trend = np.sin(np.linspace(0, 4 * np.pi, n))
    noise = np.random.normal(0, 0.3, n)
    mvrv_values = 1.0 + trend * 0.5 + noise
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
        Pandas Series with NUPL values from Glassnode API (or stub data if API unavailable)
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
                logger.warning("Glassnode NUPL data has too many gaps, falling back to stub data")
        else:
            logger.warning("No NUPL data from Glassnode, falling back to stub data")
    except Exception as e:
        logger.warning(f"Error fetching NUPL from Glassnode: {e}. Using stub data.")
    
    # Fallback to stub data
    logger.warning("Using stub NUPL data - Glassnode API unavailable or no API key")
    n = len(dates)
    trend = np.sin(np.linspace(0, 3 * np.pi, n))
    noise = np.random.normal(0, 0.1, n)
    nupl_values = trend * 0.3 + noise
    nupl_values = np.clip(nupl_values, -0.5, 0.75)
    
    return pd.Series(nupl_values, index=dates, name='NUPL')


def calculate_bitcoin_thermocap(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Bitcoin Thermocap (Cumulative Miner Revenue).
    
    Bitcoin Thermocap is the cumulative sum of all miner revenue since genesis,
    representing the total value paid to miners over time. It's a long-term
    valuation indicator that helps identify cycle bottoms.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Bitcoin Thermocap values from Glassnode API (or stub data if API unavailable)
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
                logger.warning("Glassnode Thermocap data has too many gaps, falling back to stub data")
        else:
            logger.warning("No Thermocap data from Glassnode, falling back to stub data")
    except Exception as e:
        logger.warning(f"Error fetching Thermocap from Glassnode: {e}. Using stub data.")
    
    # Fallback to stub data
    logger.warning("Using stub Bitcoin Thermocap data - Glassnode API unavailable or no API key")
    n = len(dates)
    base_growth = np.linspace(1, 10, n)
    daily_values = base_growth * np.random.exponential(0.5, n)
    thermocap_values = np.cumsum(daily_values)
    thermocap_values = (thermocap_values - thermocap_values.min()) / (thermocap_values.max() - thermocap_values.min()) * 1000
    
    return pd.Series(thermocap_values, index=dates, name='Bitcoin_Thermocap')


def calculate_cvdd(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Cumulative Value Days Destroyed (CVDD).
    
    CVDD is a long-term valuation indicator that accumulates value-days
    destroyed over time, helping identify long-term cycle bottoms.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with CVDD values from Glassnode API (or stub data if API unavailable)
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
                logger.warning("Glassnode CVDD data has too many gaps, falling back to stub data")
        else:
            logger.warning("No CVDD data from Glassnode, falling back to stub data")
    except Exception as e:
        logger.warning(f"Error fetching CVDD from Glassnode: {e}. Using stub data.")
    
    # Fallback to stub data
    logger.warning("Using stub CVDD data - Glassnode API unavailable or no API key")
    n = len(dates)
    daily_values = np.random.exponential(0.1, n)
    cvdd_values = np.cumsum(daily_values)
    cvdd_values = (cvdd_values - cvdd_values.min()) / (cvdd_values.max() - cvdd_values.min()) * 100
    
    return pd.Series(cvdd_values, index=dates, name='CVDD')


def calculate_puell_multiple(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Puell Multiple.
    
    Puell Multiple is the ratio of daily coin issuance value (in USD) to the
    365-day moving average of daily coin issuance value. It's excellent for
    identifying cycle bottoms when values drop below 0.5.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Puell Multiple values from Glassnode API (or stub data if API unavailable)
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
                logger.warning("Glassnode Puell Multiple data has too many gaps, falling back to stub data")
        else:
            logger.warning("No Puell Multiple data from Glassnode, falling back to stub data")
    except Exception as e:
        logger.warning(f"Error fetching Puell Multiple from Glassnode: {e}. Using stub data.")
    
    # Fallback to stub data
    logger.warning("Using stub Puell Multiple data - Glassnode API unavailable or no API key")
    n = len(dates)
    trend = np.sin(np.linspace(0, 3 * np.pi, n))
    noise = np.random.normal(0, 0.2, n)
    puell_values = 1.0 + trend * 0.8 + noise
    puell_values = np.clip(puell_values, 0.3, 4.0)
    
    return pd.Series(puell_values, index=dates, name='Puell_Multiple')


def calculate_reserve_risk(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Reserve Risk.
    
    Reserve Risk is a long-term valuation indicator that measures price confidence
    relative to network security. Low values indicate good buying opportunities.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Reserve Risk values (stub - returns mock data)
        
    TODO: Replace with real Reserve Risk calculation from on-chain data.
    Recommended API: Glassnode (https://docs.glassnode.com/basic-api/endpoints/indicators)
    Endpoint: /v1/metrics/indicators/reserve_risk
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
                logger.warning("Glassnode Reserve Risk data has too many gaps, falling back to stub data")
        else:
            logger.warning("No Reserve Risk data from Glassnode, falling back to stub data")
    except Exception as e:
        logger.warning(f"Error fetching Reserve Risk from Glassnode: {e}. Using stub data.")
    
    # Fallback to stub data
    logger.warning("Using stub Reserve Risk data - Glassnode API unavailable or no API key")
    n = len(dates)
    trend = np.sin(np.linspace(0, 2.5 * np.pi, n))
    noise = np.random.normal(0, 0.01, n)
    reserve_risk_values = 0.02 + trend * 0.015 + noise
    reserve_risk_values = np.clip(reserve_risk_values, 0.001, 0.1)
    
    return pd.Series(reserve_risk_values, index=dates, name='Reserve_Risk')


def calculate_bitcoin_days_destroyed(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Bitcoin Days Destroyed (BDD).
    
    Bitcoin Days Destroyed measures the movement of old coins. High spikes
    indicate capitulation events, often marking cycle bottoms.
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Bitcoin Days Destroyed values from Glassnode API (or stub data if API unavailable)
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
                logger.warning("Glassnode BDD data has too many gaps, falling back to stub data")
        else:
            logger.warning("No BDD data from Glassnode, falling back to stub data")
    except Exception as e:
        logger.warning(f"Error fetching BDD from Glassnode: {e}. Using stub data.")
    
    # Fallback to stub data
    logger.warning("Using stub Bitcoin Days Destroyed data - Glassnode API unavailable or no API key")
    n = len(dates)
    base_level = np.random.exponential(1000000, n)
    spikes = np.random.choice([0, 1], size=n, p=[0.95, 0.05])
    spike_multiplier = 1 + spikes * np.random.uniform(2, 5, n)
    bdd_values = base_level * spike_multiplier
    
    return pd.Series(bdd_values, index=dates, name='Bitcoin_Days_Destroyed')


def calculate_exchange_net_position(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Exchange Net Position Change.
    
    Measures the net change in exchange balances. Negative values indicate
    accumulation (bullish), positive values indicate distribution (bearish).
    
    Args:
        df: DataFrame with OHLCV data and Date index
        
    Returns:
        Pandas Series with Exchange Net Position values (stub - returns mock data)
        
    TODO: Replace with real Exchange Net Position calculation from on-chain data.
    Recommended API: Glassnode or CryptoQuant
    Endpoint: Glassnode /v1/metrics/distribution/exchange_net_position_change
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
        logger.warning(f"Error fetching Exchange Net Position from Glassnode: {e}. Using stub data.")
    
    # Fallback to stub data
    logger.warning("Using stub Exchange Net Position data - Glassnode API unavailable or no API key")
    n = len(dates)
    trend = np.sin(np.linspace(0, 4 * np.pi, n))
    noise = np.random.normal(0, 500, n)
    exchange_net_values = trend * 2000 + noise
    
    return pd.Series(exchange_net_values, index=dates, name='Exchange_Net_Position')


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
    'bitcoin_thermocap': calculate_bitcoin_thermocap,
    'nupl': calculate_nupl,
    'cvdd': calculate_cvdd,
    'puell_multiple': calculate_puell_multiple,
    'reserve_risk': calculate_reserve_risk,
    'bitcoin_days_destroyed': calculate_bitcoin_days_destroyed,
    'exchange_net_position': calculate_exchange_net_position,
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
