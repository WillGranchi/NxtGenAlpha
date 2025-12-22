#!/usr/bin/env python3
"""
CLI entrypoint for running Bitcoin trading strategy backtests.

This script provides a command-line interface to execute backtests with
various strategies and parameters, generating reports and visualizations.
"""

import argparse
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Add the backend directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from core.data_loader import load_btc_data
from core.strategy import (
    SMAStrategy, RSIStrategy, MACDStrategy, 
    BollingerBandsStrategy, CombinedStrategy
)
from core.backtest import BacktestEngine
from core.metrics import calculate_all_metrics
from utils.helpers import (
    get_data_path, get_output_path, get_strategy_config,
    format_currency, format_percentage, get_timestamp,
    validate_date_range, ensure_output_directories
)
from utils.visualization import create_comprehensive_report


def get_strategy_class(strategy_name: str):
    """Get strategy class by name."""
    strategies = {
        'SMA': SMAStrategy,
        'RSI': RSIStrategy,
        'MACD': MACDStrategy,
        'Bollinger': BollingerBandsStrategy,
        'Combined': CombinedStrategy
    }
    
    if strategy_name not in strategies:
        raise ValueError(f"Unknown strategy: {strategy_name}. Available: {list(strategies.keys())}")
    
    return strategies[strategy_name]


def run_backtest(
    strategy_name: str,
    strategy_params: Dict[str, Any],
    initial_capital: float = 10000,
    trading_fee: float = 0.001,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    data_file: str = "btc_price.csv"
) -> Dict[str, Any]:
    """
    Run a complete backtest with the specified parameters.
    
    Args:
        strategy_name: Name of the strategy to use
        strategy_params: Parameters for the strategy
        initial_capital: Starting capital amount
        trading_fee: Trading fee rate
        start_date: Start date for backtest (YYYY-MM-DD)
        end_date: End date for backtest (YYYY-MM-DD)
        data_file: Name of the data file
        
    Returns:
        Dictionary containing backtest results
    """
    print(f"🚀 Starting backtest with {strategy_name} strategy...")
    
    # Load data
    print("📊 Loading Bitcoin historical data...")
    data_path = Path(__file__).parent.parent.parent / "data" / data_file
    df = load_btc_data(str(data_path))
    print(f"   Loaded {len(df)} rows of data from {df.index[0]} to {df.index[-1]}")
    
    # Filter by date range if specified
    if start_date or end_date:
        if start_date:
            start_dt = pd.to_datetime(start_date)
            df = df[df.index >= start_dt]
        if end_date:
            end_dt = pd.to_datetime(end_date)
            df = df[df.index <= end_dt]
        print(f"   Filtered to {len(df)} rows from {df.index[0]} to {df.index[-1]}")
    
    # Initialize strategy
    print(f"📈 Initializing {strategy_name} strategy...")
    strategy_class = get_strategy_class(strategy_name)
    strategy = strategy_class(**strategy_params)
    
    # Generate signals
    print("🎯 Generating trading signals...")
    df_with_signals = strategy.generate_signals(df)
    
    # Count signals
    signal_counts = df_with_signals['Signal'].value_counts()
    print(f"   Generated {signal_counts.get(1, 0)} buy signals and {signal_counts.get(-1, 0)} sell signals")
    
    # Run backtest
    print("💰 Running backtest simulation...")
    backtest_engine = BacktestEngine(initial_capital=initial_capital, fee=trading_fee)
    results = backtest_engine.run_backtest(df_with_signals, strategy_name)
    
    # Extract metrics from results
    print("📊 Extracting performance metrics...")
    metrics = {
        'total_return': results['total_return'],
        'cagr': results['cagr'],
        'sharpe_ratio': results['sharpe_ratio'],
        'sortino_ratio': results.get('sortino_ratio', 0),  # Add default value
        'max_drawdown': results['max_drawdown'],
        'win_rate': results['win_rate'],
        'buy_hold_return': results['buy_hold_return'],
        'total_trades': results['total_trades'],
        'winning_trades': results['winning_trades'],
        'var_95': results.get('var_95', 0),
        'cvar_95': results.get('cvar_95', 0)
    }
    results['metrics'] = metrics
    
    # Add metadata
    results['metadata'] = {
        'strategy_name': strategy_name,
        'strategy_params': strategy_params,
        'initial_capital': initial_capital,
        'trading_fee': trading_fee,
        'start_date': str(df.index[0]),
        'end_date': str(df.index[-1]),
        'data_points': len(df),
        'trades_executed': len(results['trades']),
        'timestamp': datetime.now().isoformat()
    }
    
    print("✅ Backtest completed successfully!")
    return results, df_with_signals


