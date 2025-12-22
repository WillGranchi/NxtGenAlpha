"""
PineScript Indicator Conversions

This module contains Python implementations of indicators converted from PineScript.
These indicators are integrated into the indicator registry system.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any
from .indicators import (
    rma, atr_from_df, ema, sma, dema, rsi, crossover, crossunder, nz, fixnan,
    wma, hma, pvt, percentile_nearest_rank, true_range, change, tema, vwma,
    smma, lsma, alma, hyperbolic_ma, highest, lowest, stdev, zscore, roc,
    momentum as mom_func, double_smooth, cci, williams_r
)


def rsi_trail_signal(df: pd.DataFrame, f_rsi_lower: int, f_rsi_upper: int) -> pd.Series:
    """
    RSI Trail indicator - generates signals based on RSI trail bounds.
    
    Converted from PineScript RSITrail function.
    
    Args:
        df: DataFrame with OHLCV data
        f_rsi_lower: Lower RSI threshold
        f_rsi_upper: Upper RSI threshold
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    # Calculate OHLC4
    ohlc4 = (df['Open'] + df['High'] + df['Low'] + df['Close']) / 4
    
    # Calculate base MA and range
    f_ma_base = rma(ohlc4, 27)
    _range = atr_from_df(df, 27)
    
    # Calculate bounds
    f_upper_bound = f_ma_base + (f_rsi_upper - 50) / 10 * _range
    f_lower_bound = f_ma_base - (50 - f_rsi_lower) / 10 * _range
    
    # Detect crossovers
    bull_cross = crossover(ohlc4, f_upper_bound)
    bear_cross = crossunder(df['Close'], f_lower_bound)
    
    # Track state (var bool in PineScript)
    is_bullish = pd.Series(False, index=df.index, dtype=bool)
    is_bearish = pd.Series(False, index=df.index, dtype=bool)
    
    # Initialize signal series
    signal = pd.Series(0, index=df.index, dtype=int)
    
    # Process signals row by row (to handle state properly)
    for i in range(len(df)):
        if i > 0:
            # Carry forward previous state
            is_bullish.iloc[i] = is_bullish.iloc[i-1]
            is_bearish.iloc[i] = is_bearish.iloc[i-1]
        
        # Check for bullish crossover
        if bull_cross.iloc[i]:
            bull_signal = not is_bullish.iloc[i]
            if bull_signal:
                signal.iloc[i] = 1
            is_bullish.iloc[i] = True
            is_bearish.iloc[i] = False
        
        # Check for bearish crossunder
        if bear_cross.iloc[i]:
            bear_signal = not is_bearish.iloc[i]
            if bear_signal:
                signal.iloc[i] = -1
            is_bullish.iloc[i] = False
            is_bearish.iloc[i] = True
    
    return signal


def lwst_signal(df: pd.DataFrame, supertrend_type: str, factor2: float, pd2: int, fast: int, slow: int) -> pd.Series:
    """
    Liquidity Weighted Supertrend indicator.
    
    Converted from PineScript LWST function.
    
    Args:
        df: DataFrame with OHLCV data
        supertrend_type: "Aggressive" or other
        factor2: Supertrend factor
        pd2: ATR period
        fast: Fast EMA period
        slow: Slow EMA period
        
    Returns:
        Series with signals: 1 for long, -1 for short
    """
    thresh = 10
    
    # Calculate liquidity
    price_diff = df['Close'] - df['Open']
    liquidity = df['Volume'] / np.abs(price_diff.replace(0, np.nan))
    bound = ema(liquidity.fillna(0), thresh) + liquidity.rolling(window=thresh).std().fillna(0)
    
    # Track liquidity array (keep last 5 crossover values)
    liq_values = []
    liq_cross = crossover(liquidity.fillna(0), bound)
    
    # Build g_base from liquidity crossovers
    g_base = pd.Series(index=df.index, dtype=float)
    for i in range(len(df)):
        if liq_cross.iloc[i]:
            liq_values.append(df['Close'].iloc[i])
            if len(liq_values) > 5:
                liq_values.pop(0)
        
        if len(liq_values) > 0:
            g_base.iloc[i] = liq_values[-1]
        else:
            g_base.iloc[i] = df['Close'].iloc[i]
    
    g = ema(g_base, fast)
    h = ema(g_base, slow)
    
    # Calculate HL2 LWMA
    hl2 = (df['High'] + df['Low']) / 2
    if supertrend_type == "Aggressive":
        hl2_lwma = ema(hl2, fast)
    else:
        hl2_lwma = sma(hl2, slow)
    
    # Supertrend calculation
    atr_val = atr_from_df(df, pd2)
    Up2 = hl2_lwma - (factor2 * atr_val)
    Dn2 = hl2_lwma + (factor2 * atr_val)
    
    # Initialize trend arrays
    TrendUp2 = Up2.copy()
    TrendDown2 = Dn2.copy()
    
    # Calculate trend
    for i in range(1, len(df)):
        if df['Close'].iloc[i-1] > TrendUp2.iloc[i-1]:
            TrendUp2.iloc[i] = max(Up2.iloc[i], TrendUp2.iloc[i-1])
        if df['Close'].iloc[i-1] < TrendDown2.iloc[i-1]:
            TrendDown2.iloc[i] = min(Dn2.iloc[i], TrendDown2.iloc[i-1])
    
    # Determine trend
    Trend2 = pd.Series(1, index=df.index, dtype=int)
    for i in range(1, len(df)):
        if df['Close'].iloc[i] <= TrendDown2.iloc[i-1]:
            if df['Close'].iloc[i] < TrendUp2.iloc[i-1]:
                Trend2.iloc[i] = -1
            else:
                Trend2.iloc[i] = Trend2.iloc[i-1] if i > 0 else 1
    
    # Convert to signal
    signal = pd.Series(1, index=df.index, dtype=int)
    signal[Trend2 == -1] = -1
    
    return signal


