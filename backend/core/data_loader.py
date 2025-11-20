"""
Data loader module for Bitcoin trading strategy backtesting.

This module handles loading and preprocessing of historical cryptocurrency price data
from CSV files and fetching live data from Binance API, ensuring proper 
datetime indexing and data cleaning.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict
from functools import lru_cache
import logging
import requests
import os
import json
from pathlib import Path
import time


# Global variable to track last update time per symbol
_last_update_time: Dict[str, datetime] = {}

def fetch_crypto_data_from_binance(symbol: str = "BTCUSDT", days: int = 1825, fallback_to_coingecko: bool = True) -> pd.DataFrame:
    """
    Fetch cryptocurrency historical data from Binance API with full OHLCV data.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        days (int): Number of days of historical data to fetch (default 1825 = 5 years)
        
    Returns:
        pd.DataFrame: DataFrame with OHLCV data (Open, High, Low, Close, Volume)
        
    Raises:
        Exception: If API request fails
    """
    logger = logging.getLogger(__name__)
    
    try:
        base_url = "https://api.binance.com/api/v3/klines"
        interval = "1d"  # Daily candles
        limit = 1000  # Maximum candles per request
        
        # Calculate start and end times
        # Binance API requires endTime to be current time or past, not future
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
        
        # Convert to milliseconds (Binance API requirement)
        # Use current time as endTime to avoid future date issues
        current_time_ms = int(datetime.now().timestamp() * 1000)
        end_time_ms = current_time_ms
        start_time_ms = int(start_time.timestamp() * 1000)
        
        # Ensure start_time is not too far in the past (Binance has limits)
        # Binance typically allows up to 1000 days of historical data per request
        if days > 1000:
            # For requests > 1000 days, we'll paginate
            pass
        
        logger.info(f"Fetching {symbol} data from Binance ({days} days, ~{days // limit + 1} requests)...")
        
        all_data = []
        current_start = start_time_ms
        
        # Fetch data in chunks of 1000 candles (Binance limit)
        request_count = 0
        max_requests = (days // limit) + 2  # Add buffer for safety
        
        while current_start < end_time_ms and request_count < max_requests:
            # Calculate end time for this request (current_start + limit days, but not beyond end_time_ms)
            request_end = min(current_start + (limit * 24 * 60 * 60 * 1000), end_time_ms)
            
            params = {
                'symbol': symbol,
                'interval': interval,
                'startTime': current_start,
                'endTime': request_end,
                'limit': limit
            }
            
            # Rate limiting: Binance allows 1200 requests/minute
            if request_count > 0:
                time.sleep(0.05)  # 50ms delay between requests
            
            try:
                response = requests.get(base_url, params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                
                if not data:
                    logger.warning(f"No data returned for {symbol} starting from {current_start}")
                    break
                
                all_data.extend(data)
                
                # Update start time for next request (use last candle's close time + 1ms)
                if len(data) > 0:
                    last_candle_close_time = data[-1][6]  # Close time is index 6
                    current_start = last_candle_close_time + 1
                else:
                    break
                
                request_count += 1
                
                # Log progress
                if request_count % 5 == 0:
                    logger.info(f"Fetched {len(all_data)} candles so far...")
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 451:
                    # 451 = Unavailable For Legal Reasons (geographic restriction)
                    logger.warning(f"Binance API unavailable (451): Geographic restriction detected")
                    if fallback_to_coingecko and symbol == "BTCUSDT":
                        logger.info("Falling back to CoinGecko API for Bitcoin data")
                        return fetch_btc_data_from_coingecko(days=min(days, 365))
                    else:
                        raise Exception(f"Binance API unavailable (451): Geographic restriction. Consider using VPN or alternative data source.")
                else:
                    logger.error(f"HTTP error fetching data chunk: {e}")
                    if request_count < max_requests:
                        time.sleep(2)
                        continue
                    else:
                        raise
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching data chunk: {e}")
                # Retry once with exponential backoff
                if request_count < max_requests:
                    time.sleep(2)
                    continue
                else:
                    raise
        
        if not all_data:
            raise ValueError(f"No data returned from Binance for {symbol}")
        
        # Parse Binance klines response format:
        # [Open time, Open, High, Low, Close, Volume, Close time, Quote asset volume, 
        #  Number of trades, Taker buy base asset volume, Taker buy quote asset volume, Ignore]
        df = pd.DataFrame(all_data, columns=[
            'OpenTime', 'Open', 'High', 'Low', 'Close', 'Volume',
            'CloseTime', 'QuoteVolume', 'Trades', 'TakerBuyBase', 'TakerBuyQuote', 'Ignore'
        ])
        
        # Convert to proper data types
        df['Date'] = pd.to_datetime(df['OpenTime'], unit='ms')
        df['Open'] = df['Open'].astype(float)
        df['High'] = df['High'].astype(float)
        df['Low'] = df['Low'].astype(float)
        df['Close'] = df['Close'].astype(float)
        df['Volume'] = df['Volume'].astype(float)
        
        # Set Date as index and select only OHLCV columns
        df.set_index('Date', inplace=True)
        df = df[['Open', 'High', 'Low', 'Close', 'Volume']]
        
        # Remove duplicates (in case of overlapping requests)
        df = df[~df.index.duplicated(keep='first')]
        
        # Sort by date
        df.sort_index(inplace=True)
        
        logger.info(f"Successfully fetched {len(df)} days of {symbol} data from Binance")
        logger.info(f"Date range: {df.index.min()} to {df.index.max()}")
        logger.info(f"Price range: ${df['Close'].min():.2f} - ${df['Close'].max():.2f}")
        
        return df
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching data from Binance: {e}")
        # Try fallback if available
        if fallback_to_coingecko and symbol == "BTCUSDT":
            logger.info("Falling back to CoinGecko API for Bitcoin data")
            return fetch_btc_data_from_coingecko(days=min(days, 365))
        raise Exception(f"Failed to fetch data from Binance: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error fetching data: {e}")
        # Try fallback if available
        if fallback_to_coingecko and symbol == "BTCUSDT" and "451" not in str(e):
            logger.info("Falling back to CoinGecko API for Bitcoin data")
            try:
                return fetch_btc_data_from_coingecko(days=min(days, 365))
            except:
                pass
        raise


def fetch_btc_data_from_coingecko(days: int = 365) -> pd.DataFrame:
    """
    Fetch Bitcoin historical data from CoinGecko API.
    
    Args:
        days (int): Number of days of historical data to fetch (max 365)
        
    Returns:
        pd.DataFrame: DataFrame with OHLC data
        
    Raises:
        Exception: If API request fails
    """
    logger = logging.getLogger(__name__)
    try:
        url = f"https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"
        params = {
            'vs_currency': 'usd',
            'days': min(days, 365),  # CoinGecko free tier limit
            'interval': 'daily'
        }
        
        logger.info(f"Fetching Bitcoin data from CoinGecko ({days} days)...")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract prices (OHLC data)
        prices = data.get('prices', [])
        if not prices:
            raise ValueError("No price data returned from CoinGecko")
        
        # Convert to DataFrame
        df = pd.DataFrame(prices, columns=['timestamp', 'price'])
        df['Date'] = pd.to_datetime(df['timestamp'], unit='ms')
        df.set_index('Date', inplace=True)
        
        # CoinGecko only provides close prices in market_chart endpoint
        # For OHLC, we'd need a different endpoint or use close as all values
        # For now, use close price for all OHLC columns
        df['Open'] = df['price']
        df['High'] = df['price']
        df['Low'] = df['price']
        df['Close'] = df['price']
        
        # Try to get market cap data for volume estimation
        market_caps = data.get('market_caps', [])
        if market_caps:
            df_mc = pd.DataFrame(market_caps, columns=['timestamp', 'market_cap'])
            df_mc['Date'] = pd.to_datetime(df_mc['timestamp'], unit='ms')
            df_mc.set_index('Date', inplace=True)
            # Estimate volume as a percentage of market cap (rough approximation)
            df['Volume'] = df_mc['market_cap'] * 0.01  # 1% of market cap as volume estimate
        else:
            df['Volume'] = 0
        
        df.drop(['timestamp', 'price'], axis=1, inplace=True)
        df.sort_index(inplace=True)
        
        logger.info(f"Successfully fetched {len(df)} days of data from CoinGecko")
        logger.info(f"Date range: {df.index.min()} to {df.index.max()}")
        
        return df
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching data from CoinGecko: {e}")
        raise Exception(f"Failed to fetch data from CoinGecko: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error fetching data: {e}")
        raise


def get_available_symbols() -> list:
    """
    Get list of available cryptocurrency symbols supported by Binance.
    
    Returns:
        list: List of symbol strings (e.g., ['BTCUSDT', 'ETHUSDT', ...])
    """
    # Common cryptocurrency pairs available on Binance
    return [
        'BTCUSDT',   # Bitcoin
        'ETHUSDT',   # Ethereum
        'BNBUSDT',   # Binance Coin
        'ADAUSDT',   # Cardano
        'SOLUSDT',   # Solana
        'XRPUSDT',   # Ripple
        'DOTUSDT',   # Polkadot
        'DOGEUSDT',  # Dogecoin
        'AVAXUSDT',  # Avalanche
        'MATICUSDT', # Polygon
        'LINKUSDT',  # Chainlink
        'UNIUSDT',   # Uniswap
        'LTCUSDT',   # Litecoin
        'ATOMUSDT',  # Cosmos
        'ETCUSDT',   # Ethereum Classic
    ]


def save_data_to_csv(df: pd.DataFrame, file_path: Optional[str] = None, symbol: str = "BTCUSDT") -> str:
    """
    Save DataFrame to CSV file.
    
    Args:
        df (pd.DataFrame): DataFrame to save
        file_path (str, optional): Path to save file. Defaults to data directory.
        symbol (str): Cryptocurrency symbol (e.g., "BTCUSDT")
        
    Returns:
        str: Path to saved file
    """
    if file_path is None:
        import os
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        os.makedirs(data_dir, exist_ok=True)
        # Use symbol-specific filename, but maintain backward compatibility for BTC
        if symbol == "BTCUSDT":
            # Check if old file exists, use it for backward compatibility
            old_file = os.path.join(data_dir, 'Bitcoin Historical Data4.csv')
            if os.path.exists(old_file):
                file_path = old_file
            else:
                file_path = os.path.join(data_dir, f'{symbol}_historical_data.csv')
        else:
            file_path = os.path.join(data_dir, f'{symbol}_historical_data.csv')
    
    # Create a copy to avoid modifying the original
    df_save = df.copy()
    
    # Reset index to save Date as column
    df_save = df_save.reset_index()
    
    # Rename Close to Price to match expected CSV format (will be renamed back by _clean_data)
    if 'Close' in df_save.columns and 'Price' not in df_save.columns:
        df_save.rename(columns={'Close': 'Price'}, inplace=True)
    
    df_save.to_csv(file_path, index=False)
    
    logger = logging.getLogger(__name__)
    logger.info(f"Data saved to {file_path}")
    
    return file_path


def fetch_crypto_data_hybrid(symbol: str = "BTCUSDT", days: int = 1825) -> Tuple[pd.DataFrame, str, str]:
    """
    Fetch cryptocurrency data using hybrid approach: Binance → CoinGecko (The Graph can be added later).
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        days (int): Number of days of historical data to fetch
        
    Returns:
        Tuple[pd.DataFrame, str, str]: DataFrame, data_source ("binance", "coingecko", "thegraph"), data_quality ("full_ohlcv", "close_only")
        
    Raises:
        Exception: If all data sources fail
    """
    logger = logging.getLogger(__name__)
    
    # Try Binance first (best quality - full OHLCV)
    try:
        logger.info(f"Attempting to fetch {symbol} data from Binance...")
        df = fetch_crypto_data_from_binance(symbol=symbol, days=days, fallback_to_coingecko=False)
        logger.info(f"Successfully fetched {symbol} data from Binance")
        return df, "binance", "full_ohlcv"
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 451:
            logger.warning(f"Binance API unavailable (451) for {symbol}, trying fallback sources...")
        else:
            logger.warning(f"Binance API error for {symbol}: {e}, trying fallback sources...")
    except Exception as e:
        logger.warning(f"Binance fetch failed for {symbol}: {e}, trying fallback sources...")
    
    # Try CoinGecko for Bitcoin and popular tokens (close prices only)
    if symbol == "BTCUSDT":
        try:
            logger.info(f"Attempting to fetch {symbol} data from CoinGecko...")
            df = fetch_btc_data_from_coingecko(days=min(days, 365))
            logger.info(f"Successfully fetched {symbol} data from CoinGecko")
            return df, "coingecko", "close_only"
        except Exception as e:
            logger.error(f"CoinGecko fetch failed for {symbol}: {e}")
    
    # TODO: Add The Graph API integration for Ethereum-based tokens
    # if symbol in ["ETHUSDT", "LINKUSDT", "UNIUSDT"]:
    #     try:
    #         df = fetch_crypto_data_from_thegraph(symbol=symbol, days=days)
    #         return df, "thegraph", "full_ohlcv"
    #     except Exception as e:
    #         logger.error(f"The Graph fetch failed for {symbol}: {e}")
    
    raise Exception(f"All data sources failed for {symbol}")


def update_crypto_data(symbol: str = "BTCUSDT", force: bool = False, days: int = 1825) -> pd.DataFrame:
    """
    Update cryptocurrency data using hybrid data sources and save to CSV.
    Checks if data is fresh (updated within last 24 hours) before fetching.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        force (bool): Force update even if data is fresh
        days (int): Number of days of historical data to fetch (default 1825 = 5 years)
        
    Returns:
        pd.DataFrame: Updated DataFrame
    """
    global _last_update_time
    
    logger = logging.getLogger(__name__)
    
    # Check if we need to update (once per day)
    if not force and symbol in _last_update_time:
        time_since_update = datetime.now() - _last_update_time[symbol]
        if time_since_update < timedelta(hours=23):  # Update if older than 23 hours
            logger.info(f"{symbol} data is fresh, skipping update")
            return load_crypto_data(symbol=symbol)
    
    try:
        # Fetch fresh data using hybrid approach
        df, data_source, data_quality = fetch_crypto_data_hybrid(symbol=symbol, days=days)
        
        # Save to CSV
        save_data_to_csv(df, symbol=symbol)
        
        # Update cache
        load_crypto_data.cache_clear()
        _last_update_time[symbol] = datetime.now()
        
        logger.info(f"{symbol} data updated successfully from {data_source} (quality: {data_quality})")
        return df
        
    except Exception as e:
        logger.error(f"Error updating {symbol} data: {e}")
        # Fall back to existing CSV if available
        try:
            return load_crypto_data(symbol=symbol)
        except:
            raise Exception(f"Failed to update {symbol} data and no local data available: {str(e)}")


def update_btc_data(force: bool = False) -> pd.DataFrame:
    """
    Update Bitcoin data (backward compatibility wrapper).
    
    Args:
        force (bool): Force update even if data is fresh
        
    Returns:
        pd.DataFrame: Updated DataFrame
    """
    return update_crypto_data(symbol="BTCUSDT", force=force)


def get_last_update_time(symbol: str = "BTCUSDT") -> Optional[datetime]:
    """Get the last time data was updated for a specific symbol."""
    return _last_update_time.get(symbol)


@lru_cache(maxsize=10)
def load_crypto_data(symbol: str = "BTCUSDT", file_path: Optional[str] = None) -> pd.DataFrame:
    """
    Load cryptocurrency historical data from CSV file with caching.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        file_path (str, optional): Path to the CSV file. Auto-generated if not provided.
        
    Returns:
        pd.DataFrame: Cleaned DataFrame with datetime index and numeric columns
        
    Raises:
        FileNotFoundError: If the specified file doesn't exist
        ValueError: If the data format is invalid
    """
    if file_path is None:
        import os
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        
        # For backward compatibility, check old Bitcoin file first
        if symbol == "BTCUSDT":
            old_file = os.path.join(data_dir, 'Bitcoin Historical Data4.csv')
            if os.path.exists(old_file):
                file_path = old_file
            else:
                file_path = os.path.join(data_dir, f'{symbol}_historical_data.csv')
        else:
            file_path = os.path.join(data_dir, f'{symbol}_historical_data.csv')
    
    try:
        # Load the CSV file
        df = pd.read_csv(file_path)
        
        # Log basic info about the loaded data
        logger = logging.getLogger(__name__)
        logger.info(f"Loaded {len(df)} rows of {symbol} data")
        logger.debug(f"Columns: {list(df.columns)}")
        
        # Clean and preprocess the data
        df = _clean_data(df)
        
        return df
        
    except FileNotFoundError:
        raise FileNotFoundError(f"Data file not found: {file_path}")
    except Exception as e:
        raise ValueError(f"Error loading {symbol} data: {str(e)}")


@lru_cache(maxsize=1)
def load_btc_data(file_path: Optional[str] = None) -> pd.DataFrame:
    """
    Load Bitcoin historical data (backward compatibility wrapper).
    
    Args:
        file_path (str, optional): Path to the CSV file containing Bitcoin data.
        
    Returns:
        pd.DataFrame: Cleaned DataFrame with datetime index and numeric columns
    """
    return load_crypto_data(symbol="BTCUSDT", file_path=file_path)


def _clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and preprocess the Bitcoin data.
    
    Args:
        df (pd.DataFrame): Raw DataFrame from CSV
        
    Returns:
        pd.DataFrame: Cleaned DataFrame with proper data types and index
    """
    # Create a copy to avoid modifying the original
    df_clean = df.copy()
    
    # Convert Date column to datetime
    df_clean['Date'] = pd.to_datetime(df_clean['Date'])
    
    # Set Date as index
    df_clean.set_index('Date', inplace=True)
    
    # Clean numeric columns by removing commas and converting to float
    # Handle both Price and Close columns (will normalize to Close later)
    numeric_columns = ['Price', 'Close', 'Open', 'High', 'Low']
    
    for col in numeric_columns:
        if col in df_clean.columns:
            # Remove commas and convert to float
            # If already numeric, just ensure it's float
            if df_clean[col].dtype != 'float64' and df_clean[col].dtype != 'int64':
                df_clean[col] = df_clean[col].astype(str).str.replace(',', '').astype(float)
            else:
                df_clean[col] = df_clean[col].astype(float)
    
    # Clean volume column (remove 'K' and 'M' suffixes and convert to float)
    if 'Vol.' in df_clean.columns:
        def clean_volume(vol_str):
            vol_str = str(vol_str)
            if 'B' in vol_str:
                return float(vol_str.replace('B', '')) * 1000000000
            elif 'M' in vol_str:
                return float(vol_str.replace('M', '')) * 1000000
            elif 'K' in vol_str:
                return float(vol_str.replace('K', '')) * 1000
            else:
                return float(vol_str)
        
        df_clean['Volume'] = df_clean['Vol.'].apply(clean_volume)
        df_clean.drop('Vol.', axis=1, inplace=True)
    
    # Clean Change % column (remove % and convert to float)
    if 'Change %' in df_clean.columns:
        df_clean['Change_Pct'] = df_clean['Change %'].astype(str).str.replace('%', '').astype(float)
        df_clean.drop('Change %', axis=1, inplace=True)
    
    # Sort by date to ensure chronological order
    df_clean.sort_index(inplace=True)
    
    # Remove any rows with NaN values
    df_clean.dropna(inplace=True)
    
    # Handle Price/Close column - accept either format
    if 'Close' in df_clean.columns and 'Price' not in df_clean.columns:
        # Already has Close, that's fine
        pass
    elif 'Price' in df_clean.columns:
        # Rename Price to Close for consistency
        df_clean.rename(columns={'Price': 'Close'}, inplace=True)
    else:
        raise ValueError("Missing required column: 'Price' or 'Close'")
    
    # Ensure we have the required columns (after Price->Close rename)
    required_columns = ['Open', 'High', 'Low', 'Close']
    missing_columns = [col for col in required_columns if col not in df_clean.columns]
    
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    logger = logging.getLogger(__name__)
    logger.info(f"Data cleaned successfully. Shape: {df_clean.shape}")
    logger.info(f"Date range: {df_clean.index.min()} to {df_clean.index.max()}")
    
    return df_clean


