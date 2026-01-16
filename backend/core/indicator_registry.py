"""
Indicator Registry for Modular Strategy Builder.

This module provides a registry of available technical indicators with their
metadata, parameters, and condition generation functions.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)
from .indicators import (
    sma, ema, rsi, bollinger_bands, macd, stochastic, williams_r, atr, cci, momentum,
    adx, parabolic_sar, ichimoku_cloud, obv, volume_sma, keltner_channels
)
from .pinescript_indicators import (
    rsi_trail_signal, lwst_signal, ssd_signal, vtsp_signal, dema_dmi_signal,
    ewma_signal, ema_zscore_signal, dst_signal, msd_signal, dema_efi_signal,
    hsp_signal, dema_afr_signal, rsi_sd_signal, inverted_sd_dema_rsi_signal,
    kvo_signal, stc_signal, eri_signal, cmo_signal, fisher_transform_signal,
    bb_percent_signal, tsi_signal, disparity_index_signal,
    chande_momentum_oscillator_signal, rapr_1_signal, rapr_2_signal
)


class IndicatorMetadata:
    """Metadata for a technical indicator."""
    
    def __init__(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Dict[str, Any]],
        conditions: Dict[str, str],
        compute_fn: Callable,
        evaluate_conditions_fn: Callable,
        category: str = "Other"
    ):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.conditions = conditions
        self.compute_fn = compute_fn
        self.evaluate_conditions_fn = evaluate_conditions_fn
        self.category = category  # Momentum, Trend, Volatility, Other


def compute_rsi_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute RSI indicator and add to DataFrame."""
    period = params.get('period', 14)
    rsi_values = rsi(df['Close'], period)
    df[f'RSI_{period}'] = rsi_values
    return df


def evaluate_rsi_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate RSI conditions and return boolean series."""
    period = params.get('period', 14)
    oversold = params.get('oversold', 30)
    overbought = params.get('overbought', 70)
    
    rsi_col = f'RSI_{period}'
    if rsi_col not in df.columns:
        df = compute_rsi_indicator(df, params)
    
    return {
        'rsi_oversold': df[rsi_col] < oversold,
        'rsi_overbought': df[rsi_col] > overbought,
        'rsi_cross_above_oversold': (df[rsi_col] > oversold) & (df[rsi_col].shift(1) <= oversold),
        'rsi_cross_below_overbought': (df[rsi_col] < overbought) & (df[rsi_col].shift(1) >= overbought)
    }


def compute_macd_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute MACD indicator and add to DataFrame."""
    fast = params.get('fast', 12)
    slow = params.get('slow', 26)
    signal = params.get('signal', 9)
    
    macd_line, signal_line, histogram = macd(df['Close'], fast, slow, signal)
    df[f'MACD_{fast}_{slow}'] = macd_line
    df[f'MACD_Signal_{signal}'] = signal_line
    df[f'MACD_Histogram_{fast}_{slow}_{signal}'] = histogram
    return df


def evaluate_macd_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate MACD conditions and return boolean series."""
    fast = params.get('fast', 12)
    slow = params.get('slow', 26)
    signal = params.get('signal', 9)
    
    macd_col = f'MACD_{fast}_{slow}'
    signal_col = f'MACD_Signal_{signal}'
    
    if macd_col not in df.columns:
        df = compute_macd_indicator(df, params)
    
    return {
        'macd_cross_up': (df[macd_col] > df[signal_col]) & (df[macd_col].shift(1) <= df[signal_col].shift(1)),
        'macd_cross_down': (df[macd_col] < df[signal_col]) & (df[macd_col].shift(1) >= df[signal_col].shift(1)),
        'macd_above_signal': df[macd_col] > df[signal_col],
        'macd_below_signal': df[macd_col] < df[signal_col],
        'macd_above_zero': df[macd_col] > 0,
        'macd_below_zero': df[macd_col] < 0
    }


def compute_sma_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute SMA indicator and add to DataFrame."""
    period = params.get('period', 20)
    sma_values = sma(df['Close'], period)
    df[f'SMA_{period}'] = sma_values
    return df


def evaluate_sma_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate SMA conditions and return boolean series."""
    period = params.get('period', 20)
    sma_col = f'SMA_{period}'
    
    if sma_col not in df.columns:
        df = compute_sma_indicator(df, params)
    
    return {
        'sma_price_above': df['Close'] > df[sma_col],
        'sma_price_below': df['Close'] < df[sma_col],
        'sma_price_cross_above': (df['Close'] > df[sma_col]) & (df['Close'].shift(1) <= df[sma_col].shift(1)),
        'sma_price_cross_below': (df['Close'] < df[sma_col]) & (df['Close'].shift(1) >= df[sma_col].shift(1))
    }


def compute_ema_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute EMA indicator and add to DataFrame."""
    period = params.get('period', 20)
    ema_values = ema(df['Close'], period)
    df[f'EMA_{period}'] = ema_values
    return df


def evaluate_ema_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate EMA conditions and return boolean series."""
    period = params.get('period', 20)
    ema_col = f'EMA_{period}'
    
    if ema_col not in df.columns:
        df = compute_ema_indicator(df, params)
    
    return {
        'ema_price_above': df['Close'] > df[ema_col],
        'ema_price_below': df['Close'] < df[ema_col],
        'ema_price_cross_above': (df['Close'] > df[ema_col]) & (df['Close'].shift(1) <= df[ema_col].shift(1)),
        'ema_price_cross_below': (df['Close'] < df[ema_col]) & (df['Close'].shift(1) >= df[ema_col].shift(1))
    }


def compute_bollinger_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Bollinger Bands indicator and add to DataFrame."""
    window = params.get('window', 20)
    num_std = params.get('num_std', 2)
    
    upper, middle, lower = bollinger_bands(df['Close'], window, num_std)
    df[f'BB_Upper_{window}_{num_std}'] = upper
    df[f'BB_Middle_{window}_{num_std}'] = middle
    df[f'BB_Lower_{window}_{num_std}'] = lower
    return df


def evaluate_bollinger_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Bollinger Bands conditions and return boolean series."""
    window = params.get('window', 20)
    num_std = params.get('num_std', 2)
    
    upper_col = f'BB_Upper_{window}_{num_std}'
    lower_col = f'BB_Lower_{window}_{num_std}'
    
    if upper_col not in df.columns:
        df = compute_bollinger_indicator(df, params)
    
    return {
        'bb_price_above_upper': df['Close'] > df[upper_col],
        'bb_price_below_lower': df['Close'] < df[lower_col],
        'bb_price_touch_upper': (df['Close'] >= df[upper_col]) & (df['Close'].shift(1) < df[upper_col].shift(1)),
        'bb_price_touch_lower': (df['Close'] <= df[lower_col]) & (df['Close'].shift(1) > df[lower_col].shift(1)),
        'bb_price_squeeze': (df[upper_col] - df[lower_col]) < (df[upper_col].rolling(20).mean() * 0.5)
    }


def compute_ema_cross_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute dual EMA cross indicator and add to DataFrame."""
    fast_period = params.get('fast_period', 12)
    slow_period = params.get('slow_period', 26)
    
    fast_ema = ema(df['Close'], fast_period)
    slow_ema = ema(df['Close'], slow_period)
    
    df[f'EMA_Fast_{fast_period}'] = fast_ema
    df[f'EMA_Slow_{slow_period}'] = slow_ema
    return df


def evaluate_ema_cross_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate EMA cross conditions and return boolean series."""
    fast_period = params.get('fast_period', 12)
    slow_period = params.get('slow_period', 26)
    
    fast_col = f'EMA_Fast_{fast_period}'
    slow_col = f'EMA_Slow_{slow_period}'
    
    if fast_col not in df.columns:
        df = compute_ema_cross_indicator(df, params)
    
    return {
        'ema_fast_gt_slow': df[fast_col] > df[slow_col],
        'ema_slow_gt_fast': df[slow_col] > df[fast_col],
        'ema_cross_up': (df[fast_col] > df[slow_col]) & (df[fast_col].shift(1) <= df[slow_col].shift(1)),
        'ema_cross_down': (df[fast_col] < df[slow_col]) & (df[fast_col].shift(1) >= df[slow_col].shift(1))
    }


def compute_stochastic_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Stochastic Oscillator indicator and add to DataFrame."""
    k_period = params.get('k_period', 14)
    d_period = params.get('d_period', 3)
    
    stoch_k, stoch_d = stochastic(df['High'], df['Low'], df['Close'], k_period, d_period)
    df[f'Stoch_K_{k_period}'] = stoch_k
    df[f'Stoch_D_{d_period}'] = stoch_d
    return df


def evaluate_stochastic_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Stochastic conditions and return boolean series."""
    k_period = params.get('k_period', 14)
    d_period = params.get('d_period', 3)
    oversold = params.get('oversold', 20)
    overbought = params.get('overbought', 80)
    
    k_col = f'Stoch_K_{k_period}'
    d_col = f'Stoch_D_{d_period}'
    
    if k_col not in df.columns:
        df = compute_stochastic_indicator(df, params)
    
    return {
        'stoch_oversold': df[k_col] < oversold,
        'stoch_overbought': df[k_col] > overbought,
        'stoch_k_cross_above_d': (df[k_col] > df[d_col]) & (df[k_col].shift(1) <= df[d_col].shift(1)),
        'stoch_k_cross_below_d': (df[k_col] < df[d_col]) & (df[k_col].shift(1) >= df[d_col].shift(1)),
        'stoch_k_above_d': df[k_col] > df[d_col],
        'stoch_k_below_d': df[k_col] < df[d_col]
    }


def compute_williams_r_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Williams %R indicator and add to DataFrame."""
    period = params.get('period', 14)
    wr_values = williams_r(df['High'], df['Low'], df['Close'], period)
    df[f'Williams_R_{period}'] = wr_values
    return df