def ssd_signal(df: pd.DataFrame, len_dema: int, src_dema: float, src_demal: float, 
               len: int, len_sd: int, len_dema_sd: int, src_dema_sd: float) -> pd.Series:
    """
    SMA Standard Deviation indicator.
    
    Converted from PineScript SSD function.
    
    Args:
        df: DataFrame with OHLCV data
        len_dema: DEMA length
        src_dema: Source for DEMA (typically close price)
        src_demal: Source for DEMA low
        len: SMA length
        len_sd: Standard deviation length
        len_dema_sd: DEMA SD length
        src_dema_sd: Source for DEMA SD
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    # Get source series (assuming src_dema is close price index)
    dema_src = df['Close'] if src_dema == 0 else df['Close']  # Simplified
    demal_src = df['Low'] if src_demal == 0 else df['Low']  # Simplified
    dema_sd_src = df['Close'] if src_dema_sd == 0 else df['Close']  # Simplified
    
    demas = dema(dema_src, len_dema)
    demal = dema(demal_src, len_dema)
    
    sma_val = sma(df['Close'], len)
    
    mainl = demal > sma_val
    mains = demas < sma_val
    
    sd = sma_val.rolling(window=len_sd).std()
    sd_upper = sma_val + sd
    sd_lower = sma_val - sd
    
    dema_sd = dema(dema_sd_src, len_dema_sd)
    
    sd_s = dema_sd < sd_upper
    invert_l = ~sd_s
    
    L = mainl & invert_l
    S = mains
    
    signal = pd.Series(0, index=df.index, dtype=int)
    signal[L] = 1
    signal[S] = -1
    
    return signal


def vtsp_signal(df: pd.DataFrame, x: int, y: int) -> pd.Series:
    """
    Volume Trend Swing Points indicator.
    
    Converted from PineScript VTSP function.
    
    Args:
        df: DataFrame with OHLCV data
        x: Period for highest
        y: Period for lowest
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    # Calculate PVT (Price Volume Trend)
    pvt_values = pvt(df['Close'], df['Volume'])
    
    h = pvt_values.rolling(window=x).max()
    l = pvt_values.rolling(window=y).min()
    
    L_cond = pvt_values == h
    S_cond = pvt_values == l
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    # Track previous state
    prev_signal = 0
    for i in range(len(df)):
        if L_cond.iloc[i] and not S_cond.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S_cond.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def dema_dmi_signal(df: pd.DataFrame, len_dema: int, adx_smoothing_len: int, di_len: int) -> pd.Series:
    """
    DEMA DMI (Directional Movement Index) indicator.
    
    Converted from PineScript DemaDMI function.
    
    Args:
        df: DataFrame with OHLCV data
        len_dema: DEMA length
        adx_smoothing_len: ADX smoothing length
        di_len: DI length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    demah = dema(df['High'], len_dema)
    demal = dema(df['Low'], len_dema)
    
    u = demah.diff()
    d = -demal.diff()
    p = u.where((u > d) & (u > 0), 0)
    m = d.where((d > u) & (d > 0), 0)
    
    # Calculate True Range for DEMA
    tr1 = df['High'] - df['Low']
    tr2 = abs(df['High'] - df['Close'].shift(1))
    tr3 = abs(df['Low'] - df['Close'].shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    t = rma(tr, di_len)
    
    plus = fixnan(100 * rma(p, di_len) / t)
    minus = fixnan(100 * rma(m, di_len) / t)
    sum_val = plus + minus
    adx = 100 * rma(abs(plus - minus) / sum_val.replace(0, 1), adx_smoothing_len)
    
    x = adx > adx.shift(1)
    dmil = (plus > minus) & x
    dmis = minus > plus
    
    L = dmil
    S = dmis
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def ewma_signal(df: pd.DataFrame, len: int, src: float) -> pd.Series:
    """
    EWMA (Exponential Weighted Moving Average) indicator.
    
    Converted from PineScript Ewma function.
    
    Args:
        df: DataFrame with OHLCV data
        len: Length period
        src: Source (typically close price)
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    src_series = df['Close'] if src == 0 else df['Close']  # Simplified
    
    ewma_val = ema(wma(src_series, len), len)
    
    L = ewma_val > ewma_val.shift(1)
    S = ewma_val < ewma_val.shift(1)
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def ema_zscore_signal(df: pd.DataFrame, len: int, src: float, lookback: int, 
                      threshold_l: float, threshold_s: float) -> pd.Series:
    """
    EMA Z-score indicator.
    
    Converted from PineScript EmaZScore function.
    
    Args:
        df: DataFrame with OHLCV data
        len: EMA length
        src: Source (typically close price)
        lookback: Lookback period for mean/std
        threshold_l: Long threshold
        threshold_s: Short threshold
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    src_series = df['Close'] if src == 0 else df['Close']  # Simplified
    
    ema_val = ema(src_series, len)
    mean = ema(ema_val, lookback)
    std_dev = ema_val.rolling(window=lookback).std()
    z_score = (ema_val - mean) / std_dev.replace(0, np.nan)
    
    L = z_score > threshold_l
    S = z_score < threshold_s
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def dst_signal(df: pd.DataFrame, subject: int, mul: float, demalen: int, src: float) -> pd.Series:
    """
    DEMA Supertrend indicator.
    
    Converted from PineScript DST function.
    
    Args:
        df: DataFrame with OHLCV data
        subject: ATR period
        mul: Multiplier
        demalen: DEMA length
        src: Source (typically close price)
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    src_series = df['Close'] if src == 0 else df['Close']  # Simplified
    
    dema_val = dema(src_series, demalen)
    atr_val = atr_from_df(df, subject)
    
    u = dema_val + mul * atr_val
    l = dema_val - mul * atr_val
    
    # Initialize arrays
    pl = nz(l.shift(1), l.iloc[0])
    pu = nz(u.shift(1), u.iloc[0])
    
    l_adj = l.copy()
    u_adj = u.copy()
    
    for i in range(1, len(df)):
        if l.iloc[i] > pl.iloc[i] or df['Close'].iloc[i-1] < pl.iloc[i]:
            l_adj.iloc[i] = l.iloc[i]
        else:
            l_adj.iloc[i] = pl.iloc[i]
        
        if u.iloc[i] < pu.iloc[i] or df['Close'].iloc[i-1] > pu.iloc[i]:
            u_adj.iloc[i] = u.iloc[i]
        else:
            u_adj.iloc[i] = pu.iloc[i]
        
        pl.iloc[i] = l_adj.iloc[i]
        pu.iloc[i] = u_adj.iloc[i]
    
    # Determine trend
    d = pd.Series(1, index=df.index, dtype=int)
    st = pd.Series(np.nan, index=df.index)
    
    for i in range(1, len(df)):
        if pd.isna(atr_val.iloc[i-1]):
            d.iloc[i] = 1
        elif i > 0 and not pd.isna(st.iloc[i-1]):
            if st.iloc[i-1] == pu.iloc[i-1]:
                d.iloc[i] = -1 if df['Close'].iloc[i] > u_adj.iloc[i] else 1
            else:
                d.iloc[i] = 1 if df['Close'].iloc[i] < l_adj.iloc[i] else -1
        else:
            d.iloc[i] = 1
        
        st.iloc[i] = l_adj.iloc[i] if d.iloc[i] == -1 else u_adj.iloc[i]
    
    stl = crossunder(d, pd.Series(0, index=df.index))
    sts = crossover(d, pd.Series(0, index=df.index))
    
    L = stl
    S = sts
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def msd_signal(df: pd.DataFrame, len_dema: int, median_len: int, atr_len: int, 
               atr_mul: float, len_sd: int) -> pd.Series:
    """
    Median Standard Deviation indicator.
    
    Converted from PineScript MSD function.
    
    Args:
        df: DataFrame with OHLCV data
        len_dema: DEMA length
        median_len: Median length
        atr_len: ATR length
        atr_mul: ATR multiplier
        len_sd: Standard deviation length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    dema_val = dema(df['Close'], len_dema)
    median = percentile_nearest_rank(dema_val, median_len, 50)
    atr_val = atr_mul * atr_from_df(df, atr_len)
    
    u = median + atr_val
    l = median - atr_val
    
    meu = df['Close'] > l
    mel = df['Close'] < u
    
    # Standard Deviation
    sd = median.rolling(window=len_sd).std()
    sdd = median + sd
    sdl = median - sd
    
    x = df['Close'] < sdd
    y = df['Close'] > sdl
    
    sd_s = ~y
    sd_l = ~x
    
    L = meu & sd_l
    S = mel
    
    signal = pd.Series(0, index=df.index, dtype=int)
    signal[L] = 1
    signal[S] = -1
    
    return signal


def dema_efi_signal(df: pd.DataFrame, dema_len: int, dema_src: float, length: int) -> pd.Series:
    """
    DEMA EFI Volume indicator.
    
    Converted from PineScript DemaEFI function.
    
    Args:
        df: DataFrame with OHLCV data
        dema_len: DEMA length
        dema_src: Source for DEMA (typically close price)
        length: EFI length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    dema_src_series = df['Close'] if dema_src == 0 else df['Close']  # Simplified
    dema_val = dema(dema_src_series, dema_len)
    
    efi = ema(dema_val.diff() * df['Volume'], length)
    
    bullish = df['Volume'] > df['Volume'].shift(1)
    bearish = df['Volume'] < df['Volume'].shift(1)
    
    efil = (efi > 0) & bullish
    efis = (efi < 0) & bearish
    
    L = efil
    S = efis
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def hsp_signal(df: pd.DataFrame, x: int, len: int) -> pd.Series:
    """
    HMA Swing Points indicator.
    
    Converted from PineScript HSP function.
    
    Args:
        df: DataFrame with OHLCV data
        x: Period for highest/lowest
        len: HMA length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    xy = hma(df['High'], len)
    xz = hma(df['Low'], len)
    
    h = xy.rolling(window=x).max()
    l = xz.rolling(window=x).min()
    
    L = xy == h
    S = xz == l
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def dema_afr_signal(df: pd.DataFrame, len: int, src: float, p: int, atr_factor: float) -> pd.Series:
    """
    DEMA Adaptive Filter Range indicator.
    
    Converted from PineScript DemaAFR function.
    
    Args:
        df: DataFrame with OHLCV data
        len: DEMA length
        src: Source (typically close price)
        p: ATR period
        atr_factor: ATR factor
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    src_series = df['Close'] if src == 0 else df['Close']  # Simplified
    
    dema_val = dema(src_series, len)
    atr_afr = atr_from_df(df, p)
    e = atr_afr * atr_factor
    
    afr = dema_val.copy()
    afr.iloc[0] = dema_val.iloc[0]
    
    atr_factory_high = dema_val + e
    atr_factory_low = dema_val - e
    
    for i in range(1, len(df)):
        if atr_factory_low.iloc[i] > afr.iloc[i-1]:
            afr.iloc[i] = atr_factory_low.iloc[i]
        elif atr_factory_high.iloc[i] < afr.iloc[i-1]:
            afr.iloc[i] = atr_factory_high.iloc[i]
        else:
            afr.iloc[i] = afr.iloc[i-1]
    
    afrl = (afr > afr.shift(1)) & ~(afr.shift(1) > afr.shift(2))
    afrs = (afr < afr.shift(1)) & ~(afr.shift(1) < afr.shift(2))
    
    L = afrl
    S = afrs
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def rsi_sd_signal(df: pd.DataFrame, len: int, src: float, sdlen: int) -> pd.Series:
    """
    RSI Standard Deviation indicator.
    
    Converted from PineScript RSIsd function.
    
    Args:
        df: DataFrame with OHLCV data
        len: RSI length
        src: Source (typically close price)
        sdlen: Standard deviation length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    src_series = df['Close'] if src == 0 else df['Close']  # Simplified
    
    rsi_val = rsi(src_series, len)
    
    atr_sd = rsi_val.rolling(window=sdlen).std()
    u = rsi_val + atr_sd
    d = rsi_val - atr_sd
    
    rsil = d > 50
    rsis = rsi_val < 50
    
    L = rsil
    S = rsis
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def inverted_sd_dema_rsi_signal(df: pd.DataFrame, sublen: int, sublen_2: int, len: int,
                                 threshold_l: int, threshold_s: int) -> pd.Series:
    """
    Inverted Standard Deviation DEMA RSI indicator.
    
    Converted from PineScript Inverted_SD_Dema_RSI function.
    
    Args:
        df: DataFrame with OHLCV data
        sublen: DEMA length
        sublen_2: Standard deviation length
        len: RSI length
        threshold_l: Long threshold
        threshold_s: Short threshold
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    dema_val = dema(df['Close'], sublen)
    rsi_val = rsi(dema_val, len)
    
    stdev = dema_val.rolling(window=sublen_2).std()
    u = dema_val + stdev
    d = dema_val - stdev
    
    supl = df['Close'] > d
    sups = df['Close'] < u
    
    L = (rsi_val > threshold_l) & ~sups
    S = rsi_val < threshold_s
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal

