"""
Unit tests for indicator registry.
"""

import pytest
import pandas as pd
import numpy as np
from backend.core.indicator_registry import (
    IndicatorMetadata, INDICATOR_REGISTRY, get_indicator_metadata,
    get_all_indicators, get_available_conditions, compute_indicators,
    evaluate_all_conditions
)


class TestIndicatorRegistry:
    """Test cases for indicator registry functionality."""
    
    def test_registry_contains_expected_indicators(self):
        """Test that registry contains expected indicators."""
        expected_indicators = ["RSI", "MACD", "SMA", "EMA", "Bollinger", "EMA_Cross"]
        
        for indicator in expected_indicators:
            assert indicator in INDICATOR_REGISTRY
            metadata = INDICATOR_REGISTRY[indicator]
            assert isinstance(metadata, IndicatorMetadata)
            assert metadata.name
            assert metadata.description
            assert metadata.parameters
            assert metadata.conditions
            assert callable(metadata.compute_fn)
            assert callable(metadata.evaluate_conditions_fn)
    
    def test_get_indicator_metadata(self):
        """Test getting indicator metadata."""
        # Valid indicator
        metadata = get_indicator_metadata("RSI")
        assert isinstance(metadata, IndicatorMetadata)
        assert metadata.name == "Relative Strength Index"
        
        # Invalid indicator
        with pytest.raises(ValueError, match="Unknown indicator"):
            get_indicator_metadata("INVALID")
    
    def test_get_all_indicators(self):
        """Test getting all indicators."""
        indicators = get_all_indicators()
        assert isinstance(indicators, dict)
        assert len(indicators) > 0
        
        # Check that it's a copy
        indicators["TEST"] = "test"
        assert "TEST" not in INDICATOR_REGISTRY
    
    def test_rsi_metadata(self):
        """Test RSI indicator metadata."""
        metadata = INDICATOR_REGISTRY["RSI"]
        
        # Check parameters
        assert "period" in metadata.parameters
        assert "oversold" in metadata.parameters
        assert "overbought" in metadata.parameters
        
        # Check parameter types and defaults
        period_param = metadata.parameters["period"]
        assert period_param["type"] == "int"
        assert period_param["default"] == 14
        assert period_param["min"] == 5
        assert period_param["max"] == 50
        
        # Check conditions
        expected_conditions = ["rsi_oversold", "rsi_overbought", "rsi_cross_above_oversold", "rsi_cross_below_overbought"]
        for condition in expected_conditions:
            assert condition in metadata.conditions
    
    def test_macd_metadata(self):
        """Test MACD indicator metadata."""
        metadata = INDICATOR_REGISTRY["MACD"]
        
        # Check parameters
        assert "fast" in metadata.parameters
        assert "slow" in metadata.parameters
        assert "signal" in metadata.parameters
        
        # Check conditions
        expected_conditions = ["macd_cross_up", "macd_cross_down", "macd_above_signal", "macd_below_signal", "macd_above_zero", "macd_below_zero"]
        for condition in expected_conditions:
            assert condition in metadata.conditions