def evaluate_williams_r_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Williams %R conditions and return boolean series."""
    period = params.get('period', 14)
    oversold = params.get('oversold', -80)
    overbought = params.get('overbought', -20)
    
    wr_col = f'Williams_R_{period}'
    
    if wr_col not in df.columns:
        df = compute_williams_r_indicator(df, params)
    
    return {
        'williams_r_oversold': df[wr_col] < oversold,
        'williams_r_overbought': df[wr_col] > overbought,
        'williams_r_cross_above_oversold': (df[wr_col] > oversold) & (df[wr_col].shift(1) <= oversold),
        'williams_r_cross_below_overbought': (df[wr_col] < overbought) & (df[wr_col].shift(1) >= overbought)
    }


def compute_cci_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute CCI indicator and add to DataFrame."""
    period = params.get('period', 20)
    cci_values = cci(df['High'], df['Low'], df['Close'], period)
    df[f'CCI_{period}'] = cci_values
    return df


def evaluate_cci_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate CCI conditions and return boolean series."""
    period = params.get('period', 20)
    oversold = params.get('oversold', -100)
    overbought = params.get('overbought', 100)
    
    cci_col = f'CCI_{period}'
    
    if cci_col not in df.columns:
        df = compute_cci_indicator(df, params)
    
    return {
        'cci_oversold': df[cci_col] < oversold,
        'cci_overbought': df[cci_col] > overbought,
        'cci_cross_above_oversold': (df[cci_col] > oversold) & (df[cci_col].shift(1) <= oversold),
        'cci_cross_below_overbought': (df[cci_col] < overbought) & (df[cci_col].shift(1) >= overbought),
        'cci_above_zero': df[cci_col] > 0,
        'cci_below_zero': df[cci_col] < 0
    }


def compute_momentum_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Momentum indicator and add to DataFrame."""
    period = params.get('period', 10)
    momentum_values = momentum(df['Close'], period)
    df[f'Momentum_{period}'] = momentum_values
    return df


def evaluate_momentum_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Momentum conditions and return boolean series."""
    period = params.get('period', 10)
    threshold = params.get('threshold', 0)
    
    momentum_col = f'Momentum_{period}'
    
    if momentum_col not in df.columns:
        df = compute_momentum_indicator(df, params)
    
    return {
        'momentum_positive': df[momentum_col] > threshold,
        'momentum_negative': df[momentum_col] < threshold,
        'momentum_cross_above_zero': (df[momentum_col] > threshold) & (df[momentum_col].shift(1) <= threshold),
        'momentum_cross_below_zero': (df[momentum_col] < threshold) & (df[momentum_col].shift(1) >= threshold)
    }


# Trend Indicators

def compute_adx_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute ADX indicator and add to DataFrame."""
    period = params.get('period', 14)
    adx_values = adx(df['High'], df['Low'], df['Close'], period)
    df[f'ADX_{period}'] = adx_values
    return df


def evaluate_adx_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate ADX conditions and return boolean series."""
    period = params.get('period', 14)
    strong_trend = params.get('strong_trend', 25)
    
    adx_col = f'ADX_{period}'
    
    if adx_col not in df.columns:
        df = compute_adx_indicator(df, params)
    
    return {
        'adx_strong_trend': df[adx_col] > strong_trend,
        'adx_weak_trend': df[adx_col] < strong_trend,
        'adx_cross_above_strong': (df[adx_col] > strong_trend) & (df[adx_col].shift(1) <= strong_trend),
        'adx_cross_below_strong': (df[adx_col] < strong_trend) & (df[adx_col].shift(1) >= strong_trend)
    }


def compute_parabolic_sar_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Parabolic SAR indicator and add to DataFrame."""
    af_start = params.get('af_start', 0.02)
    af_increment = params.get('af_increment', 0.02)
    af_max = params.get('af_max', 0.2)
    
    sar_values = parabolic_sar(df['High'], df['Low'], df['Close'], af_start, af_increment, af_max)
    df['Parabolic_SAR'] = sar_values
    return df


def evaluate_parabolic_sar_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Parabolic SAR conditions and return boolean series."""
    if 'Parabolic_SAR' not in df.columns:
        df = compute_parabolic_sar_indicator(df, params)
    
    return {
        'psar_price_above': df['Close'] > df['Parabolic_SAR'],
        'psar_price_below': df['Close'] < df['Parabolic_SAR'],
        'psar_price_cross_above': (df['Close'] > df['Parabolic_SAR']) & (df['Close'].shift(1) <= df['Parabolic_SAR'].shift(1)),
        'psar_price_cross_below': (df['Close'] < df['Parabolic_SAR']) & (df['Close'].shift(1) >= df['Parabolic_SAR'].shift(1))
    }


def compute_ichimoku_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Ichimoku Cloud indicator and add to DataFrame."""
    tenkan = params.get('tenkan_period', 9)
    kijun = params.get('kijun_period', 26)
    senkou_b = params.get('senkou_b_period', 52)
    displacement = params.get('displacement', 26)
    
    tenkan_sen, kijun_sen, senkou_a, senkou_b, chikou = ichimoku_cloud(
        df['High'], df['Low'], df['Close'], tenkan, kijun, senkou_b, displacement
    )
    
    df[f'Ichimoku_Tenkan_{tenkan}'] = tenkan_sen
    df[f'Ichimoku_Kijun_{kijun}'] = kijun_sen
    df[f'Ichimoku_Senkou_A'] = senkou_a
    df[f'Ichimoku_Senkou_B_{senkou_b}'] = senkou_b
    df[f'Ichimoku_Chikou'] = chikou
    
    return df


def evaluate_ichimoku_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Ichimoku Cloud conditions and return boolean series."""
    tenkan = params.get('tenkan_period', 9)
    kijun = params.get('kijun_period', 26)
    senkou_b = params.get('senkou_b_period', 52)
    
    tenkan_col = f'Ichimoku_Tenkan_{tenkan}'
    kijun_col = f'Ichimoku_Kijun_{kijun}'
    senkou_a_col = 'Ichimoku_Senkou_A'
    senkou_b_col = f'Ichimoku_Senkou_B_{senkou_b}'
    
    if tenkan_col not in df.columns:
        df = compute_ichimoku_indicator(df, params)
    
    return {
        'ichimoku_price_above_cloud': df['Close'] > df[[senkou_a_col, senkou_b_col]].max(axis=1),
        'ichimoku_price_below_cloud': df['Close'] < df[[senkou_a_col, senkou_b_col]].min(axis=1),
        'ichimoku_tenkan_above_kijun': df[tenkan_col] > df[kijun_col],
        'ichimoku_tenkan_below_kijun': df[tenkan_col] < df[kijun_col],
        'ichimoku_tenkan_cross_above_kijun': (df[tenkan_col] > df[kijun_col]) & (df[tenkan_col].shift(1) <= df[kijun_col].shift(1)),
        'ichimoku_tenkan_cross_below_kijun': (df[tenkan_col] < df[kijun_col]) & (df[tenkan_col].shift(1) >= df[kijun_col].shift(1)),
        'ichimoku_cloud_bullish': df[senkou_a_col] > df[senkou_b_col],
        'ichimoku_cloud_bearish': df[senkou_a_col] < df[senkou_b_col]
    }


# Volume Indicators

def compute_obv_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute OBV indicator and add to DataFrame."""
    if 'Volume' not in df.columns:
        raise ValueError("OBV requires Volume data")
    
    obv_values = obv(df['Close'], df['Volume'])
    df['OBV'] = obv_values
    return df


def evaluate_obv_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate OBV conditions and return boolean series."""
    if 'OBV' not in df.columns:
        df = compute_obv_indicator(df, params)
    
    obv_sma_period = params.get('obv_sma_period', 20)
    obv_sma = sma(df['OBV'], obv_sma_period)
    
    return {
        'obv_above_sma': df['OBV'] > obv_sma,
        'obv_below_sma': df['OBV'] < obv_sma,
        'obv_cross_above_sma': (df['OBV'] > obv_sma) & (df['OBV'].shift(1) <= obv_sma.shift(1)),
        'obv_cross_below_sma': (df['OBV'] < obv_sma) & (df['OBV'].shift(1) >= obv_sma.shift(1)),
        'obv_rising': df['OBV'] > df['OBV'].shift(1),
        'obv_falling': df['OBV'] < df['OBV'].shift(1)
    }


def compute_volume_sma_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Volume SMA indicator and add to DataFrame."""
    if 'Volume' not in df.columns:
        raise ValueError("Volume SMA requires Volume data")
    
    period = params.get('period', 20)
    volume_sma_values = volume_sma(df['Volume'], period)
    df[f'Volume_SMA_{period}'] = volume_sma_values
    return df


