"""
Tests for trading strategies.

This module contains unit tests for all trading strategies to ensure
correct signal generation and position tracking.
"""

import pytest
import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from core.strategy import (
    SMAStrategy, RSIStrategy, MACDStrategy, 
    BollingerBandsStrategy, CombinedStrategy
)


class TestSMAStrategy:
    """Test SMA Crossover Strategy."""
    
    def setup_method(self):
        """Set up test data."""
        # Create price data with clear crossover
        dates = pd.date_range('2020-01-01', periods=100, freq='D')
        
        # Create data where fast SMA crosses above slow SMA around day 50
        prices = np.concatenate([
            np.linspace(100, 95, 30),  # Declining trend
            np.linspace(95, 110, 40),  # Rising trend
            np.linspace(110, 105, 30)  # Slight decline
        ])
        
        self.test_data = pd.DataFrame({
            'Close': prices,
            'Open': prices * 0.999,
            'High': prices * 1.001,
            'Low': prices * 0.998,
            'Volume': np.random.randint(1000, 10000, 100)
        }, index=dates)
    
    def test_sma_strategy_initialization(self):
        """Test SMA strategy initialization."""
        strategy = SMAStrategy(fast_window=10, slow_window=20)
        
        assert strategy.fast_window == 10
        assert strategy.slow_window == 20
        assert strategy.name == "SMA Crossover (10/20)"
    
    def test_sma_strategy_signal_generation(self):
        """Test SMA strategy signal generation."""
        strategy = SMAStrategy(fast_window=10, slow_window=20)
        df_with_signals = strategy.generate_signals(self.test_data)
        
        # Check required columns
        assert 'Signal' in df_with_signals.columns
        assert 'Position' in df_with_signals.columns
        assert 'SMA_10' in df_with_signals.columns
        assert 'SMA_20' in df_with_signals.columns
        
        # Check signal values
        signals = df_with_signals['Signal'].unique()
        assert all(signal in [-1, 0, 1] for signal in signals)
        
        # Check position values
        positions = df_with_signals['Position'].unique()
        assert all(position in [0, 1] for position in positions)
    
    def test_sma_strategy_no_consecutive_signals(self):
        """Test that SMA strategy doesn't generate consecutive signals."""
        strategy = SMAStrategy(fast_window=10, slow_window=20)
        df_with_signals = strategy.generate_signals(self.test_data)
        
        signals = df_with_signals['Signal'].values
        non_zero_signals = signals[signals != 0]
        
        # Check no consecutive identical signals
        for i in range(len(non_zero_signals) - 1):
            assert non_zero_signals[i] != non_zero_signals[i + 1]
    
    def test_sma_strategy_position_tracking(self):
        """Test SMA strategy position tracking."""
        strategy = SMAStrategy(fast_window=10, slow_window=20)
        df_with_signals = strategy.generate_signals(self.test_data)
        
        positions = df_with_signals['Position'].values
        signals = df_with_signals['Signal'].values
        
        # Position should start at 0
        assert positions[0] == 0
        
        # Position should only change on signals
        for i in range(1, len(positions)):
            if signals[i] == 1:  # Buy signal
                assert positions[i] == 1
            elif signals[i] == -1:  # Sell signal
                assert positions[i] == 0
            else:  # No signal
                assert positions[i] == positions[i-1]  # Should maintain previous position


