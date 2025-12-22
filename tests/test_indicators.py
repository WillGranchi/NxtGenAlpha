"""
Tests for technical indicators.

This module contains unit tests for all technical indicators to ensure
mathematical correctness and proper handling of edge cases.
"""

import pytest
import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from core.indicators import sma, ema, rsi, bollinger_bands, macd


class TestSMA:
    """Test Simple Moving Average calculations."""
    
    def test_sma_basic(self):
        """Test basic SMA calculation."""
        data = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        result = sma(data, 3)
        
        # First two values should be NaN
        assert pd.isna(result.iloc[0])
        assert pd.isna(result.iloc[1])
        
        # Third value should be (1+2+3)/3 = 2
        assert result.iloc[2] == 2.0
        
        # Fourth value should be (2+3+4)/3 = 3
        assert result.iloc[3] == 3.0
        
        # Last value should be (8+9+10)/3 = 9
        assert result.iloc[-1] == 9.0
    
    def test_sma_window_larger_than_data(self):
        """Test SMA with window larger than data length."""
        data = pd.Series([1, 2, 3])
        result = sma(data, 5)
        
        # All values should be NaN
        assert result.isna().all()
    
    def test_sma_single_value(self):
        """Test SMA with single value."""
        data = pd.Series([5])
        result = sma(data, 1)
        
        # Should return the value itself
        assert result.iloc[0] == 5.0


class TestEMA:
    """Test Exponential Moving Average calculations."""
    
    def test_ema_basic(self):
        """Test basic EMA calculation."""
        data = pd.Series([1, 2, 3, 4, 5])
        result = ema(data, 3)
        
        # First value should be the first data point
        assert result.iloc[0] == 1.0
        
        # EMA should be calculated correctly
        alpha = 2 / (3 + 1)  # 0.5
        expected_1 = 1.0
        expected_2 = alpha * 2 + (1 - alpha) * expected_1  # 0.5 * 2 + 0.5 * 1 = 1.5
        expected_3 = alpha * 3 + (1 - alpha) * expected_2  # 0.5 * 3 + 0.5 * 1.5 = 2.25
        
        assert abs(result.iloc[1] - expected_2) < 1e-10
        assert abs(result.iloc[2] - expected_3) < 1e-10
    
    def test_ema_custom_alpha(self):
        """Test EMA with custom alpha."""
        data = pd.Series([1, 2, 3, 4, 5])
        alpha = 0.3
        result = ema(data, window=3, alpha=alpha)
        
        # First value should be the first data point
        assert result.iloc[0] == 1.0
        
        # Second value should use custom alpha
        expected_2 = alpha * 2 + (1 - alpha) * 1.0
        assert abs(result.iloc[1] - expected_2) < 1e-10


class TestRSI:
    """Test Relative Strength Index calculations."""
    
    def test_rsi_basic(self):
        """Test basic RSI calculation."""
        # Create data with clear trends
        data = pd.Series([100, 102, 101, 103, 105, 104, 106, 108, 107, 109])
        result = rsi(data, 5)
        
        # RSI should be between 0 and 100
        assert result.min() >= 0
        assert result.max() <= 100
        
        # First value should be NaN (need enough data for calculation)
        assert pd.isna(result.iloc[0])
        # RSI needs at least 2 periods to calculate, so second value might not be NaN
    
    def test_rsi_constant_data(self):
        """Test RSI with constant data."""
        data = pd.Series([100, 100, 100, 100, 100, 100, 100, 100, 100, 100])
        result = rsi(data, 5)
        
        # RSI should be 50 for constant data (no gains or losses)
        valid_values = result.dropna()
        assert all(abs(val - 50) < 1e-10 for val in valid_values)
    
    def test_rsi_uptrend(self):
        """Test RSI with strong uptrend."""
        data = pd.Series([100, 101, 102, 103, 104, 105, 106, 107, 108, 109])
        result = rsi(data, 5)
        
        # RSI should be high (close to 100) for strong uptrend
        valid_values = result.dropna()
        assert valid_values.iloc[-1] > 70  # Should be in overbought territory