def evaluate_volume_sma_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Volume SMA conditions and return boolean series."""
    if 'Volume' not in df.columns:
        raise ValueError("Volume SMA requires Volume data")
    
    period = params.get('period', 20)
    multiplier = params.get('multiplier', 1.5)
    
    volume_sma_col = f'Volume_SMA_{period}'
    
    if volume_sma_col not in df.columns:
        df = compute_volume_sma_indicator(df, params)
    
    return {
        'volume_above_sma': df['Volume'] > df[volume_sma_col],
        'volume_below_sma': df['Volume'] < df[volume_sma_col],
        'volume_spike': df['Volume'] > (df[volume_sma_col] * multiplier),
        'volume_cross_above_sma': (df['Volume'] > df[volume_sma_col]) & (df['Volume'].shift(1) <= df[volume_sma_col].shift(1)),
        'volume_cross_below_sma': (df['Volume'] < df[volume_sma_col]) & (df['Volume'].shift(1) >= df[volume_sma_col].shift(1))
    }


# Volatility Indicators

def compute_atr_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute ATR indicator and add to DataFrame."""
    period = params.get('period', 14)
    atr_values = atr(df['High'], df['Low'], df['Close'], period)
    df[f'ATR_{period}'] = atr_values
    return df


def evaluate_atr_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate ATR conditions and return boolean series."""
    period = params.get('period', 14)
    high_threshold = params.get('high_threshold', None)
    low_threshold = params.get('low_threshold', None)
    
    atr_col = f'ATR_{period}'
    
    if atr_col not in df.columns:
        df = compute_atr_indicator(df, params)
    
    # Use ATR SMA for thresholds if not provided
    if high_threshold is None:
        atr_sma = sma(df[atr_col], 20)
        high_threshold = atr_sma * 1.5
    if low_threshold is None:
        atr_sma = sma(df[atr_col], 20)
        low_threshold = atr_sma * 0.5
    
    return {
        'atr_high_volatility': df[atr_col] > high_threshold,
        'atr_low_volatility': df[atr_col] < low_threshold,
        'atr_cross_above_high': (df[atr_col] > high_threshold) & (df[atr_col].shift(1) <= high_threshold),
        'atr_cross_below_low': (df[atr_col] < low_threshold) & (df[atr_col].shift(1) >= low_threshold),
        'atr_rising': df[atr_col] > df[atr_col].shift(1),
        'atr_falling': df[atr_col] < df[atr_col].shift(1)
    }


def compute_keltner_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Keltner Channels indicator and add to DataFrame."""
    period = params.get('period', 20)
    multiplier = params.get('multiplier', 2.0)
    
    upper, middle, lower = keltner_channels(df['High'], df['Low'], df['Close'], period, multiplier)
    df[f'KC_Upper_{period}_{multiplier}'] = upper
    df[f'KC_Middle_{period}'] = middle
    df[f'KC_Lower_{period}_{multiplier}'] = lower
    return df


def evaluate_keltner_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Keltner Channels conditions and return boolean series."""
    period = params.get('period', 20)
    multiplier = params.get('multiplier', 2.0)
    
    upper_col = f'KC_Upper_{period}_{multiplier}'
    lower_col = f'KC_Lower_{period}_{multiplier}'
    
    if upper_col not in df.columns:
        df = compute_keltner_indicator(df, params)
    
    return {
        'kc_price_above_upper': df['Close'] > df[upper_col],
        'kc_price_below_lower': df['Close'] < df[lower_col],
        'kc_price_touch_upper': (df['Close'] >= df[upper_col]) & (df['Close'].shift(1) < df[upper_col].shift(1)),
        'kc_price_touch_lower': (df['Close'] <= df[lower_col]) & (df['Close'].shift(1) > df[lower_col].shift(1)),
        'kc_squeeze': (df[upper_col] - df[lower_col]) < (df[upper_col].rolling(20).mean() * 0.5)
    }


# PineScript Indicator Compute Functions

def compute_rsitrail_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute RSI Trail indicator."""
    f_rsi_lower = params.get('f_rsi_lower', 30)
    f_rsi_upper = params.get('f_rsi_upper', 70)
    signal = rsi_trail_signal(df, f_rsi_lower, f_rsi_upper)
    df['RSITrail_Signal'] = signal
    return df


def evaluate_rsitrail_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate RSI Trail conditions."""
    if 'RSITrail_Signal' not in df.columns:
        df = compute_rsitrail_indicator(df, params)
    return {
        'rsitrail_long': df['RSITrail_Signal'] == 1,
        'rsitrail_short': df['RSITrail_Signal'] == -1,
        'rsitrail_bullish': df['RSITrail_Signal'] > 0
    }


def compute_lwst_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Liquidity Weighted Supertrend indicator."""
    supertrend_type = params.get('supertrend_type', 'Aggressive')
    factor2 = params.get('factor2', 2.0)
    pd2 = params.get('pd2', 10)
    fast = params.get('fast', 10)
    slow = params.get('slow', 11)
    signal = lwst_signal(df, supertrend_type, factor2, pd2, fast, slow)
    df['LWST_Signal'] = signal
    return df


def evaluate_lwst_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate LWST conditions."""
    if 'LWST_Signal' not in df.columns:
        df = compute_lwst_indicator(df, params)
    return {
        'lwst_long': df['LWST_Signal'] == 1,
        'lwst_short': df['LWST_Signal'] == -1,
        'lwst_bullish': df['LWST_Signal'] > 0
    }


def compute_ssd_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute SMA Standard Deviation indicator."""
    len_dema = params.get('len_dema', 21)
    src_dema = params.get('src_dema', 0.0)
    src_demal = params.get('src_demal', 0.0)
    len_period = params.get('len', 50)
    len_sd = params.get('len_sd', 20)
    len_dema_sd = params.get('len_dema_sd', 21)
    src_dema_sd = params.get('src_dema_sd', 0.0)
    signal = ssd_signal(df, len_dema, src_dema, src_demal, len_period, len_sd, len_dema_sd, src_dema_sd)
    df['SSD_Signal'] = signal
    return df


def evaluate_ssd_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate SSD conditions."""
    if 'SSD_Signal' not in df.columns:
        df = compute_ssd_indicator(df, params)
    return {
        'ssd_long': df['SSD_Signal'] == 1,
        'ssd_short': df['SSD_Signal'] == -1,
        'ssd_bullish': df['SSD_Signal'] > 0
    }


def compute_vtsp_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Volume Trend Swing Points indicator."""
    x = params.get('x', 5)
    y = params.get('y', 5)
    signal = vtsp_signal(df, x, y)
    df['VTSP_Signal'] = signal
    return df


def evaluate_vtsp_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate VTSP conditions."""
    if 'VTSP_Signal' not in df.columns:
        df = compute_vtsp_indicator(df, params)
    return {
        'vtsp_long': df['VTSP_Signal'] == 1,
        'vtsp_short': df['VTSP_Signal'] == -1,
        'vtsp_bullish': df['VTSP_Signal'] > 0
    }


def compute_demadmi_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute DEMA DMI indicator."""
    len_dema = params.get('len_dema', 14)
    adx_smoothing_len = params.get('adx_smoothing_len', 14)
    di_len = params.get('di_len', 14)
    signal = dema_dmi_signal(df, len_dema, adx_smoothing_len, di_len)
    df['DemaDMI_Signal'] = signal
    return df


def evaluate_demadmi_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate DemaDMI conditions."""
    if 'DemaDMI_Signal' not in df.columns:
        df = compute_demadmi_indicator(df, params)
    return {
        'demadmi_long': df['DemaDMI_Signal'] == 1,
        'demadmi_short': df['DemaDMI_Signal'] == -1,
        'demadmi_bullish': df['DemaDMI_Signal'] > 0
    }


def compute_ewma_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute EWMA indicator."""
    len_period = params.get('len', 14)
    src = params.get('src', 0.0)
    signal = ewma_signal(df, len_period, src)
    df['EWMA_Signal'] = signal
    return df


def evaluate_ewma_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate EWMA conditions."""
    if 'EWMA_Signal' not in df.columns:
        df = compute_ewma_indicator(df, params)
    return {
        'ewma_long': df['EWMA_Signal'] == 1,
        'ewma_short': df['EWMA_Signal'] == -1,
        'ewma_bullish': df['EWMA_Signal'] > 0
    }


def compute_emazscore_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute EMA Z-score indicator."""
    len_period = params.get('len', 14)
    src = params.get('src', 0.0)
    lookback = params.get('lookback', 20)
    threshold_l = params.get('threshold_l', 1.0)
    threshold_s = params.get('threshold_s', -1.0)
    signal = ema_zscore_signal(df, len_period, src, lookback, threshold_l, threshold_s)
    df['EmaZScore_Signal'] = signal
    return df


def evaluate_emazscore_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate EmaZScore conditions."""
    if 'EmaZScore_Signal' not in df.columns:
        df = compute_emazscore_indicator(df, params)
    return {
        'emazscore_long': df['EmaZScore_Signal'] == 1,
        'emazscore_short': df['EmaZScore_Signal'] == -1,
        'emazscore_bullish': df['EmaZScore_Signal'] > 0
    }


def compute_dst_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute DEMA Supertrend indicator."""
    subject = params.get('subject', 10)
    mul = params.get('mul', 2.0)
    demalen = params.get('demalen', 21)
    src = params.get('src', 0.0)
    signal = dst_signal(df, subject, mul, demalen, src)
    df['DST_Signal'] = signal
    return df


