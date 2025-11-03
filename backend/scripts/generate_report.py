#!/usr/bin/env python3
"""
Generate comprehensive HTML reports from backtest results.

This script creates detailed HTML reports with embedded charts and metrics
from previously saved backtest results.
"""

import argparse
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

# Add the backend directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from utils.helpers import (
    get_output_path, format_currency, format_percentage,
    get_performance_rating, ensure_output_directories
)
from utils.visualization import (
    create_price_chart, create_equity_chart, create_metrics_chart,
    create_drawdown_chart, save_chart
)
import pandas as pd


def load_backtest_results(results_file: str) -> Dict[str, Any]:
    """Load backtest results from JSON file."""
    results_path = Path(results_file)
    if not results_path.exists():
        raise FileNotFoundError(f"Results file not found: {results_file}")
    
    with open(results_path, 'r') as f:
        results = json.load(f)
    
    # Convert equity curve back to DataFrame
    if 'equity_curve' in results and isinstance(results['equity_curve'], list):
        equity_data = results['equity_curve']
        # Check if Date column exists
        if equity_data and 'Date' in equity_data[0]:
            results['equity_curve'] = pd.DataFrame(equity_data)
            results['equity_curve']['Date'] = pd.to_datetime(results['equity_curve']['Date'])
            results['equity_curve'].set_index('Date', inplace=True)
        else:
            # Create a simple DataFrame with index as dates
            results['equity_curve'] = pd.DataFrame(equity_data)
            # Create a date range if no dates are provided
            if len(equity_data) > 0:
                start_date = pd.Timestamp('2020-01-01')
                date_range = pd.date_range(start=start_date, periods=len(equity_data), freq='D')
                results['equity_curve'].index = date_range
    
    return results


