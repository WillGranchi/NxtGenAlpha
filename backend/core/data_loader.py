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

def fetch_crypto_data_from_binance(symbol: str = "BTCUSDT", days: int = 1825, start_date: Optional[datetime] = None, fallback_to_coingecko: bool = True) -> pd.DataFrame:
    """
    Fetch cryptocurrency historical data from Binance API with full OHLCV data.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        days (int): Number of days of historical data to fetch (default 1825 = 5 years)
        start_date (datetime, optional): Specific start date to fetch from (overrides days)
        fallback_to_coingecko (bool): Whether to fallback to CoinGecko on failure
        
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
        if start_date:
            start_time = start_date
            # Calculate days from start_date to now
            days = (end_time - start_time).days
        else:
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


def fetch_btc_data_from_coingecko(days: int = 365, start_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Fetch Bitcoin historical data from CoinGecko API.
    Uses OHLC endpoint for better data quality when available.
    Can fetch historical data from specific dates (e.g., 2016) using history endpoint.
    
    Args:
        days (int): Number of days of historical data to fetch (max 365 for free tier)
        start_date (datetime, optional): Specific start date to fetch from (for historical data beyond 365 days)
        
    Returns:
        pd.DataFrame: DataFrame with OHLC data
        
    Raises:
        Exception: If API request fails
    """
    logger = logging.getLogger(__name__)
    
    # If start_date is provided and it's more than 365 days ago, use history endpoint
    if start_date:
        days_from_start = (datetime.now() - start_date).days
        if days_from_start > 365:
            logger.info(f"Fetching historical data from {start_date.strftime('%Y-%m-%d')} (>{days_from_start} days ago)...")
            return fetch_btc_historical_from_coingecko(start_date=start_date)
    
    try:
        # Try OHLC endpoint first (better data quality)
        # CoinGecko free tier allows OHLC endpoint for historical data
        try:
            url_ohlc = f"https://api.coingecko.com/api/v3/coins/bitcoin/ohlc"
            params_ohlc = {
                'vs_currency': 'usd',
                'days': min(days, 365),  # CoinGecko free tier limit
            }
            
            logger.info(f"Attempting to fetch Bitcoin OHLC data from CoinGecko ({days} days)...")
            response_ohlc = requests.get(url_ohlc, params=params_ohlc, timeout=30)
            
            if response_ohlc.status_code == 200:
                ohlc_data = response_ohlc.json()
                if ohlc_data and len(ohlc_data) > 0:
                    # OHLC format: [timestamp, open, high, low, close]
                    df_ohlc = pd.DataFrame(ohlc_data, columns=['timestamp', 'Open', 'High', 'Low', 'Close'])
                    df_ohlc['Date'] = pd.to_datetime(df_ohlc['timestamp'], unit='ms')
                    df_ohlc.set_index('Date', inplace=True)
                    df_ohlc = df_ohlc[['Open', 'High', 'Low', 'Close']]
                    
                    # Get volume from market_chart endpoint
                    url_vol = f"https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"
                    params_vol = {
                        'vs_currency': 'usd',
                        'days': min(days, 365),
                        'interval': 'daily'
                    }
                    response_vol = requests.get(url_vol, params=params_vol, timeout=30)
                    if response_vol.status_code == 200:
                        vol_data = response_vol.json()
                        total_volumes = vol_data.get('total_volumes', [])
                        if total_volumes:
                            df_vol = pd.DataFrame(total_volumes, columns=['timestamp', 'Volume'])
                            df_vol['Date'] = pd.to_datetime(df_vol['timestamp'], unit='ms')
                            df_vol.set_index('Date', inplace=True)
                            # Merge volume data
                            df_ohlc = df_ohlc.join(df_vol, how='left')
                            df_ohlc['Volume'] = df_ohlc['Volume'].fillna(0)
                        else:
                            df_ohlc['Volume'] = 0
                    else:
                        df_ohlc['Volume'] = 0
                    
                    df_ohlc.sort_index(inplace=True)
                    logger.info(f"Successfully fetched {len(df_ohlc)} days of OHLC data from CoinGecko")
                    logger.info(f"Date range: {df_ohlc.index.min()} to {df_ohlc.index.max()}")
                    return df_ohlc
        except Exception as ohlc_error:
            logger.warning(f"OHLC endpoint failed, falling back to market_chart: {ohlc_error}")
        
        # Fallback to market_chart endpoint (close prices only)
        url = f"https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"
        params = {
            'vs_currency': 'usd',
            'days': min(days, 365),  # CoinGecko free tier limit
            'interval': 'daily'
        }
        
        logger.info(f"Fetching Bitcoin data from CoinGecko market_chart ({days} days)...")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract prices (close prices)
        prices = data.get('prices', [])
        if not prices:
            raise ValueError("No price data returned from CoinGecko")
        
        # Convert to DataFrame
        df = pd.DataFrame(prices, columns=['timestamp', 'price'])
        df['Date'] = pd.to_datetime(df['timestamp'], unit='ms')
        df.set_index('Date', inplace=True)
        
        # CoinGecko market_chart only provides close prices
        # Use close price for all OHLC columns (approximation)
        df['Open'] = df['price'].shift(1).fillna(df['price'])  # Use previous close as open
        df['High'] = df[['Open', 'price']].max(axis=1)  # Approximate high
        df['Low'] = df[['Open', 'price']].min(axis=1)  # Approximate low
        df['Close'] = df['price']
        
        # Try to get volume data
        total_volumes = data.get('total_volumes', [])
        if total_volumes:
            df_vol = pd.DataFrame(total_volumes, columns=['timestamp', 'Volume'])
            df_vol['Date'] = pd.to_datetime(df_vol['timestamp'], unit='ms')
            df_vol.set_index('Date', inplace=True)
            df = df.join(df_vol, how='left')
            df['Volume'] = df['Volume'].fillna(0)
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