def evaluate_dst_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate DST conditions."""
    if 'DST_Signal' not in df.columns:
        df = compute_dst_indicator(df, params)
    return {
        'dst_long': df['DST_Signal'] == 1,
        'dst_short': df['DST_Signal'] == -1,
        'dst_bullish': df['DST_Signal'] > 0
    }


def compute_msd_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Median Standard Deviation indicator."""
    len_dema = params.get('len_dema', 21)
    median_len = params.get('median_len', 50)
    atr_len = params.get('atr_len', 14)
    atr_mul = params.get('atr_mul', 2.0)
    len_sd = params.get('len_sd', 20)
    signal = msd_signal(df, len_dema, median_len, atr_len, atr_mul, len_sd)
    df['MSD_Signal'] = signal
    return df


def evaluate_msd_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate MSD conditions."""
    if 'MSD_Signal' not in df.columns:
        df = compute_msd_indicator(df, params)
    return {
        'msd_long': df['MSD_Signal'] == 1,
        'msd_short': df['MSD_Signal'] == -1,
        'msd_bullish': df['MSD_Signal'] > 0
    }


def compute_demaefi_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute DEMA EFI Volume indicator."""
    dema_len = params.get('dema_len', 14)
    dema_src = params.get('dema_src', 0.0)
    length = params.get('length', 13)
    signal = dema_efi_signal(df, dema_len, dema_src, length)
    df['DemaEFI_Signal'] = signal
    return df


def evaluate_demaefi_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate DemaEFI conditions."""
    if 'DemaEFI_Signal' not in df.columns:
        df = compute_demaefi_indicator(df, params)
    return {
        'demaefi_long': df['DemaEFI_Signal'] == 1,
        'demaefi_short': df['DemaEFI_Signal'] == -1,
        'demaefi_bullish': df['DemaEFI_Signal'] > 0
    }


def compute_hsp_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute HMA Swing Points indicator."""
    x = params.get('x', 5)
    len_period = params.get('len', 14)
    signal = hsp_signal(df, x, len_period)
    df['HSP_Signal'] = signal
    return df


def evaluate_hsp_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate HSP conditions."""
    if 'HSP_Signal' not in df.columns:
        df = compute_hsp_indicator(df, params)
    return {
        'hsp_long': df['HSP_Signal'] == 1,
        'hsp_short': df['HSP_Signal'] == -1,
        'hsp_bullish': df['HSP_Signal'] > 0
    }


def compute_demaafr_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute DEMA Adaptive Filter Range indicator."""
    len_period = params.get('len', 14)
    src = params.get('src', 0.0)
    p = params.get('p', 14)
    atr_factor = params.get('atr_factor', 2.0)
    signal = dema_afr_signal(df, len_period, src, p, atr_factor)
    df['DemaAFR_Signal'] = signal
    return df


def evaluate_demaafr_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate DemaAFR conditions."""
    if 'DemaAFR_Signal' not in df.columns:
        df = compute_demaafr_indicator(df, params)
    return {
        'demaafr_long': df['DemaAFR_Signal'] == 1,
        'demaafr_short': df['DemaAFR_Signal'] == -1,
        'demaafr_bullish': df['DemaAFR_Signal'] > 0
    }


def compute_rsisd_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute RSI Standard Deviation indicator."""
    len_period = params.get('len', 14)
    src = params.get('src', 0.0)
    sdlen = params.get('sdlen', 20)
    signal = rsi_sd_signal(df, len_period, src, sdlen)
    df['RSIsd_Signal'] = signal
    return df


def evaluate_rsisd_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate RSIsd conditions."""
    if 'RSIsd_Signal' not in df.columns:
        df = compute_rsisd_indicator(df, params)
    return {
        'rsisd_long': df['RSIsd_Signal'] == 1,
        'rsisd_short': df['RSIsd_Signal'] == -1,
        'rsisd_bullish': df['RSIsd_Signal'] > 0
    }


def compute_inverted_sd_dema_rsi_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Inverted Standard Deviation DEMA RSI indicator."""
    sublen = params.get('sublen', 21)
    sublen_2 = params.get('sublen_2', 20)
    len_period = params.get('len', 14)
    threshold_l = params.get('threshold_l', 50)
    threshold_s = params.get('threshold_s', 50)
    signal = inverted_sd_dema_rsi_signal(df, sublen, sublen_2, len_period, threshold_l, threshold_s)
    df['Inverted_SD_Dema_RSI_Signal'] = signal
    return df


def evaluate_inverted_sd_dema_rsi_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Inverted_SD_Dema_RSI conditions."""
    if 'Inverted_SD_Dema_RSI_Signal' not in df.columns:
        df = compute_inverted_sd_dema_rsi_indicator(df, params)
    return {
        'inverted_sd_dema_rsi_long': df['Inverted_SD_Dema_RSI_Signal'] == 1,
        'inverted_sd_dema_rsi_short': df['Inverted_SD_Dema_RSI_Signal'] == -1,
        'inverted_sd_dema_rsi_bullish': df['Inverted_SD_Dema_RSI_Signal'] > 0
    }


# New Indicator Compute Functions

def compute_kvo_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Klinger Volume Oscillator indicator."""
    fast_len = params.get('fast_len', 34)
    slow_len = params.get('slow_len', 55)
    signal = kvo_signal(df, fast_len, slow_len)
    df['KVO_Signal'] = signal
    return df


def evaluate_kvo_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate KVO conditions."""
    if 'KVO_Signal' not in df.columns:
        df = compute_kvo_indicator(df, params)
    return {
        'kvo_long': df['KVO_Signal'] == 1,
        'kvo_short': df['KVO_Signal'] == -1,
        'kvo_bullish': df['KVO_Signal'] > 0
    }


def compute_stc_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Schaff Trend Cycle indicator."""
    length = params.get('length', 10)
    fast_length = params.get('fast_length', 23)
    slow_length = params.get('slow_length', 50)
    signal = stc_signal(df, length, fast_length, slow_length)
    df['STC_Signal'] = signal
    return df


def evaluate_stc_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate STC conditions."""
    if 'STC_Signal' not in df.columns:
        df = compute_stc_indicator(df, params)
    return {
        'stc_long': df['STC_Signal'] == 1,
        'stc_short': df['STC_Signal'] == -1,
        'stc_bullish': df['STC_Signal'] > 0
    }


def compute_eri_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Elder Ray Index indicator."""
    length = params.get('length', 13)
    signal = eri_signal(df, length)
    df['ERI_Signal'] = signal
    return df


def evaluate_eri_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate ERI conditions."""
    if 'ERI_Signal' not in df.columns:
        df = compute_eri_indicator(df, params)
    return {
        'eri_long': df['ERI_Signal'] == 1,
        'eri_short': df['ERI_Signal'] == -1,
        'eri_bullish': df['ERI_Signal'] > 0
    }


def compute_cmo_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Chande Momentum Oscillator indicator."""
    length = params.get('length', 14)
    signal = cmo_signal(df, length)
    df['CMO_Signal'] = signal
    return df


def evaluate_cmo_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate CMO conditions."""
    if 'CMO_Signal' not in df.columns:
        df = compute_cmo_indicator(df, params)
    return {
        'cmo_long': df['CMO_Signal'] == 1,
        'cmo_short': df['CMO_Signal'] == -1,
        'cmo_bullish': df['CMO_Signal'] > 0
    }


def compute_fisher_transform_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Fisher Transform indicator."""
    length = params.get('length', 10)
    signal = fisher_transform_signal(df, length)
    df['FisherTransform_Signal'] = signal
    return df


def evaluate_fisher_transform_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Fisher Transform conditions."""
    if 'FisherTransform_Signal' not in df.columns:
        df = compute_fisher_transform_indicator(df, params)
    return {
        'fisher_transform_long': df['FisherTransform_Signal'] == 1,
        'fisher_transform_short': df['FisherTransform_Signal'] == -1,
        'fisher_transform_bullish': df['FisherTransform_Signal'] > 0
    }


def compute_bb_percent_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Bollinger Band Percent indicator."""
    bb_len = params.get('bb_len', 20)
    bb_mul = params.get('bb_mul', 2.0)
    bb_zlen = params.get('bb_zlen', 20)
    signal = bb_percent_signal(df, bb_len, bb_mul, bb_zlen)
    df['BBPercent_Signal'] = signal
    return df


def evaluate_bb_percent_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate BB Percent conditions."""
    if 'BBPercent_Signal' not in df.columns:
        df = compute_bb_percent_indicator(df, params)
    return {
        'bb_percent_long': df['BBPercent_Signal'] == 1,
        'bb_percent_short': df['BBPercent_Signal'] == -1,
        'bb_percent_bullish': df['BBPercent_Signal'] > 0
    }


def compute_tsi_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute True Strength Index indicator."""
    tsi_long = params.get('tsi_long', 25)
    tsi_short = params.get('tsi_short', 13)
    tsi_zlen = params.get('tsi_zlen', 20)
    signal = tsi_signal(df, tsi_long, tsi_short, tsi_zlen)
    df['TSI_Signal'] = signal
    return df


def evaluate_tsi_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate TSI conditions."""
    if 'TSI_Signal' not in df.columns:
        df = compute_tsi_indicator(df, params)
    return {
        'tsi_long': df['TSI_Signal'] == 1,
        'tsi_short': df['TSI_Signal'] == -1,
        'tsi_bullish': df['TSI_Signal'] > 0
    }


def compute_disparity_index_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Disparity Index indicator."""
    lookback = params.get('lookback', 14)
    smoothing = params.get('smoothing', 'EMA')
    signal = disparity_index_signal(df, lookback, smoothing)
    df['DisparityIndex_Signal'] = signal
    return df