"""
Additional PineScript Indicator Conversions
"""

import pandas as pd
import numpy as np
from .indicators import (
    rma, atr_from_df, ema, sma, dema, rsi, crossover, crossunder, nz, fixnan,
    wma, hma, pvt, percentile_nearest_rank, true_range, change, tema, vwma,
    smma, lsma, alma, hyperbolic_ma, highest, lowest, stdev, zscore, roc,
    momentum as mom_func, double_smooth, cci, williams_r
)


def kvo_signal(df: pd.DataFrame, fast_len: int, slow_len: int) -> pd.Series:
    """
    Klinger Volume Oscillator indicator.
    
    Converted from PineScript KVO function.
    
    Args:
        df: DataFrame with OHLCV data
        fast_len: Fast EMA length
        slow_len: Slow EMA length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    # Calculate trend direction
    hl3 = (df['High'] + df['Low'] + df['Close']) / 3
    prev_hl3 = hl3.shift(1)
    dm = pd.Series(1, index=df.index)
    dm[hl3 <= prev_hl3] = -1
    
    # Calculate volume force
    hl_range = df['High'] - df['Low']
    hl_sum = df['High'] + df['Low']
    prev_close = df['Close'].shift(1)
    
    vf = df['Volume'] * dm * np.abs(
        2 * (hl_range / hl_sum.replace(0, np.nan)) - 
        ((df['High'] - prev_close) / (df['High'] + prev_close.replace(0, np.nan)))
    )
    
    # Calculate signal using EMA difference
    fast_ema = ema(vf, fast_len)
    slow_ema = ema(vf, slow_len)
    kvo = fast_ema - slow_ema
    
    # Generate signals
    L = kvo > 0
    S = kvo < 0
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def stc_signal(df: pd.DataFrame, length: int, fast_length: int, slow_length: int) -> pd.Series:
    """
    Schaff Trend Cycle indicator.
    
    Converted from PineScript STC function.
    
    Args:
        df: DataFrame with OHLCV data
        length: Stochastic length
        fast_length: Fast EMA length
        slow_length: Slow EMA length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    # Calculate fast and slow EMAs
    fast_ema = ema(df['Close'], fast_length)
    slow_ema = ema(df['Close'], slow_length)
    
    # Calculate MACD
    macd = fast_ema - slow_ema
    
    # Calculate Stochastic of MACD
    macd_low = lowest(macd, length)
    macd_high = highest(macd, length)
    macd_range = macd_high - macd_low
    
    k = pd.Series(0.0, index=df.index)
    k[macd_range != 0] = ((macd - macd_low) / macd_range.replace(0, np.nan) * 100)
    k = k.fillna(0)
    
    # Calculate second Stochastic
    d = ema(k, 3)
    d_low = lowest(d, length)
    d_high = highest(d, length)
    d_range = d_high - d_low
    
    stoch2 = pd.Series(0.0, index=df.index)
    stoch2[d_range != 0] = ((d - d_low) / d_range.replace(0, np.nan) * 100)
    stoch2 = stoch2.fillna(0)
    
    # Final smoothing
    fin = ema(stoch2, 3)
    
    # Generate signals
    L = fin > 50
    S = fin < 50
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def eri_signal(df: pd.DataFrame, length: int) -> pd.Series:
    """
    Elder Ray Index indicator.
    
    Converted from PineScript ERI function.
    
    Args:
        df: DataFrame with OHLCV data
        length: EMA length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    ema_val = ema(df['Close'], length)
    bull_power = df['High'] - ema_val
    bear_power = df['Low'] - ema_val
    
    bull_power_rising = bull_power > bull_power.shift(1)
    bear_power_rising = bear_power > bear_power.shift(1)
    bear_power_falling = bear_power < bear_power.shift(1)
    bull_power_falling = bull_power < bull_power.shift(1)
    
    ema_next = ema(df['Close'], length + 1)
    ema_cross_up = crossover(ema_val, ema_next)
    ema_cross_down = crossunder(ema_val, ema_next)
    ema_uptrend = ema_cross_up | (ema_val > ema_val.shift(1))
    ema_downtrend = ema_cross_down | (ema_val < ema_val.shift(1))
    
    buy_signal = ema_uptrend & (bull_power > 0) & bull_power_rising & (bear_power < 0) & bear_power_rising
    sell_signal = ema_downtrend & (bull_power < 0) & bull_power_falling & (bear_power > 0) & bear_power_falling
    
    signal = pd.Series(0, index=df.index, dtype=int)
    signal[buy_signal] = 1
    signal[sell_signal] = -1
    
    return signal


def cmo_signal(df: pd.DataFrame, length: int) -> pd.Series:
    """
    Chande Momentum Oscillator indicator.
    
    Converted from PineScript CMO function.
    
    Args:
        df: DataFrame with OHLCV data
        length: CMO length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    close = df['Close']
    up = (close - close.shift(1)).clip(lower=0)
    down = (close.shift(1) - close).clip(lower=0)
    
    up_sum = up.rolling(window=length).sum()
    down_sum = down.rolling(window=length).sum()
    
    total = up_sum + down_sum
    cmo_val = pd.Series(0.0, index=df.index)
    cmo_val[total != 0] = 100 * (up_sum - down_sum) / total.replace(0, np.nan)
    
    # Generate signals
    L = cmo_val > 0
    S = cmo_val < 0
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def fisher_transform_signal(df: pd.DataFrame, length: int) -> pd.Series:
    """
    Fisher Transform indicator.
    
    Converted from PineScript FT function.
    
    Args:
        df: DataFrame with OHLCV data
        length: Period length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    close = df['Close']
    
    # Calculate highest high and lowest low
    hi = highest(close, length)
    lo = lowest(close, length)
    
    # Normalize price between -1 and 1
    value = pd.Series(0.0, index=df.index)
    range_val = hi - lo
    value[range_val != 0] = 0.66 * ((2 * ((close - lo) / range_val.replace(0, np.nan))) - 1)
    
    # Apply smoothing
    value = 0.5 * value + 0.5 * value.shift(1).fillna(0)
    
    # Constrain value
    value = value.clip(lower=-0.999, upper=0.999)
    
    # Calculate Fisher Transform
    fisher = 0.5 * np.log((1 + value) / (1 - value))
    
    # Smooth the result
    fisher_smooth = 0.5 * fisher + 0.5 * fisher.shift(1).fillna(0)
    
    # Generate signals based on crossovers
    fisher_cross_up = crossover(fisher_smooth, fisher_smooth.shift(1))
    fisher_cross_down = crossunder(fisher_smooth, fisher_smooth.shift(1))
    
    signal = pd.Series(0, index=df.index, dtype=int)
    signal[fisher_cross_up] = 1
    signal[fisher_cross_down] = -1
    
    return signal


def bb_percent_signal(df: pd.DataFrame, bb_len: int, bb_mul: float, bb_zlen: int) -> pd.Series:
    """
    Bollinger Band Percent with z-score indicator.
    
    Converted from PineScript f_BBpercent function.
    
    Args:
        df: DataFrame with OHLCV data
        bb_len: Bollinger Band length
        bb_mul: Bollinger Band multiplier
        bb_zlen: Z-score length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    z_scorebb = bb_percent(df['Close'], bb_len, bb_mul, bb_zlen)
    
    # Generate signals based on z-score
    L = z_scorebb > 0
    S = z_scorebb < 0
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def tsi_signal(df: pd.DataFrame, tsi_long: int, tsi_short: int, tsi_zlen: int) -> pd.Series:
    """
    True Strength Index with z-score indicator.
    
    Converted from PineScript f_tsi function.
    
    Args:
        df: DataFrame with OHLCV data
        tsi_long: Long smoothing period
        tsi_short: Short smoothing period
        tsi_zlen: Z-score length
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    z_tsi = tsi(df['Close'], tsi_long, tsi_short, tsi_zlen)
    
    # Generate signals based on z-score
    L = z_tsi > 0
    S = z_tsi < 0
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def disparity_index_signal(df: pd.DataFrame, lookback: int, smoothing: str = 'EMA') -> pd.Series:
    """
    Disparity Index indicator.
    
    Converted from PineScript f_disparity_index function.
    
    Args:
        df: DataFrame with OHLCV data
        lookback: Lookback period
        smoothing: Smoothing method ('EMA' or 'SMA')
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    di = disparity_index(df['Close'], lookback, smoothing)
    
    # Generate signals based on disparity index
    L = di > 0
    S = di < 0
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def chande_momentum_oscillator_signal(df: pd.DataFrame, lookback: int) -> pd.Series:
    """
    Chande Momentum Oscillator indicator (alternative calculation).
    
    Converted from PineScript f_chande_momentum_oscillator function.
    
    Args:
        df: DataFrame with OHLCV data
        lookback: Lookback period
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    chandeMO = chande_momentum_oscillator(df['Close'], lookback)
    
    # Generate signals
    L = chandeMO > 0
    S = chandeMO < 0
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def rapr_1_signal(df: pd.DataFrame, metric_lookback: int, valuation_lookback: int) -> pd.Series:
    """
    RAPR 1 indicator - Risk-Adjusted Performance Ratio.
    
    Converted from PineScript f_rapr_1 function.
    
    Args:
        df: DataFrame with OHLCV data
        metric_lookback: Metric lookback period
        valuation_lookback: Valuation lookback period
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    rapr_results = rapr_1(df['Close'], metric_lookback, valuation_lookback)
    
    # Combine z-scores (average or use Sharpe as primary)
    combined_score = (
        rapr_results['z_sharpe'].fillna(0) +
        rapr_results['z_sortino'].fillna(0) +
        rapr_results['z_omega'].fillna(0)
    ) / 3
    
    # Generate signals
    L = combined_score > 0
    S = combined_score < 0
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal


