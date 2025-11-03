"""
Trading strategy module for Bitcoin backtesting.

This module implements various trading strategies including SMA crossover,
RSI-based strategies, and other technical analysis approaches.
"""

import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any
from .indicators import sma, ema, rsi, bollinger_bands, macd


class SMAStrategy:
    """
    Simple Moving Average Crossover Strategy.
    
    This strategy generates buy signals when the fast SMA crosses above the slow SMA
    and sell signals when the fast SMA crosses below the slow SMA.
    """
    
    def __init__(self, fast_window: int = 50, slow_window: int = 200):
        """
        Initialize SMA strategy.
        
        Args:
            fast_window (int): Fast SMA window period
            slow_window (int): Slow SMA window period
        """
        self.fast_window = fast_window
        self.slow_window = slow_window
        self.name = f"SMA Crossover ({fast_window}/{slow_window})"
    
    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals based on SMA crossover.
        
        Args:
            df (pd.DataFrame): DataFrame with OHLC data and indicators
            
        Returns:
            pd.DataFrame: DataFrame with signal columns added
        """
        df_signals = df.copy()
        
        # Calculate SMAs
        df_signals[f'SMA_{self.fast_window}'] = sma(df['Close'], self.fast_window)
        df_signals[f'SMA_{self.slow_window}'] = sma(df['Close'], self.slow_window)
        
        # Generate signals
        df_signals['Signal'] = 0  # 0 = hold, 1 = buy, -1 = sell
        
        # Buy signal: fast SMA crosses above slow SMA
        df_signals.loc[
            (df_signals[f'SMA_{self.fast_window}'] > df_signals[f'SMA_{self.slow_window}']) &
            (df_signals[f'SMA_{self.fast_window}'].shift(1) <= df_signals[f'SMA_{self.slow_window}'].shift(1)),
            'Signal'
        ] = 1
        
        # Sell signal: fast SMA crosses below slow SMA
        df_signals.loc[
            (df_signals[f'SMA_{self.fast_window}'] < df_signals[f'SMA_{self.slow_window}']) &
            (df_signals[f'SMA_{self.fast_window}'].shift(1) >= df_signals[f'SMA_{self.slow_window}'].shift(1)),
            'Signal'
        ] = -1
        
        # Position tracking - convert signals to positions
        # 1 = buy signal, -1 = sell signal, 0 = hold
        # Position: 1 = long, 0 = cash
        df_signals['Position'] = 0  # Start with cash position
        
        # Track position changes and clean up signals
        current_position = 0
        for i in range(len(df_signals)):
            signal = df_signals['Signal'].iloc[i]
            if signal == 1 and current_position == 0:  # Buy signal when in cash
                current_position = 1
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = 1  # Keep buy signal
            elif signal == -1 and current_position == 1:  # Sell signal when in long
                current_position = 0
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = -1  # Keep sell signal
            else:
                # No position change, remove signal
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = 0
            df_signals.iloc[i, df_signals.columns.get_loc('Position')] = current_position
        
        return df_signals


class RSIStrategy:
    """
    RSI-based trading strategy.
    
    This strategy generates buy signals when RSI is oversold (< 30)
    and sell signals when RSI is overbought (> 70).
    """
    
    def __init__(self, rsi_period: int = 14, oversold: float = 30, overbought: float = 70):
        """
        Initialize RSI strategy.
        
        Args:
            rsi_period (int): RSI calculation period
            oversold (float): Oversold threshold
            overbought (float): Overbought threshold
        """
        self.rsi_period = rsi_period
        self.oversold = oversold
        self.overbought = overbought
        self.name = f"RSI Strategy ({oversold}/{overbought})"
    
    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals based on RSI.
        
        Args:
            df (pd.DataFrame): DataFrame with OHLC data
            
        Returns:
            pd.DataFrame: DataFrame with signal columns added
        """
        df_signals = df.copy()
        
        # Calculate RSI
        df_signals['RSI'] = rsi(df['Close'], self.rsi_period)
        
        # Generate signals
        df_signals['Signal'] = 0
        
        # Buy signal: RSI crosses above oversold level
        df_signals.loc[
            (df_signals['RSI'] > self.oversold) &
            (df_signals['RSI'].shift(1) <= self.oversold),
            'Signal'
        ] = 1
        
        # Sell signal: RSI crosses below overbought level
        df_signals.loc[
            (df_signals['RSI'] < self.overbought) &
            (df_signals['RSI'].shift(1) >= self.overbought),
            'Signal'
        ] = -1
        
        # Position tracking - convert signals to positions
        df_signals['Position'] = 0  # Start with cash position
        
        # Track position changes and clean up signals
        current_position = 0
        for i in range(len(df_signals)):
            signal = df_signals['Signal'].iloc[i]
            if signal == 1 and current_position == 0:  # Buy signal when in cash
                current_position = 1
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = 1  # Keep buy signal
            elif signal == -1 and current_position == 1:  # Sell signal when in long
                current_position = 0
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = -1  # Keep sell signal
            else:
                # No position change, remove signal
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = 0
            df_signals.iloc[i, df_signals.columns.get_loc('Position')] = current_position
        
        return df_signals


