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


if __name__ == "__main__":
    # Test the indicators with sample data
    import sys
    sys.path.append('..')
    from data_loader import load_btc_data
    
    try:
        # Load sample data
        df = load_btc_data("../data/btc_price.csv")
        
        # Add indicators
        df_with_indicators = add_indicators(df)
        
        print("Indicators added successfully!")
        print(f"DataFrame shape: {df_with_indicators.shape}")
        print(f"New columns: {[col for col in df_with_indicators.columns if col not in df.columns]}")
        
        # Show some sample values
        print("\nSample SMA values:")
        print(df_with_indicators[['Close', 'SMA_20', 'SMA_50', 'SMA_200']].tail())
        
    except Exception as e:
        print(f"Error: {e}")
