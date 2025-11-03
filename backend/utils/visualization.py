"""
Visualization utilities for the Bitcoin Trading Strategy Backtesting Tool.

This module contains functions to create Plotly charts for price data,
trading signals, equity curves, and performance metrics.
"""

import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import json

from .helpers import get_output_path, format_currency, format_percentage, DEFAULT_CONFIG


def create_price_chart(
    df: pd.DataFrame,
    strategy_name: str = "Strategy",
    show_indicators: bool = True,
    width: int = None,
    height: int = None
) -> go.Figure:
    """
    Create a comprehensive price chart with trading signals and indicators.
    
    Args:
        df: DataFrame with price data and signals
        strategy_name: Name of the strategy for title
        show_indicators: Whether to show technical indicators
        width: Chart width in pixels
        height: Chart height in pixels
        
    Returns:
        Plotly Figure object
    """
    width = width or DEFAULT_CONFIG["chart_width"]
    height = height or DEFAULT_CONFIG["chart_height"]
    
    fig = go.Figure()
    
    # Price line
    fig.add_trace(go.Scatter(
        x=df.index,
        y=df['Close'],
        mode='lines',
        name='Bitcoin Price',
        line=dict(color='#f7931a', width=2),
        hovertemplate='<b>%{x}</b><br>Price: $%{y:,.2f}<extra></extra>'
    ))
    
    # Buy signals
    buy_signals = df[df['Signal'] == 1]
    if not buy_signals.empty:
        fig.add_trace(go.Scatter(
            x=buy_signals.index,
            y=buy_signals['Close'],
            mode='markers',
            name='Buy Signal',
            marker=dict(
                color='green',
                size=12,
                symbol='triangle-up',
                line=dict(color='darkgreen', width=2)
            ),
            hovertemplate='<b>%{x}</b><br>Buy at: $%{y:,.2f}<extra></extra>'
        ))
    
    # Sell signals
    sell_signals = df[df['Signal'] == -1]
    if not sell_signals.empty:
        fig.add_trace(go.Scatter(
            x=sell_signals.index,
            y=sell_signals['Close'],
            mode='markers',
            name='Sell Signal',
            marker=dict(
                color='red',
                size=12,
                symbol='triangle-down',
                line=dict(color='darkred', width=2)
            ),
            hovertemplate='<b>%{x}</b><br>Sell at: $%{y:,.2f}<extra></extra>'
        ))
    
    # Technical indicators
    if show_indicators:
        # SMA lines
        if 'SMA_50' in df.columns:
            fig.add_trace(go.Scatter(
                x=df.index,
                y=df['SMA_50'],
                mode='lines',
                name='SMA 50',
                line=dict(color='blue', width=1, dash='dash'),
                opacity=0.7,
                hovertemplate='<b>%{x}</b><br>SMA 50: $%{y:,.2f}<extra></extra>'
            ))
        
        if 'SMA_200' in df.columns:
            fig.add_trace(go.Scatter(
                x=df.index,
                y=df['SMA_200'],
                mode='lines',
                name='SMA 200',
                line=dict(color='purple', width=1, dash='dash'),
                opacity=0.7,
                hovertemplate='<b>%{x}</b><br>SMA 200: $%{y:,.2f}<extra></extra>'
            ))
        
        # Bollinger Bands
        if all(col in df.columns for col in ['BB_Upper', 'BB_Middle', 'BB_Lower']):
            # Upper band
            fig.add_trace(go.Scatter(
                x=df.index,
                y=df['BB_Upper'],
                mode='lines',
                name='BB Upper',
                line=dict(color='gray', width=1),
                opacity=0.5,
                showlegend=False,
                hovertemplate='<b>%{x}</b><br>BB Upper: $%{y:,.2f}<extra></extra>'
            ))
            
            # Lower band
            fig.add_trace(go.Scatter(
                x=df.index,
                y=df['BB_Lower'],
                mode='lines',
                name='BB Lower',
                line=dict(color='gray', width=1),
                opacity=0.5,
                fill='tonexty',
                fillcolor='rgba(128,128,128,0.1)',
                showlegend=False,
                hovertemplate='<b>%{x}</b><br>BB Lower: $%{y:,.2f}<extra></extra>'
            ))
    
    # Layout
    fig.update_layout(
        title=f"{strategy_name} - Bitcoin Price Chart with Trading Signals",
        xaxis_title="Date",
        yaxis_title="Price ($)",
        height=height,
        width=width,
        hovermode='x unified',
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
        template="plotly_dark" if DEFAULT_CONFIG.get("dark_theme", False) else "plotly_white"
    )
    
    return fig


