"""
Technical indicators module for Bitcoin trading strategy.

This module contains functions to calculate various technical indicators
used in trading strategies, including moving averages, RSI, and others.
"""

import pandas as pd
import numpy as np
from typing import Union, Optional, Dict


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


def atr_from_df(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    Calculate ATR from DataFrame (helper for PineScript conversions).
    
    Args:
        df (pd.DataFrame): DataFrame with High, Low, Close columns
        period (int): ATR period
        
    Returns:
        pd.Series: ATR values
    """
    return atr(df['High'], df['Low'], df['Close'], period)


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


def dema(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Double Exponential Moving Average (DEMA).
    
    DEMA = 2*EMA(data, period) - EMA(EMA(data, period), period)
    
    Args:
        data (pd.Series): Price data
        period (int): Period for DEMA calculation
        
    Returns:
        pd.Series: DEMA values
    """
    ema1 = ema(data, period)
    ema2 = ema(ema1, period)
    return 2 * ema1 - ema2


def wma(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Weighted Moving Average (WMA).
    
    Args:
        data (pd.Series): Price data
        period (int): Period for WMA calculation
        
    Returns:
        pd.Series: WMA values
    """
    weights = np.arange(1, period + 1)
    return data.rolling(window=period).apply(
        lambda x: np.dot(x, weights) / weights.sum(), raw=True
    )


def rma(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Rolling Moving Average (RMA) / Wilder's Smoothing.
    
    RMA uses Wilder's smoothing: alpha = 1/period
    
    Args:
        data (pd.Series): Price data
        period (int): Period for RMA calculation
        
    Returns:
        pd.Series: RMA values
    """
    alpha = 1.0 / period
    return data.ewm(alpha=alpha, adjust=False).mean()


def hma(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Hull Moving Average (HMA).
    
    HMA = WMA(2*WMA(data, period/2) - WMA(data, period), sqrt(period))
    
    Args:
        data (pd.Series): Price data
        period (int): Period for HMA calculation
        
    Returns:
        pd.Series: HMA values
    """
    half_period = max(1, period // 2)
    sqrt_period = max(1, int(np.sqrt(period)))
    
    wma_half = wma(data, half_period)
    wma_full = wma(data, period)
    
    hma_input = 2 * wma_half - wma_full
    return wma(hma_input, sqrt_period)


def pvt(close: pd.Series, volume: pd.Series) -> pd.Series:
    """
    Calculate Price Volume Trend (PVT).
    
    PVT = cumulative sum of (price_change / previous_price * volume)
    
    Args:
        close (pd.Series): Close prices
        volume (pd.Series): Volume data
        
    Returns:
        pd.Series: PVT values
    """
    price_change = close.pct_change()
    pvt = (price_change * volume).fillna(0)
    return pvt.cumsum()


def percentile_nearest_rank(data: pd.Series, period: int, percentile: float) -> pd.Series:
    """
    Calculate percentile using nearest rank method.
    
    Args:
        data (pd.Series): Price data
        period (int): Rolling window period
        percentile (float): Percentile value (0-100)
        
    Returns:
        pd.Series: Percentile values
    """
    return data.rolling(window=period).quantile(percentile / 100.0, interpolation='nearest')


def crossover(series1: pd.Series, series2: pd.Series) -> pd.Series:
    """
    Detect when series1 crosses above series2.
    
    Args:
        series1 (pd.Series): First series
        series2 (pd.Series): Second series
        
    Returns:
        pd.Series: Boolean series indicating crossovers
    """
    return (series1 > series2) & (series1.shift(1) <= series2.shift(1))


def crossunder(series1: pd.Series, series2: pd.Series) -> pd.Series:
    """
    Detect when series1 crosses below series2.
    
    Args:
        series1 (pd.Series): First series
        series2 (pd.Series): Second series
        
    Returns:
        pd.Series: Boolean series indicating crossunders
    """
    return (series1 < series2) & (series1.shift(1) >= series2.shift(1))


def nz(value: pd.Series, default: float = 0.0) -> pd.Series:
    """
    Replace NaN values with default (PineScript nz() equivalent).
    
    Args:
        value (pd.Series): Series that may contain NaN
        default (float): Default value to use for NaN (default: 0.0)
        
    Returns:
        pd.Series: Series with NaN replaced by default
    """
    return value.fillna(default)


def fixnan(value: pd.Series) -> pd.Series:
    """
    Fix NaN values by forward filling (PineScript fixnan() equivalent).
    
    Args:
        value (pd.Series): Series that may contain NaN
        
    Returns:
        pd.Series: Series with NaN forward-filled
    """
    return value.ffill().fillna(0)


def true_range(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    """
    Calculate True Range (TR).
    
    TR = max(high - low, abs(high - prev_close), abs(low - prev_close))
    
    Args:
        high (pd.Series): High prices
        low (pd.Series): Low prices
        close (pd.Series): Close prices
        
    Returns:
        pd.Series: True Range values
    """
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    return pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)


def change(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate price change over period.
    
    Args:
        data (pd.Series): Price data
        period (int): Period for change calculation
        
    Returns:
        pd.Series: Change values
    """
    return data - data.shift(period)


def tema(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Triple Exponential Moving Average (TEMA).
    
    TEMA = 3*(EMA1 - EMA2) + EMA3
    where EMA1 = EMA(data, period)
          EMA2 = EMA(EMA1, period)
          EMA3 = EMA(EMA2, period)
    
    Args:
        data (pd.Series): Price data
        period (int): Period for TEMA calculation
        
    Returns:
        pd.Series: TEMA values
    """
    ema1 = ema(data, period)
    ema2 = ema(ema1, period)
    ema3 = ema(ema2, period)
    return 3 * (ema1 - ema2) + ema3


def vwma(price: pd.Series, volume: pd.Series, period: int) -> pd.Series:
    """
    Calculate Volume Weighted Moving Average (VWMA).
    
    Args:
        price (pd.Series): Price data
        volume (pd.Series): Volume data
        period (int): Period for VWMA calculation
        
    Returns:
        pd.Series: VWMA values
    """
    volume_price = price * volume
    return volume_price.rolling(window=period).sum() / volume.rolling(window=period).sum()


def smma(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Smoothed Moving Average (SMMA) / Modified Moving Average.
    
    SMMA = (SMMA[1] * (period - 1) + data) / period
    
    Args:
        data (pd.Series): Price data
        period (int): Period for SMMA calculation
        
    Returns:
        pd.Series: SMMA values
    """
    return data.ewm(alpha=1.0/period, adjust=False).mean()


def lsma(data: pd.Series, period: int, offset: int = 0) -> pd.Series:
    """
    Calculate Least Squares Moving Average (LSMA) / Linear Regression Moving Average.
    
    Args:
        data (pd.Series): Price data
        period (int): Period for LSMA calculation
        offset (int): Offset for projection (default: 0)
        
    Returns:
        pd.Series: LSMA values
    """
    def linear_regression(x_values, y_values):
        n = len(x_values)
        if n == 0:
            return np.nan
        sum_x = np.sum(x_values)
        sum_y = np.sum(y_values)
        sum_xy = np.sum(x_values * y_values)
        sum_x2 = np.sum(x_values ** 2)
        
        denominator = n * sum_x2 - sum_x ** 2
        if denominator == 0:
            return np.nan
        
        slope = (n * sum_xy - sum_x * sum_y) / denominator
        intercept = (sum_y - slope * sum_x) / n
        
        return slope * (period - 1 + offset) + intercept
    
    result = []
    for i in range(len(data)):
        if i < period - 1:
            result.append(np.nan)
        else:
            window = data.iloc[i - period + 1:i + 1].values
            x_values = np.arange(len(window))
            y_values = window
            result.append(linear_regression(x_values, y_values))
    
    return pd.Series(result, index=data.index)


def alma(data: pd.Series, period: int, offset: float = 0.85, sigma: float = 6.0) -> pd.Series:
    """
    Calculate Arnaud Legoux Moving Average (ALMA).
    
    Args:
        data (pd.Series): Price data
        period (int): Period for ALMA calculation
        offset (float): Offset parameter (default: 0.85)
        sigma (float): Sigma parameter (default: 6.0)
        
    Returns:
        pd.Series: ALMA values
    """
    m = int(np.floor(offset * (period - 1)))
    s = period / sigma
    
    def calculate_alma(window):
        if len(window) == 0:
            return np.nan
        alma_sum = 0.0
        norm_sum = 0.0
        for i, val in enumerate(window):
            if not np.isnan(val):
                weight = np.exp(-1 * ((i - m) ** 2) / (2 * (s ** 2)))
                norm_sum += weight
                alma_sum += val * weight
        return alma_sum / norm_sum if norm_sum > 0 else np.nan
    
    return data.rolling(window=period).apply(calculate_alma, raw=True)


def hyperbolic_ma(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Hyperbolic Moving Average (HyperMA).
    
    Uses hyperbolic weights: weight(i) = 1 / (period - i)
    
    Args:
        data (pd.Series): Price data
        period (int): Period for HyperMA calculation
        
    Returns:
        pd.Series: HyperMA values
    """
    def calculate_hyperma(window):
        if len(window) == 0:
            return np.nan
        sum_hyp = 0.0
        sum_weights = 0.0
        for i, val in enumerate(window):
            if not np.isnan(val):
                w = 1.0 / (len(window) - i) if (len(window) - i) > 0 else 0
                sum_hyp += val * w
                sum_weights += w
        return sum_hyp / sum_weights if sum_weights > 0 else np.nan
    
    return data.rolling(window=period).apply(calculate_hyperma, raw=True)


def highest(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate highest value over period.
    
    Args:
        data (pd.Series): Price data
        period (int): Period for highest calculation
        
    Returns:
        pd.Series: Highest values
    """
    return data.rolling(window=period).max()


def lowest(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate lowest value over period.
    
    Args:
        data (pd.Series): Price data
        period (int): Period for lowest calculation
        
    Returns:
        pd.Series: Lowest values
    """
    return data.rolling(window=period).min()


def stdev(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Standard Deviation.
    
    Args:
        data (pd.Series): Price data
        period (int): Period for standard deviation calculation
        
    Returns:
        pd.Series: Standard deviation values
    """
    return data.rolling(window=period).std()


def zscore(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Z-score (standardized score).
    
    Z-score = (value - mean) / std_dev
    
    Args:
        data (pd.Series): Price data
        period (int): Period for z-score calculation
        
    Returns:
        pd.Series: Z-score values
    """
    mean_val = sma(data, period)
    std_val = stdev(data, period)
    return (data - mean_val) / std_val.replace(0, np.nan)


def roc(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Rate of Change (ROC).
    
    ROC = (current - previous) / previous * 100
    
    Args:
        data (pd.Series): Price data
        period (int): Period for ROC calculation
        
    Returns:
        pd.Series: ROC values (as percentage)
    """
    previous = data.shift(period)
    return ((data - previous) / previous.replace(0, np.nan)) * 100


def momentum(data: pd.Series, period: int) -> pd.Series:
    """
    Calculate Momentum.
    
    Momentum = current - previous[period]
    
    Args:
        data (pd.Series): Price data
        period (int): Period for momentum calculation
        
    Returns:
        pd.Series: Momentum values
    """
    return data - data.shift(period)


def double_smooth(data: pd.Series, long_period: int, short_period: int) -> pd.Series:
    """
    Calculate double smoothing (EMA of EMA).
    
    Args:
        data (pd.Series): Price data
        long_period (int): Long EMA period
        short_period (int): Short EMA period
        
    Returns:
        pd.Series: Double smoothed values
    """
    first_smooth = ema(data, long_period)
    return ema(first_smooth, short_period)


def f_roc(data: pd.Series) -> pd.Series:
    """
    Calculate rate of change (normalized to decimal).
    
    Args:
        data (pd.Series): Price data
        
    Returns:
        pd.Series: ROC values as decimal (not percentage)
    """
    roc_val = roc(data, 1)
    return roc_val / 100


def bb_percent(data: pd.Series, bb_len: int, bb_mul: float, bb_zlen: int) -> pd.Series:
    """
    Calculate Bollinger Band Percent with z-score.
    
    Args:
        data (pd.Series): Price data
        bb_len (int): Bollinger Band length
        bb_mul (float): Bollinger Band multiplier
        bb_zlen (int): Z-score length
        
    Returns:
        pd.Series: Z-score of Bollinger Band Percent
    """
    basis = sma(data, bb_len)
    dev = bb_mul * stdev(data, bb_len)
    upperbb = basis + dev
    lowerbb = basis - dev
    bbr = (data - lowerbb) / (upperbb - lowerbb).replace(0, np.nan)
    z_scorebb = zscore(bbr, bb_zlen)
    return z_scorebb


def tsi(data: pd.Series, tsi_long: int, tsi_short: int, tsi_zlen: int) -> pd.Series:
    """
    Calculate True Strength Index with z-score.
    
    Args:
        data (pd.Series): Price data
        tsi_long (int): Long smoothing period
        tsi_short (int): Short smoothing period
        tsi_zlen (int): Z-score length
        
    Returns:
        pd.Series: Z-score of TSI
    """
    pc = change(data, 1)
    double_smoothed_pc = double_smooth(pc, tsi_long, tsi_short)
    double_smoothed_abs_pc = double_smooth(pc.abs(), tsi_long, tsi_short)
    tsi_value = 100 * (double_smoothed_pc / double_smoothed_abs_pc.replace(0, np.nan))
    z_tsi = zscore(tsi_value, tsi_zlen)
    return z_tsi


def disparity_index(data: pd.Series, lookback: int, smoothing: str = 'EMA') -> pd.Series:
    """
    Calculate Disparity Index.
    
    Args:
        data (pd.Series): Price data
        lookback (int): Lookback period
        smoothing (str): Smoothing method ('EMA' or 'SMA')
        
    Returns:
        pd.Series: Disparity Index values
    """
    if smoothing == 'EMA':
        ma = ema(data, lookback)
    else:
        ma = sma(data, lookback)
    
    di = 100 * (data - ma) / ma.replace(0, np.nan)
    return di


def chande_momentum_oscillator(data: pd.Series, lookback: int) -> pd.Series:
    """
    Calculate Chande Momentum Oscillator.
    
    Args:
        data (pd.Series): Price data
        lookback (int): Lookback period
        
    Returns:
        pd.Series: CMO values
    """
    momm = change(data, 1)
    m1 = momm.clip(lower=0)  # f1: >= 0 ? m : 0
    m2 = (-momm).clip(lower=0)  # f2: >= 0 ? 0 : -m
    sm1 = m1.rolling(window=lookback).sum()
    sm2 = m2.rolling(window=lookback).sum()
    
    total = sm1 + sm2
    chandeMO = pd.Series(0.0, index=data.index)
    chandeMO[total != 0] = 100 * (sm1 - sm2) / total.replace(0, np.nan)
    return chandeMO


def calculate_rapr_ratios(data: pd.Series, length: int) -> Dict[str, pd.Series]:
    """
    Calculate RAPR (Risk-Adjusted Performance Ratio) metrics.
    
    Args:
        data (pd.Series): Price data
        length (int): Lookback length
        
    Returns:
        Dict with 'srt' (Sortino), 'srp' (Sharpe), 'omg' (Omega) ratios
    """
    # Calculate returns
    rtr = data / data.shift(1) - 1
    
    # Separate positive and negative returns
    a_prtr = rtr.clip(lower=0)  # Positive returns
    a_nrtr = (-rtr).clip(lower=0)  # Negative returns (absolute)
    
    # Calculate ratios
    rtr_mean = rtr.rolling(window=length).mean()
    rtr_std = rtr.rolling(window=length).std()
    nrtr_std = a_nrtr.rolling(window=length).std()
    
    prtr_sum = a_prtr.rolling(window=length).sum()
    nrtr_sum = a_nrtr.rolling(window=length).sum()
    
    # Sortino ratio: mean / negative std * sqrt(length)
    srt = (rtr_mean / nrtr_std.replace(0, np.nan)) * np.sqrt(length)
    
    # Sharpe ratio: mean / std * sqrt(length)
    srp = (rtr_mean / rtr_std.replace(0, np.nan)) * np.sqrt(length)
    
    # Omega ratio: positive sum / negative sum * -1
    omega = pd.Series(0.0, index=data.index)
    omega[nrtr_sum != 0] = (prtr_sum / nrtr_sum.replace(0, np.nan)) * (-1)
    
    return {
        'srt': srt,
        'srp': srp,
        'omg': omega
    }


def rapr_1(data: pd.Series, metric_lookback: int, valuation_lookback: int) -> Dict[str, pd.Series]:
    """
    Calculate RAPR 1 indicators.
    
    Args:
        data (pd.Series): Price data
        metric_lookback (int): Metric lookback period
        valuation_lookback (int): Valuation lookback period
        
    Returns:
        Dict with z-scores for Sharpe, Sortino, and Omega
    """
    rapr_1_src = data.shift(valuation_lookback)
    rapr_1_len = 50
    
    ratios = calculate_rapr_ratios(rapr_1_src, rapr_1_len)
    
    z_scoresharpe = zscore(ratios['srp'], metric_lookback)
    z_scoresortino = zscore(ratios['srt'], metric_lookback)
    z_scoreomega = zscore(ratios['omg'], metric_lookback)
    
    return {
        'z_sharpe': z_scoresharpe,
        'z_sortino': z_scoresortino,
        'z_omega': z_scoreomega
    }


def rapr_2(data: pd.Series, metric_lookback: int, valuation_lookback: int) -> Dict[str, pd.Series]:
    """
    Calculate RAPR 2 indicators.
    
    Args:
        data (pd.Series): Price data
        metric_lookback (int): Metric lookback period
        valuation_lookback (int): Valuation lookback period
        
    Returns:
        Dict with z-scores for Sharpe, Sortino, and Omega
    """
    rapr_2_src = data.shift(valuation_lookback)
    rapr_2_len = 30
    rapr_2_rob_len = 4
    rapr_2_med_len = 20
    
    # Calculate different lengths
    lengths = [
        rapr_2_len,
        rapr_2_len + (rapr_2_rob_len * 1),
        rapr_2_len + (rapr_2_rob_len * 2),
        rapr_2_len + (rapr_2_rob_len * 3),
        rapr_2_len - (rapr_2_rob_len * 1),
        rapr_2_len - (rapr_2_rob_len * 2),
        rapr_2_len - (rapr_2_rob_len * 3),
    ]
    
    # Calculate ratios for each length
    all_ratios = []
    for length in lengths:
        ratios = calculate_rapr_ratios(rapr_2_src, length)
        all_ratios.append(ratios)
    
    # Calculate median for each ratio type
    def calculate_median_ratio(ratio_key: str) -> pd.Series:
        ratio_series = [r[ratio_key] for r in all_ratios]
        df_ratios = pd.DataFrame(ratio_series).T
        return df_ratios.rolling(window=rapr_2_med_len).median().mean(axis=1)
    
    Sharpe = calculate_median_ratio('srp')
    Sortino = calculate_median_ratio('srt')
    Omega = calculate_median_ratio('omg')
    
    # Calculate z-scores
    Z_Sharpe = zscore(Sharpe, metric_lookback)
    Z_Sortino = zscore(Sortino, metric_lookback)
    Z_Omega = zscore(Omega, metric_lookback)
    
    return {
        'z_sharpe': Z_Sharpe,
        'z_sortino': Z_Sortino,
        'z_omega': Z_Omega
    }


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