def rapr_2_signal(df: pd.DataFrame, metric_lookback: int, valuation_lookback: int) -> pd.Series:
    """
    RAPR 2 indicator - Risk-Adjusted Performance Ratio (robust variant).
    
    Converted from PineScript f_rapr_2 function.
    
    Args:
        df: DataFrame with OHLCV data
        metric_lookback: Metric lookback period
        valuation_lookback: Valuation lookback period
        
    Returns:
        Series with signals: 1 for long, -1 for short, 0 for neutral
    """
    rapr_results = rapr_2(df['Close'], metric_lookback, valuation_lookback)
    
    # Combine z-scores (average or use Sharpe as primary)
    combined_score = (
        rapr_results['z_sharpe'].fillna(0) +
        rapr_results['z_sortino'].fillna(0) +
        rapr_results['z_omega'].fillna(0)
    ) / 3
    
    # Generate signals
    L = combined_score > 0
    S = combined_score < 0
    
    signal = pd.Series(0, index=df.index, dtype=int)
    
    prev_signal = 0
    for i in range(len(df)):
        if L.iloc[i] and not S.iloc[i]:
            signal.iloc[i] = 1
            prev_signal = 1
        elif S.iloc[i]:
            signal.iloc[i] = -1
            prev_signal = -1
        else:
            signal.iloc[i] = prev_signal
    
    return signal