class TestIndicatorComputation:
    """Test cases for indicator computation functions."""
    
    def create_sample_dataframe(self, n=100):
        """Create a sample DataFrame for testing."""
        np.random.seed(42)
        dates = pd.date_range('2020-01-01', periods=n, freq='D')
        
        # Generate realistic price data
        price = 100
        prices = []
        for _ in range(n):
            price += np.random.normal(0, 2)
            prices.append(max(price, 1))  # Ensure positive prices
        
        return pd.DataFrame({
            'Date': dates,
            'Open': prices,
            'High': [p * (1 + abs(np.random.normal(0, 0.02))) for p in prices],
            'Low': [p * (1 - abs(np.random.normal(0, 0.02))) for p in prices],
            'Close': prices,
            'Volume': np.random.randint(1000, 10000, n)
        }).set_index('Date')
    
    def test_rsi_computation(self):
        """Test RSI indicator computation."""
        df = self.create_sample_dataframe(50)
        params = {"period": 14, "oversold": 30, "overbought": 70}
        
        # Test computation
        result_df = INDICATOR_REGISTRY["RSI"].compute_fn(df.copy(), params)
        
        # Check that RSI column was added
        assert "RSI_14" in result_df.columns
        
        # Check RSI values are in expected range
        rsi_values = result_df["RSI_14"].dropna()
        assert all(0 <= val <= 100 for val in rsi_values)
        
        # Test condition evaluation
        conditions = INDICATOR_REGISTRY["RSI"].evaluate_conditions_fn(result_df, params)
        
        # Check that all expected conditions are present
        expected_conditions = ["rsi_oversold", "rsi_overbought", "rsi_cross_above_oversold", "rsi_cross_below_overbought"]
        for condition in expected_conditions:
            assert condition in conditions
            assert isinstance(conditions[condition], pd.Series)
            assert len(conditions[condition]) == len(result_df)
    
    def test_macd_computation(self):
        """Test MACD indicator computation."""
        df = self.create_sample_dataframe(50)
        params = {"fast": 12, "slow": 26, "signal": 9}
        
        # Test computation
        result_df = INDICATOR_REGISTRY["MACD"].compute_fn(df.copy(), params)
        
        # Check that MACD columns were added
        assert "MACD_12_26" in result_df.columns
        assert "MACD_Signal_9" in result_df.columns
        assert "MACD_Histogram_12_26_9" in result_df.columns
        
        # Test condition evaluation
        conditions = INDICATOR_REGISTRY["MACD"].evaluate_conditions_fn(result_df, params)
        
        # Check that all expected conditions are present
        expected_conditions = ["macd_cross_up", "macd_cross_down", "macd_above_signal", "macd_below_signal", "macd_above_zero", "macd_below_zero"]
        for condition in expected_conditions:
            assert condition in conditions
            assert isinstance(conditions[condition], pd.Series)
    
    def test_sma_computation(self):
        """Test SMA indicator computation."""
        df = self.create_sample_dataframe(50)
        params = {"period": 20}
        
        # Test computation
        result_df = INDICATOR_REGISTRY["SMA"].compute_fn(df.copy(), params)
        
        # Check that SMA column was added
        assert "SMA_20" in result_df.columns
        
        # Test condition evaluation
        conditions = INDICATOR_REGISTRY["SMA"].evaluate_conditions_fn(result_df, params)
        
        # Check that all expected conditions are present
        expected_conditions = ["sma_price_above", "sma_price_below", "sma_price_cross_above", "sma_price_cross_below"]
        for condition in expected_conditions:
            assert condition in conditions
            assert isinstance(conditions[condition], pd.Series)
    
    def test_bollinger_computation(self):
        """Test Bollinger Bands indicator computation."""
        df = self.create_sample_dataframe(50)
        params = {"window": 20, "num_std": 2.0}
        
        # Test computation
        result_df = INDICATOR_REGISTRY["Bollinger"].compute_fn(df.copy(), params)
        
        # Check that Bollinger columns were added
        assert "BB_Upper_20_2.0" in result_df.columns
        assert "BB_Middle_20_2.0" in result_df.columns
        assert "BB_Lower_20_2.0" in result_df.columns
        
        # Test condition evaluation
        conditions = INDICATOR_REGISTRY["Bollinger"].evaluate_conditions_fn(result_df, params)
        
        # Check that all expected conditions are present
        expected_conditions = ["bb_price_above_upper", "bb_price_below_lower", "bb_price_touch_upper", "bb_price_touch_lower", "bb_price_squeeze"]
        for condition in expected_conditions:
            assert condition in conditions
            assert isinstance(conditions[condition], pd.Series)