def create_html_report(
    results: Dict[str, Any],
    df_with_signals: pd.DataFrame = None,
    output_filename: str = None
) -> Path:
    """
    Create a comprehensive HTML report with embedded charts.
    
    Args:
        results: Backtest results dictionary
        df_with_signals: DataFrame with price data and signals
        output_filename: Output filename (without extension)
        
    Returns:
        Path to generated HTML file
    """
    metadata = results.get('metadata', {})
    metrics = results.get('metrics', {})
    equity_df = results.get('equity_curve')
    
    if equity_df is None:
        raise ValueError("No equity curve data found in results")
    
    # Generate charts
    print("📊 Generating charts...")
    
    # Price chart (if signals data available)
    price_chart_html = ""
    if df_with_signals is not None:
        price_fig = create_price_chart(df_with_signals, metadata.get('strategy_name', 'Strategy'))
        price_chart_html = price_fig.to_html(include_plotlyjs='cdn', div_id="price_chart")
    
    # Equity chart
    equity_fig = create_equity_chart(results, metadata.get('strategy_name', 'Strategy'))
    equity_chart_html = equity_fig.to_html(include_plotlyjs='cdn', div_id="equity_chart")
    
    # Metrics chart
    metrics_fig = create_metrics_chart(metrics)
    metrics_chart_html = metrics_fig.to_html(include_plotlyjs='cdn', div_id="metrics_chart")
    
    # Drawdown chart
    drawdown_fig = create_drawdown_chart(equity_df, metadata.get('strategy_name', 'Strategy'))
    drawdown_chart_html = drawdown_fig.to_html(include_plotlyjs='cdn', div_id="drawdown_chart")
    
    # Calculate additional metrics
    final_value = equity_df['Portfolio_Value'].iloc[-1]
    initial_capital = metadata.get('initial_capital', 10000)
    buy_hold_value = equity_df['Price'].iloc[-1] / equity_df['Price'].iloc[0] * initial_capital
    outperformance = final_value - buy_hold_value
    
    # Get performance rating
    performance_rating = get_performance_rating(metrics)
    
    # Create HTML content
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bitcoin Trading Strategy Report - {metadata.get('strategy_name', 'Strategy')}</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
                color: #333;
            }}
            .container {{
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 2.5em;
                font-weight: 300;
            }}
            .header p {{
                margin: 10px 0 0 0;
                font-size: 1.2em;
                opacity: 0.9;
            }}
            .content {{
                padding: 30px;
            }}
            .summary-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }}
            .summary-card {{
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }}
            .summary-card h3 {{
                margin: 0 0 10px 0;
                color: #667eea;
                font-size: 1.1em;
            }}
            .summary-card .value {{
                font-size: 1.8em;
                font-weight: bold;
                color: #333;
            }}
            .summary-card .label {{
                font-size: 0.9em;
                color: #666;
                margin-top: 5px;
            }}
            .metrics-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 30px 0;
            }}
            .metric-card {{
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
            }}
            .metric-card .metric-value {{
                font-size: 1.5em;
                font-weight: bold;
                color: #333;
            }}
            .metric-card .metric-label {{
                font-size: 0.9em;
                color: #666;
                margin-top: 5px;
            }}
            .chart-container {{
                margin: 30px 0;
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .chart-title {{
                font-size: 1.3em;
                font-weight: 600;
                margin-bottom: 15px;
                color: #333;
            }}
            .performance-badge {{
                display: inline-block;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 0.9em;
                margin: 10px 0;
            }}
            .performance-excellent {{ background: #d4edda; color: #155724; }}
            .performance-good {{ background: #d1ecf1; color: #0c5460; }}
            .performance-average {{ background: #fff3cd; color: #856404; }}
            .performance-poor {{ background: #f8d7da; color: #721c24; }}
            .footer {{
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                border-top: 1px solid #e0e0e0;
            }}
            .trades-table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }}
            .trades-table th, .trades-table td {{
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #e0e0e0;
            }}
            .trades-table th {{
                background: #f8f9fa;
                font-weight: 600;
            }}
            .buy-signal {{ color: #28a745; font-weight: bold; }}
            .sell-signal {{ color: #dc3545; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Bitcoin Trading Strategy Report</h1>
                <p>{metadata.get('strategy_name', 'Strategy')} Strategy Analysis</p>
            </div>
            
            <div class="content">
                <!-- Summary Cards -->
                <div class="summary-grid">
                    <div class="summary-card">
                        <h3>Strategy Performance</h3>
                        <div class="value">{format_currency(final_value)}</div>
                        <div class="label">Final Portfolio Value</div>
                    </div>
                    <div class="summary-card">
                        <h3>Buy & Hold Performance</h3>
                        <div class="value">{format_currency(buy_hold_value)}</div>
                        <div class="label">Buy & Hold Value</div>
                    </div>
                    <div class="summary-card">
                        <h3>Outperformance</h3>
                        <div class="value">{format_currency(outperformance)}</div>
                        <div class="label">Strategy vs Buy & Hold</div>
                    </div>
                    <div class="summary-card">
                        <h3>Performance Rating</h3>
                        <div class="value performance-badge performance-{performance_rating.lower()}">{performance_rating}</div>
                        <div class="label">Overall Rating</div>
                    </div>
                </div>
                
                <!-- Key Metrics -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">{format_percentage(metrics.get('total_return', 0) * 100, 2)}</div>
                        <div class="metric-label">Total Return</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{format_percentage(metrics.get('cagr', 0) * 100, 2)}</div>
                        <div class="metric-label">CAGR</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{metrics.get('sharpe_ratio', 0):.3f}</div>
                        <div class="metric-label">Sharpe Ratio</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{metrics.get('sortino_ratio', 0):.3f}</div>
                        <div class="metric-label">Sortino Ratio</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{format_percentage(metrics.get('max_drawdown', 0) * 100, 2)}</div>
                        <div class="metric-label">Max Drawdown</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{format_percentage(metrics.get('win_rate', 0) * 100, 1)}</div>
                        <div class="metric-label">Win Rate</div>
                    </div>
                </div>
                
                <!-- Strategy Information -->
                <div class="chart-container">
                    <div class="chart-title">Strategy Configuration</div>
                    <p><strong>Strategy:</strong> {metadata.get('strategy_name', 'Unknown')}</p>
                    <p><strong>Parameters:</strong> {json.dumps(metadata.get('strategy_params', {}), indent=2)}</p>
                    <p><strong>Initial Capital:</strong> {format_currency(metadata.get('initial_capital', 0))}</p>
                    <p><strong>Trading Fee:</strong> {metadata.get('trading_fee', 0) * 100:.3f}%</p>
                    <p><strong>Period:</strong> {metadata.get('start_date', 'Unknown')} to {metadata.get('end_date', 'Unknown')}</p>
                    <p><strong>Data Points:</strong> {metadata.get('data_points', 0):,}</p>
                    <p><strong>Trades Executed:</strong> {metadata.get('trades_executed', 0)}</p>
                </div>
                
                <!-- Price Chart -->
                {f'''
                <div class="chart-container">
                    <div class="chart-title">Price Chart with Trading Signals</div>
                    {price_chart_html}
                </div>
                ''' if price_chart_html else ''}
                
                <!-- Equity Chart -->
                <div class="chart-container">
                    <div class="chart-title">Portfolio Equity Curve</div>
                    {equity_chart_html}
                </div>
                
                <!-- Metrics Chart -->
                <div class="chart-container">
                    <div class="chart-title">Performance Metrics</div>
                    {metrics_chart_html}
                </div>
                
                <!-- Drawdown Chart -->
                <div class="chart-container">
                    <div class="chart-title">Portfolio Drawdown</div>
                    {drawdown_chart_html}
                </div>
                
                <!-- Trades Table -->
                {create_trades_table(results.get('trades', []))}
            </div>
            
            <div class="footer">
                <p>Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>Bitcoin Trading Strategy Backtesting Tool</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Save HTML file
    if output_filename is None:
        output_filename = f"report_{metadata.get('strategy_name', 'strategy').lower()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    output_path = get_output_path(f"{output_filename}.html")
    with open(output_path, 'w') as f:
        f.write(html_content)
    
    return output_path


def create_trades_table(trades: List[Dict[str, Any]]) -> str:
    """Create HTML table for trades."""
    if not trades:
        return ""
    
    table_html = """
    <div class="chart-container">
        <div class="chart-title">Trading History</div>
        <table class="trades-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Value</th>
                    <th>Commission</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for trade in trades:
        trade_type_class = "buy-signal" if trade.get('Type') == 'BUY' else "sell-signal"
        table_html += f"""
                <tr>
                    <td>{trade.get('Date', 'N/A')}</td>
                    <td class="{trade_type_class}">{trade.get('Type', 'N/A')}</td>
                    <td>{format_currency(trade.get('Price', 0))}</td>
                    <td>{trade.get('Quantity', 0):.4f}</td>
                    <td>{format_currency(trade.get('Value', 0))}</td>
                    <td>{format_currency(trade.get('Commission', 0))}</td>
                </tr>
        """
    
    table_html += """
            </tbody>
        </table>
    </div>
    """
    
    return table_html


def main():
    """Main CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Generate HTML reports from backtest results",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_report.py results.json
  python generate_report.py results.json --output my_report
  python generate_report.py results.json --signals data_with_signals.csv
        """
    )
    
    parser.add_argument(
        'results_file',
        help='Path to backtest results JSON file'
    )
    
    parser.add_argument(
        '--signals',
        help='Path to CSV file with price data and signals (optional)'
    )
    
    parser.add_argument(
        '--output', '-o',
        help='Output filename (without extension)'
    )
    
    args = parser.parse_args()
    
    try:
        # Ensure output directories exist
        ensure_output_directories()
        
        # Load results
        print(f"📊 Loading backtest results from {args.results_file}...")
        results = load_backtest_results(args.results_file)
        
        # Load signals data if provided
        df_with_signals = None
        if args.signals:
            print(f"📈 Loading signals data from {args.signals}...")
            df_with_signals = pd.read_csv(args.signals, index_col=0, parse_dates=True)
        
        # Generate report
        print("📝 Generating HTML report...")
        report_path = create_html_report(results, df_with_signals, args.output)
        
        print(f"✅ Report generated successfully: {report_path}")
        print(f"🌐 Open in browser: file://{report_path.absolute()}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