def create_equity_chart(
    results: Dict[str, Any],
    strategy_name: str = "Strategy",
    width: int = None,
    height: int = None
) -> go.Figure:
    """
    Create an equity curve chart with position-based coloring.
    
    Args:
        results: Backtest results dictionary
        strategy_name: Name of the strategy
        width: Chart width in pixels
        height: Chart height in pixels
        
    Returns:
        Plotly Figure object
    """
    width = width or DEFAULT_CONFIG["chart_width"]
    height = height or DEFAULT_CONFIG["chart_height"]
    
    equity_df = results['equity_curve']
    fig = go.Figure()
    
    # Calculate Buy & Hold equity curve
    initial_value = results['initial_capital']
    first_price = equity_df['Price'].iloc[0]
    buy_hold_equity = [initial_value * (price / first_price) for price in equity_df['Price']]
    
    # Add Buy & Hold line
    fig.add_trace(go.Scatter(
        x=equity_df.index,
        y=buy_hold_equity,
        mode='lines',
        name='Buy & Hold',
        line=dict(color='gray', width=2, dash='dash'),
        hovertemplate='<b>%{x}</b><br>Buy & Hold: %{y:,.0f}<extra></extra>'
    ))
    
    # Create position-based colored equity curve
    portfolio_values = equity_df['Portfolio_Value'].values
    positions = equity_df['Position'].values
    
    # Define colors for different positions
    colors = {
        1: '#2e8b57',    # Green for long positions
        0: '#ffa500',    # Orange for cash positions
        -1: '#dc3545'    # Red for short positions
    }
    
    # Create segments for different positions
    current_position = positions[0] if len(positions) > 0 else 0
    segment_start = 0
    
    for i in range(1, len(positions)):
        if positions[i] != current_position or i == len(positions) - 1:
            # Position changed or reached end, create segment
            segment_end = i if i < len(positions) - 1 else len(positions)
            
            # Get the appropriate color
            color = colors.get(current_position, '#2e8b57')
            position_name = {1: 'Long', 0: 'Cash', -1: 'Short'}.get(current_position, 'Unknown')
            
            fig.add_trace(go.Scatter(
                x=equity_df.index[segment_start:segment_end],
                y=portfolio_values[segment_start:segment_end],
                mode='lines',
                name=f'Strategy ({position_name})',
                line=dict(color=color, width=3),
                showlegend=True if segment_start == 0 else False,
                legendgroup='strategy',
                hovertemplate=f'<b>%{{x}}</b><br>Strategy ({position_name}): %{{y:,.0f}}<extra></extra>'
            ))
            
            current_position = positions[i]
            segment_start = i
    
    # Handle case where all positions are the same
    if len(set(positions)) == 1:
        position = positions[0]
        color = colors.get(position, '#2e8b57')
        position_name = {1: 'Long', 0: 'Cash', -1: 'Short'}.get(position, 'Unknown')
        
        fig.add_trace(go.Scatter(
            x=equity_df.index,
            y=portfolio_values,
            mode='lines',
            name=f'Strategy ({position_name})',
            line=dict(color=color, width=3),
            hovertemplate=f'<b>%{{x}}</b><br>Strategy ({position_name}): %{{y:,.0f}}<extra></extra>'
        ))
    
    # Layout
    fig.update_layout(
        title=f"{strategy_name} - Portfolio Equity Curve",
        xaxis_title="Date",
        yaxis_title="Portfolio Value ($)",
        height=height,
        width=width,
        showlegend=True,
        hovermode='x unified',
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
        template="plotly_dark" if DEFAULT_CONFIG.get("dark_theme", False) else "plotly_white"
    )
    
    return fig


def create_metrics_chart(metrics: Dict[str, float], width: int = None, height: int = None) -> go.Figure:
    """
    Create a bar chart showing key performance metrics.
    
    Args:
        metrics: Dictionary of performance metrics
        width: Chart width in pixels
        height: Chart height in pixels
        
    Returns:
        Plotly Figure object
    """
    width = width or DEFAULT_CONFIG["chart_width"]
    height = height or DEFAULT_CONFIG["chart_height"]
    
    # Select key metrics for visualization
    key_metrics = {
        'Total Return': metrics.get('total_return', 0) * 100,
        'CAGR': metrics.get('cagr', 0) * 100,
        'Sharpe Ratio': metrics.get('sharpe_ratio', 0),
        'Sortino Ratio': metrics.get('sortino_ratio', 0),
        'Max Drawdown': abs(metrics.get('max_drawdown', 0)) * 100,
        'Win Rate': metrics.get('win_rate', 0) * 100
    }
    
    # Create bar chart
    fig = go.Figure(data=[
        go.Bar(
            x=list(key_metrics.keys()),
            y=list(key_metrics.values()),
            marker_color=['#2e8b57' if v > 0 else '#dc3545' for v in key_metrics.values()],
            text=[f"{v:.2f}%" if 'Return' in k or 'CAGR' in k or 'Drawdown' in k or 'Rate' in k else f"{v:.2f}" 
                  for k, v in key_metrics.items()],
            textposition='auto',
            hovertemplate='<b>%{x}</b><br>Value: %{y:.2f}<extra></extra>'
        )
    ])
    
    fig.update_layout(
        title="Key Performance Metrics",
        xaxis_title="Metrics",
        yaxis_title="Value",
        height=height,
        width=width,
        template="plotly_dark" if DEFAULT_CONFIG.get("dark_theme", False) else "plotly_white"
    )
    
    return fig