def print_summary(results: Dict[str, Any]):
    """Print a summary of backtest results to console."""
    metrics = results['metrics']
    metadata = results['metadata']
    
    print("\n" + "="*60)
    print(f"📊 BACKTEST SUMMARY - {metadata['strategy_name']} Strategy")
    print("="*60)
    
    print(f"\n📅 Period: {metadata['start_date']} to {metadata['end_date']}")
    print(f"💰 Initial Capital: {format_currency(metadata['initial_capital'])}")
    print(f"📈 Data Points: {metadata['data_points']:,}")
    print(f"🔄 Trades Executed: {metadata['trades_executed']}")
    
    print(f"\n📊 PERFORMANCE METRICS:")
    print(f"   Total Return:     {format_percentage(metrics['total_return'] * 100, 2)}")
    print(f"   CAGR:             {format_percentage(metrics['cagr'] * 100, 2)}")
    print(f"   Sharpe Ratio:     {metrics['sharpe_ratio']:.3f}")
    print(f"   Sortino Ratio:    {metrics['sortino_ratio']:.3f}")
    print(f"   Max Drawdown:     {format_percentage(metrics['max_drawdown'] * 100, 2)}")
    print(f"   Win Rate:         {format_percentage(metrics['win_rate'] * 100, 1)}")
    
    print(f"\n💵 FINAL VALUES:")
    final_value = results['equity_curve']['Portfolio_Value'].iloc[-1]
    buy_hold_value = results['equity_curve']['Price'].iloc[-1] / results['equity_curve']['Price'].iloc[0] * metadata['initial_capital']
    print(f"   Strategy Value:   {format_currency(final_value)}")
    print(f"   Buy & Hold Value: {format_currency(buy_hold_value)}")
    print(f"   Outperformance:   {format_currency(final_value - buy_hold_value)}")
    
    print("="*60)


