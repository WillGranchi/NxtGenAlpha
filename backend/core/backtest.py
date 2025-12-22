"""
Backtesting module for Bitcoin trading strategies.

This module simulates trading based on strategy signals and tracks
portfolio performance over time.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime


class BacktestEngine:
    """
    Backtesting engine for trading strategies.
    
    This class simulates trading based on strategy signals and calculates
    portfolio performance metrics.
    """
    
    def __init__(self, initial_capital: float = 10000, fee: float = 0.001):
        """
        Initialize backtesting engine.
        
        Args:
            initial_capital (float): Starting capital for backtesting
            fee (float): Fee rate per trade (0.001 = 0.1%)
        """
        self.initial_capital = initial_capital
        self.fee = fee
        self.reset()
    
    def reset(self):
        """Reset the backtesting engine to initial state."""
        self.capital = self.initial_capital
        self.position = 0  # Position type: 0 = cash, 1 = long, -1 = short
        self.shares = 0  # Number of shares/units held
        self.trades = []
        self.equity_curve = []
        self.daily_returns = []
    
    def run_backtest(self, df: pd.DataFrame, strategy_name: str = "Strategy") -> Dict:
        """
        Run backtesting simulation.
        
        Args:
            df (pd.DataFrame): DataFrame with OHLC data and signals
            strategy_name (str): Name of the strategy being tested
            
        Returns:
            Dict: Backtesting results including trades, equity curve, and metrics
        """
        self.reset()
        
        # Ensure we have the required columns
        required_columns = ['Open', 'High', 'Low', 'Close', 'Signal', 'Position']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Run simulation day by day
        for i, (date, row) in enumerate(df.iterrows()):
            current_price = row['Close']
            signal = row['Signal']
            target_position = row['Position']
            
            # Execute trades when position changes
            if int(target_position) != self.position:
                self._execute_position_change(date, current_price, int(target_position))
            
            # Calculate current portfolio value AFTER trade execution
            portfolio_value = self.capital + (self.shares * current_price)
            self.equity_curve.append({
                'Date': date,
                'Portfolio_Value': portfolio_value,
                'Price': current_price,
                'Position': self.position,
                'Capital': self.capital,
                'Shares': self.shares
            })
            
            # Calculate daily return
            if i > 0:
                prev_value = self.equity_curve[-2]['Portfolio_Value']
                daily_return = (portfolio_value - prev_value) / prev_value
                self.daily_returns.append(daily_return)
            else:
                self.daily_returns.append(0)
        
        # Calculate final results
        results = self._calculate_results(df, strategy_name)
        
        return results
    
    def _execute_position_change(self, date: datetime, price: float, target_position: int):
        """
        Execute a position change.
        
        Args:
            date (datetime): Trade date
            price (float): Trade price
            target_position (int): Target position (0 = cash, 1 = long, -1 = short)
        """
        current_position = self.position
        position_change = target_position - current_position
        
        if position_change == 0:
            return  # No change needed
        
        # Calculate current portfolio value
        current_portfolio_value = self.capital + (self.shares * price)
        
        # Handle all position transitions
        if current_position == 0:  # Currently in cash
            if target_position == 1:  # Cash → Long
                # Convert all cash to shares
                self.shares = current_portfolio_value / price
                self.capital = 0
                self.position = 1
                
                self.trades.append({
                    'Date': date,
                    'Type': 'BUY',
                    'Price': price,
                    'Quantity': self.shares,
                    'Value': current_portfolio_value,
                    'Commission': current_portfolio_value * self.fee,
                    'Capital_After': self.capital,
                    'Position_After': self.position
                })
            elif target_position == -1:  # Cash → Short
                # Short sell: borrow shares and receive cash
                # Calculate how many shares to short (use all portfolio value)
                short_shares = current_portfolio_value / price
                self.shares = -short_shares  # Negative shares for short
                # Capital increases by the proceeds from short sale (minus fees)
                short_proceeds = short_shares * price
                self.capital = current_portfolio_value + short_proceeds - (short_proceeds * self.fee)
                self.position = -1
                
                self.trades.append({
                    'Date': date,
                    'Type': 'SHORT_SELL',
                    'Price': price,
                    'Quantity': short_shares,
                    'Value': short_proceeds,
                    'Commission': short_proceeds * self.fee,
                    'Capital_After': self.capital,
                    'Position_After': self.position
                })
        
        elif current_position == 1:  # Currently long
            if target_position == 0:  # Long → Cash
                # Sell shares and convert to cash
                shares_to_sell = self.shares  # Save before clearing
                sell_value = shares_to_sell * price
                # Capital after selling (minus fees)
                self.capital = sell_value - (sell_value * self.fee)
                self.shares = 0
                self.position = 0
                
                self.trades.append({
                    'Date': date,
                    'Type': 'SELL',
                    'Price': price,
                    'Quantity': shares_to_sell,
                    'Value': sell_value,
                    'Commission': sell_value * self.fee,
                    'Capital_After': self.capital,
                    'Position_After': self.position
                })
            elif target_position == -1:  # Long → Short
                # First sell long position, then enter short
                shares_to_sell = self.shares  # Save before changing
                sell_value = shares_to_sell * price
                # After selling, capital equals sell proceeds minus fees
                intermediate_capital = sell_value - (sell_value * self.fee)
                
                # Now enter short position with all available capital
                short_shares = intermediate_capital / price  # Amount to short
                short_proceeds = short_shares * price
                self.shares = -short_shares  # Negative shares for short
                self.capital = intermediate_capital + short_proceeds - (short_proceeds * self.fee)
                self.position = -1
                
                # Record two trades: sell long, then short sell
                self.trades.append({
                    'Date': date,
                    'Type': 'SELL',
                    'Price': price,
                    'Quantity': shares_to_sell,
                    'Value': sell_value,
                    'Commission': sell_value * self.fee,
                    'Capital_After': intermediate_capital,
                    'Position_After': 0  # Intermediate state
                })
                self.trades.append({
                    'Date': date,
                    'Type': 'SHORT_SELL',
                    'Price': price,
                    'Quantity': short_shares,
                    'Value': short_proceeds,
                    'Commission': short_proceeds * self.fee,
                    'Capital_After': self.capital,
                    'Position_After': self.position
                })
        
        elif current_position == -1:  # Currently short
            if target_position == 0:  # Short → Cash
                # Cover short position: buy back shares
                # Need to pay back the borrowed shares
                shares_to_cover = abs(self.shares)  # Save before clearing
                cover_cost = shares_to_cover * price
                # After covering, capital is reduced by the cost (plus fees)
                # Use capital directly, not portfolio_value (which already accounts for short liability)
                self.capital = self.capital - cover_cost - (cover_cost * self.fee)
                self.shares = 0
                self.position = 0
                
                self.trades.append({
                    'Date': date,
                    'Type': 'COVER_SHORT',
                    'Price': price,
                    'Quantity': shares_to_cover,
                    'Value': cover_cost,
                    'Commission': cover_cost * self.fee,
                    'Capital_After': self.capital,
                    'Position_After': self.position
                })
            elif target_position == 1:  # Short → Long
                # Cover short, then enter long
                shares_to_cover = abs(self.shares)  # Save before changing
                cover_cost = shares_to_cover * price
                # Cover the short position first (use capital directly)
                remaining_capital = self.capital - cover_cost - (cover_cost * self.fee)
                # Then use remaining capital to buy long position
                if remaining_capital > 0:
                    long_shares = remaining_capital / (price * (1 + self.fee))
                    long_cost = long_shares * price
                    self.shares = long_shares
                    self.capital = remaining_capital - long_cost - (long_cost * self.fee)
                else:
                    long_shares = 0
                    self.shares = 0
                    self.capital = remaining_capital
                self.position = 1
                
                # Record two trades: cover short, then buy
                self.trades.append({
                    'Date': date,
                    'Type': 'COVER_SHORT',
                    'Price': price,
                    'Quantity': shares_to_cover,
                    'Value': cover_cost,
                    'Commission': cover_cost * self.fee,
                    'Capital_After': remaining_capital,
                    'Position_After': 0  # Intermediate state
                })
                if long_shares > 0:
                    long_cost = long_shares * price
                    self.trades.append({
                        'Date': date,
                        'Type': 'BUY',
                        'Price': price,
                        'Quantity': long_shares,
                        'Value': long_cost,
                        'Commission': long_cost * self.fee,
                        'Capital_After': self.capital,
                        'Position_After': self.position
                    })
    
    def _generate_trade_log(self) -> List[Dict]:
        """
        Generate detailed trade log with entry/exit pairs.
        
        Returns:
            List[Dict]: List of completed round-trip trades
        """
        trade_log = []
        buy_trades = []
        short_sell_trades = []
        
        for trade in self.trades:
            trade_type = trade['Type']
            
            # Handle LONG trades
            if trade_type == 'BUY':
                buy_trades.append(trade)
            elif trade_type == 'SELL' and buy_trades:
                # Match with most recent buy
                buy_trade = buy_trades.pop()
                
                entry_date = buy_trade['Date']
                exit_date = trade['Date']
                entry_price = buy_trade['Price']
                exit_price = trade['Price']
                
                return_pct = ((exit_price - entry_price) / entry_price) * 100
                duration = (exit_date - entry_date).days
                
                trade_log.append({
                    'entry_date': entry_date.strftime('%Y-%m-%d'),
                    'exit_date': exit_date.strftime('%Y-%m-%d'),
                    'entry_price': round(entry_price, 2),
                    'exit_price': round(exit_price, 2),
                    'return_pct': round(return_pct, 2),
                    'duration': duration,
                    'direction': 'LONG'
                })
            
            # Handle SHORT trades
            elif trade_type == 'SHORT_SELL':
                short_sell_trades.append(trade)
            elif trade_type == 'COVER_SHORT' and short_sell_trades:
                # Match with most recent short sell
                short_sell_trade = short_sell_trades.pop()
                
                entry_date = short_sell_trade['Date']
                exit_date = trade['Date']
                entry_price = short_sell_trade['Price']
                exit_price = trade['Price']
                
                # For short: profit when exit < entry (price drops)
                # return_pct = ((entry - exit) / entry) * 100
                return_pct = ((entry_price - exit_price) / entry_price) * 100
                duration = (exit_date - entry_date).days
                
                trade_log.append({
                    'entry_date': entry_date.strftime('%Y-%m-%d'),
                    'exit_date': exit_date.strftime('%Y-%m-%d'),
                    'entry_price': round(entry_price, 2),
                    'exit_price': round(exit_price, 2),
                    'return_pct': round(return_pct, 2),
                    'duration': duration,
                    'direction': 'SHORT'
                })
        
        return trade_log
    
    def _execute_trade(self, date: datetime, price: float, signal: int, target_position: int):
        """
        Execute a trade based on signal.
        
        Args:
            date (datetime): Trade date
            price (float): Trade price
            signal (int): Trade signal (1 = buy, -1 = sell)
            target_position (int): Target position after trade
        """
        current_position = self.position
        position_change = target_position - current_position
        
        if position_change == 0:
            return  # No trade needed
        
        # Calculate trade size and cost
        trade_size = abs(position_change)
        trade_cost = trade_size * price
        commission_cost = trade_cost * self.fee
        total_cost = trade_cost + commission_cost
        
        if position_change > 0:  # Buy
            if total_cost <= self.capital:
                self.capital -= total_cost
                self.position += trade_size
                
                self.trades.append({
                    'Date': date,
                    'Type': 'BUY',
                    'Price': price,
                    'Quantity': trade_size,
                    'Value': trade_cost,
                    'Commission': commission_cost,
                    'Capital_After': self.capital,
                    'Position_After': self.position
                })
        
        elif position_change < 0:  # Sell
            if trade_size <= self.position:
                self.capital += trade_cost - commission_cost
                self.position -= trade_size
                
                self.trades.append({
                    'Date': date,
                    'Type': 'SELL',
                    'Price': price,
                    'Quantity': trade_size,
                    'Value': trade_cost,
                    'Commission': commission_cost,
                    'Capital_After': self.capital,
                    'Position_After': self.position
                })
    
    def _calculate_results(self, df: pd.DataFrame, strategy_name: str) -> Dict:
        """
        Calculate backtesting results and metrics.
        
        Args:
            df (pd.DataFrame): Original data with signals
            strategy_name (str): Name of the strategy
            
        Returns:
            Dict: Complete backtesting results
        """
        # Convert equity curve to DataFrame for calculations
        if len(self.equity_curve) > 0:
            equity_df = pd.DataFrame(self.equity_curve)
            equity_df.set_index('Date', inplace=True)
        else:
            equity_df = pd.DataFrame()
        
        # Keep original equity curve as list of dicts for API response
        equity_curve_for_api = self.equity_curve.copy()
        
        # Calculate final portfolio value
        if not df.empty:
            final_price = df['Close'].iloc[-1]
            final_portfolio_value = self.capital + (self.shares * final_price)
        else:
            final_price = 0
            final_portfolio_value = self.capital
        
        # Calculate buy and hold performance for comparison
        if not df.empty:
            buy_hold_return = (final_price - df['Close'].iloc[0]) / df['Close'].iloc[0]
            buy_hold_value = self.initial_capital * (1 + buy_hold_return)
        else:
            buy_hold_return = 0
            buy_hold_value = self.initial_capital
        
        # Calculate strategy return
        strategy_return = (final_portfolio_value - self.initial_capital) / self.initial_capital
        
        # Calculate daily returns for risk metrics
        daily_returns = pd.Series(self.daily_returns)
        
        # Calculate additional metrics
        total_trades = len(self.trades)
        winning_trades = len([t for t in self.trades if t['Type'] == 'SELL' and 
                             t['Value'] > 0])  # Simplified win calculation
        
        # Calculate maximum drawdown
        if not equity_df.empty:
            equity_values = equity_df['Portfolio_Value']
            rolling_max = equity_values.expanding().max()
            drawdown = (equity_values - rolling_max) / rolling_max
            max_drawdown = drawdown.min()
        else:
            max_drawdown = 0
            drawdown = pd.Series()
        
        # Calculate Sharpe ratio (assuming risk-free rate of 0)
        if daily_returns.std() > 0:
            sharpe_ratio = daily_returns.mean() / daily_returns.std() * np.sqrt(252)
        else:
            sharpe_ratio = 0
        
        # Calculate win rate
        if total_trades > 0:
            win_rate = winning_trades / total_trades
        else:
            win_rate = 0
        
        # Calculate CAGR
        if not df.empty:
            days = (df.index[-1] - df.index[0]).days
            years = days / 365.25
            if years > 0:
                cagr = (final_portfolio_value / self.initial_capital) ** (1 / years) - 1
            else:
                cagr = 0
        else:
            cagr = 0
        
        # Generate trade log
        trade_log = self._generate_trade_log()
        
        results = {
            'strategy_name': strategy_name,
            'initial_capital': self.initial_capital,
            'final_portfolio_value': final_portfolio_value,
            'final_capital': self.capital,
            'final_position': self.position,
            'final_price': final_price,
            'total_return': strategy_return,
            'cagr': cagr,
            'buy_hold_return': buy_hold_return,
            'buy_hold_value': buy_hold_value,
            'sharpe_ratio': sharpe_ratio,
            'max_drawdown': max_drawdown,
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'win_rate': win_rate,
            'equity_curve': equity_curve_for_api,
            'trades': self.trades,
            'trade_log': trade_log,
            'daily_returns': daily_returns,
            'drawdown': drawdown
        }
        
        return results


def run_backtest(df: pd.DataFrame, strategy_name: str = "Strategy", 
                initial_capital: float = 10000, fee: float = 0.001) -> Dict:
    """
    Convenience function to run a backtest.
    
    Args:
        df (pd.DataFrame): DataFrame with OHLC data and signals
        strategy_name (str): Name of the strategy
        initial_capital (float): Starting capital
        fee (float): Fee rate
        
    Returns:
        Dict: Backtesting results
    """
    engine = BacktestEngine(initial_capital, fee)
    return engine.run_backtest(df, strategy_name)


def compare_strategies(df: pd.DataFrame, strategies: List[Tuple], 
                      initial_capital: float = 10000) -> pd.DataFrame:
    """
    Compare multiple strategies side by side.
    
    Args:
        df (pd.DataFrame): DataFrame with OHLC data
        strategies (List[Tuple]): List of (strategy_instance, strategy_name) tuples
        initial_capital (float): Starting capital for all strategies
        
    Returns:
        pd.DataFrame: Comparison results
    """
    results = []
    
    for strategy, name in strategies:
        # Generate signals
        df_with_signals = strategy.generate_signals(df)
        
        # Run backtest
        backtest_results = run_backtest(df_with_signals, name, initial_capital)
        
        # Extract key metrics
        results.append({
            'Strategy': name,
            'Total Return': f"{backtest_results['total_return']:.2%}",
            'CAGR': f"{backtest_results['cagr']:.2%}",
            'Sharpe Ratio': f"{backtest_results['sharpe_ratio']:.2f}",
            'Max Drawdown': f"{backtest_results['max_drawdown']:.2%}",
            'Win Rate': f"{backtest_results['win_rate']:.2%}",
            'Total Trades': backtest_results['total_trades'],
            'Final Value': f"${backtest_results['final_portfolio_value']:,.2f}"
        })
    
    return pd.DataFrame(results)


