"""
Data loader module for Bitcoin trading strategy backtesting.

This module handles loading and preprocessing of historical cryptocurrency price data
from CSV files and fetching live data from Binance API, ensuring proper 
datetime indexing and data cleaning.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, List, Any
from functools import lru_cache
import logging
import requests
import os
import json
from pathlib import Path
import time
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
from .data_quality import validate_data_quality, cross_validate_sources, calculate_quality_score
from .coinglass_client import get_coinglass_client

# Database imports for price data
try:
    from backend.core.database import SessionLocal
    from backend.api.models.db_models import PriceData
    from sqlalchemy import and_, func, text
    DATABASE_AVAILABLE = True
except ImportError:
    DATABASE_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Database imports not available, will use CSV fallback only")


# Global variable to track last update time per symbol
_last_update_time: Dict[str, datetime] = {}

# Database query result cache: {cache_key: (dataframe, timestamp)}
# TTL: 30 minutes for database queries (shorter than API cache since DB is fast)
_db_query_cache: Dict[str, Tuple[pd.DataFrame, float]] = {}
DB_QUERY_CACHE_TTL = 1800  # 30 minutes


def _get_db_query_cache_key(symbol: str, exchange: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> str:
    """Generate cache key for database query."""
    key_parts = [
        symbol,
        exchange,
        start_date.isoformat() if start_date else "none",
        end_date.isoformat() if end_date else "none"
    ]
    return "|".join(key_parts)


def _get_cached_db_query(cache_key: str) -> Optional[pd.DataFrame]:
    """Get cached database query result if available and not expired."""
    logger = logging.getLogger(__name__)
    
    if cache_key not in _db_query_cache:
        return None
    
    df, cached_time = _db_query_cache[cache_key]
    current_time = time.time()
    age = current_time - cached_time
    
    if age > DB_QUERY_CACHE_TTL:
        # Cache expired, remove it
        logger.debug(f"Database query cache expired for key {cache_key[:16]}... (age: {age:.1f}s)")
        del _db_query_cache[cache_key]
        return None
    
    logger.debug(f"Database query cache hit for key {cache_key[:16]}... (age: {age:.1f}s)")
    return df


def _store_db_query_cache(cache_key: str, df: pd.DataFrame):
    """Store database query result in cache."""
    _db_query_cache[cache_key] = (df, time.time())
    
    # Clean expired cache entries periodically (every 100 cache writes)
    if len(_db_query_cache) > 100:
        current_time = time.time()
        expired_keys = [
            key for key, (_, cached_time) in _db_query_cache.items()
            if current_time - cached_time > DB_QUERY_CACHE_TTL
        ]
        for key in expired_keys:
            del _db_query_cache[key]


def get_latest_data_date(symbol: str = "BTCUSDT", exchange: str = "Binance") -> Optional[datetime]:
    """
    Get the latest date for which price data exists in the database.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        exchange: Exchange name (e.g., "Binance")
        
    Returns:
        Latest date in database, or None if no data exists
    """
    if not DATABASE_AVAILABLE:
        return None
    
    logger = logging.getLogger(__name__)
    
    try:
        with SessionLocal() as session:
            # Query for the maximum date
            result = session.query(func.max(PriceData.date)).filter(
                PriceData.symbol == symbol,
                PriceData.exchange == exchange
            ).scalar()
            
            if result:
                logger.debug(f"Latest data date for {symbol} on {exchange}: {result}")
                return result
            else:
                logger.debug(f"No data found in database for {symbol} on {exchange}")
                return None
                
    except Exception as e:
        logger.warning(f"Error getting latest data date for {symbol} on {exchange}: {e}")
        return None


def load_crypto_data_from_database(
    symbol: str = "BTCUSDT",
    exchange: str = "Binance",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Optional[pd.DataFrame]:
    """
    Load cryptocurrency historical data from PostgreSQL database.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        exchange: Exchange name (e.g., "Binance")
        start_date: Optional start date filter
        end_date: Optional end date filter
        
    Returns:
        DataFrame with OHLCV data, or None if database query fails or no data found
    """
    if not DATABASE_AVAILABLE:
        return None
    
    logger = logging.getLogger(__name__)
    
    # Check cache first
    cache_key = _get_db_query_cache_key(symbol, exchange, start_date, end_date)
    cached_df = _get_cached_db_query(cache_key)
    if cached_df is not None:
        return cached_df
    
    try:
        with SessionLocal() as session:
            # Build optimized query using composite index (symbol, exchange, date)
            # This should use idx_price_data_symbol_exchange_date index
            query = session.query(PriceData).filter(
                PriceData.symbol == symbol,
                PriceData.exchange == exchange
            )
            
            # Apply date filters if provided (these should use the composite index)
            if start_date:
                query = query.filter(PriceData.date >= start_date)
            if end_date:
                query = query.filter(PriceData.date <= end_date)
            
            # Order by date (indexed column)
            query = query.order_by(PriceData.date.asc())
            
            # Use limit for very large date ranges to prevent memory issues
            # If no date filters, limit to recent data
            if not start_date and not end_date:
                query = query.limit(10000)  # Limit to 10k most recent records
            
            # Execute query - fetch all at once for better performance
            results = query.all()
            
            if not results:
                logger.debug(f"No data found in database for {symbol} on {exchange}")
                return None
            
            # Convert to DataFrame
            data = []
            for row in results:
                data.append({
                    'Date': row.date,
                    'Open': row.open,
                    'High': row.high,
                    'Low': row.low,
                    'Close': row.close,
                    'Volume': row.volume if row.volume is not None else 0.0
                })
            
            df = pd.DataFrame(data)
            df.set_index('Date', inplace=True)
            
            logger.info(f"Loaded {len(df)} rows of {symbol} data from database (exchange: {exchange})")
            
            # Cache the result
            _store_db_query_cache(cache_key, df)
            
            return df
            
    except Exception as e:
        logger.warning(f"Error loading {symbol} data from database: {e}")
        return None

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
            # Ensure endTime is not in the future
            request_end = min(current_start + (limit * 24 * 60 * 60 * 1000), end_time_ms)
            
            # Binance API doesn't accept future dates - ensure endTime is not beyond current time
            if request_end > current_time_ms:
                request_end = current_time_ms
            
            params = {
                'symbol': symbol,
                'interval': interval,
                'startTime': current_start,
                'endTime': request_end,
                'limit': limit
            }
            
            logger.debug(f"Request {request_count + 1}: fetching from {datetime.fromtimestamp(current_start/1000).strftime('%Y-%m-%d')} to {datetime.fromtimestamp(request_end/1000).strftime('%Y-%m-%d')}")
            
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
        
        # Remove any future dates (shouldn't happen, but safety check)
        current_date = datetime.now()
        if df.index.max() > current_date:
            logger.warning(f"Removing future dates from Binance data (max date: {df.index.max()})")
            df = df[df.index <= current_date]
        
        logger.info(f"Successfully fetched {len(df)} days of {symbol} data from Binance")
        logger.info(f"Date range: {df.index.min()} to {df.index.max()}")
        logger.info(f"Price range: ${df['Close'].min():.2f} - ${df['Close'].max():.2f}")
        
        # Verify data is valid (no future dates)
        if df.index.max() > datetime.now():
            logger.error(f"⚠️ ERROR: Binance API returned future dates! Max date: {df.index.max()}")
            # Remove future dates
            df = df[df.index <= datetime.now()]
        
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


def fetch_crypto_recent_from_coingecko(symbol: str, days: int = 365) -> pd.DataFrame:
    """
    Fetch recent cryptocurrency data from CoinGecko using OHLC endpoint.
    Best quality data for recent periods (≤365 days).
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        days (int): Number of days of historical data to fetch (max 365 for free tier)
        
    Returns:
        pd.DataFrame: DataFrame with OHLCV data
        
    Raises:
        Exception: If API request fails or symbol not supported
    """
    logger = logging.getLogger(__name__)
    
    # Get CoinGecko coin ID
    coin_id = get_coingecko_coin_id(symbol)
    if not coin_id:
        raise ValueError(f"Symbol {symbol} is not supported by CoinGecko. Please use a supported symbol.")
    
    try:
        # Try OHLC endpoint first (better data quality)
        url_ohlc = f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc"
        params_ohlc = {
            'vs_currency': 'usd',
            'days': min(days, 365),  # CoinGecko free tier limit
        }
        
        logger.info(f"Fetching {symbol} ({coin_id}) OHLC data from CoinGecko ({days} days)...")
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
                url_vol = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
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
        else:
            logger.warning(f"OHLC endpoint returned status {response_ohlc.status_code}, falling back to market_chart")
    except Exception as ohlc_error:
        logger.warning(f"OHLC endpoint failed, falling back to market_chart: {ohlc_error}")
    
    # Fallback to market_chart endpoint (close prices only)
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
    params = {
        'vs_currency': 'usd',
        'days': min(days, 365),  # CoinGecko free tier limit
        'interval': 'daily'
    }
    
    logger.info(f"Fetching {symbol} data from CoinGecko market_chart ({days} days)...")
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    
    data = response.json()
    
    # Extract prices (close prices)
    prices = data.get('prices', [])
    if not prices:
        raise ValueError(f"No price data returned from CoinGecko for {symbol}")
    
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


def fetch_crypto_data_from_coingecko(symbol: str = "BTCUSDT", start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Fetch cryptocurrency data from CoinGecko using optimal strategy:
    - Recent data (≤365 days): Use OHLC endpoint (single call, best quality)
    - Historical data (>365 days): Use history endpoint (weekly sampling)
    - Combines both for full range (2010-today)
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        start_date (datetime, optional): Start date (defaults to 2010-01-01)
        end_date (datetime, optional): End date (defaults to today)
        
    Returns:
        pd.DataFrame: DataFrame with OHLCV data from start_date to end_date
        
    Raises:
        Exception: If API request fails or symbol not supported
    """
    logger = logging.getLogger(__name__)
    
    # Get CoinGecko coin ID
    coin_id = get_coingecko_coin_id(symbol)
    if not coin_id:
        raise ValueError(f"Symbol {symbol} is not supported by CoinGecko. Please use a supported symbol.")
    
    # Default to earliest available date
    if start_date is None:
        start_date = datetime(2010, 1, 1)
    
    if end_date is None:
        end_date = datetime.now()
    
    # Calculate days from start to end
    days_from_start = (end_date - start_date).days
    
    # If range is ≤365 days, use OHLC endpoint only
    if days_from_start <= 365:
        logger.info(f"Fetching {symbol} data from CoinGecko (recent data, {days_from_start} days)...")
        df_recent = fetch_crypto_recent_from_coingecko(symbol, days=days_from_start)
        # Filter to requested date range
        df_recent = df_recent[(df_recent.index >= start_date) & (df_recent.index <= end_date)]
        return df_recent
    
    # For longer ranges, combine OHLC (recent) + history (historical)
    logger.info(f"Fetching {symbol} data from CoinGecko (full range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')})...")
    
    # 1. Fetch recent data (last 365 days) using OHLC endpoint
    logger.info("Step 1: Fetching recent data (last 365 days) from OHLC endpoint...")
    df_recent = fetch_crypto_recent_from_coingecko(symbol, days=365)
    
    # 2. Fetch historical data (start_date to 365 days ago) using history endpoint
    # Calculate historical_end as 365 days before end_date, but not before start_date
    historical_end = max(start_date, end_date - timedelta(days=365))
    if start_date < historical_end:
        logger.info(f"Step 2: Fetching historical data ({start_date.strftime('%Y-%m-%d')} to {historical_end.strftime('%Y-%m-%d')}) from history endpoint...")
        df_historical = fetch_crypto_historical_from_coingecko(symbol, start_date=start_date, end_date=historical_end, fetch_interval_days=7)
    else:
        df_historical = pd.DataFrame()
    
    # 3. Merge both datasets
    if not df_historical.empty:
        # Remove overlap: prefer recent data (OHLC) for overlapping dates
        overlap_start = df_recent.index.min()
        df_historical = df_historical[df_historical.index < overlap_start]
        
        # Combine historical + recent
        df_combined = pd.concat([df_historical, df_recent])
    else:
        df_combined = df_recent
    
    # Filter to exact date range requested
    df_combined = df_combined[(df_combined.index >= start_date) & (df_combined.index <= end_date)]
    
    # Remove duplicates (keep last occurrence)
    df_combined = df_combined[~df_combined.index.duplicated(keep='last')]
    
    # Sort by date
    df_combined.sort_index(inplace=True)
    
    logger.info(f"Successfully fetched {len(df_combined)} days of data from CoinGecko")
    logger.info(f"Date range: {df_combined.index.min()} to {df_combined.index.max()}")
    
    return df_combined