class TestBollingerBands:
    """Test Bollinger Bands calculations."""
    
    def test_bollinger_bands_basic(self):
        """Test basic Bollinger Bands calculation."""
        data = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        upper, middle, lower = bollinger_bands(data, 5, 2)
        
        # Middle should be SMA
        sma_result = sma(data, 5)
        assert middle.equals(sma_result)
        
        # Upper should be middle + 2*std
        # Lower should be middle - 2*std
        for i in range(len(data)):
            if not pd.isna(middle.iloc[i]):
                std = data.iloc[max(0, i-4):i+1].std()
                expected_upper = middle.iloc[i] + 2 * std
                expected_lower = middle.iloc[i] - 2 * std
                
                assert abs(upper.iloc[i] - expected_upper) < 1e-10
                assert abs(lower.iloc[i] - expected_lower) < 1e-10
    
    def test_bollinger_bands_constant_data(self):
        """Test Bollinger Bands with constant data."""
        data = pd.Series([100, 100, 100, 100, 100, 100, 100, 100, 100, 100])
        upper, middle, lower = bollinger_bands(data, 5, 2)
        
        # For constant data, std = 0, so upper = middle = lower
        valid_indices = ~middle.isna()
        assert upper[valid_indices].equals(middle[valid_indices])
        assert lower[valid_indices].equals(middle[valid_indices])


class TestMACD:
    """Test MACD calculations."""
    
    def test_macd_basic(self):
        """Test basic MACD calculation."""
        data = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        macd_line, signal_line, histogram = macd(data, 12, 26, 9)
        
        # MACD line should be EMA(12) - EMA(26)
        ema_12 = ema(data, 12)
        ema_26 = ema(data, 26)
        expected_macd = ema_12 - ema_26
        
        # Compare non-NaN values
        valid_indices = ~macd_line.isna() & ~expected_macd.isna()
        assert macd_line[valid_indices].equals(expected_macd[valid_indices])
        
        # Signal line should be EMA of MACD line
        expected_signal = ema(macd_line, 9)
        valid_signal_indices = ~signal_line.isna() & ~expected_signal.isna()
        assert signal_line[valid_signal_indices].equals(expected_signal[valid_signal_indices])
        
        # Histogram should be MACD - Signal
        expected_histogram = macd_line - signal_line
        valid_hist_indices = ~histogram.isna() & ~expected_histogram.isna()
        assert histogram[valid_hist_indices].equals(expected_histogram[valid_hist_indices])


class TestIndicatorEdgeCases:
    """Test edge cases for all indicators."""
    
    def test_empty_series(self):
        """Test indicators with empty series."""
        empty_series = pd.Series([], dtype=float)
        
        # All indicators should handle empty series gracefully
        assert sma(empty_series, 5).empty
        assert ema(empty_series, 5).empty
        assert rsi(empty_series, 5).empty
        
        upper, middle, lower = bollinger_bands(empty_series, 5, 2)
        assert upper.empty and middle.empty and lower.empty
        
        macd_line, signal_line, histogram = macd(empty_series, 12, 26, 9)
        assert macd_line.empty and signal_line.empty and histogram.empty
    
    def test_single_value_series(self):
        """Test indicators with single value."""
        single_series = pd.Series([100])
        
        # SMA with window 1 should return the value
        sma_result = sma(single_series, 1)
        assert sma_result.iloc[0] == 100.0
        
        # EMA should return the value
        ema_result = ema(single_series, 1)
        assert ema_result.iloc[0] == 100.0
        
        # RSI should handle single value (will be NaN)
        rsi_result = rsi(single_series, 1)
        assert pd.isna(rsi_result.iloc[0])
    
    def test_all_nan_series(self):
        """Test indicators with all NaN values."""
        nan_series = pd.Series([np.nan, np.nan, np.nan, np.nan, np.nan])
        
        # All indicators should return NaN series
        assert sma(nan_series, 3).isna().all()
        assert ema(nan_series, 3).isna().all()
        assert rsi(nan_series, 3).isna().all()
        
        upper, middle, lower = bollinger_bands(nan_series, 3, 2)
        assert upper.isna().all() and middle.isna().all() and lower.isna().all()
        
        macd_line, signal_line, histogram = macd(nan_series, 12, 26, 9)
        assert macd_line.isna().all() and signal_line.isna().all() and histogram.isna().all()


if __name__ == "__main__":
    pytest.main([__file__])
