"""
Technical indicators module for Bitcoin trading strategy.

This module contains functions to calculate various technical indicators
used in trading strategies, including moving averages, RSI, and others.
"""

import pandas as pd
import numpy as np
from typing import Union, Optional


def sma(data: pd.Series, window: int) -> pd.Series:
    """
    Calculate Simple Moving Average (SMA).
    
    Args:
        data (pd.Series): Price data (typically Close prices)
        window (int): Number of periods for the moving average
        
    Returns:
        pd.Series: SMA values
    """
    return data.rolling(window=window).mean()


def ema(data: pd.Series, window: int, alpha: Optional[float] = None) -> pd.Series:
    """
    Calculate Exponential Moving Average (EMA).
    
    Args:
        data (pd.Series): Price data (typically Close prices)
        window (int): Number of periods for the moving average
        alpha (float, optional): Smoothing factor. If None, calculated as 2/(window+1)
        
    Returns:
        pd.Series: EMA values
    """
    if alpha is None:
        alpha = 2.0 / (window + 1)
    
    return data.ewm(alpha=alpha, adjust=False).mean()


def rsi(data: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculate Relative Strength Index (RSI).
    
    Args:
        data (pd.Series): Price data (typically Close prices)
        period (int): Number of periods for RSI calculation (default: 14)
        
    Returns:
        pd.Series: RSI values (0-100)
    """
    # Calculate price changes
    delta = data.diff()
    
    # Separate gains and losses
    gains = delta.where(delta > 0, 0)
    losses = -delta.where(delta < 0, 0)
    
    # Calculate average gains and losses using EMA
    avg_gains = gains.ewm(alpha=1/period, adjust=False).mean()
    avg_losses = losses.ewm(alpha=1/period, adjust=False).mean()
    
    # Calculate RS and RSI
    rs = avg_gains / avg_losses
    rsi = 100 - (100 / (1 + rs))
    
    return rsi


def bollinger_bands(data: pd.Series, window: int = 20, num_std: float = 2) -> tuple:
    """
    Calculate Bollinger Bands.
    
    Args:
        data (pd.Series): Price data (typically Close prices)
        window (int): Number of periods for the moving average
        num_std (float): Number of standard deviations for the bands
        
    Returns:
        tuple: (upper_band, middle_band, lower_band)
    """
    middle_band = sma(data, window)
    std = data.rolling(window=window).std()
    
    upper_band = middle_band + (std * num_std)
    lower_band = middle_band - (std * num_std)
    
    return upper_band, middle_band, lower_band


def macd(data: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> tuple:
    """
    Calculate MACD (Moving Average Convergence Divergence).
    
    Args:
        data (pd.Series): Price data (typically Close prices)
        fast (int): Fast EMA period
        slow (int): Slow EMA period
        signal (int): Signal line EMA period
        
    Returns:
        tuple: (macd_line, signal_line, histogram)
    """
    ema_fast = ema(data, fast)
    ema_slow = ema(data, slow)
    
    macd_line = ema_fast - ema_slow
    signal_line = ema(macd_line, signal)
    histogram = macd_line - signal_line
    
    return macd_line, signal_line, histogram


def stochastic(high: pd.Series, low: pd.Series, close: pd.Series, 
               k_period: int = 14, d_period: int = 3) -> tuple:
    """
    Calculate Stochastic Oscillator.
    
    Args:
        high (pd.Series): High prices
        low (pd.Series): Low prices
        close (pd.Series): Close prices
        k_period (int): %K period
        d_period (int): %D period (SMA of %K)
        
    Returns:
        tuple: (%K, %D)
    """
    lowest_low = low.rolling(window=k_period).min()
    highest_high = high.rolling(window=k_period).max()
    
    k_percent = 100 * ((close - lowest_low) / (highest_high - lowest_low))
    d_percent = k_percent.rolling(window=d_period).mean()
    
    return k_percent, d_percent


def williams_r(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculate Williams %R.
    
    Args:
        high (pd.Series): High prices
        low (pd.Series): Low prices
        close (pd.Series): Close prices
        period (int): Lookback period
        
    Returns:
        pd.Series: Williams %R values
    """
    highest_high = high.rolling(window=period).max()
    lowest_low = low.rolling(window=period).min()
    
    williams_r = -100 * ((highest_high - close) / (highest_high - lowest_low))
    
    return williams_r


def atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculate Average True Range (ATR).
    
    Args:
        high (pd.Series): High prices
        low (pd.Series): Low prices
        close (pd.Series): Close prices
        period (int): ATR period
        
    Returns:
        pd.Series: ATR values
    """
    # Calculate True Range components
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    
    # True Range is the maximum of the three
    true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    # ATR is the EMA of True Range
    atr = ema(true_range, period)
    
    return atr


def cci(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 20) -> pd.Series:
    """
    Calculate Commodity Channel Index (CCI).
    
    Args:
        high (pd.Series): High prices
        low (pd.Series): Low prices
        close (pd.Series): Close prices
        period (int): CCI period (default: 20)
        
    Returns:
        pd.Series: CCI values
    """
    # Typical Price
    tp = (high + low + close) / 3
    
    # Simple Moving Average of Typical Price
    sma_tp = sma(tp, period)
    
    # Mean Deviation
    mean_deviation = tp.rolling(window=period).apply(
        lambda x: np.mean(np.abs(x - x.mean())), raw=True
    )
    
    # CCI calculation
    cci = (tp - sma_tp) / (0.015 * mean_deviation)
    
    return cci


def momentum(close: pd.Series, period: int = 10) -> pd.Series:
    """
    Calculate Momentum indicator.
    
    Args:
        close (pd.Series): Close prices
        period (int): Momentum period (default: 10)
        
    Returns:
        pd.Series: Momentum values
    """
    return close.diff(period)


def adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculate Average Directional Index (ADX).
    
    Args:
        high (pd.Series): High prices
        low (pd.Series): Low prices
        close (pd.Series): Close prices
        period (int): ADX period (default: 14)
        
    Returns:
        pd.Series: ADX values (0-100)
    """
    # Calculate True Range
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    # Calculate Directional Movement
    plus_dm = high.diff()
    minus_dm = -low.diff()
    
    plus_dm[plus_dm < 0] = 0
    minus_dm[minus_dm < 0] = 0
    
    # When both move in same direction, set the smaller to zero
    both_directions = (plus_dm > minus_dm) & (minus_dm > 0)
    minus_dm[both_directions] = 0
    both_directions = (minus_dm > plus_dm) & (plus_dm > 0)
    plus_dm[both_directions] = 0
    
    # Smooth the values using Wilder's smoothing (EMA-like)
    atr_smoothed = tr.ewm(alpha=1/period, adjust=False).mean()
    plus_di = 100 * (plus_dm.ewm(alpha=1/period, adjust=False).mean() / atr_smoothed)
    minus_di = 100 * (minus_dm.ewm(alpha=1/period, adjust=False).mean() / atr_smoothed)
    
    # Calculate DX
    dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
    
    # Calculate ADX (smoothed DX)
    adx = dx.ewm(alpha=1/period, adjust=False).mean()
    
    return adx


def parabolic_sar(high: pd.Series, low: pd.Series, close: pd.Series, 
                  af_start: float = 0.02, af_increment: float = 0.02, 
                  af_max: float = 0.2) -> pd.Series:
    """
    Calculate Parabolic SAR (Stop and Reverse).
    
    Args:
        high (pd.Series): High prices
        low (pd.Series): Low prices
        close (pd.Series): Close prices
        af_start (float): Acceleration factor start (default: 0.02)
        af_increment (float): Acceleration factor increment (default: 0.02)
        af_max (float): Maximum acceleration factor (default: 0.2)
        
    Returns:
        pd.Series: Parabolic SAR values
    """
    sar = pd.Series(index=close.index, dtype=float)
    trend = pd.Series(index=close.index, dtype=int)  # 1 = uptrend, -1 = downtrend
    af = pd.Series(index=close.index, dtype=float)
    ep = pd.Series(index=close.index, dtype=float)  # Extreme point
    
    # Initialize
    sar.iloc[0] = low.iloc[0]
    trend.iloc[0] = 1
    af.iloc[0] = af_start
    ep.iloc[0] = high.iloc[0]
    
    for i in range(1, len(close)):
        prev_sar = sar.iloc[i-1]
        prev_trend = trend.iloc[i-1]
        prev_af = af.iloc[i-1]
        prev_ep = ep.iloc[i-1]
        
        if prev_trend == 1:  # Uptrend
            sar.iloc[i] = prev_sar + prev_af * (prev_ep - prev_sar)
            sar.iloc[i] = min(sar.iloc[i], low.iloc[i-1], low.iloc[i])
            
            if high.iloc[i] > prev_ep:
                ep.iloc[i] = high.iloc[i]
                af.iloc[i] = min(prev_af + af_increment, af_max)
            else:
                ep.iloc[i] = prev_ep
                af.iloc[i] = prev_af
            
            if low.iloc[i] < sar.iloc[i]:
                trend.iloc[i] = -1
                sar.iloc[i] = prev_ep
                ep.iloc[i] = low.iloc[i]
                af.iloc[i] = af_start
            else:
                trend.iloc[i] = 1
        else:  # Downtrend
            sar.iloc[i] = prev_sar + prev_af * (prev_ep - prev_sar)
            sar.iloc[i] = max(sar.iloc[i], high.iloc[i-1], high.iloc[i])
            
            if low.iloc[i] < prev_ep:
                ep.iloc[i] = low.iloc[i]
                af.iloc[i] = min(prev_af + af_increment, af_max)
            else:
                ep.iloc[i] = prev_ep
                af.iloc[i] = prev_af
            
            if high.iloc[i] > sar.iloc[i]:
                trend.iloc[i] = 1
                sar.iloc[i] = prev_ep
                ep.iloc[i] = high.iloc[i]
                af.iloc[i] = af_start
            else:
                trend.iloc[i] = -1
    
    return sar


def ichimoku_cloud(high: pd.Series, low: pd.Series, close: pd.Series,
                   tenkan_period: int = 9, kijun_period: int = 26,
                   senkou_b_period: int = 52, displacement: int = 26) -> tuple:
    """
    Calculate Ichimoku Cloud components.
    
    Args:
        high (pd.Series): High prices
        low (pd.Series): Low prices
        close (pd.Series): Close prices
        tenkan_period (int): Tenkan-sen period (default: 9)
        kijun_period (int): Kijun-sen period (default: 26)
        senkou_b_period (int): Senkou Span B period (default: 52)
        displacement (int): Displacement for cloud (default: 26)
        
    Returns:
        tuple: (tenkan_sen, kijun_sen, senkou_span_a, senkou_span_b, chikou_span)
    """
    # Tenkan-sen (Conversion Line)
    tenkan_high = high.rolling(window=tenkan_period).max()
    tenkan_low = low.rolling(window=tenkan_period).min()
    tenkan_sen = (tenkan_high + tenkan_low) / 2
    
    # Kijun-sen (Base Line)
    kijun_high = high.rolling(window=kijun_period).max()
    kijun_low = low.rolling(window=kijun_period).min()
    kijun_sen = (kijun_high + kijun_low) / 2
    
    # Senkou Span A (Leading Span A)
    senkou_span_a = ((tenkan_sen + kijun_sen) / 2).shift(displacement)
    
    # Senkou Span B (Leading Span B)
    senkou_high = high.rolling(window=senkou_b_period).max()
    senkou_low = low.rolling(window=senkou_b_period).min()
    senkou_span_b = ((senkou_high + senkou_low) / 2).shift(displacement)
    
    # Chikou Span (Lagging Span)
    chikou_span = close.shift(-displacement)
    
    return tenkan_sen, kijun_sen, senkou_span_a, senkou_span_b, chikou_span


def obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    """
    Calculate On-Balance Volume (OBV).
    
    Args:
        close (pd.Series): Close prices
        volume (pd.Series): Volume data
        
    Returns:
        pd.Series: OBV values
    """
    obv = pd.Series(index=close.index, dtype=float)
    obv.iloc[0] = volume.iloc[0]
    
    for i in range(1, len(close)):
        if close.iloc[i] > close.iloc[i-1]:
            obv.iloc[i] = obv.iloc[i-1] + volume.iloc[i]
        elif close.iloc[i] < close.iloc[i-1]:
            obv.iloc[i] = obv.iloc[i-1] - volume.iloc[i]
        else:
            obv.iloc[i] = obv.iloc[i-1]
    
    return obv


def volume_sma(volume: pd.Series, period: int = 20) -> pd.Series:
    """
    Calculate Volume Simple Moving Average.
    
    Args:
        volume (pd.Series): Volume data
        period (int): SMA period (default: 20)
        
    Returns:
        pd.Series: Volume SMA values
    """
    return sma(volume, period)


def keltner_channels(high: pd.Series, low: pd.Series, close: pd.Series,
                    period: int = 20, multiplier: float = 2.0) -> tuple:
    """
    Calculate Keltner Channels.
    
    Args:
        high (pd.Series): High prices
        low (pd.Series): Low prices
        close (pd.Series): Close prices
        period (int): EMA period (default: 20)
        multiplier (float): ATR multiplier (default: 2.0)
        
    Returns:
        tuple: (upper_band, middle_band, lower_band)
    """
    middle_band = ema(close, period)
    atr_values = atr(high, low, close, period)
    
    upper_band = middle_band + (multiplier * atr_values)
    lower_band = middle_band - (multiplier * atr_values)
    
    return upper_band, middle_band, lower_band


def add_indicators(df: pd.DataFrame, 
                  sma_windows: list = [20, 50, 200],
                  ema_windows: list = [12, 26],
                  rsi_period: int = 14,
                  bb_window: int = 20,
                  bb_std: float = 2) -> pd.DataFrame:
    """
    Add multiple technical indicators to a DataFrame.
    
    Args:
        df (pd.DataFrame): DataFrame with OHLC data
        sma_windows (list): List of SMA window periods
        ema_windows (list): List of EMA window periods
        rsi_period (int): RSI period
        bb_window (int): Bollinger Bands window
        bb_std (float): Bollinger Bands standard deviation multiplier
        
    Returns:
        pd.DataFrame: DataFrame with added indicator columns
    """
    df_indicators = df.copy()
    
    # Add SMAs
    for window in sma_windows:
        df_indicators[f'SMA_{window}'] = sma(df['Close'], window)
    
    # Add EMAs
    for window in ema_windows:
        df_indicators[f'EMA_{window}'] = ema(df['Close'], window)
    
    # Add RSI
    df_indicators['RSI'] = rsi(df['Close'], rsi_period)
    
    # Add Bollinger Bands
    bb_upper, bb_middle, bb_lower = bollinger_bands(df['Close'], bb_window, bb_std)
    df_indicators['BB_Upper'] = bb_upper
    df_indicators['BB_Middle'] = bb_middle
    df_indicators['BB_Lower'] = bb_lower
    
    # Add MACD
    macd_line, signal_line, histogram = macd(df['Close'])
    df_indicators['MACD'] = macd_line
    df_indicators['MACD_Signal'] = signal_line
    df_indicators['MACD_Histogram'] = histogram
    
    # Add Stochastic
    stoch_k, stoch_d = stochastic(df['High'], df['Low'], df['Close'])
    df_indicators['Stoch_K'] = stoch_k
    df_indicators['Stoch_D'] = stoch_d
    
    # Add Williams %R
    df_indicators['Williams_R'] = williams_r(df['High'], df['Low'], df['Close'])
    
    # Add ATR
    df_indicators['ATR'] = atr(df['High'], df['Low'], df['Close'])
    
    return df_indicators