class TestRSIStrategy:
    """Test RSI Strategy."""
    
    def setup_method(self):
        """Set up test data."""
        dates = pd.date_range('2020-01-01', periods=100, freq='D')
        
        # Create data with clear RSI patterns
        # Start with high prices (overbought), then decline (oversold), then recovery
        prices = np.concatenate([
            np.linspace(100, 120, 30),  # Rising trend (overbought)
            np.linspace(120, 80, 40),   # Declining trend (oversold)
            np.linspace(80, 100, 30)    # Recovery
        ])
        
        self.test_data = pd.DataFrame({
            'Close': prices,
            'Open': prices * 0.999,
            'High': prices * 1.001,
            'Low': prices * 0.998,
            'Volume': np.random.randint(1000, 10000, 100)
        }, index=dates)
    
    def test_rsi_strategy_initialization(self):
        """Test RSI strategy initialization."""
        strategy = RSIStrategy(period=14, oversold=30, overbought=70)
        
        assert strategy.period == 14
        assert strategy.oversold == 30
        assert strategy.overbought == 70
        assert strategy.name == "RSI Strategy (14)"
    
    def test_rsi_strategy_signal_generation(self):
        """Test RSI strategy signal generation."""
        strategy = RSIStrategy(period=14, oversold=30, overbought=70)
        df_with_signals = strategy.generate_signals(self.test_data)
        
        # Check required columns
        assert 'Signal' in df_with_signals.columns
        assert 'Position' in df_with_signals.columns
        assert 'RSI' in df_with_signals.columns
        
        # Check RSI values are between 0 and 100
        rsi_values = df_with_signals['RSI'].dropna()
        assert rsi_values.min() >= 0
        assert rsi_values.max() <= 100


class TestMACDStrategy:
    """Test MACD Strategy."""
    
    def setup_method(self):
        """Set up test data."""
        dates = pd.date_range('2020-01-01', periods=100, freq='D')
        
        # Create data with clear MACD crossover
        prices = 100 + np.cumsum(np.random.randn(100) * 0.5)
        
        self.test_data = pd.DataFrame({
            'Close': prices,
            'Open': prices * 0.999,
            'High': prices * 1.001,
            'Low': prices * 0.998,
            'Volume': np.random.randint(1000, 10000, 100)
        }, index=dates)
    
    def test_macd_strategy_initialization(self):
        """Test MACD strategy initialization."""
        strategy = MACDStrategy(fast_period=12, slow_period=26, signal_period=9)
        
        assert strategy.fast_period == 12
        assert strategy.slow_period == 26
        assert strategy.signal_period == 9
        assert strategy.name == "MACD Strategy (12/26/9)"
    
    def test_macd_strategy_signal_generation(self):
        """Test MACD strategy signal generation."""
        strategy = MACDStrategy(fast_period=12, slow_period=26, signal_period=9)
        df_with_signals = strategy.generate_signals(self.test_data)
        
        # Check required columns
        assert 'Signal' in df_with_signals.columns
        assert 'Position' in df_with_signals.columns
        assert 'MACD' in df_with_signals.columns
        assert 'MACD_Signal' in df_with_signals.columns
        assert 'MACD_Histogram' in df_with_signals.columns


class TestBollingerBandsStrategy:
    """Test Bollinger Bands Strategy."""
    
    def setup_method(self):
        """Set up test data."""
        dates = pd.date_range('2020-01-01', periods=100, freq='D')
        
        # Create data with clear Bollinger Bands patterns
        prices = 100 + np.sin(np.arange(100) * 0.1) * 10 + np.random.randn(100) * 2
        
        self.test_data = pd.DataFrame({
            'Close': prices,
            'Open': prices * 0.999,
            'High': prices * 1.001,
            'Low': prices * 0.998,
            'Volume': np.random.randint(1000, 10000, 100)
        }, index=dates)
    
    def test_bollinger_strategy_initialization(self):
        """Test Bollinger Bands strategy initialization."""
        strategy = BollingerBandsStrategy(period=20, std_dev=2)
        
        assert strategy.period == 20
        assert strategy.std_dev == 2
        assert strategy.name == "Bollinger Bands Strategy (20/2)"
    
    def test_bollinger_strategy_signal_generation(self):
        """Test Bollinger Bands strategy signal generation."""
        strategy = BollingerBandsStrategy(period=20, std_dev=2)
        df_with_signals = strategy.generate_signals(self.test_data)
        
        # Check required columns
        assert 'Signal' in df_with_signals.columns
        assert 'Position' in df_with_signals.columns
        assert 'BB_Upper' in df_with_signals.columns
        assert 'BB_Middle' in df_with_signals.columns
        assert 'BB_Lower' in df_with_signals.columns
        
        # Check that upper > middle > lower
        valid_data = df_with_signals.dropna()
        assert (valid_data['BB_Upper'] > valid_data['BB_Middle']).all()
        assert (valid_data['BB_Middle'] > valid_data['BB_Lower']).all()