def fetch_btc_data_from_coingecko(days: int = 365, start_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Fetch Bitcoin historical data from CoinGecko API (backward compatibility wrapper).
    Uses the generic CoinGecko fetch function.
    
    Args:
        days (int): Number of days of historical data to fetch (max 365 for free tier)
        start_date (datetime, optional): Specific start date to fetch from
        
    Returns:
        pd.DataFrame: DataFrame with OHLC data
        
    Raises:
        Exception: If API request fails
    """
    if start_date:
        end_date = datetime.now()
        return fetch_crypto_data_from_coingecko("BTCUSDT", start_date=start_date, end_date=end_date)
    else:
        # Calculate start_date from days
        start_date = datetime.now() - timedelta(days=days)
        return fetch_crypto_data_from_coingecko("BTCUSDT", start_date=start_date)


def fetch_crypto_historical_from_coingecko(symbol: str, start_date: datetime, end_date: Optional[datetime] = None, fetch_interval_days: int = 7) -> pd.DataFrame:
    """
    Fetch cryptocurrency historical data from CoinGecko using their history endpoint.
    This allows fetching data from specific dates (e.g., 2010) beyond the 365-day limit.
    Optimized to fetch weekly data points to reduce API calls.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        start_date (datetime): Start date to fetch from
        end_date (datetime, optional): End date (defaults to today)
        fetch_interval_days (int): Days between samples (default: 7 for weekly)
        
    Returns:
        pd.DataFrame: DataFrame with OHLC data
        
    Raises:
        Exception: If API request fails or symbol not supported
    """
    logger = logging.getLogger(__name__)
    
    # Get CoinGecko coin ID
    coin_id = get_coingecko_coin_id(symbol)
    if not coin_id:
        raise ValueError(f"Symbol {symbol} is not supported by CoinGecko. Please use a supported symbol.")
    
    if end_date is None:
        end_date = datetime.now()
    
    logger.info(f"Fetching {symbol} ({coin_id}) historical data from CoinGecko: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    logger.info(f"Note: This may take several minutes as we fetch data points every {fetch_interval_days} days to optimize API usage...")
    
    all_data = []
    current_date = start_date
    
    # CoinGecko history endpoint: /coins/{id}/history?date={dd-mm-yyyy}
    request_count = 0
    while current_date <= end_date:
        # Format date as dd-mm-yyyy for CoinGecko API
        date_str = current_date.strftime('%d-%m-%Y')
        
        try:
            url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/history"
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
            elif response.status_code == 429:
                # Rate limit - wait longer
                logger.warning(f"Rate limit hit, waiting 5 seconds...")
                time.sleep(5)
                continue
            else:
                logger.warning(f"API returned status {response.status_code} for {date_str}")
            
            # Rate limiting: CoinGecko free tier allows ~10-50 calls/minute
            # Use 200ms delay to stay well within limits (~300 calls/minute max)
            time.sleep(0.2)
            
            # Move to next interval
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
        raise ValueError(f"No historical data fetched from CoinGecko for {symbol} in date range {start_date} to {end_date}")
    
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


# Keep backward compatibility
def fetch_btc_historical_from_coingecko(start_date: datetime, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """Backward compatibility wrapper for Bitcoin historical fetch."""
    return fetch_crypto_historical_from_coingecko("BTCUSDT", start_date, end_date)


def get_coingecko_coin_id(symbol: str) -> Optional[str]:
    """
    Map trading pair symbol to CoinGecko coin ID.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        
    Returns:
        Optional[str]: CoinGecko coin ID (e.g., "bitcoin", "ethereum") or None if not supported
    """
    symbol_to_coingecko = {
        'BTCUSDT': 'bitcoin',
        'ETHUSDT': 'ethereum',
        'BNBUSDT': 'binancecoin',
        'ADAUSDT': 'cardano',
        'SOLUSDT': 'solana',
        'XRPUSDT': 'ripple',
        'SUIUSDT': 'sui',
        'DOTUSDT': 'polkadot',
        'DOGEUSDT': 'dogecoin',
        'AVAXUSDT': 'avalanche-2',
        'MATICUSDT': 'matic-network',
        'LINKUSDT': 'chainlink',
        'UNIUSDT': 'uniswap',
        'LTCUSDT': 'litecoin',
        'ATOMUSDT': 'cosmos',
        'ETCUSDT': 'ethereum-classic',
    }
    return symbol_to_coingecko.get(symbol)


def get_yahoo_finance_ticker(symbol: str) -> Optional[str]:
    """
    Map trading pair symbol to Yahoo Finance ticker.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        
    Returns:
        Optional[str]: Yahoo Finance ticker (e.g., "BTC-USD", "ETH-USD") or None if not supported
    """
    symbol_to_yahoo = {
        'BTCUSDT': 'BTC-USD',
        'ETHUSDT': 'ETH-USD',
        'BNBUSDT': 'BNB-USD',
        'ADAUSDT': 'ADA-USD',
        'SOLUSDT': 'SOL-USD',
        'XRPUSDT': 'XRP-USD',
        'SUIUSDT': 'SUI-USD',
        'DOTUSDT': 'DOT-USD',
        'DOGEUSDT': 'DOGE-USD',
        'AVAXUSDT': 'AVAX-USD',
        'MATICUSDT': 'MATIC-USD',
        'LINKUSDT': 'LINK-USD',
        'UNIUSDT': 'UNI-USD',
        'LTCUSDT': 'LTC-USD',
        'ATOMUSDT': 'ATOM-USD',
        'ETCUSDT': 'ETC-USD',
    }
    return symbol_to_yahoo.get(symbol)


def fetch_crypto_data_from_coinglass(
    symbol: str = "BTCUSDT",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    exchange: str = "Binance",
    interval: str = "1d"
) -> pd.DataFrame:
    """
    Fetch cryptocurrency historical data from CoinGlass API.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        start_date: Start date for historical data (defaults to 5 years back or token launch)
        end_date: End date (defaults to today)
        exchange: Exchange name (e.g., "Binance", "Coinbase", "OKX")
        interval: Timeframe/interval (1h, 4h, 1d, 1w, 1M) - default "1d"
        
    Returns:
        DataFrame with OHLCV data (Open, High, Low, Close, Volume)
        
    Raises:
        Exception: If API request fails
    """
    logger = logging.getLogger(__name__)
    
    try:
        # Default date range
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            # Default to 5 years back or token launch date
            start_date, _ = calculate_historical_range(symbol, years=5)
        
        logger.info(f"Fetching {symbol} data from CoinGlass from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")
        
        # Get CoinGlass client
        client = get_coinglass_client()
        
        # Test connection first (optional, but helpful for debugging)
        try:
            connection_result = client.test_connection()
            if not connection_result.get("success", False):
                logger.warning("CoinGlass API connection test failed, but continuing with data fetch attempt...")
        except Exception as conn_test_error:
            logger.warning(f"CoinGlass API connection test error: {conn_test_error}, but continuing with data fetch attempt...")
        
        # Fetch price history
        # Use provided interval (default "1d" for daily)
        # For Hobbyist tier, minimum is 4h, but 1d is fine
        df = client.get_price_history(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            interval=interval,
            exchange=exchange
        )
        
        if df.empty:
            raise ValueError(f"No data returned from CoinGlass for {symbol}")
        
        # Ensure we have required columns
        required_columns = ["Open", "High", "Low", "Close", "Volume"]
        for col in required_columns:
            if col not in df.columns:
                if col == "Volume":
                    df[col] = 0.0
                else:
                    # Use Close as fallback for missing OHLC
                    df[col] = df.get("Close", 0.0)
        
        # Validate data quality
        if len(df) == 0:
            raise ValueError(f"Empty DataFrame returned from CoinGlass for {symbol}")
        
        # Remove any invalid values
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.ffill().bfill()
        
        # Ensure dates are in correct format
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index)
        
        # Remove timezone if present
        if df.index.tz is not None:
            df.index = df.index.tz_localize(None)
        
        # Filter to requested date range
        df = df[(df.index >= start_date) & (df.index <= end_date)]
        
        # Sort by date
        df.sort_index(inplace=True)
        
        # Remove duplicates
        df = df[~df.index.duplicated(keep='last')]
        
        logger.info(f"Successfully fetched {len(df)} rows from CoinGlass ({df.index.min()} to {df.index.max()})")
        
        return df
        
    except Exception as e:
        logger.error(f"Error fetching {symbol} data from CoinGlass: {e}", exc_info=True)
        raise Exception(f"Failed to fetch {symbol} data from CoinGlass: {str(e)}")


def fetch_coinglass_additional_metrics(
    symbol: str = "BTCUSDT",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Dict[str, pd.Series]:
    """
    Fetch additional metrics from CoinGlass API (funding rates, open interest, etc.).
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        start_date: Start date for historical data
        end_date: End date (defaults to today)
        
    Returns:
        Dictionary mapping metric names to pandas Series with date index
    """
    logger = logging.getLogger(__name__)
    
    if end_date is None:
        end_date = datetime.now()
    if start_date is None:
        start_date, _ = calculate_historical_range(symbol, years=5)
    
    metrics = {}
    
    try:
        client = get_coinglass_client()
        
        # Fetch funding rate
        logger.info(f"Fetching funding rate data from CoinGlass for {symbol}...")
        funding_rate = client.get_funding_rate_history(symbol, start_date, end_date)
        if not funding_rate.empty:
            metrics["FundingRate"] = funding_rate
        
        # Fetch open interest
        logger.info(f"Fetching open interest data from CoinGlass for {symbol}...")
        open_interest = client.get_open_interest_history(symbol, start_date, end_date)
        if not open_interest.empty:
            metrics["OpenInterest"] = open_interest
        
        # Fetch long/short ratio
        logger.info(f"Fetching long/short ratio data from CoinGlass for {symbol}...")
        long_short_ratio = client.get_long_short_ratio(symbol, start_date, end_date)
        if not long_short_ratio.empty:
            metrics["LongShortRatio"] = long_short_ratio
        
        # Fetch liquidation data
        logger.info(f"Fetching liquidation data from CoinGlass for {symbol}...")
        liquidation = client.get_liquidation_history(symbol, start_date, end_date)
        if not liquidation.empty:
            metrics["LiquidationVolume"] = liquidation
        
        logger.info(f"Successfully fetched {len(metrics)} additional metrics from CoinGlass for {symbol}")
        
    except Exception as e:
        logger.warning(f"Error fetching additional metrics from CoinGlass: {e}")
        # Return empty dict on error - don't fail the whole operation
    
    return metrics


def fetch_crypto_data_from_yahoo_finance(
    symbol: str = "BTCUSDT",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> pd.DataFrame:
    """
    Fetch cryptocurrency historical data from Yahoo Finance using yfinance library.
    Yahoo Finance provides free, reliable historical data with good coverage.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        start_date (datetime, optional): Start date to fetch from (defaults to 5 years ago)
        end_date (datetime, optional): End date (defaults to today)
        
    Returns:
        pd.DataFrame: DataFrame with OHLCV data (Open, High, Low, Close, Volume)
        
    Raises:
        ValueError: If symbol not supported or yfinance not available
        Exception: If API request fails
    """
    logger = logging.getLogger(__name__)
    
    if not YFINANCE_AVAILABLE:
        raise ValueError("yfinance library is not installed. Please install it: pip install yfinance")
    
    # Get Yahoo Finance ticker
    ticker = get_yahoo_finance_ticker(symbol)
    if not ticker:
        raise ValueError(f"Symbol {symbol} is not supported by Yahoo Finance. Please use a supported symbol.")
    
    # Default dates - fetch all available data from launch
    if end_date is None:
        end_date = datetime.now()
    if start_date is None:
        # Default to token launch date (Yahoo Finance has good historical coverage)
        launch_date = get_token_launch_date(symbol)
        start_date = launch_date
        logger.info(f"Using token launch date as start: {start_date.strftime('%Y-%m-%d')}")
    
    try:
        logger.info(f"Fetching {symbol} ({ticker}) data from Yahoo Finance from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")
        
        # Create ticker object
        yf_ticker = yf.Ticker(ticker)
        
        # Fetch historical data
        df = yf_ticker.history(start=start_date, end=end_date, interval='1d')
        
        if df.empty:
            raise ValueError(f"No data returned from Yahoo Finance for {symbol} ({ticker})")
        
        # Rename columns to match our standard format
        # yfinance returns: Open, High, Low, Close, Volume, Dividends, Stock Splits
        required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        
        # Ensure we have the right columns
        if not all(col in df.columns for col in required_columns):
            # Use adjusted close if regular close is not available
            if 'Adj Close' in df.columns and 'Close' not in df.columns:
                df['Close'] = df['Adj Close']
        
        # Select only required columns
        df = df[required_columns].copy()
        
        # Ensure index is datetime
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index)
        
        # Remove timezone if present (yfinance sometimes includes timezone)
        if df.index.tz is not None:
            df.index = df.index.tz_localize(None)
        
        # Sort by date
        df = df.sort_index()
        
        # Remove any duplicate dates
        df = df[~df.index.duplicated(keep='last')]
        
        # Filter to requested date range
        df = df[(df.index >= start_date) & (df.index <= end_date)]
        
        # Ensure all values are numeric
        for col in required_columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Remove rows with all NaN values
        df = df.dropna(how='all')
        
        logger.info(f"Successfully fetched {len(df)} rows from Yahoo Finance ({df.index.min()} to {df.index.max()})")
        
        return df
        
    except ValueError as e:
        # ValueError usually means symbol not supported or no data
        logger.error(f"Yahoo Finance error for {symbol}: {e}")
        raise Exception(f"Yahoo Finance: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching {symbol} data from Yahoo Finance: {e}", exc_info=True)
        raise Exception(f"Failed to fetch {symbol} data from Yahoo Finance: {str(e)}")


def get_cryptocompare_symbol(symbol: str) -> Optional[str]:
    """
    Map trading pair symbol to CryptoCompare symbol format.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        
    Returns:
        Optional[str]: CryptoCompare symbol (e.g., "BTC", "ETH") or None if not supported
    """
    symbol_to_cryptocompare = {
        'BTCUSDT': 'BTC',
        'ETHUSDT': 'ETH',
        'BNBUSDT': 'BNB',
        'SOLUSDT': 'SOL',
        'XRPUSDT': 'XRP',
        'SUIUSDT': 'SUI',
        'ADAUSDT': 'ADA',
        'DOTUSDT': 'DOT',
        'DOGEUSDT': 'DOGE',
        'AVAXUSDT': 'AVAX',
        'MATICUSDT': 'MATIC',
        'LINKUSDT': 'LINK',
        'UNIUSDT': 'UNI',
        'LTCUSDT': 'LTC',
        'ATOMUSDT': 'ATOM',
        'ETCUSDT': 'ETC',
    }
    return symbol_to_cryptocompare.get(symbol)


def fetch_crypto_data_from_cryptocompare(
    symbol: str = "BTCUSDT",
    days: int = 365,
    start_date: Optional[datetime] = None
) -> pd.DataFrame:
    """
    Fetch cryptocurrency historical data from CryptoCompare API (free tier).
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        days (int): Number of days of historical data to fetch
        start_date (datetime, optional): Specific start date to fetch from (overrides days)
        
    Returns:
        pd.DataFrame: DataFrame with OHLCV data (Open, High, Low, Close, Volume)
        
    Raises:
        ValueError: If symbol not supported or API request fails
    """
    logger = logging.getLogger(__name__)
    
    # Get CryptoCompare symbol
    cc_symbol = get_cryptocompare_symbol(symbol)
    if not cc_symbol:
        raise ValueError(f"Symbol {symbol} is not supported by CryptoCompare")
    
    try:
        # CryptoCompare free API endpoint
        # Note: Free tier allows 100k calls/month, no API key required for basic endpoints
        base_url = "https://min-api.cryptocompare.com/data/v2/histoday"
        
        # Calculate time range
        end_time = datetime.now()
        if start_date:
            start_time = start_date
            days = (end_time - start_time).days
        else:
            start_time = end_time - timedelta(days=days)
        
        # CryptoCompare API uses Unix timestamps
        to_ts = int(end_time.timestamp())
        limit = min(days, 2000)  # CryptoCompare allows up to 2000 days per request
        
        # For requests > 2000 days, we need to paginate
        all_data = []
        current_to_ts = to_ts
        request_count = 0
        max_requests = (days // 2000) + 2
        
        logger.info(f"Fetching {symbol} ({cc_symbol}) data from CryptoCompare ({days} days)...")
        
        while request_count < max_requests and limit > 0:
            params = {
                'fsym': cc_symbol,  # From symbol (e.g., BTC)
                'tsym': 'USD',      # To symbol (USD)
                'limit': limit,
                'toTs': current_to_ts
            }
            
            try:
                response = requests.get(base_url, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                if data.get('Response') == 'Error':
                    error_msg = data.get('Message', 'Unknown error')
                    logger.error(f"CryptoCompare API error: {error_msg}")
                    break
                
                if data.get('Data', {}).get('Data'):
                    candles = data['Data']['Data']
                    if candles:
                        all_data.extend(candles)
                        # Update timestamp for next request (go back in time)
                        current_to_ts = candles[0]['time'] - 1
                        limit = min(2000, days - len(all_data))
                        request_count += 1
                        
                        # Rate limiting: CryptoCompare free tier allows ~10 calls/second
                        if request_count > 0:
                            time.sleep(0.1)  # 100ms delay between requests
                    else:
                        break
                else:
                    break
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching CryptoCompare data: {e}")
                break
        
        if not all_data:
            raise ValueError(f"No data returned from CryptoCompare for {symbol}")
        
        # Parse CryptoCompare response format
        # CryptoCompare returns: time, high, low, open, close, volumefrom, volumeto
        df_data = []
        for candle in all_data:
            df_data.append({
                'Date': pd.Timestamp.fromtimestamp(candle['time']),
                'Open': candle['open'],
                'High': candle['high'],
                'Low': candle['low'],
                'Close': candle['close'],
                'Volume': candle.get('volumeto', candle.get('volumefrom', 0))  # Use volumeto (USD volume)
            })
        
        df = pd.DataFrame(df_data)
        df.set_index('Date', inplace=True)
        df.sort_index(inplace=True)
        
        # Remove duplicates
        df = df[~df.index.duplicated(keep='first')]
        
        # Clean data
        df = _clean_data(df)
        
        logger.info(f"Successfully fetched {len(df)} days of {symbol} data from CryptoCompare")
        return df
        
    except Exception as e:
        logger.error(f"Error fetching data from CryptoCompare: {e}", exc_info=True)
        raise Exception(f"Failed to fetch data from CryptoCompare: {str(e)}")


def get_available_symbols() -> list:
    """
    Get list of available cryptocurrency symbols supported by CoinGecko.
    
    Returns:
        list: List of symbol strings (e.g., ['BTCUSDT', 'ETHUSDT', ...])
    """
    # Common cryptocurrency pairs available on CoinGecko
    return [
        'BTCUSDT',   # Bitcoin
        'ETHUSDT',   # Ethereum
        'BNBUSDT',   # Binance Coin
        'ADAUSDT',   # Cardano
        'SOLUSDT',   # Solana
        'XRPUSDT',   # Ripple
        'SUIUSDT',   # Sui
        'DOTUSDT',   # Polkadot
        'DOGEUSDT',  # Dogecoin
        'AVAXUSDT',  # Avalanche
        'MATICUSDT', # Polygon
        'LINKUSDT',  # Chainlink
        'UNIUSDT',   # Uniswap
        'LTCUSDT',   # Litecoin
        'ATOMUSDT',  # Cosmos
        'ETCUSDT',   # Ethereum Classic
        'SUIUSDT',   # Sui
    ]


def get_token_launch_date(symbol: str) -> datetime:
    """
    Get token launch date for calculating historical ranges.
    
    Args:
        symbol (str): Trading pair symbol
        
    Returns:
        datetime: Token launch date
    """
    launch_dates = {
        'BTCUSDT': datetime(2010, 1, 1),
        'ETHUSDT': datetime(2015, 7, 30),
        'SOLUSDT': datetime(2020, 3, 16),
        'SUIUSDT': datetime(2023, 5, 3),
        'BNBUSDT': datetime(2017, 7, 25),
        'XRPUSDT': datetime(2013, 8, 4),
    }
    return launch_dates.get(symbol, datetime(2010, 1, 1))  # Default to BTC launch date


def calculate_historical_range(symbol: str, years: int = None) -> Tuple[datetime, datetime]:
    """
    Calculate historical date range for a token.
    If years is None, returns from token launch date (or 2010 for BTC) to today.
    Otherwise, returns years back from today or from launch, whichever is later.
    
    Args:
        symbol (str): Trading pair symbol
        years (int, optional): Number of years to look back. If None, fetches all available data from launch.
        
    Returns:
        Tuple[datetime, datetime]: (start_date, end_date)
    """
    end_date = datetime.now()
    launch_date = get_token_launch_date(symbol)
    
    if years is None:
        # Fetch all available data from launch date
        start_date = launch_date
    else:
        # Fetch specified years back or from launch, whichever is later
        start_date = max(launch_date, end_date - timedelta(days=years * 365))
    
    return start_date, end_date


def fetch_crypto_data_smart(
    symbol: str = "BTCUSDT",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    exchange: str = "Binance",
    interval: str = "1d",
    use_cache: bool = True,
    cross_validate: bool = False,  # Disabled by default when using only CoinGlass
    include_additional_metrics: bool = False
) -> Tuple[pd.DataFrame, str, Dict]:
    """
    Fetch cryptocurrency data using ONLY CoinGlass API (no fallbacks).
    
    This function is configured to use CoinGlass exclusively to verify API connectivity
    and ensure all data comes from a single, reliable source.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        start_date: Start date for historical data (defaults to 5 years back or token launch)
        end_date: End date (defaults to today)
        exchange: Exchange name (e.g., "Binance", "Coinbase", "OKX")
        interval: Timeframe/interval (1h, 4h, 1d, 1w, 1M) - default "1d"
        use_cache: Whether to use cached data if fresh (not currently used, always fetches fresh)
        cross_validate: Whether to cross-validate (disabled when using only CoinGlass)
        include_additional_metrics: Whether to fetch additional metrics (funding rates, OI, etc.)
        
    Returns:
        Tuple[pd.DataFrame, str, Dict]: DataFrame, data_source, quality_metrics
        
    Raises:
        Exception: If CoinGlass API request fails
    """
    logger = logging.getLogger(__name__)
    
    # Calculate date range (all available data from token launch by default)
    if end_date is None:
        end_date = datetime.now()
    if start_date is None:
        # For BTC, fetch from 2010-01-01 (earliest Bitcoin data)
        # For other coins, fetch from token launch date
        if symbol == "BTCUSDT":
            start_date = datetime(2010, 1, 1)  # Bitcoin started in 2009, but reliable price data from 2010
            logger.info(f"Using Bitcoin launch date: {start_date.strftime('%Y-%m-%d')}")
        else:
            start_date, _ = calculate_historical_range(symbol, years=None)
    
    # Try database first for better performance, then CoinGlass API
    logger.info(f"Fetching {symbol} data (interval: {interval}) from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")
    
    # First try database (fastest)
    df = load_crypto_data_from_database(
        symbol=symbol,
        exchange=exchange,
        start_date=start_date,
        end_date=end_date
    )
    
    if df is not None and len(df) > 0:
        logger.info(f"Loaded {len(df)} rows from database for {symbol} on {exchange}")
        return df, "database", {"quality_score": 1.0, "source": "database"}
    
    # Fallback to CoinGlass API if database doesn't have data
    logger.info(f"Database cache miss, fetching from CoinGlass API...")
    try:
        df_coinglass = fetch_crypto_data_from_coinglass(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            exchange=exchange,
            interval=interval
        )
        
        if df_coinglass.empty:
            raise Exception(f"CoinGlass API returned empty data for {symbol}. Check API key and endpoint configuration.")
        
        logger.info(f"✓ Successfully fetched {len(df_coinglass)} days from CoinGlass")
        
        # Fetch additional metrics if requested
        if include_additional_metrics:
            try:
                additional_metrics = fetch_coinglass_additional_metrics(
                    symbol=symbol,
                    start_date=start_date,
                    end_date=end_date
                )
                # Merge additional metrics into DataFrame
                for metric_name, metric_series in additional_metrics.items():
                    if not metric_series.empty:
                        df_coinglass[metric_name] = metric_series
                        logger.info(f"✓ Added {metric_name} metric to DataFrame")
            except Exception as e:
                logger.warning(f"Failed to fetch additional metrics from CoinGlass: {e}")
        
        # Filter to requested date range
        df_merged = df_coinglass[(df_coinglass.index >= start_date) & (df_coinglass.index <= end_date)]
        
        # Validate data quality
        quality_metrics = validate_data_quality(df_merged, symbol)
        quality_metrics['data_source'] = 'coinglass'
        quality_metrics['sources_used'] = ['coinglass']
        
        return df_merged, "coinglass", quality_metrics
        
    except Exception as e:
        error_msg = f"CoinGlass API fetch failed for {symbol}: {str(e)}"
        logger.error(error_msg)
        logger.error("No fallback sources available - CoinGlass is the only data source configured.")
        raise Exception(f"{error_msg} Please check: 1) CoinGlass API key is set, 2) API key is valid, 3) Network connectivity, 4) CoinGlass API status.")


def save_data_to_database(
    df: pd.DataFrame,
    symbol: str = "BTCUSDT",
    exchange: str = "Binance",
    batch_size: int = 1000,
    also_save_csv: bool = True
) -> Dict[str, Any]:
    """
    Save DataFrame to PostgreSQL database using bulk insert/update operations.
    Also saves to CSV file for backward compatibility if also_save_csv is True.
    
    Args:
        df (pd.DataFrame): DataFrame to save (must have Date as index and OHLCV columns)
        symbol (str): Cryptocurrency symbol (e.g., "BTCUSDT")
        exchange (str): Exchange name (e.g., "Binance")
        batch_size (int): Number of records to insert per batch
        also_save_csv (bool): Whether to also save to CSV file for backward compatibility
        
    Returns:
        Dict with save results: {
            'success': bool,
            'database': {'inserted': int, 'updated': int},
            'csv_path': str (if also_save_csv is True)
        }
    """
    logger = logging.getLogger(__name__)
    
    result = {
        'success': False,
        'database': {'inserted': 0, 'updated': 0},
        'csv_path': None
    }
    
    # Ensure DataFrame has Date as index
    if df.index.name != 'Date' and 'Date' not in df.columns:
        # Try to reset index if Date is in index
        if isinstance(df.index, pd.DatetimeIndex):
            df_save = df.reset_index()
            df_save.rename(columns={df_save.columns[0]: 'Date'}, inplace=True)
        else:
            raise ValueError("DataFrame must have Date as index or column")
    else:
        df_save = df.reset_index() if df.index.name == 'Date' else df.copy()
    
    # Ensure Date column exists and is datetime
    if 'Date' not in df_save.columns:
        raise ValueError("Date column not found in DataFrame")
    
    df_save['Date'] = pd.to_datetime(df_save['Date'])
    
    # Ensure required columns exist
    required_columns = ['Open', 'High', 'Low', 'Close']
    missing_columns = [col for col in required_columns if col not in df_save.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    # Save to database if available
    if DATABASE_AVAILABLE:
        try:
            with SessionLocal() as session:
                total_records = len(df_save)
                inserted = 0
                
                # Process in batches
                for i in range(0, total_records, batch_size):
                    batch = df_save.iloc[i:i + batch_size]
                    
                    # Prepare batch data
                    records = []
                    for _, row in batch.iterrows():
                        try:
                            record = {
                                'symbol': symbol,
                                'exchange': exchange,
                                'date': row['Date'],
                                'open': float(row['Open']),
                                'high': float(row['High']),
                                'low': float(row['Low']),
                                'close': float(row['Close']),
                                'volume': float(row['Volume']) if 'Volume' in row and pd.notna(row.get('Volume')) else None,
                            }
                            records.append(record)
                        except Exception as e:
                            logger.warning(f"Error preparing record for date {row.get('Date')}: {e}")
                            continue
                    
                    if not records:
                        continue
                    
                    # Use bulk insert with ON CONFLICT DO UPDATE
                    # SQLAlchemy bulk_insert_mappings doesn't support ON CONFLICT directly,
                    # so we use raw SQL for better performance
                    try:
                        values_list = []
                        for record in records:
                            date_str = record['date'].strftime('%Y-%m-%d %H:%M:%S')
                            volume_val = record['volume'] if record['volume'] is not None else 'NULL'
                            values_list.append(
                                f"('{symbol}', '{exchange}', '{date_str}', "
                                f"{record['open']}, {record['high']}, {record['low']}, "
                                f"{record['close']}, {volume_val})"
                            )
                        
                        values_sql = ', '.join(values_list)
                        
                        sql = f"""
                            INSERT INTO price_data (symbol, exchange, date, open, high, low, close, volume, updated_at)
                            VALUES {values_sql}
                            ON CONFLICT (symbol, exchange, date) 
                            DO UPDATE SET
                                open = EXCLUDED.open,
                                high = EXCLUDED.high,
                                low = EXCLUDED.low,
                                close = EXCLUDED.close,
                                volume = EXCLUDED.volume,
                                updated_at = CURRENT_TIMESTAMP
                        """
                        
                        session.execute(text(sql))
                        session.commit()
                        
                        inserted += len(records)
                        
                        # Clear database query cache for this symbol/exchange
                        cache_keys_to_remove = [
                            key for key in _db_query_cache.keys()
                            if key.startswith(f"{symbol}|{exchange}|")
                        ]
                        for key in cache_keys_to_remove:
                            del _db_query_cache[key]
                        
                    except Exception as e:
                        logger.error(f"Error inserting batch starting at index {i}: {e}")
                        session.rollback()
                        raise
                
                result['database']['inserted'] = inserted
                result['database']['updated'] = 0  # PostgreSQL doesn't distinguish in ON CONFLICT
                logger.info(f"Saved {inserted} records to database for {symbol} on {exchange}")
                
        except Exception as e:
            logger.error(f"Error saving {symbol} data to database: {e}")
            if not also_save_csv:
                raise
    
    # Also save to CSV for backward compatibility
    if also_save_csv:
        try:
            csv_path = save_data_to_csv(df, symbol=symbol)
            result['csv_path'] = csv_path
        except Exception as e:
            logger.warning(f"Error saving {symbol} data to CSV: {e}")
    
    result['success'] = True
    return result


def save_data_to_csv(df: pd.DataFrame, file_path: Optional[str] = None, symbol: str = "BTCUSDT") -> str:
    """
    Save DataFrame to CSV file (backward compatibility function).
    For new code, use save_data_to_database() instead.
    
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
    Fetch cryptocurrency data using CoinGecko API exclusively.
    This ensures consistent, seamless data across all charts and indicators.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        days (int): Number of days of historical data to fetch (ignored if start_date provided)
        start_date (datetime, optional): Specific start date to fetch from (defaults to 2010-01-01)
        use_binance_only (bool): Deprecated - kept for backward compatibility, ignored
        
    Returns:
        Tuple[pd.DataFrame, str, str]: DataFrame, data_source ("coingecko"), data_quality ("ohlc")
        
    Raises:
        Exception: If CoinGecko fetch fails or symbol not supported
    """
    logger = logging.getLogger(__name__)
    
    # Default to 2010-01-01 (earliest CoinGecko data) if no start_date provided
    if start_date is None:
        start_date = datetime(2010, 1, 1)
        logger.info(f"Using default start date: {start_date.strftime('%Y-%m-%d')} (earliest CoinGecko data)")
    
    # Calculate end_date from days if needed
    if days and start_date:
        end_date = start_date + timedelta(days=days)
    else:
        end_date = datetime.now()
    
    try:
        logger.info(f"Fetching {symbol} data from CoinGecko (from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')})...")
        df = fetch_crypto_data_from_coingecko(symbol=symbol, start_date=start_date, end_date=end_date)
        logger.info(f"Successfully fetched {symbol} data from CoinGecko")
        return df, "coingecko", "ohlc"
    except Exception as e:
        logger.error(f"CoinGecko fetch failed for {symbol}: {e}")
        raise Exception(f"Failed to fetch {symbol} data from CoinGecko: {str(e)}")


def update_crypto_data(symbol: str = "BTCUSDT", force: bool = False, days: int = 1825, start_date: Optional[datetime] = None, include_additional_metrics: bool = False) -> pd.DataFrame:
    """
    Update cryptocurrency data using ONLY CoinGlass API (no fallbacks).
    Saves to CSV and caches locally. Checks if data is fresh (updated within last 24 hours) before fetching.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        force (bool): Force update even if data is fresh
        days (int): Number of days of historical data to fetch (default 1825 = 5 years, ignored if start_date provided)
        start_date (datetime, optional): Specific start date to fetch from (defaults to 5 years back or token launch)
        include_additional_metrics (bool): Whether to fetch additional metrics (funding rates, OI, etc.) from CoinGlass
        
    Returns:
        pd.DataFrame: Updated DataFrame with quality metrics
    """
    global _last_update_time
    
    logger = logging.getLogger(__name__)
    
    # Determine exchange (default to Binance)
    exchange = "Binance"  # Can be made configurable later
    
    # Check for incremental update: if data exists in database, only fetch new data
    latest_db_date = get_latest_data_date(symbol=symbol, exchange=exchange)
    
    if latest_db_date and not force:
        # Incremental update: fetch data from day after latest date
        # Add 1 day to avoid duplicate on the latest date (in case of partial day data)
        start_date = latest_db_date + timedelta(days=1)
        logger.info(f"Incremental update: Latest data in database is {latest_db_date.strftime('%Y-%m-%d')}, fetching from {start_date.strftime('%Y-%m-%d')}")
        
        # If start_date is in the future (data is already up to date), return existing data
        if start_date > datetime.now():
            logger.info(f"{symbol} data is already up to date (latest: {latest_db_date.strftime('%Y-%m-%d')})")
            return load_crypto_data(symbol=symbol, exchange=exchange)
    else:
        # Full update: calculate historical range (all available data from token launch by default)
        if start_date is None:
            start_date, _ = calculate_historical_range(symbol, years=None)
            logger.info(f"Full update: Using calculated start date: {start_date.strftime('%Y-%m-%d')} (from token launch - fetching all available data)")
    
    # Check if we need to update (every 24 hours for daily updates)
    if not force and symbol in _last_update_time:
        time_since_update = datetime.now() - _last_update_time[symbol]
        if time_since_update < timedelta(hours=24):  # Update if older than 24 hours
            logger.info(f"{symbol} data is fresh (updated {time_since_update.total_seconds()/3600:.1f} hours ago), skipping update")
            # Still clear cache to ensure latest data is loaded
            import os
            data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
            if symbol == "BTCUSDT":
                old_file = os.path.join(data_dir, 'Bitcoin Historical Data4.csv')
                file_path = old_file if os.path.exists(old_file) else os.path.join(data_dir, f'{symbol}_historical_data.csv')
            else:
                file_path = os.path.join(data_dir, f'{symbol}_historical_data.csv')
            cache_key = f"{symbol}_{file_path}"
            if cache_key in _dataframe_cache:
                del _dataframe_cache[cache_key]
            return load_crypto_data(symbol=symbol)
    
    try:
        # Calculate end_date (today)
        end_date = datetime.now()
        fetch_days = (end_date - start_date).days
        logger.info(f"Fetching {symbol} data from CoinGlass ONLY from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')} ({fetch_days} days)...")
        
        # Determine exchange (default to Binance)
        exchange = "Binance"  # Can be made configurable later
        
        # Use CoinGlass ONLY (no fallbacks)
        df, data_source, quality_metrics = fetch_crypto_data_smart(
            symbol=symbol,
            exchange=exchange,
            start_date=start_date,
            end_date=end_date,
            use_cache=False,  # Force fresh fetch
            cross_validate=False,  # Disabled when using only CoinGlass
            include_additional_metrics=include_additional_metrics
        )
        
        # Log data date range and quality metrics
        days_available = (df.index.max() - df.index.min()).days
        quality_score = quality_metrics.get('quality_score', 0.0)
        logger.info(f"Fetched {symbol} data: {len(df)} rows from {df.index.min()} to {df.index.max()}")
        logger.info(f"Total days available: {days_available} ({days_available/365:.2f} years)")
        logger.info(f"Data source: {data_source}, Quality score: {quality_score:.2f}")
        
        # Log quality issues if any
        if quality_metrics.get('issues'):
            logger.warning(f"Data quality issues detected for {symbol}: {quality_metrics['issues']}")
        
        # Verify minimum data requirement (at least 1 year)
        if days_available < 365:
            logger.warning(f"Only {days_available} days fetched (< 1 year). This may indicate limited historical data for {symbol}.")
        
        # Save to database (and CSV for backward compatibility)
        save_result = save_data_to_database(
            df=df,
            symbol=symbol,
            exchange=exchange,
            also_save_csv=True  # Keep CSV for backward compatibility during transition
        )
        
        if save_result['success']:
            logger.info(f"Data saved to database: {save_result['database']['inserted']} records")
            if save_result.get('csv_path'):
                logger.info(f"Data also saved to CSV: {save_result['csv_path']}")
        else:
            logger.warning(f"Failed to save {symbol} data to database, CSV may still be available")
        
        # Clear caches BEFORE updating timestamp to ensure fresh data is loaded
        # Clear database query cache
        cache_keys_to_remove = [
            key for key in _db_query_cache.keys()
            if key.startswith(f"{symbol}|{exchange}|")
        ]
        for key in cache_keys_to_remove:
            del _db_query_cache[key]
        
        # Clear CSV cache if CSV was saved
        if save_result.get('csv_path'):
            csv_path = save_result['csv_path']
            cache_key = f"{symbol}_{csv_path}"
            if cache_key in _dataframe_cache:
                del _dataframe_cache[cache_key]
            
            # Update file modification time cache
            import os
            if os.path.exists(csv_path):
                _file_mtime_cache[cache_key] = os.path.getmtime(csv_path)
        
        logger.debug(f"Cache cleared after saving {symbol} data")
        
        _last_update_time[symbol] = datetime.now()
        
        # Reload to verify it's saved correctly (cache is cleared, so this will load fresh)
        df_verify = load_crypto_data(symbol=symbol)
        
        final_days = (df_verify.index.max() - df_verify.index.min()).days
        quality_score = quality_metrics.get('quality_score', 0.0)
        logger.info(f"{symbol} data updated successfully from {data_source} (quality score: {quality_score:.2f}, {final_days} days / {final_days/365:.2f} years)")
        logger.info(f"Latest price: ${df_verify['Close'].iloc[-1]:.2f} as of {df_verify.index.max().strftime('%Y-%m-%d')}")
        return df_verify
        
    except Exception as e:
        logger.error(f"Error updating {symbol} data: {e}")
        # Fall back to existing CSV if available
        try:
            return load_crypto_data(symbol=symbol)
        except:
            raise Exception(f"Failed to update {symbol} data and no local data available: {str(e)}")


def build_full_historical_dataset(
    symbol: str = "BTCUSDT",
    target_start_date: Optional[datetime] = None,
    exchange: str = "Binance",
    chunk_days: int = 999,  # Fetch 999 days per chunk (under 1000 limit)
    save_after_each_chunk: bool = True,
    delay_between_chunks: float = 0.5  # Delay in seconds to avoid rate limits (reduced for faster loading)
) -> pd.DataFrame:
    """
    Build a complete historical dataset by fetching data in chunks going backward in time.
    This allows building datasets that exceed the CoinGlass API's 1000 record limit.
    
    Strategy:
    1. Start from today and fetch the most recent chunk (999 days)
    2. Save that chunk
    3. Move back in time and fetch the next 999 days
    4. Merge with existing data
    5. Continue until reaching target_start_date
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        target_start_date: Target start date to fetch back to (defaults to token launch date)
        exchange: Exchange name (e.g., "Binance", "Coinbase")
        chunk_days: Number of days per chunk (default: 999, under the 1000 limit)
        save_after_each_chunk: Whether to save after each chunk (recommended for safety)
        delay_between_chunks: Delay in seconds between chunks to avoid rate limits
        
    Returns:
        pd.DataFrame: Complete historical dataset
    """
    logger = logging.getLogger(__name__)
    
    # Determine target start date
    if target_start_date is None:
        if symbol == "BTCUSDT":
            target_start_date = datetime(2010, 1, 1)  # Bitcoin launch
        else:
            target_start_date, _ = calculate_historical_range(symbol, years=None)
    
    logger.info(f"Building full historical dataset for {symbol} from {target_start_date.strftime('%Y-%m-%d')} to today")
    
    # Load existing data if available
    try:
        existing_df = load_crypto_data(symbol=symbol)
        if not existing_df.empty:
            existing_start = existing_df.index.min()
            existing_end = existing_df.index.max()
            logger.info(f"Found existing data: {len(existing_df)} rows from {existing_start.strftime('%Y-%m-%d')} to {existing_end.strftime('%Y-%m-%d')}")
            
            # If we already have data going back to target, check if we need to update recent data
            if existing_start <= target_start_date:
                logger.info(f"Existing data already goes back to {existing_start.strftime('%Y-%m-%d')} (target: {target_start_date.strftime('%Y-%m-%d')})")
                # Check if we need to update recent data
                days_since_last_update = (datetime.now() - existing_end).days
                if days_since_last_update < 7:
                    logger.info("Recent data is fresh, no update needed")
                    return existing_df
                else:
                    # Start from existing end date and fetch forward
                    start_date = existing_end + timedelta(days=1)
                    all_data = existing_df.copy()
            else:
                # Need to fetch data going further back
                start_date = target_start_date
                all_data = existing_df.copy()
        else:
            # No existing data, start fresh
            all_data = pd.DataFrame()
            start_date = target_start_date
    except Exception as e:
        logger.warning(f"Could not load existing data: {e}. Starting fresh.")
        all_data = pd.DataFrame()
        start_date = target_start_date
    
    # Start fetching chunks going backward from today
    current_end = datetime.now()
    chunk_number = 0
    
    while current_end > start_date:
        chunk_number += 1
        
        # Calculate chunk start date (going backward)
        chunk_start = current_end - timedelta(days=chunk_days)
        
        # Ensure we don't go before target_start_date
        if chunk_start < start_date:
            chunk_start = start_date
        
        logger.info(f"Fetching chunk {chunk_number}: {chunk_start.strftime('%Y-%m-%d')} to {current_end.strftime('%Y-%m-%d')} ({chunk_days} days)")
        
        try:
            # Fetch this chunk
            chunk_df, data_source, quality_metrics = fetch_crypto_data_smart(
                symbol=symbol,
                start_date=chunk_start,
                end_date=current_end,
                exchange=exchange,
                use_cache=False,  # Don't use cache for incremental building
                cross_validate=False
            )
            
            if chunk_df.empty:
                logger.warning(f"Empty chunk received for {chunk_start.strftime('%Y-%m-%d')} to {current_end.strftime('%Y-%m-%d')}")
                # Move back and try next chunk
                current_end = chunk_start - timedelta(days=1)
                continue
            
            logger.info(f"✓ Fetched chunk {chunk_number}: {len(chunk_df)} rows from {chunk_df.index.min()} to {chunk_df.index.max()}")
            
            # Merge with existing data
            if all_data.empty:
                all_data = chunk_df.copy()
            else:
                # Combine and remove duplicates (keep most recent)
                all_data = pd.concat([chunk_df, all_data])
                all_data = all_data[~all_data.index.duplicated(keep='first')]
                all_data = all_data.sort_index()
            
            logger.info(f"Total data so far: {len(all_data)} rows from {all_data.index.min()} to {all_data.index.max()}")
            
            # Save after each chunk if requested
            if save_after_each_chunk:
                csv_path = save_data_to_csv(all_data, symbol=symbol)
                logger.info(f"Saved progress to {csv_path} ({len(all_data)} total rows)")
                
                # Clear cache to ensure fresh data on next load
                cache_key = f"{symbol}_{csv_path}"
                if cache_key in _dataframe_cache:
                    del _dataframe_cache[cache_key]
            
            # Move back in time for next chunk
            current_end = chunk_start - timedelta(days=1)
            
            # Delay to avoid rate limits
            if delay_between_chunks > 0 and current_end > start_date:
                logger.info(f"Waiting {delay_between_chunks} seconds before next chunk...")
                time.sleep(delay_between_chunks)
            
        except Exception as e:
            logger.error(f"Error fetching chunk {chunk_number}: {e}")
            logger.warning(f"Stopping incremental fetch. Current data: {len(all_data)} rows")
            break
    
    # Final save
    if not all_data.empty:
        csv_path = save_data_to_csv(all_data, symbol=symbol)
        logger.info(f"✓ Complete dataset saved: {csv_path}")
        logger.info(f"Final dataset: {len(all_data)} rows from {all_data.index.min()} to {all_data.index.max()}")
        logger.info(f"Total days: {(all_data.index.max() - all_data.index.min()).days} days ({(all_data.index.max() - all_data.index.min()).days/365:.2f} years)")
        
        # Clear cache
        cache_key = f"{symbol}_{csv_path}"
        if cache_key in _dataframe_cache:
            del _dataframe_cache[cache_key]
        
        _last_update_time[symbol] = datetime.now()
    
    return all_data


def ensure_full_btc_history(
    exchange: str = "Binance",
    target_start_date: datetime = datetime(2010, 1, 1),
    force_rebuild: bool = False
) -> Tuple[pd.DataFrame, bool]:
    """
    Ensure BTC has complete historical data going back to target_start_date.
    If data is incomplete, automatically builds it using incremental CSV storage.
    
    Args:
        exchange: Exchange name (default: "Binance")
        target_start_date: Target start date (default: 2010-01-01 for BTC)
        force_rebuild: Force rebuild even if data appears complete
        
    Returns:
        Tuple[pd.DataFrame, bool]: (DataFrame, was_built) - True if data was just built
    """
    logger = logging.getLogger(__name__)
    symbol = "BTCUSDT"
    
    try:
        # Check existing data
        existing_df = load_crypto_data(symbol=symbol)
        
        if not existing_df.empty and not force_rebuild:
            data_start = existing_df.index.min()
            data_end = existing_df.index.max()
            
            # Check if data goes back to target date (with 90-day buffer for flexibility)
            # Increased buffer to account for data availability limitations
            days_from_target = (data_start - target_start_date).days
            if days_from_target <= 90:
                logger.info(f"BTC data is complete: {len(existing_df)} rows from {data_start.strftime('%Y-%m-%d')} to {data_end.strftime('%Y-%m-%d')}")
                return existing_df, False
        
        # Data is incomplete or force rebuild requested
        logger.info(f"BTC data is incomplete or missing. Building full history from {target_start_date.strftime('%Y-%m-%d')}...")
        
        # Build full history
        df = build_full_historical_dataset(
            symbol=symbol,
            target_start_date=target_start_date,
            exchange=exchange,
            chunk_days=999,
            save_after_each_chunk=True,
            delay_between_chunks=0.5  # Reduced delay for faster building
        )
        
        if df.empty:
            logger.warning("Failed to build BTC history, returning existing data if available")
            return existing_df if not existing_df.empty else pd.DataFrame(), False
        
        logger.info(f"✓ BTC full history built: {len(df)} rows from {df.index.min()} to {df.index.max()}")
        return df, True
        
    except Exception as e:
        logger.error(f"Error ensuring full BTC history: {e}", exc_info=True)
        # Return existing data if available
        try:
            return load_crypto_data(symbol=symbol), False
        except:
            return pd.DataFrame(), False


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


# Cache for file modification times to detect CSV changes
_file_mtime_cache: Dict[str, float] = {}

# Simple cache for DataFrames (will be cleared when files change)
_dataframe_cache: Dict[str, Tuple[pd.DataFrame, float]] = {}

def load_crypto_data(symbol: str = "BTCUSDT", file_path: Optional[str] = None, exchange: str = "Binance", use_database: bool = True) -> pd.DataFrame:
    """
    Load cryptocurrency historical data from PostgreSQL database (primary) or CSV file (fallback).
    Automatically fetches data if file doesn't exist or doesn't go back to token launch date.
    Cache is invalidated when CSV file modification time changes or database is updated.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
        file_path (str, optional): Path to the CSV file. Auto-generated if not provided.
        exchange (str): Exchange name (e.g., "Binance"). Defaults to "Binance".
        use_database (bool): Whether to try database first. Defaults to True.
        
    Returns:
        pd.DataFrame: Cleaned DataFrame with datetime index and numeric columns
        
    Raises:
        ValueError: If the data format is invalid or data cannot be fetched
    """
    logger = logging.getLogger(__name__)
    
    # Try database first if enabled and available
    if use_database and DATABASE_AVAILABLE:
        try:
            df = load_crypto_data_from_database(symbol=symbol, exchange=exchange)
            if df is not None and not df.empty:
                logger.info(f"Loaded {len(df)} rows of {symbol} data from database")
                return df
            else:
                logger.debug(f"No data found in database for {symbol}, falling back to CSV")
        except Exception as e:
            logger.warning(f"Error loading {symbol} from database, falling back to CSV: {e}")
    
    # Fallback to CSV file
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
    
    # Check if file exists and get modification time for cache-busting
    import os
    file_exists = os.path.exists(file_path)
    file_mtime = os.path.getmtime(file_path) if file_exists else 0
    
    # Check cache with file modification time (cache-busting)
    cache_key = f"{symbol}_{file_path}"
    if cache_key in _dataframe_cache:
        cached_df, cached_mtime = _dataframe_cache[cache_key]
        if cached_mtime == file_mtime and file_exists:
            logger.debug(f"Returning cached CSV data for {symbol} (file unchanged)")
            return cached_df
        else:
            logger.debug(f"Cache invalidated for {symbol} (file modified or missing)")
            del _dataframe_cache[cache_key]
    
    # Store file modification time
    _file_mtime_cache[cache_key] = file_mtime
    
    try:
        # Load the CSV file
        df = pd.read_csv(file_path)
        
        # Log basic info about the loaded data
        logger.info(f"Loaded {len(df)} rows of {symbol} data from CSV file: {file_path}")
        logger.debug(f"Columns: {list(df.columns)}")
        
        # Clean and preprocess the data
        df = _clean_data(df)
        
        # Check if data goes back to token launch date (or reasonable earliest date)
        # Also check for invalid future dates (indicates mock/test data)
        data_start = df.index.min()
        data_end = df.index.max()
        earliest_start_date = get_token_launch_date(symbol)  # Use token launch date instead of hardcoded 2010
        current_date = datetime.now()
        
        # Check if data is invalid (future dates or doesn't go back to launch date)
        has_future_dates = data_end > current_date
        missing_historical_data = data_start > earliest_start_date
        
        if has_future_dates or missing_historical_data:
            if has_future_dates:
                logger.error(f"⚠️ INVALID DATA DETECTED: CSV contains future dates (up to {data_end.strftime('%Y-%m-%d')}). This appears to be mock/test data.")
            if missing_historical_data:
                logger.warning(f"Data file only goes back to {data_start.strftime('%Y-%m-%d')}, but CoinGecko data is available from {earliest_start_date.strftime('%Y-%m-%d')}")
            
            # Skip automatic refresh to prevent blocking server startup
            # Data refresh should be handled by scheduled jobs or manual refresh endpoint
            logger.info(f"⚠️ {symbol} data needs refresh (current: {data_start.strftime('%Y-%m-%d')} to {data_end.strftime('%Y-%m-%d')}, expected: {earliest_start_date.strftime('%Y-%m-%d')} onwards)")
            logger.info(f"   Use /api/data/refresh endpoint or wait for scheduled daily update to refresh data")
            
            # Return existing data - don't block on refresh
            return df
        
        # Cache the loaded data
        if file_exists:
            _dataframe_cache[cache_key] = (df, file_mtime)
        
        return df
        
    except FileNotFoundError:
        # File doesn't exist - don't auto-fetch to prevent blocking server startup
        logger.warning(f"⚠️ Data file not found for {symbol}")
        logger.info(f"   Use /api/data/refresh endpoint or wait for scheduled daily update to fetch data")
        # Return empty DataFrame instead of blocking on fetch
        return pd.DataFrame(columns=['Open', 'High', 'Low', 'Close', 'Volume']).set_index(pd.DatetimeIndex([]))
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