def create_drawdown_chart(
    equity_df: pd.DataFrame,
    strategy_name: str = "Strategy",
    width: int = None,
    height: int = None
) -> go.Figure:
    """
    Create a drawdown chart showing portfolio drawdowns over time.
    
    Args:
        equity_df: DataFrame with equity curve data
        strategy_name: Name of the strategy
        width: Chart width in pixels
        height: Chart height in pixels
        
    Returns:
        Plotly Figure object
    """
    width = width or DEFAULT_CONFIG["chart_width"]
    height = height or DEFAULT_CONFIG["chart_height"]
    
    # Calculate running maximum and drawdown
    running_max = equity_df['Portfolio_Value'].expanding().max()
    drawdown = (equity_df['Portfolio_Value'] - running_max) / running_max * 100
    
    fig = go.Figure()
    
    # Drawdown area
    fig.add_trace(go.Scatter(
        x=equity_df.index,
        y=drawdown,
        mode='lines',
        fill='tozeroy',
        name='Drawdown',
        line=dict(color='red', width=1),
        fillcolor='rgba(255,0,0,0.3)',
        hovertemplate='<b>%{x}</b><br>Drawdown: %{y:.2f}%<extra></extra>'
    ))
    
    # Zero line
    fig.add_hline(y=0, line_dash="dash", line_color="black", opacity=0.5)
    
    fig.update_layout(
        title=f"{strategy_name} - Portfolio Drawdown",
        xaxis_title="Date",
        yaxis_title="Drawdown (%)",
        height=height,
        width=width,
        template="plotly_dark" if DEFAULT_CONFIG.get("dark_theme", False) else "plotly_white"
    )
    
    return fig


def save_chart(fig: go.Figure, filename: str, format: str = "html") -> Path:
    """
    Save a Plotly chart to file.
    
    Args:
        fig: Plotly Figure object
        filename: Output filename (without extension)
        format: Output format ('html', 'png', 'pdf', 'svg')
        
    Returns:
        Path to saved file
    """
    output_path = get_output_path(f"{filename}.{format}")
    
    if format == "html":
        fig.write_html(output_path)
    elif format == "png":
        fig.write_image(output_path, width=DEFAULT_CONFIG["chart_width"], 
                       height=DEFAULT_CONFIG["chart_height"])
    elif format == "pdf":
        fig.write_image(output_path, format="pdf", width=DEFAULT_CONFIG["chart_width"], 
                       height=DEFAULT_CONFIG["chart_height"])
    elif format == "svg":
        fig.write_image(output_path, format="svg", width=DEFAULT_CONFIG["chart_width"], 
                       height=DEFAULT_CONFIG["chart_height"])
    else:
        raise ValueError(f"Unsupported format: {format}")
    
    return output_path


def create_comprehensive_report(
    df: pd.DataFrame,
    results: Dict[str, Any],
    strategy_name: str = "Strategy",
    strategy_params: Dict[str, Any] = None
) -> Dict[str, Path]:
    """
    Create a comprehensive report with all charts.
    
    Args:
        df: DataFrame with price data and signals
        results: Backtest results dictionary
        strategy_name: Name of the strategy
        strategy_params: Strategy parameters used
        
    Returns:
        Dictionary mapping chart names to file paths
    """
    timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
    base_filename = f"{strategy_name.lower()}_report_{timestamp}"
    
    charts = {}
    
    # Price chart
    price_fig = create_price_chart(df, strategy_name)
    charts['price_chart'] = save_chart(price_fig, f"{base_filename}_price", "html")
    
    # Equity chart
    equity_fig = create_equity_chart(results, strategy_name)
    charts['equity_chart'] = save_chart(equity_fig, f"{base_filename}_equity", "html")
    
    # Metrics chart
    metrics_fig = create_metrics_chart(results['metrics'])
    charts['metrics_chart'] = save_chart(metrics_fig, f"{base_filename}_metrics", "html")
    
    # Drawdown chart
    drawdown_fig = create_drawdown_chart(results['equity_curve'], strategy_name)
    charts['drawdown_chart'] = save_chart(drawdown_fig, f"{base_filename}_drawdown", "html")
    
    return charts