def evaluate_disparity_index_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Disparity Index conditions."""
    if 'DisparityIndex_Signal' not in df.columns:
        df = compute_disparity_index_indicator(df, params)
    return {
        'disparity_index_long': df['DisparityIndex_Signal'] == 1,
        'disparity_index_short': df['DisparityIndex_Signal'] == -1,
        'disparity_index_bullish': df['DisparityIndex_Signal'] > 0
    }


def compute_chande_momentum_oscillator_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute Chande Momentum Oscillator indicator (alternative)."""
    lookback = params.get('lookback', 14)
    signal = chande_momentum_oscillator_signal(df, lookback)
    df['ChandeMO_Signal'] = signal
    return df


def evaluate_chande_momentum_oscillator_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate Chande Momentum Oscillator conditions."""
    if 'ChandeMO_Signal' not in df.columns:
        df = compute_chande_momentum_oscillator_indicator(df, params)
    return {
        'chande_mo_long': df['ChandeMO_Signal'] == 1,
        'chande_mo_short': df['ChandeMO_Signal'] == -1,
        'chande_mo_bullish': df['ChandeMO_Signal'] > 0
    }


def compute_rapr_1_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute RAPR 1 indicator."""
    metric_lookback = params.get('metric_lookback', 20)
    valuation_lookback = params.get('valuation_lookback', 0)
    signal = rapr_1_signal(df, metric_lookback, valuation_lookback)
    df['RAPR1_Signal'] = signal
    return df


def evaluate_rapr_1_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate RAPR 1 conditions."""
    if 'RAPR1_Signal' not in df.columns:
        df = compute_rapr_1_indicator(df, params)
    return {
        'rapr_1_long': df['RAPR1_Signal'] == 1,
        'rapr_1_short': df['RAPR1_Signal'] == -1,
        'rapr_1_bullish': df['RAPR1_Signal'] > 0
    }


def compute_rapr_2_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Compute RAPR 2 indicator."""
    metric_lookback = params.get('metric_lookback', 20)
    valuation_lookback = params.get('valuation_lookback', 0)
    signal = rapr_2_signal(df, metric_lookback, valuation_lookback)
    df['RAPR2_Signal'] = signal
    return df


def evaluate_rapr_2_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
    """Evaluate RAPR 2 conditions."""
    if 'RAPR2_Signal' not in df.columns:
        df = compute_rapr_2_indicator(df, params)
    return {
        'rapr_2_long': df['RAPR2_Signal'] == 1,
        'rapr_2_short': df['RAPR2_Signal'] == -1,
        'rapr_2_bullish': df['RAPR2_Signal'] > 0
    }