class BollingerBandsStrategy:
    """
    Bollinger Bands mean reversion strategy.
    
    This strategy generates buy signals when price touches the lower band
    and sell signals when price touches the upper band.
    """
    
    def __init__(self, window: int = 20, num_std: float = 2):
        """
        Initialize Bollinger Bands strategy.
        
        Args:
            window (int): Bollinger Bands window period
            num_std (float): Number of standard deviations for bands
        """
        self.window = window
        self.num_std = num_std
        self.name = f"Bollinger Bands ({window}, {num_std}σ)"
    
    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals based on Bollinger Bands.
        
        Args:
            df (pd.DataFrame): DataFrame with OHLC data
            
        Returns:
            pd.DataFrame: DataFrame with signal columns added
        """
        df_signals = df.copy()
        
        # Calculate Bollinger Bands
        bb_upper, bb_middle, bb_lower = bollinger_bands(df['Close'], self.window, self.num_std)
        df_signals['BB_Upper'] = bb_upper
        df_signals['BB_Middle'] = bb_middle
        df_signals['BB_Lower'] = bb_lower
        
        # Generate signals
        df_signals['Signal'] = 0
        
        # Buy signal: price touches or goes below lower band
        df_signals.loc[df['Close'] <= bb_lower, 'Signal'] = 1
        
        # Sell signal: price touches or goes above upper band
        df_signals.loc[df['Close'] >= bb_upper, 'Signal'] = -1
        
        # Position tracking - convert signals to positions
        df_signals['Position'] = 0  # Start with cash position
        
        # Track position changes and clean up signals
        current_position = 0
        for i in range(len(df_signals)):
            signal = df_signals['Signal'].iloc[i]
            if signal == 1 and current_position == 0:  # Buy signal when in cash
                current_position = 1
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = 1  # Keep buy signal
            elif signal == -1 and current_position == 1:  # Sell signal when in long
                current_position = 0
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = -1  # Keep sell signal
            else:
                # No position change, remove signal
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = 0
            df_signals.iloc[i, df_signals.columns.get_loc('Position')] = current_position
        
        return df_signals


class MACDStrategy:
    """
    MACD crossover strategy.
    
    This strategy generates buy signals when MACD line crosses above signal line
    and sell signals when MACD line crosses below signal line.
    """
    
    def __init__(self, fast: int = 12, slow: int = 26, signal: int = 9):
        """
        Initialize MACD strategy.
        
        Args:
            fast (int): Fast EMA period
            slow (int): Slow EMA period
            signal (int): Signal line EMA period
        """
        self.fast = fast
        self.slow = slow
        self.signal = signal
        self.name = f"MACD Strategy ({fast}/{slow}/{signal})"
    
    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals based on MACD.
        
        Args:
            df (pd.DataFrame): DataFrame with OHLC data
            
        Returns:
            pd.DataFrame: DataFrame with signal columns added
        """
        df_signals = df.copy()
        
        # Calculate MACD
        macd_line, signal_line, histogram = macd(df['Close'], self.fast, self.slow, self.signal)
        df_signals['MACD'] = macd_line
        df_signals['MACD_Signal'] = signal_line
        df_signals['MACD_Histogram'] = histogram
        
        # Generate signals
        df_signals['Signal'] = 0
        
        # Buy signal: MACD crosses above signal line
        df_signals.loc[
            (macd_line > signal_line) &
            (macd_line.shift(1) <= signal_line.shift(1)),
            'Signal'
        ] = 1
        
        # Sell signal: MACD crosses below signal line
        df_signals.loc[
            (macd_line < signal_line) &
            (macd_line.shift(1) >= signal_line.shift(1)),
            'Signal'
        ] = -1
        
        # Position tracking - convert signals to positions
        df_signals['Position'] = 0  # Start with cash position
        
        # Track position changes and clean up signals
        current_position = 0
        for i in range(len(df_signals)):
            signal = df_signals['Signal'].iloc[i]
            if signal == 1 and current_position == 0:  # Buy signal when in cash
                current_position = 1
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = 1  # Keep buy signal
            elif signal == -1 and current_position == 1:  # Sell signal when in long
                current_position = 0
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = -1  # Keep sell signal
            else:
                # No position change, remove signal
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = 0
            df_signals.iloc[i, df_signals.columns.get_loc('Position')] = current_position
        
        return df_signals


