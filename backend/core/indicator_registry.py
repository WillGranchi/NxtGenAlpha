"""
Indicator Registry for Modular Strategy Builder.

This module provides a registry of available technical indicators with their
metadata, parameters, and condition generation functions.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Callable
from .indicators import sma, ema, rsi, bollinger_bands, macd, stochastic, williams_r, atr


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
    
    return all_conditions