# Registry of available indicators
INDICATOR_REGISTRY: Dict[str, IndicatorMetadata] = {
    'RSI': IndicatorMetadata(
        name='Relative Strength Index',
        description='Momentum oscillator measuring speed and change of price movements',
        parameters={
            'period': {'type': 'int', 'default': 14, 'min': 5, 'max': 50, 'description': 'RSI period'},
            'oversold': {'type': 'int', 'default': 30, 'min': 10, 'max': 40, 'description': 'Oversold threshold'},
            'overbought': {'type': 'int', 'default': 70, 'min': 60, 'max': 90, 'description': 'Overbought threshold'}
        },
        conditions={
            'rsi_oversold': 'RSI < oversold threshold',
            'rsi_overbought': 'RSI > overbought threshold',
            'rsi_cross_above_oversold': 'RSI crosses above oversold threshold',
            'rsi_cross_below_overbought': 'RSI crosses below overbought threshold'
        },
        compute_fn=compute_rsi_indicator,
        evaluate_conditions_fn=evaluate_rsi_conditions,
        category='Momentum'
    ),
    
    'MACD': IndicatorMetadata(
        name='Moving Average Convergence Divergence',
        description='Trend-following momentum indicator showing relationship between two moving averages',
        parameters={
            'fast': {'type': 'int', 'default': 12, 'min': 5, 'max': 20, 'description': 'Fast EMA period'},
            'slow': {'type': 'int', 'default': 26, 'min': 20, 'max': 50, 'description': 'Slow EMA period'},
            'signal': {'type': 'int', 'default': 9, 'min': 5, 'max': 20, 'description': 'Signal line period'}
        },
        conditions={
            'macd_cross_up': 'MACD line crosses above signal line',
            'macd_cross_down': 'MACD line crosses below signal line',
            'macd_above_signal': 'MACD line above signal line',
            'macd_below_signal': 'MACD line below signal line',
            'macd_above_zero': 'MACD line above zero',
            'macd_below_zero': 'MACD line below zero'
        },
        compute_fn=compute_macd_indicator,
        evaluate_conditions_fn=evaluate_macd_conditions,
        category='Trend'
    ),
    
    'SMA': IndicatorMetadata(
        name='Simple Moving Average',
        description='Average price over a specified number of periods',
        parameters={
            'period': {'type': 'int', 'default': 20, 'min': 5, 'max': 100, 'description': 'SMA period'}
        },
        conditions={
            'sma_price_above': 'Price above SMA',
            'sma_price_below': 'Price below SMA',
            'sma_price_cross_above': 'Price crosses above SMA',
            'sma_price_cross_below': 'Price crosses below SMA'
        },
        compute_fn=compute_sma_indicator,
        evaluate_conditions_fn=evaluate_sma_conditions,
        category='Trend'
    ),
    
    'EMA': IndicatorMetadata(
        name='Exponential Moving Average',
        description='Moving average that gives more weight to recent prices',
        parameters={
            'period': {'type': 'int', 'default': 20, 'min': 5, 'max': 100, 'description': 'EMA period'}
        },
        conditions={
            'ema_price_above': 'Price above EMA',
            'ema_price_below': 'Price below EMA',
            'ema_price_cross_above': 'Price crosses above EMA',
            'ema_price_cross_below': 'Price crosses below EMA'
        },
        compute_fn=compute_ema_indicator,
        evaluate_conditions_fn=evaluate_ema_conditions,
        category='Trend'
    ),
    
    'Bollinger': IndicatorMetadata(
        name='Bollinger Bands',
        description='Price channels based on moving average and standard deviation',
        parameters={
            'window': {'type': 'int', 'default': 20, 'min': 10, 'max': 50, 'description': 'Moving average window'},
            'num_std': {'type': 'float', 'default': 2.0, 'min': 1.0, 'max': 3.0, 'description': 'Number of standard deviations'}
        },
        conditions={
            'bb_price_above_upper': 'Price above upper band',
            'bb_price_below_lower': 'Price below lower band',
            'bb_price_touch_upper': 'Price touches upper band',
            'bb_price_touch_lower': 'Price touches lower band',
            'bb_price_squeeze': 'Bollinger bands squeeze (low volatility)'
        },
        compute_fn=compute_bollinger_indicator,
        evaluate_conditions_fn=evaluate_bollinger_conditions,
        category='Volatility'
    ),
    
    'EMA_Cross': IndicatorMetadata(
        name='EMA Cross',
        description='Dual EMA crossover system for trend identification',
        parameters={
            'fast_period': {'type': 'int', 'default': 12, 'min': 5, 'max': 30, 'description': 'Fast EMA period'},
            'slow_period': {'type': 'int', 'default': 26, 'min': 20, 'max': 50, 'description': 'Slow EMA period'}
        },
        conditions={
            'ema_fast_gt_slow': 'Fast EMA above slow EMA',
            'ema_slow_gt_fast': 'Slow EMA above fast EMA',
            'ema_cross_up': 'Fast EMA crosses above slow EMA',
            'ema_cross_down': 'Fast EMA crosses below slow EMA'
        },
        compute_fn=compute_ema_cross_indicator,
        evaluate_conditions_fn=evaluate_ema_cross_conditions,
        category='Trend'
    ),
    
    'Stochastic': IndicatorMetadata(
        name='Stochastic Oscillator',
        description='Momentum indicator comparing closing price to price range over a period',
        parameters={
            'k_period': {'type': 'int', 'default': 14, 'min': 5, 'max': 30, 'description': '%K period'},
            'd_period': {'type': 'int', 'default': 3, 'min': 1, 'max': 10, 'description': '%D period (SMA of %K)'},
            'oversold': {'type': 'int', 'default': 20, 'min': 0, 'max': 40, 'description': 'Oversold threshold'},
            'overbought': {'type': 'int', 'default': 80, 'min': 60, 'max': 100, 'description': 'Overbought threshold'}
        },
        conditions={
            'stoch_oversold': 'Stochastic %K < oversold threshold',
            'stoch_overbought': 'Stochastic %K > overbought threshold',
            'stoch_k_cross_above_d': 'Stochastic %K crosses above %D',
            'stoch_k_cross_below_d': 'Stochastic %K crosses below %D',
            'stoch_k_above_d': 'Stochastic %K above %D',
            'stoch_k_below_d': 'Stochastic %K below %D'
        },
        compute_fn=compute_stochastic_indicator,
        evaluate_conditions_fn=evaluate_stochastic_conditions,
        category='Momentum'
    ),
    
    'Williams_R': IndicatorMetadata(
        name='Williams %R',
        description='Momentum indicator measuring overbought/oversold levels',
        parameters={
            'period': {'type': 'int', 'default': 14, 'min': 5, 'max': 30, 'description': 'Lookback period'},
            'oversold': {'type': 'int', 'default': -80, 'min': -100, 'max': -50, 'description': 'Oversold threshold'},
            'overbought': {'type': 'int', 'default': -20, 'min': -50, 'max': 0, 'description': 'Overbought threshold'}
        },
        conditions={
            'williams_r_oversold': 'Williams %R < oversold threshold',
            'williams_r_overbought': 'Williams %R > overbought threshold',
            'williams_r_cross_above_oversold': 'Williams %R crosses above oversold threshold',
            'williams_r_cross_below_overbought': 'Williams %R crosses below overbought threshold'
        },
        compute_fn=compute_williams_r_indicator,
        evaluate_conditions_fn=evaluate_williams_r_conditions,
        category='Momentum'
    ),
    
    'CCI': IndicatorMetadata(
        name='Commodity Channel Index',
        description='Momentum oscillator identifying cyclical trends',
        parameters={
            'period': {'type': 'int', 'default': 20, 'min': 10, 'max': 50, 'description': 'CCI period'},
            'oversold': {'type': 'int', 'default': -100, 'min': -200, 'max': -50, 'description': 'Oversold threshold'},
            'overbought': {'type': 'int', 'default': 100, 'min': 50, 'max': 200, 'description': 'Overbought threshold'}
        },
        conditions={
            'cci_oversold': 'CCI < oversold threshold',
            'cci_overbought': 'CCI > overbought threshold',
            'cci_cross_above_oversold': 'CCI crosses above oversold threshold',
            'cci_cross_below_overbought': 'CCI crosses below overbought threshold',
            'cci_above_zero': 'CCI above zero',
            'cci_below_zero': 'CCI below zero'
        },
        compute_fn=compute_cci_indicator,
        evaluate_conditions_fn=evaluate_cci_conditions,
        category='Momentum'
    ),
    
    'Momentum': IndicatorMetadata(
        name='Momentum',
        description='Rate of change in price over a specified period',
        parameters={
            'period': {'type': 'int', 'default': 10, 'min': 5, 'max': 30, 'description': 'Momentum period'},
            'threshold': {'type': 'float', 'default': 0, 'min': -1000, 'max': 1000, 'description': 'Momentum threshold'}
        },
        conditions={
            'momentum_positive': 'Momentum > threshold',
            'momentum_negative': 'Momentum < threshold',
            'momentum_cross_above_zero': 'Momentum crosses above threshold',
            'momentum_cross_below_zero': 'Momentum crosses below threshold'
        },
        compute_fn=compute_momentum_indicator,
        evaluate_conditions_fn=evaluate_momentum_conditions,
        category='Momentum'
    ),
    
    # Trend Indicators
    'ADX': IndicatorMetadata(
        name='Average Directional Index',
        description='Measures trend strength regardless of direction',
        parameters={
            'period': {'type': 'int', 'default': 14, 'min': 5, 'max': 30, 'description': 'ADX period'},
            'strong_trend': {'type': 'int', 'default': 25, 'min': 15, 'max': 50, 'description': 'Strong trend threshold'}
        },
        conditions={
            'adx_strong_trend': 'ADX > strong trend threshold',
            'adx_weak_trend': 'ADX < strong trend threshold',
            'adx_cross_above_strong': 'ADX crosses above strong trend threshold',
            'adx_cross_below_strong': 'ADX crosses below strong trend threshold'
        },
        compute_fn=compute_adx_indicator,
        evaluate_conditions_fn=evaluate_adx_conditions,
        category='Trend'
    ),
    
    'Parabolic_SAR': IndicatorMetadata(
        name='Parabolic SAR',
        description='Stop and Reverse indicator showing potential reversal points',
        parameters={
            'af_start': {'type': 'float', 'default': 0.02, 'min': 0.01, 'max': 0.1, 'description': 'Acceleration factor start'},
            'af_increment': {'type': 'float', 'default': 0.02, 'min': 0.01, 'max': 0.1, 'description': 'Acceleration factor increment'},
            'af_max': {'type': 'float', 'default': 0.2, 'min': 0.1, 'max': 0.5, 'description': 'Maximum acceleration factor'}
        },
        conditions={
            'psar_price_above': 'Price above Parabolic SAR',
            'psar_price_below': 'Price below Parabolic SAR',
            'psar_price_cross_above': 'Price crosses above Parabolic SAR',
            'psar_price_cross_below': 'Price crosses below Parabolic SAR'
        },
        compute_fn=compute_parabolic_sar_indicator,
        evaluate_conditions_fn=evaluate_parabolic_sar_conditions,
        category='Trend'
    ),
    
    'Ichimoku': IndicatorMetadata(
        name='Ichimoku Cloud',
        description='Comprehensive trend-following indicator with support/resistance levels',
        parameters={
            'tenkan_period': {'type': 'int', 'default': 9, 'min': 5, 'max': 20, 'description': 'Tenkan-sen period'},
            'kijun_period': {'type': 'int', 'default': 26, 'min': 20, 'max': 40, 'description': 'Kijun-sen period'},
            'senkou_b_period': {'type': 'int', 'default': 52, 'min': 40, 'max': 60, 'description': 'Senkou Span B period'},
            'displacement': {'type': 'int', 'default': 26, 'min': 20, 'max': 30, 'description': 'Cloud displacement'}
        },
        conditions={
            'ichimoku_price_above_cloud': 'Price above Ichimoku cloud',
            'ichimoku_price_below_cloud': 'Price below Ichimoku cloud',
            'ichimoku_tenkan_above_kijun': 'Tenkan-sen above Kijun-sen',
            'ichimoku_tenkan_below_kijun': 'Tenkan-sen below Kijun-sen',
            'ichimoku_tenkan_cross_above_kijun': 'Tenkan-sen crosses above Kijun-sen',
            'ichimoku_tenkan_cross_below_kijun': 'Tenkan-sen crosses below Kijun-sen',
            'ichimoku_cloud_bullish': 'Ichimoku cloud is bullish (Senkou A > Senkou B)',
            'ichimoku_cloud_bearish': 'Ichimoku cloud is bearish (Senkou A < Senkou B)'
        },
        compute_fn=compute_ichimoku_indicator,
        evaluate_conditions_fn=evaluate_ichimoku_conditions,
        category='Trend'
    ),
    
    # Volume Indicators
    'OBV': IndicatorMetadata(
        name='On-Balance Volume',
        description='Cumulative volume indicator showing buying/selling pressure',
        parameters={
            'obv_sma_period': {'type': 'int', 'default': 20, 'min': 10, 'max': 50, 'description': 'OBV SMA period for comparison'}
        },
        conditions={
            'obv_above_sma': 'OBV above OBV SMA',
            'obv_below_sma': 'OBV below OBV SMA',
            'obv_cross_above_sma': 'OBV crosses above OBV SMA',
            'obv_cross_below_sma': 'OBV crosses below OBV SMA',
            'obv_rising': 'OBV is rising',
            'obv_falling': 'OBV is falling'
        },
        compute_fn=compute_obv_indicator,
        evaluate_conditions_fn=evaluate_obv_conditions,
        category='Volume'
    ),
    
    'Volume_SMA': IndicatorMetadata(
        name='Volume Moving Average',
        description='Simple moving average of volume to identify volume trends',
        parameters={
            'period': {'type': 'int', 'default': 20, 'min': 5, 'max': 50, 'description': 'Volume SMA period'},
            'multiplier': {'type': 'float', 'default': 1.5, 'min': 1.0, 'max': 3.0, 'description': 'Volume spike multiplier'}
        },
        conditions={
            'volume_above_sma': 'Volume above Volume SMA',
            'volume_below_sma': 'Volume below Volume SMA',
            'volume_spike': 'Volume spike (Volume > SMA * multiplier)',
            'volume_cross_above_sma': 'Volume crosses above Volume SMA',
            'volume_cross_below_sma': 'Volume crosses below Volume SMA'
        },
        compute_fn=compute_volume_sma_indicator,
        evaluate_conditions_fn=evaluate_volume_sma_conditions,
        category='Volume'
    ),
    
    # Volatility Indicators
    'ATR': IndicatorMetadata(
        name='Average True Range',
        description='Measures market volatility based on price ranges',
        parameters={
            'period': {'type': 'int', 'default': 14, 'min': 5, 'max': 30, 'description': 'ATR period'},
            'high_threshold': {'type': 'float', 'default': None, 'min': 0, 'max': 10000, 'description': 'High volatility threshold (auto-calculated if None)'},
            'low_threshold': {'type': 'float', 'default': None, 'min': 0, 'max': 10000, 'description': 'Low volatility threshold (auto-calculated if None)'}
        },
        conditions={
            'atr_high_volatility': 'ATR > high volatility threshold',
            'atr_low_volatility': 'ATR < low volatility threshold',
            'atr_cross_above_high': 'ATR crosses above high volatility threshold',
            'atr_cross_below_low': 'ATR crosses below low volatility threshold',
            'atr_rising': 'ATR is rising',
            'atr_falling': 'ATR is falling'
        },
        compute_fn=compute_atr_indicator,
        evaluate_conditions_fn=evaluate_atr_conditions,
        category='Volatility'
    ),
    
    'Keltner': IndicatorMetadata(
        name='Keltner Channels',
        description='Volatility-based price channels using ATR',
        parameters={
            'period': {'type': 'int', 'default': 20, 'min': 10, 'max': 50, 'description': 'EMA period'},
            'multiplier': {'type': 'float', 'default': 2.0, 'min': 1.0, 'max': 3.0, 'description': 'ATR multiplier'}
        },
        conditions={
            'kc_price_above_upper': 'Price above upper Keltner Channel',
            'kc_price_below_lower': 'Price below lower Keltner Channel',
            'kc_price_touch_upper': 'Price touches upper Keltner Channel',
            'kc_price_touch_lower': 'Price touches lower Keltner Channel',
            'kc_squeeze': 'Keltner Channels squeeze (low volatility)'
        },
        compute_fn=compute_keltner_indicator,
        evaluate_conditions_fn=evaluate_keltner_conditions,
        category='Volatility'
    ),
    
    # PineScript Converted Indicators
    'RSITrail': IndicatorMetadata(
        name='RSI Trail',
        description='RSI-based trail indicator with upper/lower bounds',
        parameters={
            'f_rsi_lower': {'type': 'int', 'default': 30, 'min': 10, 'max': 50, 'description': 'Lower RSI threshold'},
            'f_rsi_upper': {'type': 'int', 'default': 70, 'min': 50, 'max': 90, 'description': 'Upper RSI threshold'}
        },
        conditions={
            'rsitrail_long': 'RSI Trail long signal',
            'rsitrail_short': 'RSI Trail short signal',
            'rsitrail_bullish': 'RSI Trail bullish condition'
        },
        compute_fn=compute_rsitrail_indicator,
        evaluate_conditions_fn=evaluate_rsitrail_conditions,
        category='Momentum'
    ),
    
    'LWST': IndicatorMetadata(
        name='Liquidity Weighted Supertrend',
        description='Supertrend indicator weighted by liquidity',
        parameters={
            'supertrend_type': {'type': 'str', 'default': 'Aggressive', 'description': 'Supertrend type'},
            'factor2': {'type': 'float', 'default': 2.0, 'min': 0.5, 'max': 5.0, 'description': 'Supertrend factor'},
            'pd2': {'type': 'int', 'default': 10, 'min': 5, 'max': 30, 'description': 'ATR period'},
            'fast': {'type': 'int', 'default': 10, 'min': 5, 'max': 30, 'description': 'Fast EMA period'},
            'slow': {'type': 'int', 'default': 11, 'min': 5, 'max': 50, 'description': 'Slow EMA period'}
        },
        conditions={
            'lwst_long': 'LWST long signal',
            'lwst_short': 'LWST short signal',
            'lwst_bullish': 'LWST bullish condition'
        },
        compute_fn=compute_lwst_indicator,
        evaluate_conditions_fn=evaluate_lwst_conditions,
        category='Trend'
    ),
    
    'SSD': IndicatorMetadata(
        name='SMA Standard Deviation',
        description='SMA-based standard deviation indicator',
        parameters={
            'len_dema': {'type': 'int', 'default': 21, 'min': 5, 'max': 50, 'description': 'DEMA length'},
            'src_dema': {'type': 'float', 'default': 0.0, 'description': 'Source for DEMA'},
            'src_demal': {'type': 'float', 'default': 0.0, 'description': 'Source for DEMA low'},
            'len': {'type': 'int', 'default': 50, 'min': 10, 'max': 100, 'description': 'SMA length'},
            'len_sd': {'type': 'int', 'default': 20, 'min': 5, 'max': 50, 'description': 'Standard deviation length'},
            'len_dema_sd': {'type': 'int', 'default': 21, 'min': 5, 'max': 50, 'description': 'DEMA SD length'},
            'src_dema_sd': {'type': 'float', 'default': 0.0, 'description': 'Source for DEMA SD'}
        },
        conditions={
            'ssd_long': 'SSD long signal',
            'ssd_short': 'SSD short signal',
            'ssd_bullish': 'SSD bullish condition'
        },
        compute_fn=compute_ssd_indicator,
        evaluate_conditions_fn=evaluate_ssd_conditions,
        category='Trend'
    ),
    
    'VTSP': IndicatorMetadata(
        name='Volume Trend Swing Points',
        description='Volume-based trend swing point detection',
        parameters={
            'x': {'type': 'int', 'default': 5, 'min': 3, 'max': 20, 'description': 'Period for highest'},
            'y': {'type': 'int', 'default': 5, 'min': 3, 'max': 20, 'description': 'Period for lowest'}
        },
        conditions={
            'vtsp_long': 'VTSP long signal',
            'vtsp_short': 'VTSP short signal',
            'vtsp_bullish': 'VTSP bullish condition'
        },
        compute_fn=compute_vtsp_indicator,
        evaluate_conditions_fn=evaluate_vtsp_conditions,
        category='Volume'
    ),
    
    'DemaDMI': IndicatorMetadata(
        name='DEMA DMI',
        description='DEMA-based Directional Movement Index',
        parameters={
            'len_dema': {'type': 'int', 'default': 14, 'min': 5, 'max': 50, 'description': 'DEMA length'},
            'adx_smoothing_len': {'type': 'int', 'default': 14, 'min': 5, 'max': 30, 'description': 'ADX smoothing length'},
            'di_len': {'type': 'int', 'default': 14, 'min': 5, 'max': 30, 'description': 'DI length'}
        },
        conditions={
            'demadmi_long': 'DemaDMI long signal',
            'demadmi_short': 'DemaDMI short signal',
            'demadmi_bullish': 'DemaDMI bullish condition'
        },
        compute_fn=compute_demadmi_indicator,
        evaluate_conditions_fn=evaluate_demadmi_conditions,
        category='Trend'
    ),
    
    'EWMA': IndicatorMetadata(
        name='Exponential Weighted Moving Average',
        description='EWMA signal indicator',
        parameters={
            'len': {'type': 'int', 'default': 14, 'min': 5, 'max': 50, 'description': 'Length period'},
            'src': {'type': 'float', 'default': 0.0, 'description': 'Source'}
        },
        conditions={
            'ewma_long': 'EWMA long signal',
            'ewma_short': 'EWMA short signal',
            'ewma_bullish': 'EWMA bullish condition'
        },
        compute_fn=compute_ewma_indicator,
        evaluate_conditions_fn=evaluate_ewma_conditions,
        category='Trend'
    ),
    
    
    'DST': IndicatorMetadata(
        name='DEMA Supertrend',
        description='DEMA-based Supertrend indicator',
        parameters={
            'subject': {'type': 'int', 'default': 10, 'min': 5, 'max': 30, 'description': 'ATR period'},
            'mul': {'type': 'float', 'default': 2.0, 'min': 0.5, 'max': 5.0, 'description': 'Multiplier'},
            'demalen': {'type': 'int', 'default': 21, 'min': 5, 'max': 50, 'description': 'DEMA length'},
            'src': {'type': 'float', 'default': 0.0, 'description': 'Source'}
        },
        conditions={
            'dst_long': 'DST long signal',
            'dst_short': 'DST short signal',
            'dst_bullish': 'DST bullish condition'
        },
        compute_fn=compute_dst_indicator,
        evaluate_conditions_fn=evaluate_dst_conditions,
        category='Trend'
    ),
    
    'MSD': IndicatorMetadata(
        name='Median Standard Deviation',
        description='Median-based standard deviation indicator',
        parameters={
            'len_dema': {'type': 'int', 'default': 21, 'min': 5, 'max': 50, 'description': 'DEMA length'},
            'median_len': {'type': 'int', 'default': 50, 'min': 20, 'max': 100, 'description': 'Median length'},
            'atr_len': {'type': 'int', 'default': 14, 'min': 5, 'max': 30, 'description': 'ATR length'},
            'atr_mul': {'type': 'float', 'default': 2.0, 'min': 0.5, 'max': 5.0, 'description': 'ATR multiplier'},
            'len_sd': {'type': 'int', 'default': 20, 'min': 5, 'max': 50, 'description': 'Standard deviation length'}
        },
        conditions={
            'msd_long': 'MSD long signal',
            'msd_short': 'MSD short signal',
            'msd_bullish': 'MSD bullish condition'
        },
        compute_fn=compute_msd_indicator,
        evaluate_conditions_fn=evaluate_msd_conditions,
        category='Volatility'
    ),
    
    'DemaEFI': IndicatorMetadata(
        name='DEMA EFI Volume',
        description='DEMA-based Ease of Movement indicator',
        parameters={
            'dema_len': {'type': 'int', 'default': 14, 'min': 5, 'max': 50, 'description': 'DEMA length'},
            'dema_src': {'type': 'float', 'default': 0.0, 'description': 'Source for DEMA'},
            'length': {'type': 'int', 'default': 13, 'min': 5, 'max': 30, 'description': 'EFI length'}
        },
        conditions={
            'demaefi_long': 'DemaEFI long signal',
            'demaefi_short': 'DemaEFI short signal',
            'demaefi_bullish': 'DemaEFI bullish condition'
        },
        compute_fn=compute_demaefi_indicator,
        evaluate_conditions_fn=evaluate_demaefi_conditions,
        category='Volume'
    ),
    
    'HSP': IndicatorMetadata(
        name='HMA Swing Points',
        description='Hull Moving Average swing point detection',
        parameters={
            'x': {'type': 'int', 'default': 5, 'min': 3, 'max': 20, 'description': 'Period for highest/lowest'},
            'len': {'type': 'int', 'default': 14, 'min': 5, 'max': 50, 'description': 'HMA length'}
        },
        conditions={
            'hsp_long': 'HSP long signal',
            'hsp_short': 'HSP short signal',
            'hsp_bullish': 'HSP bullish condition'
        },
        compute_fn=compute_hsp_indicator,
        evaluate_conditions_fn=evaluate_hsp_conditions,
        category='Trend'
    ),
    
    'DemaAFR': IndicatorMetadata(
        name='DEMA Adaptive Filter Range',
        description='DEMA-based adaptive filter range indicator',
        parameters={
            'len': {'type': 'int', 'default': 14, 'min': 5, 'max': 50, 'description': 'DEMA length'},
            'src': {'type': 'float', 'default': 0.0, 'description': 'Source'},
            'p': {'type': 'int', 'default': 14, 'min': 5, 'max': 30, 'description': 'ATR period'},
            'atr_factor': {'type': 'float', 'default': 2.0, 'min': 0.5, 'max': 5.0, 'description': 'ATR factor'}
        },
        conditions={
            'demaafr_long': 'DemaAFR long signal',
            'demaafr_short': 'DemaAFR short signal',
            'demaafr_bullish': 'DemaAFR bullish condition'
        },
        compute_fn=compute_demaafr_indicator,
        evaluate_conditions_fn=evaluate_demaafr_conditions,
        category='Trend'
    ),
    
    'RSIsd': IndicatorMetadata(
        name='RSI Standard Deviation',
        description='RSI-based standard deviation indicator',
        parameters={
            'len': {'type': 'int', 'default': 14, 'min': 5, 'max': 50, 'description': 'RSI length'},
            'src': {'type': 'float', 'default': 0.0, 'description': 'Source'},
            'sdlen': {'type': 'int', 'default': 20, 'min': 5, 'max': 50, 'description': 'Standard deviation length'}
        },
        conditions={
            'rsisd_long': 'RSIsd long signal',
            'rsisd_short': 'RSIsd short signal',
            'rsisd_bullish': 'RSIsd bullish condition'
        },
        compute_fn=compute_rsisd_indicator,
        evaluate_conditions_fn=evaluate_rsisd_conditions,
        category='Momentum'
    ),
    
    'Inverted_SD_Dema_RSI': IndicatorMetadata(
        name='Inverted Standard Deviation DEMA RSI',
        description='Inverted SD-based DEMA RSI indicator',
        parameters={
            'sublen': {'type': 'int', 'default': 21, 'min': 5, 'max': 50, 'description': 'DEMA length'},
            'sublen_2': {'type': 'int', 'default': 20, 'min': 5, 'max': 50, 'description': 'Standard deviation length'},
            'len': {'type': 'int', 'default': 14, 'min': 5, 'max': 50, 'description': 'RSI length'},
            'threshold_l': {'type': 'int', 'default': 50, 'min': 30, 'max': 70, 'description': 'Long threshold'},
            'threshold_s': {'type': 'int', 'default': 50, 'min': 30, 'max': 70, 'description': 'Short threshold'}
        },
        conditions={
            'inverted_sd_dema_rsi_long': 'Inverted_SD_Dema_RSI long signal',
            'inverted_sd_dema_rsi_short': 'Inverted_SD_Dema_RSI short signal',
            'inverted_sd_dema_rsi_bullish': 'Inverted_SD_Dema_RSI bullish condition'
        },
        compute_fn=compute_inverted_sd_dema_rsi_indicator,
        evaluate_conditions_fn=evaluate_inverted_sd_dema_rsi_conditions,
        category='Momentum'
    ),
    
    'KVO': IndicatorMetadata(
        name='Klinger Volume Oscillator',
        description='Volume-based oscillator using trend direction and volume force',
        parameters={
            'fast_len': {'type': 'int', 'default': 34, 'min': 5, 'max': 100, 'description': 'Fast EMA length'},
            'slow_len': {'type': 'int', 'default': 55, 'min': 10, 'max': 200, 'description': 'Slow EMA length'}
        },
        conditions={
            'kvo_long': 'KVO long signal',
            'kvo_short': 'KVO short signal',
            'kvo_bullish': 'KVO bullish condition'
        },
        compute_fn=compute_kvo_indicator,
        evaluate_conditions_fn=evaluate_kvo_conditions,
        category='Volume'
    ),
    
    'STC': IndicatorMetadata(
        name='Schaff Trend Cycle',
        description='MACD-based stochastic oscillator for trend identification',
        parameters={
            'length': {'type': 'int', 'default': 10, 'min': 5, 'max': 50, 'description': 'Stochastic length'},
            'fast_length': {'type': 'int', 'default': 23, 'min': 5, 'max': 50, 'description': 'Fast EMA length'},
            'slow_length': {'type': 'int', 'default': 50, 'min': 10, 'max': 100, 'description': 'Slow EMA length'}
        },
        conditions={
            'stc_long': 'STC long signal',
            'stc_short': 'STC short signal',
            'stc_bullish': 'STC bullish condition'
        },
        compute_fn=compute_stc_indicator,
        evaluate_conditions_fn=evaluate_stc_conditions,
        category='Momentum'
    ),
    
    'ERI': IndicatorMetadata(
        name='Elder Ray Index',
        description='Bull and bear power indicator based on EMA',
        parameters={
            'length': {'type': 'int', 'default': 13, 'min': 5, 'max': 50, 'description': 'EMA length'}
        },
        conditions={
            'eri_long': 'ERI long signal',
            'eri_short': 'ERI short signal',
            'eri_bullish': 'ERI bullish condition'
        },
        compute_fn=compute_eri_indicator,
        evaluate_conditions_fn=evaluate_eri_conditions,
        category='Momentum'
    ),
    
    'CMO': IndicatorMetadata(
        name='Chande Momentum Oscillator',
        description='Momentum oscillator comparing sum of gains to sum of losses',
        parameters={
            'length': {'type': 'int', 'default': 14, 'min': 5, 'max': 50, 'description': 'CMO length'}
        },
        conditions={
            'cmo_long': 'CMO long signal',
            'cmo_short': 'CMO short signal',
            'cmo_bullish': 'CMO bullish condition'
        },
        compute_fn=compute_cmo_indicator,
        evaluate_conditions_fn=evaluate_cmo_conditions,
        category='Momentum'
    ),
    
    'FisherTransform': IndicatorMetadata(
        name='Fisher Transform',
        description='Price transformation indicator for identifying trend reversals',
        parameters={
            'length': {'type': 'int', 'default': 10, 'min': 5, 'max': 50, 'description': 'Period length'}
        },
        conditions={
            'fisher_transform_long': 'Fisher Transform long signal',
            'fisher_transform_short': 'Fisher Transform short signal',
            'fisher_transform_bullish': 'Fisher Transform bullish condition'
        },
        compute_fn=compute_fisher_transform_indicator,
        evaluate_conditions_fn=evaluate_fisher_transform_conditions,
        category='Momentum'
    ),
    
    
    'DisparityIndex': IndicatorMetadata(
        name='Disparity Index',
        description='Disparity Index measuring price deviation from moving average',
        parameters={
            'lookback': {'type': 'int', 'default': 14, 'min': 5, 'max': 50, 'description': 'Lookback period'},
            'smoothing': {'type': 'str', 'default': 'EMA', 'description': 'Smoothing method (EMA or SMA)'}
        },
        conditions={
            'disparity_index_long': 'Disparity Index long signal',
            'disparity_index_short': 'Disparity Index short signal',
            'disparity_index_bullish': 'Disparity Index bullish condition'
        },
        compute_fn=compute_disparity_index_indicator,
        evaluate_conditions_fn=evaluate_disparity_index_conditions,
        category='Momentum'
    ),
    
}