def main():
    """Main CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Run Bitcoin trading strategy backtests",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_backtest.py --strategy SMA --fast 50 --slow 200
  python run_backtest.py --strategy RSI --period 14 --oversold 30 --overbought 70
  python run_backtest.py --strategy MACD --fast 12 --slow 26 --signal 9
  python run_backtest.py --strategy Bollinger --period 20 --std 2
  python run_backtest.py --strategy Combined --capital 50000 --start 2020-01-01
        """
    )
    
    # Strategy selection
    parser.add_argument(
        '--strategy', '-s',
        choices=['SMA', 'RSI', 'MACD', 'Bollinger', 'Combined'],
        default='SMA',
        help='Trading strategy to use (default: SMA)'
    )
    
    # Capital and fees
    parser.add_argument(
        '--capital', '-c',
        type=float,
        default=10000,
        help='Initial capital amount (default: 10000)'
    )
    
    parser.add_argument(
        '--fee', '-f',
        type=float,
        default=0.001,
        help='Trading fee rate (default: 0.001)'
    )
    
    # Date range
    parser.add_argument(
        '--start',
        type=str,
        help='Start date (YYYY-MM-DD)'
    )
    
    parser.add_argument(
        '--end',
        type=str,
        help='End date (YYYY-MM-DD)'
    )
    
    # Data file
    parser.add_argument(
        '--data',
        type=str,
        default='btc_price.csv',
        help='Data file name (default: btc_price.csv)'
    )
    
    # Output options
    parser.add_argument(
        '--output', '-o',
        type=str,
        help='Output filename prefix (default: auto-generated)'
    )
    
    parser.add_argument(
        '--no-charts',
        action='store_true',
        help='Skip chart generation'
    )
    
    parser.add_argument(
        '--format',
        choices=['html', 'png', 'both'],
        default='html',
        help='Chart output format (default: html)'
    )
    
    # Strategy-specific parameters
    parser.add_argument('--fast', type=int, help='Fast period for SMA/MACD')
    parser.add_argument('--slow', type=int, help='Slow period for SMA/MACD')
    parser.add_argument('--period', type=int, help='Period for RSI/Bollinger')
    parser.add_argument('--oversold', type=int, help='RSI oversold threshold')
    parser.add_argument('--overbought', type=int, help='RSI overbought threshold')
    parser.add_argument('--signal', type=int, help='MACD signal period')
    parser.add_argument('--std', type=float, help='Bollinger Bands standard deviation')
    
    args = parser.parse_args()
    
    try:
        # Ensure output directories exist
        ensure_output_directories()
        
        # Get strategy configuration
        strategy_config = get_strategy_config(args.strategy)
        
        # Build strategy parameters from command line args
        strategy_params = {}
        if args.strategy == 'SMA':
            strategy_params = {
                'fast_window': args.fast or strategy_config['fast_window'],
                'slow_window': args.slow or strategy_config['slow_window']
            }
        elif args.strategy == 'RSI':
            strategy_params = {
                'rsi_period': args.period or strategy_config['period'],
                'oversold': args.oversold or strategy_config['oversold'],
                'overbought': args.overbought or strategy_config['overbought']
            }
        elif args.strategy == 'MACD':
            strategy_params = {
                'fast_period': args.fast or strategy_config['fast_period'],
                'slow_period': args.slow or strategy_config['slow_period'],
                'signal_period': args.signal or strategy_config['signal_period']
            }
        elif args.strategy == 'Bollinger':
            strategy_params = {
                'period': args.period or strategy_config['period'],
                'std_dev': args.std or strategy_config['std_dev']
            }
        elif args.strategy == 'Combined':
            strategy_params = strategy_config['weights']
        
        # Validate date range if provided
        if args.start and args.end:
            validate_date_range(args.start, args.end)
        
        # Run backtest
        results, df_with_signals = run_backtest(
            strategy_name=args.strategy,
            strategy_params=strategy_params,
            initial_capital=args.capital,
            trading_fee=args.fee,
            start_date=args.start,
            end_date=args.end,
            data_file=args.data
        )
        
        # Print summary
        print_summary(results)
        
        # Generate charts if requested
        if not args.no_charts:
            print("\n📊 Generating charts...")
            timestamp = get_timestamp()
            base_filename = args.output or f"{args.strategy.lower()}_backtest_{timestamp}"
            
            from utils.visualization import create_comprehensive_report
            charts = create_comprehensive_report(
                df_with_signals, results, args.strategy, strategy_params
            )
            
            print(f"   Charts saved to outputs/reports/")
            for chart_name, chart_path in charts.items():
                print(f"   - {chart_name}: {chart_path.name}")
        
        # Save results to JSON
        output_filename = args.output or f"{args.strategy.lower()}_results_{get_timestamp()}"
        results_path = get_output_path(f"{output_filename}.json")
        
        # Convert numpy types to Python types for JSON serialization
        def convert_numpy_types(obj):
            if hasattr(obj, 'item'):
                return obj.item()
            elif hasattr(obj, 'tolist'):
                return obj.tolist()
            return obj
        
        # Clean results for JSON serialization
        clean_results = {}
        for key, value in results.items():
            if key == 'equity_curve':
                clean_results[key] = value.to_dict('records')
            elif key == 'trades':
                clean_results[key] = [
                    {k: convert_numpy_types(v) for k, v in trade.items()}
                    for trade in value
                ]
            elif key == 'metrics':
                clean_results[key] = {k: convert_numpy_types(v) for k, v in value.items()}
            else:
                clean_results[key] = value
        
        with open(results_path, 'w') as f:
            json.dump(clean_results, f, indent=2, default=str)
        
        print(f"\n💾 Results saved to: {results_path}")
        print("\n🎉 Backtest completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