def fetch_btc_historical_from_coingecko(start_date: datetime, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Fetch Bitcoin historical data from CoinGecko using their history endpoint.
    This allows fetching data from specific dates (e.g., 2016) beyond the 365-day limit.
    Optimized to fetch weekly data points to reduce API calls.
    
    Args:
        start_date (datetime): Start date to fetch from
        end_date (datetime, optional): End date (defaults to today)
        
    Returns:
        pd.DataFrame: DataFrame with OHLC data
        
    Raises:
        Exception: If API request fails
    """
    logger = logging.getLogger(__name__)
    
    if end_date is None:
        end_date = datetime.now()
    
    logger.info(f"Fetching Bitcoin historical data from CoinGecko: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    logger.info("Note: This may take several minutes as we fetch weekly data points to optimize API usage...")
    
    all_data = []
    current_date = start_date
    
    # Fetch data weekly (every 7 days) to reduce API calls while maintaining reasonable granularity
    # For 8 years of data (2016-2024), this is ~416 API calls instead of ~2,920
    fetch_interval_days = 7
    
    # CoinGecko history endpoint: /coins/{id}/history?date={dd-mm-yyyy}
    request_count = 0
    while current_date <= end_date:
        # Format date as dd-mm-yyyy for CoinGecko API
        date_str = current_date.strftime('%d-%m-%Y')
        
        try:
            url = f"https://api.coingecko.com/api/v3/coins/bitcoin/history"
            params = {
                'date': date_str,
                'localization': 'false'  # Don't need localization data
            }
            
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                market_data = data.get('market_data', {})
                
                if market_data:
                    current_price = market_data.get('current_price', {}).get('usd')
                    high_24h = market_data.get('high_24h', {}).get('usd')
                    low_24h = market_data.get('low_24h', {}).get('usd')
                    open_24h = market_data.get('opening_price', {}).get('usd') or current_price
                    volume_24h = market_data.get('total_volume', {}).get('usd', 0)
                    
                    if current_price:
                        all_data.append({
                            'Date': current_date.date(),
                            'Open': open_24h or current_price,
                            'High': high_24h or current_price,
                            'Low': low_24h or current_price,
                            'Close': current_price,
                            'Volume': volume_24h or 0
                        })
            
            # Rate limiting: CoinGecko free tier allows ~10-50 calls/minute
            # Use 200ms delay to stay well within limits (~300 calls/minute max)
            time.sleep(0.2)
            
            # Move to next week
            current_date += timedelta(days=fetch_interval_days)
            request_count += 1
            
            # Log progress every 50 requests
            if request_count % 50 == 0:
                logger.info(f"Fetched {len(all_data)} data points ({request_count} API calls)...")
                
        except requests.exceptions.RequestException as e:
            logger.warning(f"Error fetching data for {date_str}: {e}")
            # Continue to next date
            current_date += timedelta(days=fetch_interval_days)
            request_count += 1
            continue
        except Exception as e:
            logger.warning(f"Unexpected error for {date_str}: {e}")
            current_date += timedelta(days=fetch_interval_days)
            request_count += 1
            continue
    
    if not all_data:
        raise ValueError(f"No historical data fetched from CoinGecko for date range {start_date} to {end_date}")
    
    # Convert to DataFrame
    df = pd.DataFrame(all_data)
    df['Date'] = pd.to_datetime(df['Date'])
    df.set_index('Date', inplace=True)
    
    # Interpolate missing days to fill gaps (forward fill for daily data)
    # Create a full date range and reindex
    full_date_range = pd.date_range(start=df.index.min(), end=df.index.max(), freq='D')
    df = df.reindex(full_date_range)
    
    # Forward fill OHLC data (use last known values)
    df[['Open', 'High', 'Low', 'Close']] = df[['Open', 'High', 'Low', 'Close']].ffill()
    df['Volume'] = df['Volume'].fillna(0)  # Fill volume with 0
    
    df.sort_index(inplace=True)
    
    logger.info(f"Successfully fetched {len(df)} days of historical data from CoinGecko ({request_count} API calls)")
    logger.info(f"Date range: {df.index.min()} to {df.index.max()}")
    
    return df


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


def fetch_crypto_data_hybrid(symbol: str = "BTCUSDT", days: int = 1825, start_date: Optional[datetime] = None, use_binance_only: bool = True) -> Tuple[pd.DataFrame, str, str]:
    """
    Fetch cryptocurrency data using Binance API (primary) with optional CoinGecko fallback.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        days (int): Number of days of historical data to fetch
        start_date (datetime, optional): Specific start date to fetch from (defaults to 2017-01-01)
        use_binance_only (bool): If True, only use Binance (no CoinGecko fallback)
        
    Returns:
        Tuple[pd.DataFrame, str, str]: DataFrame, data_source ("binance", "coingecko"), data_quality ("full_ohlcv", "close_only")
        
    Raises:
        Exception: If all data sources fail
    """
    logger = logging.getLogger(__name__)
    
    # Default to 2017-01-01 (Binance launch date) if no start_date provided
    if start_date is None:
        start_date = datetime(2017, 1, 1)
    
    # Try Binance first (best quality - full OHLCV)
    try:
        logger.info(f"Fetching {symbol} data from Binance (from {start_date.strftime('%Y-%m-%d')})...")
        df = fetch_crypto_data_from_binance(symbol=symbol, days=days, start_date=start_date, fallback_to_coingecko=False)
        logger.info(f"Successfully fetched {symbol} data from Binance")
        return df, "binance", "full_ohlcv"
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 451:
            logger.warning(f"Binance API unavailable (451) for {symbol}")
        else:
            logger.warning(f"Binance API error for {symbol}: {e}")
    except Exception as e:
        logger.warning(f"Binance fetch failed for {symbol}: {e}")
    
    # Only use CoinGecko fallback if explicitly allowed
    if not use_binance_only and symbol == "BTCUSDT":
        try:
            logger.info(f"Falling back to CoinGecko for {symbol}...")
            df = fetch_btc_data_from_coingecko(days=min(days, 365), start_date=start_date)
            logger.info(f"Successfully fetched {symbol} data from CoinGecko")
            return df, "coingecko", "close_only"
        except Exception as e:
            logger.error(f"CoinGecko fetch failed for {symbol}: {e}")
    
    raise Exception(f"Failed to fetch {symbol} data from Binance. Please check your connection or try again later.")


def update_crypto_data(symbol: str = "BTCUSDT", force: bool = False, days: int = 1825, start_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Update cryptocurrency data using Binance API (from 2017-01-01 onwards) and save to CSV.
    Checks if data is fresh (updated within last 6 hours) before fetching.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        force (bool): Force update even if data is fresh
        days (int): Number of days of historical data to fetch (default 1825 = 5 years, ignored if start_date provided)
        start_date (datetime, optional): Specific start date to fetch from (defaults to 2017-01-01 for Binance)
        
    Returns:
        pd.DataFrame: Updated DataFrame
    """
    global _last_update_time
    
    logger = logging.getLogger(__name__)
    
    # Default to 2017-01-01 (when Binance started) if no start_date provided
    if start_date is None:
        start_date = datetime(2017, 1, 1)
        logger.info(f"Using default start date: {start_date.strftime('%Y-%m-%d')} (Binance launch date)")
    
    # Check if we need to update (every 6 hours for more frequent updates)
    if not force and symbol in _last_update_time:
        time_since_update = datetime.now() - _last_update_time[symbol]
        if time_since_update < timedelta(hours=6):  # Update if older than 6 hours
            logger.info(f"{symbol} data is fresh (updated {time_since_update.total_seconds()/3600:.1f} hours ago), skipping update")
            # Still clear cache to ensure latest data is loaded
            load_crypto_data.cache_clear()
            return load_crypto_data(symbol=symbol)
    
    try:
        # Calculate days from start_date to now
        fetch_days = (datetime.now() - start_date).days
        logger.info(f"Fetching Binance data from {start_date.strftime('%Y-%m-%d')} ({fetch_days} days)...")
        
        # Use Binance only (no CoinGecko fallback for default operations)
        # Binance has full OHLCV data from 2017 onwards
        df, data_source, data_quality = fetch_crypto_data_hybrid(symbol=symbol, days=fetch_days, start_date=start_date, use_binance_only=True)
        
        # Log data date range to verify historical depth
        days_available = (df.index.max() - df.index.min()).days
        logger.info(f"Fetched {symbol} data: {len(df)} rows from {df.index.min()} to {df.index.max()}")
        logger.info(f"Total days available: {days_available} ({days_available/365:.2f} years)")
        
        # Verify minimum data requirement (at least 1 year)
        if days_available < 365:
            logger.warning(f"Only {days_available} days fetched (< 1 year). Attempting Binance direct fetch from 2017...")
            # Try Binance directly from 2017-01-01
            try:
                binance_start = datetime(2017, 1, 1)
                df_binance = fetch_crypto_data_from_binance(symbol=symbol, start_date=binance_start, fallback_to_coingecko=False)
                binance_days = (df_binance.index.max() - df_binance.index.min()).days
                if binance_days > days_available:
                    df = df_binance
                    data_source = "binance"
                    data_quality = "full_ohlcv"
                    logger.info(f"Binance fetch successful: {binance_days} days ({binance_days/365:.2f} years)")
                else:
                    logger.warning(f"Binance fetch didn't improve data ({binance_days} days)")
            except Exception as binance_error:
                logger.warning(f"Binance direct fetch failed: {binance_error}. Using available data.")
        
        # Save to CSV
        save_data_to_csv(df, symbol=symbol)
        
        # Clear cache BEFORE updating timestamp to ensure fresh data is loaded
        load_crypto_data.cache_clear()
        _last_update_time[symbol] = datetime.now()
        
        # Reload to verify it's saved correctly
        df_verify = load_crypto_data(symbol=symbol)
        
        final_days = (df_verify.index.max() - df_verify.index.min()).days
        logger.info(f"{symbol} data updated successfully from {data_source} (quality: {data_quality}, {final_days} days / {final_days/365:.2f} years)")
        logger.info(f"Latest price: ${df_verify['Close'].iloc[-1]:.2f} as of {df_verify.index.max().strftime('%Y-%m-%d')}")
        return df_verify
        
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
    Automatically fetches data if file doesn't exist.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        file_path (str, optional): Path to the CSV file. Auto-generated if not provided.
        
    Returns:
        pd.DataFrame: Cleaned DataFrame with datetime index and numeric columns
        
    Raises:
        ValueError: If the data format is invalid or data cannot be fetched
    """
    logger = logging.getLogger(__name__)
    
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
        logger.info(f"Loaded {len(df)} rows of {symbol} data from {file_path}")
        logger.debug(f"Columns: {list(df.columns)}")
        
        # Clean and preprocess the data
        df = _clean_data(df)
        
        # Check if data goes back to 2017-01-01 (Binance launch date)
        # If not, automatically refresh from Binance
        data_start = df.index.min()
        binance_start_date = datetime(2017, 1, 1)
        
        if data_start > binance_start_date:
            logger.warning(f"Data file only goes back to {data_start.strftime('%Y-%m-%d')}, but Binance data is available from {binance_start_date.strftime('%Y-%m-%d')}")
            logger.info(f"Automatically refreshing {symbol} data from {binance_start_date.strftime('%Y-%m-%d')}...")
            
            # Clear cache and refresh
            load_crypto_data.cache_clear()
            try:
                df_refreshed = update_crypto_data(symbol=symbol, force=True, start_date=binance_start_date)
                logger.info(f"Successfully refreshed data: {len(df_refreshed)} rows from {df_refreshed.index.min()} to {df_refreshed.index.max()}")
                return df_refreshed
            except Exception as refresh_error:
                logger.warning(f"Auto-refresh failed: {refresh_error}. Using existing data.")
                return df
        
        return df
        
    except FileNotFoundError:
        # File doesn't exist - automatically fetch data
        logger.info(f"Data file not found for {symbol}, automatically fetching Binance data from 2017...")
        try:
            # Clear cache before fetching to ensure fresh data
            load_crypto_data.cache_clear()
            
            # Fetch Binance data from 2017-01-01 onwards (default)
            binance_start = datetime(2017, 1, 1)
            df = update_crypto_data(symbol=symbol, force=True, start_date=binance_start)
            
            # Verify we have at least 1 year of data
            days_available = (df.index.max() - df.index.min()).days
            if days_available < 365:
                logger.warning(f"Only {days_available} days of data fetched. Attempting to fetch more from Binance...")
                # Try fetching again with Binance directly from 2017
                try:
                    df_binance = fetch_crypto_data_from_binance(symbol=symbol, start_date=binance_start, fallback_to_coingecko=False)
                    if len(df_binance) > len(df):
                        df = df_binance
                        save_data_to_csv(df, symbol=symbol)
                        logger.info(f"Successfully fetched {len(df)} rows from Binance")
                except Exception as binance_error:
                    logger.warning(f"Binance fetch failed: {binance_error}. Using available data.")
            
            logger.info(f"Successfully fetched and saved {len(df)} rows of {symbol} data")
            logger.info(f"Date range: {df.index.min()} to {df.index.max()}")
            days_available = (df.index.max() - df.index.min()).days
            logger.info(f"Total days available: {days_available} ({days_available/365:.2f} years)")
            
            return df
            
        except Exception as fetch_error:
            logger.error(f"Failed to auto-fetch {symbol} data: {fetch_error}")
            raise ValueError(
                f"Data file not found for {symbol} and automatic fetch failed: {str(fetch_error)}. "
                f"Please ensure the symbol is valid and data sources are accessible."
            )
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
    try:
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
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Error generating data summary: {e}")
        return {
            'total_rows': 0,
            'date_range': {'start': None, 'end': None},
            'price_range': {'min': None, 'max': None, 'current': None},
            'columns': []
        }