def get_indicator_metadata(indicator_id: str) -> IndicatorMetadata:
    """Get metadata for a specific indicator."""
    if indicator_id not in INDICATOR_REGISTRY:
        raise ValueError(f"Unknown indicator: {indicator_id}")
    return INDICATOR_REGISTRY[indicator_id]


def get_all_indicators() -> Dict[str, IndicatorMetadata]:
    """Get all available indicators."""
    return INDICATOR_REGISTRY.copy()


def get_available_conditions(indicators: List[Dict[str, Any]]) -> List[str]:
    """Get all available condition names for a list of indicators."""
    conditions = []
    for indicator_config in indicators:
        indicator_id = indicator_config['id']
        if indicator_id in INDICATOR_REGISTRY:
            metadata = INDICATOR_REGISTRY[indicator_id]
            conditions.extend(metadata.conditions.keys())
    return sorted(list(set(conditions)))


def compute_indicators(df: pd.DataFrame, indicators: List[Dict[str, Any]]) -> pd.DataFrame:
    """Compute all indicators and add to DataFrame."""
    result_df = df.copy()
    
    for indicator_config in indicators:
        indicator_id = indicator_config['id']
        params = indicator_config['params']
        
        if indicator_id in INDICATOR_REGISTRY:
            metadata = INDICATOR_REGISTRY[indicator_id]
            result_df = metadata.compute_fn(result_df, params)
    
    return result_df


def evaluate_all_conditions(df: pd.DataFrame, indicators: List[Dict[str, Any]]) -> Dict[str, pd.Series]:
    """Evaluate all conditions for a list of indicators."""
    all_conditions = {}
    
    for indicator_config in indicators:
        indicator_id = indicator_config['id']
        params = indicator_config['params']
        
        if indicator_id in INDICATOR_REGISTRY:
            metadata = INDICATOR_REGISTRY[indicator_id]
            conditions = metadata.evaluate_conditions_fn(df, params)
            all_conditions.update(conditions)
        # Custom indicators feature removed during aggressive cleanup.
    
    return all_conditions


def load_custom_indicator_from_db(indicator_id: str, db_session) -> Optional[IndicatorMetadata]:
    """
    Custom indicator loading removed during aggressive cleanup.
    """
    return None
