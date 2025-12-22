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
    )
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
        elif indicator_id.startswith('custom_'):
            # Handle custom indicators
            # Custom indicators are loaded dynamically from database
            # This will be handled by the backtest route
            pass
    
    return all_conditions


def load_custom_indicator_from_db(indicator_id: str, db_session) -> Optional[IndicatorMetadata]:
    """
    Load a custom indicator from the database and create IndicatorMetadata.
    
    Args:
        indicator_id: Custom indicator ID (format: 'custom_{database_id}')
        db_session: Database session
        
    Returns:
        IndicatorMetadata if found, None otherwise
    """
    try:
        # Extract database ID from indicator_id (format: 'custom_123')
        if not indicator_id.startswith('custom_'):
            return None
        
        db_id = int(indicator_id.replace('custom_', ''))
        
        from backend.api.models.db_models import CustomIndicator
        custom_ind = db_session.query(CustomIndicator).filter(
            CustomIndicator.id == db_id
        ).first()
        
        if not custom_ind:
            return None
        
        # Create compute function wrapper
        def compute_custom_indicator(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
            from backend.core.custom_indicator_executor import execute_custom_indicator
            result = execute_custom_indicator(
                custom_ind.code,
                custom_ind.function_name,
                df,
                params
            )
            df[f'Custom_{custom_ind.id}'] = result
            return df
        
        # Create evaluate conditions function wrapper
        def evaluate_custom_conditions(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, pd.Series]:
            from backend.core.custom_indicator_executor import execute_custom_indicator
            indicator_col = f'Custom_{custom_ind.id}'
            
            if indicator_col not in df.columns:
                df = compute_custom_indicator(df, params)
            
            conditions = {}
            for cond_name, cond_desc in custom_ind.conditions.items():
                # Generate condition based on common patterns
                if 'above' in cond_name.lower():
                    conditions[cond_name] = df[indicator_col] > df['Close']
                elif 'below' in cond_name.lower():
                    conditions[cond_name] = df[indicator_col] < df['Close']
                elif 'cross' in cond_name.lower() and 'above' in cond_name.lower():
                    conditions[cond_name] = (df[indicator_col] > df['Close']) & (df[indicator_col].shift(1) <= df['Close'].shift(1))
                elif 'cross' in cond_name.lower() and 'below' in cond_name.lower():
                    conditions[cond_name] = (df[indicator_col] < df['Close']) & (df[indicator_col].shift(1) >= df['Close'].shift(1))
                else:
                    # Default: indicator > 0
                    conditions[cond_name] = df[indicator_col] > 0
            
            return conditions
        
        return IndicatorMetadata(
            name=custom_ind.name,
            description=custom_ind.description or f"Custom indicator: {custom_ind.name}",
            parameters=custom_ind.parameters,
            conditions=custom_ind.conditions,
            compute_fn=compute_custom_indicator,
            evaluate_conditions_fn=evaluate_custom_conditions,
            category=custom_ind.category
        )
        
    except Exception as e:
        logger.error(f"Error loading custom indicator {indicator_id}: {e}")
        return None