def validate_data(df: pd.DataFrame) -> bool:
    """
    Validate that the data meets minimum requirements for backtesting.
    
    Args:
        df (pd.DataFrame): DataFrame to validate
        
    Returns:
        bool: True if data is valid, False otherwise
    """
    # Check if we have enough data points (at least 200 for 200-day SMA)
    if len(df) < 200:
        logger = logging.getLogger(__name__)
        logger.warning(f"Only {len(df)} data points available. Need at least 200 for 200-day SMA.")
        return False
    
    # Check for required columns
    required_columns = ['Open', 'High', 'Low', 'Close']
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        logger = logging.getLogger(__name__)
        logger.error(f"Missing required columns: {missing_columns}")
        return False
    
    # Check for negative prices
    price_columns = ['Open', 'High', 'Low', 'Close']
    for col in price_columns:
        if (df[col] <= 0).any():
            logger = logging.getLogger(__name__)
            logger.warning(f"Found non-positive values in {col} column")
            return False
    
    # Check for reasonable price ranges (Bitcoin should be > $1)
    if df['Close'].min() < 1:
        logger = logging.getLogger(__name__)
        logger.warning("Prices seem unreasonably low")
        return False
    
    logger = logging.getLogger(__name__)
    logger.info("Data validation passed!")
    return True


def get_data_summary(df: pd.DataFrame) -> dict:
    """
    Get a summary of the loaded data.
    
    Args:
        df (pd.DataFrame): DataFrame to summarize
        
    Returns:
        dict: Summary statistics
    """
    summary = {
        'total_rows': len(df),
        'date_range': {
            'start': df.index.min().strftime('%Y-%m-%d'),
            'end': df.index.max().strftime('%Y-%m-%d')
        },
        'price_range': {
            'min': df['Close'].min(),
            'max': df['Close'].max(),
            'current': df['Close'].iloc[-1]
        },
        'columns': list(df.columns)
    }
    
    return summary


if __name__ == "__main__":
    # Test the data loader
    try:
        df = load_btc_data("../data/btc_price.csv")
        print("\nData Summary:")
        summary = get_data_summary(df)
        for key, value in summary.items():
            print(f"{key}: {value}")
        
        print("\nFirst 5 rows:")
        print(df.head())
        
        print("\nLast 5 rows:")
        print(df.tail())
        
    except Exception as e:
        print(f"Error: {e}")
