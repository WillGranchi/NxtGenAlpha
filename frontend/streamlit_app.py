"""
Streamlit dashboard for Bitcoin trading strategy backtesting and visualization.

This is the main frontend application that provides an interactive interface
for uploading data, running backtests, and visualizing results.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import sys
import os
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from data_loader import load_btc_data, validate_data, get_data_summary
from indicators import add_indicators
from strategy import get_available_strategies, SMAStrategy, RSIStrategy, BollingerBandsStrategy, MACDStrategy, CombinedStrategy
from backtest import run_backtest, compare_strategies
from metrics import calculate_all_metrics, format_metrics


# Page configuration
st.set_page_config(
    page_title="Bitcoin Trading Strategy Backtester",
    page_icon="₿",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #f7931a;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #f7931a;
    }
    .success-metric {
        color: #28a745;
        font-weight: bold;
    }
    .warning-metric {
        color: #ffc107;
        font-weight: bold;
    }
    .danger-metric {
        color: #dc3545;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

def main():
    """Main application function."""
    
    # Header
    st.markdown('<h1 class="main-header">₿ Bitcoin Trading Strategy Backtester</h1>', unsafe_allow_html=True)
    
    # Sidebar
    st.sidebar.title("Configuration")
    
    # Data upload section
    st.sidebar.header("📊 Data Upload")
    uploaded_file = st.sidebar.file_uploader(
        "Upload Bitcoin CSV data",
        type=['csv'],
        help="Upload a CSV file with columns: Date, Price, Open, High, Low, Vol., Change %"
    )
    
    # Use default data if no file uploaded
    if uploaded_file is None:
        st.sidebar.info("Using default Bitcoin data from data/btc_price.csv")
        data_path = "../data/btc_price.csv"
    else:
        # Save uploaded file temporarily
        data_path = f"temp_{uploaded_file.name}"
        with open(data_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
    
    # Strategy selection
    st.sidebar.header("🎯 Strategy Selection")
    available_strategies = get_available_strategies()
    strategy_name = st.sidebar.selectbox(
        "Choose a trading strategy",
        list(available_strategies.keys()),
        index=0
    )
    
    # Strategy parameters
    st.sidebar.header("⚙️ Strategy Parameters")
    
    if strategy_name == "SMA Crossover":
        fast_window = st.sidebar.slider("Fast SMA Window", 5, 100, 50)
        slow_window = st.sidebar.slider("Slow SMA Window", 20, 500, 200)
        strategy = available_strategies[strategy_name](fast_window, slow_window)
    
    elif strategy_name == "RSI Strategy":
        rsi_period = st.sidebar.slider("RSI Period", 5, 50, 14)
        oversold = st.sidebar.slider("Oversold Level", 10, 40, 30)
        overbought = st.sidebar.slider("Overbought Level", 60, 90, 70)
        strategy = available_strategies[strategy_name](rsi_period, oversold, overbought)
    
    elif strategy_name == "Bollinger Bands":
        window = st.sidebar.slider("BB Window", 10, 50, 20)
        num_std = st.sidebar.slider("Standard Deviations", 1.0, 3.0, 2.0)
        strategy = available_strategies[strategy_name](window, num_std)
    
    elif strategy_name == "MACD Strategy":
        fast = st.sidebar.slider("Fast EMA", 5, 20, 12)
        slow = st.sidebar.slider("Slow EMA", 20, 50, 26)
        signal = st.sidebar.slider("Signal Line", 5, 20, 9)
        strategy = available_strategies[strategy_name](fast, slow, signal)
    
    elif strategy_name == "Combined Strategy":
        sma_fast = st.sidebar.slider("SMA Fast", 10, 100, 50)
        sma_slow = st.sidebar.slider("SMA Slow", 50, 500, 200)
        rsi_period = st.sidebar.slider("RSI Period", 5, 50, 14)
        rsi_oversold = st.sidebar.slider("RSI Oversold", 10, 40, 30)
        rsi_overbought = st.sidebar.slider("RSI Overbought", 60, 90, 70)
        strategy = available_strategies[strategy_name](sma_fast, sma_slow, rsi_period, rsi_oversold, rsi_overbought)
    
    # Date range selection
    st.sidebar.header("📅 Analysis Period")
    
    # Get date range from data
    try:
        df_temp = load_btc_data(data_path)
        min_date = df_temp.index.min().date()
        max_date = df_temp.index.max().date()
        default_start = pd.Timestamp('2018-01-01').date()
        default_end = max_date
    except:
        min_date = pd.Timestamp('2014-01-01').date()
        max_date = pd.Timestamp('2025-01-01').date()
        default_start = pd.Timestamp('2018-01-01').date()
        default_end = max_date
    
    start_date = st.sidebar.date_input(
        "Start Date",
        value=default_start,
        min_value=min_date,
        max_value=max_date,
        help="Start date for analysis period"
    )
    
    end_date = st.sidebar.date_input(
        "End Date",
        value=default_end,
        min_value=min_date,
        max_value=max_date,
        help="End date for analysis period"
    )
    
    # Validate date range
    if start_date >= end_date:
        st.sidebar.error("Start date must be before end date!")
        return
    
    # Show selected date range info
    days_selected = (end_date - start_date).days
    st.sidebar.success(f"📅 Selected: {days_selected} days\n{start_date.strftime('%b %d, %Y')} to {end_date.strftime('%b %d, %Y')}")
    
    # Backtest parameters
    st.sidebar.header("💰 Backtest Parameters")
    initial_capital = st.sidebar.number_input(
        "Initial Capital ($)",
        min_value=1000,
        max_value=1000000,
        value=10000,
        step=1000
    )
    fee = st.sidebar.number_input(
        "Trading Fee (%)",
        min_value=0.0,
        max_value=1.0,
        value=0.1,
        step=0.01
    ) / 100
    
    # Load data and apply strategy for display
    try:
        df_full = load_btc_data(data_path)
        if validate_data(df_full):
            # Add technical indicators using FULL dataset
            df_with_indicators_full = add_indicators(df_full)
            
            # Generate trading signals using FULL dataset with current strategy
            df_with_signals_full = strategy.generate_signals(df_with_indicators_full)
            
            # Filter to selected date range for display
            start_datetime = pd.Timestamp(start_date)
            end_datetime = pd.Timestamp(end_date) + pd.Timedelta(days=1)
            
            df_with_signals = df_with_signals_full[
                (df_with_signals_full.index >= start_datetime) & 
                (df_with_signals_full.index < end_datetime)
            ].copy()
            
            if len(df_with_signals) > 0:
                # Display data info with current strategy applied
                display_data_info_with_strategy(df_with_signals, start_date, end_date, strategy.name)
            else:
                st.error("No data available for the selected date range!")
        else:
            st.error("Data validation failed. Please check your data format.")
    except Exception as e:
        st.error(f"Error loading data: {str(e)}")
    
    # Run backtest button
    if st.sidebar.button("🚀 Run Backtest", type="primary"):
        run_backtest_analysis(data_path, strategy, initial_capital, fee, start_date, end_date)
    
    # Clean up temporary file
    if uploaded_file is not None and os.path.exists(data_path):
        os.remove(data_path)


def run_backtest_analysis(data_path: str, strategy, initial_capital: float, fee: float, start_date, end_date):
    """Run backtest analysis and display results."""
    
    try:
        with st.spinner("Running backtest analysis..."):
            # Load and validate data
            df_full = load_btc_data(data_path)
            if not validate_data(df_full):
                st.error("Data validation failed.")
                return
            
            # Add technical indicators using FULL dataset
            df_with_indicators_full = add_indicators(df_full)
            
            # Generate trading signals using FULL dataset
            df_with_signals_full = strategy.generate_signals(df_with_indicators_full)
            
            # Filter to selected date range for analysis
            start_datetime = pd.Timestamp(start_date)
            end_datetime = pd.Timestamp(end_date) + pd.Timedelta(days=1)  # Include end date
            
            df_with_signals = df_with_signals_full[
                (df_with_signals_full.index >= start_datetime) & 
                (df_with_signals_full.index < end_datetime)
            ].copy()
            
            if len(df_with_signals) == 0:
                st.error("No data available for the selected date range!")
                return
            
            # Run backtest on filtered data
            results = run_backtest(df_with_signals, strategy.name, initial_capital, fee)
            
            # Calculate metrics
            metrics = calculate_all_metrics(results)
            
            # Display results
            display_backtest_results(results, metrics, df_with_signals, start_date, end_date)
            
    except Exception as e:
        st.error(f"Error running backtest: {str(e)}")


def display_data_info(df: pd.DataFrame, start_date=None, end_date=None):
    """Display data information."""
    
    st.header("📈 Data Overview")
    
    # Show selected date range if provided
    if start_date and end_date:
        st.info(f"📅 **Analysis Period**: {start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Days", len(df))
    
    with col2:
        st.metric("Date Range", f"{(df.index.max() - df.index.min()).days} days")
    
    with col3:
        st.metric("Current Price", f"${df['Close'].iloc[-1]:,.2f}")
    
    with col4:
        price_change = (df['Close'].iloc[-1] - df['Close'].iloc[0]) / df['Close'].iloc[0]
        st.metric("Total Return", f"{price_change:.2%}")
    
    # Price chart
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df.index,
        y=df['Close'],
        mode='lines',
        name='Bitcoin Price',
        line=dict(color='#f7931a', width=2)
    ))
    
    fig.update_layout(
        title="Bitcoin Price History",
        xaxis_title="Date",
        yaxis_title="Price ($)",
        height=400,
        showlegend=True
    )
    
    st.plotly_chart(fig, use_container_width=True, key="price_chart_overview")


def display_data_info_with_strategy(df_with_signals: pd.DataFrame, start_date, end_date, strategy_name):
    """Display data information with current strategy applied."""
    
    st.header("📈 Data Overview with Current Strategy")
    
    # Show selected date range and strategy
    st.info(f"📅 **Analysis Period**: {start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}")
    st.info(f"🎯 **Current Strategy**: {strategy_name}")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Days", len(df_with_signals))
    
    with col2:
        st.metric("Date Range", f"{(df_with_signals.index.max() - df_with_signals.index.min()).days} days")
    
    with col3:
        st.metric("Current Price", f"${df_with_signals['Close'].iloc[-1]:,.2f}")
    
    with col4:
        price_change = (df_with_signals['Close'].iloc[-1] - df_with_signals['Close'].iloc[0]) / df_with_signals['Close'].iloc[0]
        st.metric("Total Return", f"{price_change:.2%}")
    
    # Show signal statistics
    if 'Signal' in df_with_signals.columns:
        buy_signals = (df_with_signals['Signal'] == 1).sum()
        sell_signals = (df_with_signals['Signal'] == -1).sum()
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Buy Signals", buy_signals)
        with col2:
            st.metric("Sell Signals", sell_signals)
        with col3:
            total_signals = buy_signals + sell_signals
            st.metric("Total Signals", total_signals)
    
    # Price chart with signals
    fig = create_price_chart(df_with_signals, {})
    st.plotly_chart(fig, use_container_width=True, key="price_chart_preview")


def display_backtest_results(results: dict, metrics: dict, df_with_signals: pd.DataFrame, start_date, end_date):
    """Display backtest results."""
    
    st.header("📊 Backtest Results")
    
    # Show analysis period
    st.info(f"📅 **Analysis Period**: {start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')} ({(end_date - start_date).days} days)")
    st.info("ℹ️ **Note**: Technical indicators are calculated using the full historical dataset for accuracy, but performance metrics are calculated only for the selected period.")
    
    # Key metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_return = results['total_return']
        color = "success-metric" if total_return > 0 else "danger-metric"
        st.markdown(f'<div class="metric-card"><h4>Total Return</h4><p class="{color}">{total_return:.2%}</p></div>', unsafe_allow_html=True)
    
    with col2:
        cagr = results['cagr']
        color = "success-metric" if cagr > 0 else "danger-metric"
        st.markdown(f'<div class="metric-card"><h4>CAGR</h4><p class="{color}">{cagr:.2%}</p></div>', unsafe_allow_html=True)
    
    with col3:
        sharpe = results['sharpe_ratio']
        color = "success-metric" if sharpe > 1 else "warning-metric" if sharpe > 0 else "danger-metric"
        st.markdown(f'<div class="metric-card"><h4>Sharpe Ratio</h4><p class="{color}">{sharpe:.2f}</p></div>', unsafe_allow_html=True)
    
    with col4:
        max_dd = results['max_drawdown']
        color = "danger-metric" if max_dd < -0.2 else "warning-metric" if max_dd < -0.1 else "success-metric"
        st.markdown(f'<div class="metric-card"><h4>Max Drawdown</h4><p class="{color}">{max_dd:.2%}</p></div>', unsafe_allow_html=True)
    
    # Charts
    col1, col2 = st.columns(2)
    
    with col1:
        # Price chart with signals
        fig_price = create_price_chart(df_with_signals, results)
        st.plotly_chart(fig_price, use_container_width=True, key="price_chart_results")
    
    with col2:
        # Equity curve
        fig_equity = create_equity_chart(results)
        st.plotly_chart(fig_equity, use_container_width=True, key="equity_chart_results")
    
    # Detailed metrics table
    st.subheader("📋 Detailed Performance Metrics")
    formatted_metrics = format_metrics(metrics)
    st.dataframe(formatted_metrics, use_container_width=True)
    
    # Trade analysis
    if results['trades']:
        st.subheader("💼 Trade Analysis")
        
        trades_df = pd.DataFrame(results['trades'])
        col1, col2 = st.columns(2)
        
        with col1:
            st.write("**Recent Trades:**")
            st.dataframe(trades_df.tail(10), use_container_width=True)
        
        with col2:
            # Trade type distribution
            trade_counts = trades_df['Type'].value_counts()
            fig_trades = px.pie(
                values=trade_counts.values,
                names=trade_counts.index,
                title="Trade Distribution",
                color_discrete_sequence=['#f7931a', '#28a745']
            )
            st.plotly_chart(fig_trades, use_container_width=True, key="trades_pie_chart")


def create_price_chart(df_with_signals: pd.DataFrame, results: dict) -> go.Figure:
    """Create price chart with buy/sell signals."""
    
    fig = go.Figure()
    
    # Price line
    fig.add_trace(go.Scatter(
        x=df_with_signals.index,
        y=df_with_signals['Close'],
        mode='lines',
        name='Bitcoin Price',
        line=dict(color='#f7931a', width=2)
    ))
    
    # Buy signals
    buy_signals = df_with_signals[df_with_signals['Signal'] == 1]
    if not buy_signals.empty:
        fig.add_trace(go.Scatter(
            x=buy_signals.index,
            y=buy_signals['Close'],
            mode='markers',
            name='Buy Signal',
            marker=dict(color='green', size=10, symbol='triangle-up')
        ))
    
    # Sell signals
    sell_signals = df_with_signals[df_with_signals['Signal'] == -1]
    if not sell_signals.empty:
        fig.add_trace(go.Scatter(
            x=sell_signals.index,
            y=sell_signals['Close'],
            mode='markers',
            name='Sell Signal',
            marker=dict(color='red', size=10, symbol='triangle-down')
        ))
    
    # Add moving averages if available
    if 'SMA_50' in df_with_signals.columns:
        fig.add_trace(go.Scatter(
            x=df_with_signals.index,
            y=df_with_signals['SMA_50'],
            mode='lines',
            name='SMA 50',
            line=dict(color='blue', width=1, dash='dash')
        ))
    
    if 'SMA_200' in df_with_signals.columns:
        fig.add_trace(go.Scatter(
            x=df_with_signals.index,
            y=df_with_signals['SMA_200'],
            mode='lines',
            name='SMA 200',
            line=dict(color='purple', width=1, dash='dash')
        ))
    
    fig.update_layout(
        title="Price Chart with Trading Signals",
        xaxis_title="Date",
        yaxis_title="Price ($)",
        height=400,
        showlegend=True
    )
    
    return fig


def create_equity_chart(results: dict) -> go.Figure:
    """Create equity curve chart with position-based coloring."""
    
    equity_df = results['equity_curve']
    
    fig = go.Figure()
    
    # Calculate Buy & Hold equity curve properly
    initial_value = results['initial_capital']
    first_price = equity_df['Price'].iloc[0]
    buy_hold_equity = [initial_value * (price / first_price) for price in equity_df['Price']]
    
    # Add Buy & Hold line
    fig.add_trace(go.Scatter(
        x=equity_df.index,
        y=buy_hold_equity,
        mode='lines',
        name='Buy & Hold',
        line=dict(color='gray', width=2, dash='dash')
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
                showlegend=True if segment_start == 0 else False,  # Only show legend for first segment
                legendgroup='strategy'  # Group all strategy segments together
            ))
            
            current_position = positions[i]
            segment_start = i
    
    # If there's only one position throughout, add a single trace
    if len(set(positions)) == 1:
        position = positions[0]
        color = colors.get(position, '#2e8b57')
        position_name = {1: 'Long', 0: 'Cash', -1: 'Short'}.get(position, 'Unknown')
        
        fig.add_trace(go.Scatter(
            x=equity_df.index,
            y=portfolio_values,
            mode='lines',
            name=f'Strategy ({position_name})',
            line=dict(color=color, width=3)
        ))
    
    fig.update_layout(
        title="Portfolio Equity Curve",
        xaxis_title="Date",
        yaxis_title="Portfolio Value ($)",
        height=400,
        showlegend=True,
        hovermode='x unified'
    )
    
    return fig


if __name__ == "__main__":
    main()
