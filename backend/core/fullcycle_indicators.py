"""
Full Cycle indicators module.

This module provides calculations for Full Cycle BTC indicators based on PineScript formulas.
Uses "subjective mean" and "subjective scale" parameters for normalization (not standard z-score).
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional
import logging
from .indicators import (
    sma, ema, wma, dema, percentile_nearest_rank, rsi as calc_rsi, cci as calc_cci,
    stdev, zscore, vwma, calculate_rapr_ratios
)
from .fundamental_indicators import (
    calculate_mvrv, calculate_nupl, calculate_sopr
)

logger = logging.getLogger(__name__)


def calculate_mvrv_zscore(df: pd.DataFrame, mvrvlen: int = 19, mvrvmn: float = -0.8, mvrvscl: float = 2.1) -> pd.Series:
    """
    Calculate MVRV z-score: (log2(MVRV_DATA) + mvrvmn) * mvrvscl, then SMA smoothing.
    
    Args:
        df: DataFrame with OHLCV data
        mvrvlen: Smoothing length (default: 19)
        mvrvmn: Subjective mean (default: -0.8)
        mvrvscl: Subjective scale (default: 2.1)
        
    Returns:
        Pandas Series with MVRV z-score values
    """
    mvrv_data = calculate_mvrv(df)
    mvrv_log = np.log2(mvrv_data.clip(lower=0.1))  # Avoid log(0)
    mvrv_normalized = (mvrv_log + mvrvmn) * mvrvscl
    mvrv_smoothed = sma(mvrv_normalized, mvrvlen)
    return mvrv_smoothed.fillna(0)


def calculate_nupl_zscore(df: pd.DataFrame, nuplma: int = 41, nuplmn: float = -25, nuplscl: float = 20) -> pd.Series:
    """
    Calculate NUPL z-score: ((MC1 - MCR) / MC1 * 100 + nuplmn) / nuplscl, then EMA.
    
    Args:
        df: DataFrame with OHLCV data
        nuplma: EMA smoothing length (default: 41)
        nuplmn: Subjective mean (default: -25)
        nuplscl: Subjective scale (default: 20)
        
    Returns:
        Pandas Series with NUPL z-score values
    """
    nupl_data = calculate_nupl(df) * 100  # Convert to percentage
    nupl_normalized = (nupl_data + nuplmn) / nuplscl
    nupl_smoothed = ema(nupl_normalized, nuplma)
    return nupl_smoothed.fillna(0)


def calculate_sopr_zscore(df: pd.DataFrame, soprmalen: int = 100, soprmn: float = -1.004, soprscl: float = 167) -> pd.Series:
    """
    Calculate SOPR z-score: (percentile_nearest_rank(SOPR_DATA, soprmalen, 50) + soprmn) * soprscl.
    
    Args:
        df: DataFrame with OHLCV data
        soprmalen: Percentile rank length (default: 100)
        soprmn: Subjective mean (default: -1.004)
        soprscl: Subjective scale (default: 167)
        
    Returns:
        Pandas Series with SOPR z-score values
    """
    sopr_data = calculate_sopr(df)
    sopr_percentile = percentile_nearest_rank(sopr_data, soprmalen, 50)
    sopr_normalized = (sopr_percentile + soprmn) * soprscl
    return sopr_normalized.fillna(0)


def calculate_rsi_zscore(df: pd.DataFrame, rsilen: int = 400, rsimn: float = -53, rsiscl: float = 4.5) -> pd.Series:
    """
    Calculate RSI z-score: (pine_rsi(close, rsilen) + rsimn) / rsiscl.
    
    Args:
        df: DataFrame with OHLCV data
        rsilen: RSI length (default: 400)
        rsimn: Subjective mean (default: -53)
        rsiscl: Subjective scale (default: 4.5)
        
    Returns:
        Pandas Series with RSI z-score values
    """
    rsi_values = calc_rsi(df['Close'], rsilen)
    rsi_normalized = (rsi_values + rsimn) / rsiscl
    return rsi_normalized.fillna(0)


def calculate_cci_zscore(df: pd.DataFrame, ccilen: int = 500, ccilmn: float = -1.1, cciscl: float = 150) -> pd.Series:
    """
    Calculate CCI z-score: ((close - ma) / (0.015 * dev(close, ccilen)) / cciscl) + ccilmn.
    
    Args:
        df: DataFrame with OHLCV data
        ccilen: CCI length (default: 500)
        ccilmn: Subjective mean (default: -1.1)
        cciscl: Subjective scale (default: 150)
        
    Returns:
        Pandas Series with CCI z-score values
    """
    cci_values = calc_cci(df['High'], df['Low'], df['Close'], ccilen)
    cci_normalized = (cci_values / cciscl) + ccilmn
    return cci_normalized.fillna(0)


def calculate_multiple_ma_zscore(df: pd.DataFrame, malen: int = 500, mamn: float = 0, mascl: float = 3) -> pd.Series:
    """
    Calculate Multiple Normalized MA z-score: Average of 5 normalized MAs.
    Formula: (nsma + nema + nwma + nmed + ndema) / 5 * mascl + mamn
    Where each normalized MA = -1 * ma(close, malen) / close + 1
    
    Args:
        df: DataFrame with OHLCV data
        malen: MA length (default: 500)
        mamn: Subjective mean (default: 0)
        mascl: Subjective scale (default: 3)
        
    Returns:
        Pandas Series with Multiple MA z-score values
    """
    close = df['Close']
    
    # Calculate normalized MAs
    nsma = -1 * sma(close, malen) / close + 1
    nema = -1 * ema(close, malen) / close + 1
    nwma = -1 * wma(close, malen) / close + 1
    nmed = -1 * percentile_nearest_rank(close, malen, 50) / close + 1
    ndema = -1 * dema(close, malen) / close + 1
    
    # Average and normalize
    nma = (nsma + nema + nwma + nmed + ndema) / 5 * mascl + mamn
    return nma.fillna(0)


def calculate_sharpe_zscore(df: pd.DataFrame, srplen: int = 400, srpmn: float = -1, srpscl: float = 1.1) -> pd.Series:
    """
    Calculate Sharpe ratio z-score using ratios calculation.
    
    Args:
        df: DataFrame with OHLCV data
        srplen: Sharpe ratio length (default: 400)
        srpmn: Subjective mean (default: -1)
        srpscl: Subjective scale (default: 1.1)
        
    Returns:
        Pandas Series with Sharpe z-score values
    """
    close = df['Close']
    ratios = calculate_rapr_ratios(close, srplen)
    sharpe_ratio = ratios['srp']
    sharpe_normalized = sharpe_ratio * srpscl + srpmn
    return sharpe_normalized.fillna(0)


def calculate_pi_cycle_zscore(df: pd.DataFrame, long_len: int = 350, short_len: int = 88, pimn: float = -0.6, piscl: float = 3.5) -> pd.Series:
    """
    Calculate Pi Cycle z-score: log(s_ma / l_ma) * piscl + pimn.
    
    Args:
        df: DataFrame with OHLCV data
        long_len: Long MA length (default: 350)
        short_len: Short MA length (default: 88)
        pimn: Subjective mean (default: -0.6)
        piscl: Subjective scale (default: 3.5)
        
    Returns:
        Pandas Series with Pi Cycle z-score values
    """
    close = df['Close']
    s_ma = sma(close, short_len)
    l_ma = sma(close, long_len)
    
    # Avoid log(0) or division by zero
    ratio = s_ma / l_ma.replace(0, np.nan)
    ratio = ratio.clip(lower=0.01)  # Avoid log of very small numbers
    pic = np.log(ratio) * piscl + pimn
    return pic.fillna(0)


def calculate_nhpf_zscore(df: pd.DataFrame, lambda_param: int = 300, hpmn: float = -0.4, hpscl: float = 3) -> pd.Series:
    """
    Calculate Normalized Hodrick-Prescott Filter z-score.
    Formula: (-1 * hp_filter(close, lambda) / close + 1) * hpscl + hpmn
    
    Args:
        df: DataFrame with OHLCV data
        lambda_param: HP filter lambda parameter (default: 300)
        hpmn: Subjective mean (default: -0.4)
        hpscl: Subjective scale (default: 3)
        
    Returns:
        Pandas Series with NHPF z-score values
    """
    close = df['Close']
    
    # Simplified HP filter using EMA approximation
    # Real HP filter requires solving a system of equations
    hpsma = sma(close, 100)
    alpha = 1 / (1 + 2 * lambda_param)
    
    # Recursive trend estimation (simplified HP filter)
    trend = pd.Series(0.0, index=close.index)
    trend.iloc[0] = hpsma.iloc[0] if not pd.isna(hpsma.iloc[0]) else close.iloc[0]
    
    for i in range(1, len(close)):
        if pd.isna(trend.iloc[i-1]):
            trend.iloc[i] = hpsma.iloc[i] if not pd.isna(hpsma.iloc[i]) else close.iloc[i]
        else:
            trend.iloc[i] = alpha * close.iloc[i] + (1 - alpha) * trend.iloc[i-1]
    
    # Normalize
    nhpf = (-1 * trend / close + 1) * hpscl + hpmn
    return nhpf.fillna(0)


def calculate_vwap_zscore(df: pd.DataFrame, vwaplen: int = 150, zlen: int = 300) -> pd.Series:
    """
    Calculate VWAP z-score: ((vwapma - mean) / stdev(vwapma, zlen) - 0.6) / 1.2.
    
    Args:
        df: DataFrame with OHLCV data
        vwaplen: VWAP MA length (default: 150)
        zlen: Z-score length (default: 300)
        
    Returns:
        Pandas Series with VWAP z-score values
    """
    # Calculate VWAP (daily reset)
    hl2 = (df['High'] + df['Low']) / 2
    volume = df['Volume']
    
    # Calculate cumulative VWAP per day (simplified - assumes daily data)
    vwap = vwma(hl2, volume, vwaplen)
    
    # Calculate VWAP MA
    vwapma = sma(vwap, vwaplen)
    
    # Calculate z-score
    mean = sma(vwapma, zlen)
    std = stdev(vwapma, zlen)
    
    z_score = pd.Series(0.0, index=df.index)
    mask = std > 0
    z_score[mask] = ((vwapma[mask] - mean[mask]) / std[mask] - 0.6) / 1.2
    
    return z_score.fillna(0)


# Mapping of indicator IDs to calculation functions
FULL_CYCLE_INDICATORS = {
    'mvrv': {
        'name': 'MVRV',
        'category': 'fundamental',
        'function': calculate_mvrv_zscore,
        'default_params': {'mvrvlen': 19, 'mvrvmn': -0.8, 'mvrvscl': 2.1}
    },
    'nupl': {
        'name': 'NUPL',
        'category': 'fundamental',
        'function': calculate_nupl_zscore,
        'default_params': {'nuplma': 41, 'nuplmn': -25, 'nuplscl': 20}
    },
    'sopr': {
        'name': 'SOPR',
        'category': 'fundamental',
        'function': calculate_sopr_zscore,
        'default_params': {'soprmalen': 100, 'soprmn': -1.004, 'soprscl': 167}
    },
    'rsi': {
        'name': 'RSI',
        'category': 'technical',
        'function': calculate_rsi_zscore,
        'default_params': {'rsilen': 400, 'rsimn': -53, 'rsiscl': 4.5}
    },
    'cci': {
        'name': 'CCI',
        'category': 'technical',
        'function': calculate_cci_zscore,
        'default_params': {'ccilen': 500, 'ccilmn': -1.1, 'cciscl': 150}
    },
    'multiple_ma': {
        'name': 'Multiple Normalized MA',
        'category': 'technical',
        'function': calculate_multiple_ma_zscore,
        'default_params': {'malen': 500, 'mamn': 0, 'mascl': 3}
    },
    'sharpe': {
        'name': 'Sharpe',
        'category': 'technical',
        'function': calculate_sharpe_zscore,
        'default_params': {'srplen': 400, 'srpmn': -1, 'srpscl': 1.1}
    },
    'pi_cycle': {
        'name': 'Pi Cycle',
        'category': 'technical',
        'function': calculate_pi_cycle_zscore,
        'default_params': {'long_len': 350, 'short_len': 88, 'pimn': -0.6, 'piscl': 3.5}
    },
    'nhpf': {
        'name': 'NHPF',
        'category': 'technical',
        'function': calculate_nhpf_zscore,
        'default_params': {'lambda_param': 300, 'hpmn': -0.4, 'hpscl': 3}
    },
    'vwap': {
        'name': 'VWAP',
        'category': 'technical',
        'function': calculate_vwap_zscore,
        'default_params': {'vwaplen': 150, 'zlen': 300}
    },
}


def get_fullcycle_indicator(df: pd.DataFrame, indicator_id: str, params: Optional[Dict] = None) -> pd.Series:
    """
    Get a full cycle indicator by ID.
    
    Args:
        df: DataFrame with OHLCV data
        indicator_id: Indicator identifier (e.g., 'mvrv', 'rsi')
        params: Optional parameters dict (uses defaults if not provided)
        
    Returns:
        Pandas Series with indicator z-score values
        
    Raises:
        ValueError: If indicator_id is not found
    """
    if indicator_id not in FULL_CYCLE_INDICATORS:
        raise ValueError(f"Unknown full cycle indicator: {indicator_id}")
    
    indicator_info = FULL_CYCLE_INDICATORS[indicator_id]
    default_params = indicator_info['default_params'].copy()
    
    if params:
        default_params.update(params)
    
    return indicator_info['function'](df, **default_params)