class TestCombinedStrategy:
    """Test Combined Strategy."""
    
    def setup_method(self):
        """Set up test data."""
        dates = pd.date_range('2020-01-01', periods=100, freq='D')
        prices = 100 + np.cumsum(np.random.randn(100) * 0.5)
        
        self.test_data = pd.DataFrame({
            'Close': prices,
            'Open': prices * 0.999,
            'High': prices * 1.001,
            'Low': prices * 0.998,
            'Volume': np.random.randint(1000, 10000, 100)
        }, index=dates)
    
    def test_combined_strategy_initialization(self):
        """Test Combined strategy initialization."""
        weights = {'sma': 0.3, 'rsi': 0.3, 'macd': 0.2, 'bollinger': 0.2}
        strategy = CombinedStrategy(weights=weights)
        
        assert strategy.weights == weights
        assert strategy.name == "Combined Strategy"
    
    def test_combined_strategy_signal_generation(self):
        """Test Combined strategy signal generation."""
        weights = {'sma': 0.3, 'rsi': 0.3, 'macd': 0.2, 'bollinger': 0.2}
        strategy = CombinedStrategy(weights=weights)
        df_with_signals = strategy.generate_signals(self.test_data)
        
        # Check required columns
        assert 'Signal' in df_with_signals.columns
        assert 'Position' in df_with_signals.columns
        assert 'Combined_Score' in df_with_signals.columns
        
        # Check that combined score is calculated
        scores = df_with_signals['Combined_Score'].dropna()
        assert len(scores) > 0


class TestStrategyEdgeCases:
    """Test edge cases for all strategies."""
    
    def test_empty_data(self):
        """Test strategies with empty data."""
        empty_data = pd.DataFrame(columns=['Close', 'Open', 'High', 'Low', 'Volume'])
        
        strategies = [
            SMAStrategy(10, 20),
            RSIStrategy(14, 30, 70),
            MACDStrategy(12, 26, 9),
            BollingerBandsStrategy(20, 2),
            CombinedStrategy({'sma': 0.5, 'rsi': 0.5, 'macd': 0, 'bollinger': 0})
        ]
        
        for strategy in strategies:
            result = strategy.generate_signals(empty_data)
            assert len(result) == 0
    
    def test_single_data_point(self):
        """Test strategies with single data point."""
        single_data = pd.DataFrame({
            'Close': [100],
            'Open': [99.9],
            'High': [100.1],
            'Low': [99.8],
            'Volume': [1000]
        }, index=[pd.Timestamp('2020-01-01')])
        
        strategies = [
            SMAStrategy(10, 20),
            RSIStrategy(14, 30, 70),
            MACDStrategy(12, 26, 9),
            BollingerBandsStrategy(20, 2),
            CombinedStrategy({'sma': 0.5, 'rsi': 0.5, 'macd': 0, 'bollinger': 0})
        ]
        
        for strategy in strategies:
            result = strategy.generate_signals(single_data)
            assert len(result) == 1
            assert 'Signal' in result.columns
            assert 'Position' in result.columns
    
    def test_constant_data(self):
        """Test strategies with constant price data."""
        constant_data = pd.DataFrame({
            'Close': [100] * 50,
            'Open': [99.9] * 50,
            'High': [100.1] * 50,
            'Low': [99.8] * 50,
            'Volume': [1000] * 50
        }, index=pd.date_range('2020-01-01', periods=50, freq='D'))
        
        strategies = [
            SMAStrategy(10, 20),
            RSIStrategy(14, 30, 70),
            MACDStrategy(12, 26, 9),
            BollingerBandsStrategy(20, 2),
            CombinedStrategy({'sma': 0.5, 'rsi': 0.5, 'macd': 0, 'bollinger': 0})
        ]
        
        for strategy in strategies:
            result = strategy.generate_signals(constant_data)
            assert len(result) == 50
            # With constant data, most strategies should generate no signals
            signal_count = (result['Signal'] != 0).sum()
            assert signal_count <= 5  # Should have very few signals


if __name__ == "__main__":
    pytest.main([__file__])
