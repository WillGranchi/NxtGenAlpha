"""
Performance metrics module for Bitcoin trading strategies.

This module calculates various performance metrics including returns,
risk measures, and other statistical indicators.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from scipy import stats


def calculate_returns(prices: pd.Series) -> pd.Series:
    """
    Calculate simple returns from price series.
    
    Args:
        prices (pd.Series): Price series
        
    Returns:
        pd.Series: Returns series
    """
    return prices.pct_change().dropna()


def calculate_log_returns(prices: pd.Series) -> pd.Series:
    """
    Calculate log returns from price series.
    
    Args:
        prices (pd.Series): Price series
        
    Returns:
        pd.Series: Log returns series
    """
    return np.log(prices / prices.shift(1)).dropna()


def calculate_cagr(initial_value: float, final_value: float, years: float) -> float:
    """
    Calculate Compound Annual Growth Rate (CAGR).
    
    Args:
        initial_value (float): Initial portfolio value
        final_value (float): Final portfolio value
        years (float): Number of years
        
    Returns:
        float: CAGR as decimal
    """
    if years <= 0 or initial_value <= 0:
        return 0
    return (final_value / initial_value) ** (1 / years) - 1


def calculate_sharpe_ratio(returns: pd.Series, risk_free_rate: float = 0.0) -> float:
    """
    Calculate Sharpe ratio.
    
    Args:
        returns (pd.Series): Returns series
        risk_free_rate (float): Risk-free rate (annual)
        
    Returns:
        float: Sharpe ratio
    """
    if len(returns) == 0 or returns.std() == 0:
        return 0
    
    excess_returns = returns - (risk_free_rate / 252)  # Daily risk-free rate
    return (excess_returns.mean() / returns.std()) * np.sqrt(252)


def calculate_sortino_ratio(returns: pd.Series, risk_free_rate: float = 0.0) -> float:
    """
    Calculate Sortino ratio (downside deviation).
    
    Args:
        returns (pd.Series): Returns series
        risk_free_rate (float): Risk-free rate (annual)
        
    Returns:
        float: Sortino ratio
    """
    if len(returns) == 0:
        return 0
    
    excess_returns = returns - (risk_free_rate / 252)
    downside_returns = returns[returns < 0]
    
    if len(downside_returns) == 0 or downside_returns.std() == 0:
        return 0
    
    return (excess_returns.mean() / downside_returns.std()) * np.sqrt(252)


def calculate_omega_ratio(returns: pd.Series, risk_free_rate: float = 0.02) -> float:
    """
    Calculate Omega ratio.
    
    Args:
        returns (pd.Series): Returns series
        risk_free_rate (float): Risk-free rate threshold (annual)
        
    Returns:
        float: Omega ratio
    """
    if len(returns) == 0:
        return 0
    
    threshold = risk_free_rate / 252  # Daily threshold
    gains = returns[returns > threshold].sum()
    losses = abs(returns[returns <= threshold].sum())
    
    if losses == 0:
        return float('inf') if gains > 0 else 0
    
    return gains / losses


def calculate_max_drawdown(equity_curve: pd.Series) -> Tuple[float, pd.Timestamp, pd.Timestamp]:
    """
    Calculate maximum drawdown and its duration.
    
    Args:
        equity_curve (pd.Series): Portfolio value over time
        
    Returns:
        Tuple[float, pd.Timestamp, pd.Timestamp]: (max_drawdown, start_date, end_date)
    """
    rolling_max = equity_curve.expanding().max()
    drawdown = (equity_curve - rolling_max) / rolling_max
    
    max_dd = drawdown.min()
    max_dd_idx = drawdown.idxmin()
    
    # Find the start of the drawdown period
    peak_idx = rolling_max.loc[:max_dd_idx].idxmax()
    
    return max_dd, peak_idx, max_dd_idx


def calculate_calmar_ratio(cagr: float, max_drawdown: float) -> float:
    """
    Calculate Calmar ratio (CAGR / Max Drawdown).
    
    Args:
        cagr (float): Compound Annual Growth Rate
        max_drawdown (float): Maximum drawdown (as positive number)
        
    Returns:
        float: Calmar ratio
    """
    if max_drawdown == 0:
        return float('inf') if cagr > 0 else 0
    return cagr / abs(max_drawdown)


def calculate_win_rate(trades: List[Dict]) -> float:
    """
    Calculate win rate from trades.
    
    Args:
        trades (List[Dict]): List of trade dictionaries
        
    Returns:
        float: Win rate as decimal
    """
    if not trades:
        return 0
    
    # Group trades into round trips (buy-sell pairs)
    round_trips = []
    open_trades = []
    
    for trade in trades:
        if trade['Type'] == 'BUY':
            open_trades.append(trade)
        elif trade['Type'] == 'SELL' and open_trades:
            buy_trade = open_trades.pop(0)
            round_trips.append({
                'buy_price': buy_trade['Price'],
                'sell_price': trade['Price'],
                'buy_date': buy_trade['Date'],
                'sell_date': trade['Date']
            })
    
    if not round_trips:
        return 0
    
    winning_trades = sum(1 for rt in round_trips if rt['sell_price'] > rt['buy_price'])
    return winning_trades / len(round_trips)


def calculate_profit_factor(trades: List[Dict]) -> float:
    """
    Calculate profit factor (gross profit / gross loss).
    
    Args:
        trades (List[Dict]): List of trade dictionaries
        
    Returns:
        float: Profit factor
    """
    if not trades:
        return 0
    
    # Group trades into round trips
    round_trips = []
    open_trades = []
    
    for trade in trades:
        if trade['Type'] == 'BUY':
            open_trades.append(trade)
        elif trade['Type'] == 'SELL' and open_trades:
            buy_trade = open_trades.pop(0)
            round_trips.append({
                'buy_price': buy_trade['Price'],
                'sell_price': trade['Price'],
                'quantity': trade['Quantity']
            })
    
    if not round_trips:
        return 0
    
    gross_profit = sum(rt['quantity'] * (rt['sell_price'] - rt['buy_price']) 
                      for rt in round_trips if rt['sell_price'] > rt['buy_price'])
    gross_loss = abs(sum(rt['quantity'] * (rt['sell_price'] - rt['buy_price']) 
                        for rt in round_trips if rt['sell_price'] < rt['buy_price']))
    
    if gross_loss == 0:
        return float('inf') if gross_profit > 0 else 0
    
    return gross_profit / gross_loss


def calculate_var(returns: pd.Series, confidence_level: float = 0.05) -> float:
    """
    Calculate Value at Risk (VaR).
    
    Args:
        returns (pd.Series): Returns series
        confidence_level (float): Confidence level (e.g., 0.05 for 5% VaR)
        
    Returns:
        float: VaR value
    """
    if len(returns) == 0:
        return 0
    return np.percentile(returns, confidence_level * 100)


def calculate_cvar(returns: pd.Series, confidence_level: float = 0.05) -> float:
    """
    Calculate Conditional Value at Risk (CVaR) or Expected Shortfall.
    
    Args:
        returns (pd.Series): Returns series
        confidence_level (float): Confidence level (e.g., 0.05 for 5% CVaR)
        
    Returns:
        float: CVaR value
    """
    if len(returns) == 0:
        return 0
    
    var = calculate_var(returns, confidence_level)
    return returns[returns <= var].mean()


def calculate_skewness(returns: pd.Series) -> float:
    """
    Calculate skewness of returns.
    
    Args:
        returns (pd.Series): Returns series
        
    Returns:
        float: Skewness
    """
    if len(returns) < 3:
        return 0
    return stats.skew(returns)


def calculate_kurtosis(returns: pd.Series) -> float:
    """
    Calculate kurtosis of returns.
    
    Args:
        returns (pd.Series): Returns series
        
    Returns:
        float: Kurtosis
    """
    if len(returns) < 4:
        return 0
    return stats.kurtosis(returns)


def calculate_volatility(returns: pd.Series, annualized: bool = True) -> float:
    """
    Calculate volatility of returns.
    
    Args:
        returns (pd.Series): Returns series
        annualized (bool): Whether to annualize the volatility
        
    Returns:
        float: Volatility
    """
    if len(returns) == 0:
        return 0
    
    vol = returns.std()
    if annualized:
        vol *= np.sqrt(252)  # Annualize assuming 252 trading days
    return vol


def calculate_beta(strategy_returns: pd.Series, market_returns: pd.Series) -> float:
    """
    Calculate beta relative to market.
    
    Args:
        strategy_returns (pd.Series): Strategy returns
        market_returns (pd.Series): Market returns
        
    Returns:
        float: Beta
    """
    if len(strategy_returns) == 0 or len(market_returns) == 0:
        return 0
    
    # Align the series
    aligned_data = pd.concat([strategy_returns, market_returns], axis=1, join='inner')
    if len(aligned_data) < 2:
        return 0
    
    strategy_aligned = aligned_data.iloc[:, 0]
    market_aligned = aligned_data.iloc[:, 1]
    
    covariance = np.cov(strategy_aligned, market_aligned)[0, 1]
    market_variance = np.var(market_aligned)
    
    if market_variance == 0:
        return 0
    
    return covariance / market_variance


def calculate_alpha(strategy_returns: pd.Series, market_returns: pd.Series, 
                   risk_free_rate: float = 0.0) -> float:
    """
    Calculate alpha (excess return over market).
    
    Args:
        strategy_returns (pd.Series): Strategy returns
        market_returns (pd.Series): Market returns
        risk_free_rate (float): Risk-free rate (annual)
        
    Returns:
        float: Alpha
    """
    if len(strategy_returns) == 0 or len(market_returns) == 0:
        return 0
    
    beta = calculate_beta(strategy_returns, market_returns)
    
    strategy_annual_return = strategy_returns.mean() * 252
    market_annual_return = market_returns.mean() * 252
    
    return strategy_annual_return - (risk_free_rate + beta * (market_annual_return - risk_free_rate))


def calculate_all_metrics(backtest_results: Dict) -> Dict:
    """
    Calculate all performance metrics from backtest results.
    
    Args:
        backtest_results (Dict): Results from backtest engine
        
    Returns:
        Dict: Complete metrics dictionary (flattened for frontend)
    """
    equity_curve = backtest_results['equity_curve']
    daily_returns = backtest_results['daily_returns']
    trades = backtest_results['trades']
    
    # Basic metrics
    total_return = backtest_results['total_return']
    cagr = backtest_results['cagr']
    sharpe_ratio = backtest_results['sharpe_ratio']
    max_drawdown = backtest_results['max_drawdown']
    win_rate = backtest_results['win_rate']
    
    # Additional risk metrics
    volatility = calculate_volatility(daily_returns)
    sortino_ratio = calculate_sortino_ratio(daily_returns, risk_free_rate=0.02)
    omega_ratio = calculate_omega_ratio(daily_returns, risk_free_rate=0.02)
    calmar_ratio = calculate_calmar_ratio(cagr, max_drawdown)
    
    # VaR and CVaR
    var_5 = calculate_var(daily_returns, 0.05)
    cvar_5 = calculate_cvar(daily_returns, 0.05)
    
    # Statistical measures
    skewness = calculate_skewness(daily_returns)
    kurtosis = calculate_kurtosis(daily_returns)
    
    # Trade metrics
    profit_factor = calculate_profit_factor(trades)
    
    # Drawdown analysis
    if isinstance(equity_curve, list):
        # Convert list of dicts to DataFrame
        equity_df = pd.DataFrame(equity_curve)
        if 'Date' in equity_df.columns:
            equity_df['Date'] = pd.to_datetime(equity_df['Date'])
            equity_df.set_index('Date', inplace=True)
        equity_values = equity_df['Portfolio_Value']
    else:
        equity_values = equity_curve['Portfolio_Value']
    
    max_dd, dd_start, dd_end = calculate_max_drawdown(equity_values)
    dd_duration = (dd_end - dd_start).days if dd_start != dd_end else 0
    
    # Flattened metrics for frontend consumption
    metrics = {
        # Returns
        'net_profit_pct': round(total_return * 100, 2),
        'cagr': round(cagr * 100, 2),
        'annualized_return': round(cagr * 100, 2),
        
        # Risk metrics
        'max_drawdown_pct': round(max_drawdown * 100, 2),
        'volatility': round(volatility * 100, 2),
        'var_5_percent': round(var_5 * 100, 2),
        'cvar_5_percent': round(cvar_5 * 100, 2),
        'skewness': round(skewness, 4),
        'kurtosis': round(kurtosis, 4),
        
        # Ratios
        'sharpe_ratio': round(sharpe_ratio, 3),
        'sortino_ratio': round(sortino_ratio, 3),
        'omega_ratio': round(omega_ratio, 3) if omega_ratio != float('inf') else '∞',
        'calmar_ratio': round(calmar_ratio, 3),
        
        # Trade metrics
        'num_trades': backtest_results['total_trades'],
        'win_rate': round(win_rate * 100, 2),
        'profit_factor': round(profit_factor, 3) if profit_factor != float('inf') else '∞',
        
        # Drawdown details
        'max_drawdown': round(max_dd * 100, 2),
        'max_drawdown_duration_days': dd_duration
    }
    
    return metrics


def format_metrics(metrics: Dict) -> pd.DataFrame:
    """
    Format metrics into a readable DataFrame.
    
    Args:
        metrics (Dict): Metrics dictionary
        
    Returns:
        pd.DataFrame: Formatted metrics table
    """
    formatted_data = []
    
    for category, values in metrics.items():
        for metric, value in values.items():
            if isinstance(value, (int, float)):
                if 'ratio' in metric or 'rate' in metric:
                    formatted_data.append({
                        'Category': category.title(),
                        'Metric': metric.replace('_', ' ').title(),
                        'Value': f"{value:.4f}"
                    })
                elif 'return' in metric or 'drawdown' in metric or 'var' in metric or 'cvar' in metric:
                    formatted_data.append({
                        'Category': category.title(),
                        'Metric': metric.replace('_', ' ').title(),
                        'Value': f"{value:.2%}"
                    })
                else:
                    formatted_data.append({
                        'Category': category.title(),
                        'Metric': metric.replace('_', ' ').title(),
                        'Value': f"{value:.2f}"
                    })
            else:
                formatted_data.append({
                    'Category': category.title(),
                    'Metric': metric.replace('_', ' ').title(),
                    'Value': str(value)
                })
    
    return pd.DataFrame(formatted_data)


if __name__ == "__main__":
    # Test the metrics calculations
    import sys
    sys.path.append('..')
    from data_loader import load_btc_data
    from strategy import SMAStrategy
    from backtest import run_backtest
    
    try:
        # Load sample data and run backtest
        df = load_btc_data("../data/btc_price.csv")
        sma_strategy = SMAStrategy(50, 200)
        df_with_signals = sma_strategy.generate_signals(df)
        results = run_backtest(df_with_signals, "SMA 50/200", 10000, 0.001)
        
        # Calculate all metrics
        metrics = calculate_all_metrics(results)
        
        # Format and display
        formatted_metrics = format_metrics(metrics)
        print("Performance Metrics:")
        print(formatted_metrics.to_string(index=False))
        
    except Exception as e:
        print(f"Error: {e}")