class CombinedStrategy:
    """
    Combined strategy using multiple indicators.
    
    This strategy combines signals from multiple indicators to generate
    more robust trading signals.
    """
    
    def __init__(self, sma_fast: int = 50, sma_slow: int = 200, 
                 rsi_period: int = 14, rsi_oversold: float = 30, rsi_overbought: float = 70):
        """
        Initialize combined strategy.
        
        Args:
            sma_fast (int): Fast SMA window
            sma_slow (int): Slow SMA window
            rsi_period (int): RSI period
            rsi_oversold (float): RSI oversold threshold
            rsi_overbought (float): RSI overbought threshold
        """
        self.sma_fast = sma_fast
        self.sma_slow = sma_slow
        self.rsi_period = rsi_period
        self.rsi_oversold = rsi_oversold
        self.rsi_overbought = rsi_overbought
        self.name = f"Combined Strategy (SMA {sma_fast}/{sma_slow} + RSI {rsi_period})"
    
    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate combined trading signals.
        
        Args:
            df (pd.DataFrame): DataFrame with OHLC data
            
        Returns:
            pd.DataFrame: DataFrame with signal columns added
        """
        df_signals = df.copy()
        
        # Calculate indicators
        df_signals[f'SMA_{self.sma_fast}'] = sma(df['Close'], self.sma_fast)
        df_signals[f'SMA_{self.sma_slow}'] = sma(df['Close'], self.sma_slow)
        df_signals['RSI'] = rsi(df['Close'], self.rsi_period)
        
        # Initialize signals
        df_signals['Signal'] = 0
        df_signals['SMA_Signal'] = 0
        df_signals['RSI_Signal'] = 0
        
        # SMA signals
        df_signals.loc[
            (df_signals[f'SMA_{self.sma_fast}'] > df_signals[f'SMA_{self.sma_slow}']) &
            (df_signals[f'SMA_{self.sma_fast}'].shift(1) <= df_signals[f'SMA_{self.sma_slow}'].shift(1)),
            'SMA_Signal'
        ] = 1
        
        df_signals.loc[
            (df_signals[f'SMA_{self.sma_fast}'] < df_signals[f'SMA_{self.sma_slow}']) &
            (df_signals[f'SMA_{self.sma_fast}'].shift(1) >= df_signals[f'SMA_{self.sma_slow}'].shift(1)),
            'SMA_Signal'
        ] = -1
        
        # RSI signals
        df_signals.loc[
            (df_signals['RSI'] > self.rsi_oversold) &
            (df_signals['RSI'].shift(1) <= self.rsi_oversold),
            'RSI_Signal'
        ] = 1
        
        df_signals.loc[
            (df_signals['RSI'] < self.rsi_overbought) &
            (df_signals['RSI'].shift(1) >= self.rsi_overbought),
            'RSI_Signal'
        ] = -1
        
        # Combined signals (both indicators must agree)
        df_signals.loc[
            (df_signals['SMA_Signal'] == 1) & (df_signals['RSI_Signal'] == 1),
            'Signal'
        ] = 1
        
        df_signals.loc[
            (df_signals['SMA_Signal'] == -1) & (df_signals['RSI_Signal'] == -1),
            'Signal'
        ] = -1
        
        # Position tracking - convert signals to positions
        df_signals['Position'] = 0  # Start with cash position
        
        # Track position changes and clean up signals
        current_position = 0
        for i in range(len(df_signals)):
            signal = df_signals['Signal'].iloc[i]
            if signal == 1 and current_position == 0:  # Buy signal when in cash
                current_position = 1
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = 1  # Keep buy signal
            elif signal == -1 and current_position == 1:  # Sell signal when in long
                current_position = 0
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = -1  # Keep sell signal
            else:
                # No position change, remove signal
                df_signals.iloc[i, df_signals.columns.get_loc('Signal')] = 0
            df_signals.iloc[i, df_signals.columns.get_loc('Position')] = current_position
        
        return df_signals


def get_available_strategies() -> Dict[str, Any]:
    """
    Get dictionary of available trading strategies.
    
    Returns:
        Dict[str, Any]: Dictionary mapping strategy names to strategy classes
    """
    return {
        'SMA Crossover': SMAStrategy,
        'RSI Strategy': RSIStrategy,
        'Bollinger Bands': BollingerBandsStrategy,
        'MACD Strategy': MACDStrategy,
        'Combined Strategy': CombinedStrategy
    }


if __name__ == "__main__":
    # Test the strategies
    import sys
    sys.path.append('..')
    from data_loader import load_btc_data
    
    try:
        # Load sample data
        df = load_btc_data("../data/btc_price.csv")
        
        # Test SMA strategy
        sma_strategy = SMAStrategy(50, 200)
        df_with_signals = sma_strategy.generate_signals(df)
        
        print(f"Strategy: {sma_strategy.name}")
        print(f"Total signals generated: {(df_with_signals['Signal'] != 0).sum()}")
        print(f"Buy signals: {(df_with_signals['Signal'] == 1).sum()}")
        print(f"Sell signals: {(df_with_signals['Signal'] == -1).sum()}")
        
        # Show some signal examples
        signals = df_with_signals[df_with_signals['Signal'] != 0][['Close', 'Signal', 'Position']].head(10)
        print("\nSample signals:")
        print(signals)
        
    except Exception as e:
        print(f"Error: {e}")