class TestRegistryFunctions:
    """Test cases for registry utility functions."""
    
    def test_get_available_conditions(self):
        """Test getting available conditions for a list of indicators."""
        indicators = [
            {"id": "RSI", "params": {"period": 14, "oversold": 30, "overbought": 70}},
            {"id": "MACD", "params": {"fast": 12, "slow": 26, "signal": 9}}
        ]
        
        conditions = get_available_conditions(indicators)
        
        # Should contain conditions from both indicators
        assert "rsi_oversold" in conditions
        assert "rsi_overbought" in conditions
        assert "macd_cross_up" in conditions
        assert "macd_cross_down" in conditions
        
        # Should be sorted and unique
        assert conditions == sorted(list(set(conditions)))
    
    def test_compute_indicators(self):
        """Test computing multiple indicators."""
        df = pd.DataFrame({
            'Date': pd.date_range('2020-01-01', periods=50, freq='D'),
            'Open': np.random.randn(50).cumsum() + 100,
            'High': np.random.randn(50).cumsum() + 105,
            'Low': np.random.randn(50).cumsum() + 95,
            'Close': np.random.randn(50).cumsum() + 100,
            'Volume': np.random.randint(1000, 10000, 50)
        }).set_index('Date')
        
        indicators = [
            {"id": "RSI", "params": {"period": 14, "oversold": 30, "overbought": 70}},
            {"id": "SMA", "params": {"period": 20}}
        ]
        
        result_df = compute_indicators(df, indicators)
        
        # Check that both indicators were computed
        assert "RSI_14" in result_df.columns
        assert "SMA_20" in result_df.columns
        
        # Check that original columns are preserved
        assert "Close" in result_df.columns
        assert "Volume" in result_df.columns
    
    def test_evaluate_all_conditions(self):
        """Test evaluating all conditions for multiple indicators."""
        df = pd.DataFrame({
            'Date': pd.date_range('2020-01-01', periods=50, freq='D'),
            'Open': np.random.randn(50).cumsum() + 100,
            'High': np.random.randn(50).cumsum() + 105,
            'Low': np.random.randn(50).cumsum() + 95,
            'Close': np.random.randn(50).cumsum() + 100,
            'Volume': np.random.randint(1000, 10000, 50)
        }).set_index('Date')
        
        indicators = [
            {"id": "RSI", "params": {"period": 14, "oversold": 30, "overbought": 70}},
            {"id": "SMA", "params": {"period": 20}}
        ]
        
        # First compute indicators
        df_with_indicators = compute_indicators(df, indicators)
        
        # Then evaluate conditions
        conditions = evaluate_all_conditions(df_with_indicators, indicators)
        
        # Check that conditions from both indicators are present
        assert "rsi_oversold" in conditions
        assert "rsi_overbought" in conditions
        assert "sma_price_above" in conditions
        assert "sma_price_below" in conditions
        
        # Check that all conditions are boolean series
        for condition_name, condition_series in conditions.items():
            assert isinstance(condition_series, pd.Series)
            assert condition_series.dtype == bool
            assert len(condition_series) == len(df_with_indicators)


class TestEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_unknown_indicator_in_compute(self):
        """Test handling of unknown indicator in compute_indicators."""
        df = pd.DataFrame({
            'Date': pd.date_range('2020-01-01', periods=10, freq='D'),
            'Close': np.random.randn(10).cumsum() + 100
        }).set_index('Date')
        
        indicators = [
            {"id": "RSI", "params": {"period": 14}},
            {"id": "UNKNOWN", "params": {}}
        ]
        
        # Should skip unknown indicator and continue
        result_df = compute_indicators(df, indicators)
        assert "RSI_14" in result_df.columns
        # Unknown indicator should not add any columns
    
    def test_empty_indicators_list(self):
        """Test handling of empty indicators list."""
        df = pd.DataFrame({
            'Date': pd.date_range('2020-01-01', periods=10, freq='D'),
            'Close': np.random.randn(10).cumsum() + 100
        }).set_index('Date')
        
        result_df = compute_indicators(df, [])
        assert result_df.equals(df)
        
        conditions = evaluate_all_conditions(df, [])
        assert conditions == {}
    
    def test_insufficient_data_for_indicators(self):
        """Test handling of insufficient data for indicators."""
        # Create very small dataset
        df = pd.DataFrame({
            'Date': pd.date_range('2020-01-01', periods=5, freq='D'),
            'Close': [100, 101, 102, 103, 104]
        }).set_index('Date')
        
        indicators = [
            {"id": "RSI", "params": {"period": 14}},  # Needs more data
            {"id": "SMA", "params": {"period": 20}}   # Needs more data
        ]
        
        # Should handle insufficient data gracefully
        result_df = compute_indicators(df, indicators)
        
        # RSI and SMA columns should exist but may have NaN values
        assert "RSI_14" in result_df.columns
        assert "SMA_20" in result_df.columns
        
        # Most values should be NaN due to insufficient data
        assert result_df["RSI_14"].isna().sum() > 0
        assert result_df["SMA_20"].isna().sum() > 0
