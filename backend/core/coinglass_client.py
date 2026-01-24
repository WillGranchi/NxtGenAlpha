"""
CoinGlass API V4 Client Module

This module provides a client for interacting with CoinGlass API V4,
including rate limiting, authentication, and error handling.
"""

import os
import time
import logging
import requests
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from collections import deque
import pandas as pd
import numpy as np
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

logger = logging.getLogger(__name__)

# CoinGlass API Configuration
# Base URL: According to docs, V4 uses open-api-v4.coinglass.com
# But some endpoints might use open-api.coinglass.com - try both
COINGLASS_BASE_URL = "https://open-api-v4.coinglass.com"
COINGLASS_BASE_URL_ALT = "https://open-api.coinglass.com"  # Alternative base URL
COINGLASS_API_KEY = os.getenv("COINGLASS_API_KEY", "0e38a988ab2641aab8b4dd265eef9f62")

# Rate limiting: Hobbyist tier = 30 requests/minute
RATE_LIMIT_REQUESTS = 30
RATE_LIMIT_WINDOW = 60  # seconds


class RateLimiter:
    """Token bucket rate limiter for CoinGlass API requests (thread-safe)."""
    
    def __init__(self, max_requests: int = RATE_LIMIT_REQUESTS, window_seconds: int = RATE_LIMIT_WINDOW):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_times = deque()
        self.lock = Lock()  # Thread-safe lock for concurrent requests
    
    def wait_if_needed(self):
        """Wait if rate limit would be exceeded (thread-safe)."""
        with self.lock:
            now = time.time()
            
            # Remove requests outside the time window
            while self.request_times and self.request_times[0] < now - self.window_seconds:
                self.request_times.popleft()
            
            # If we're at the limit, wait until the oldest request expires
            if len(self.request_times) >= self.max_requests:
                wait_time = self.window_seconds - (now - self.request_times[0]) + 0.1
                if wait_time > 0:
                    logger.warning(f"Rate limit reached ({self.max_requests} requests/minute). Waiting {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                    # Clean up again after waiting
                    now = time.time()
                    while self.request_times and self.request_times[0] < now - self.window_seconds:
                        self.request_times.popleft()
            
            # Record this request
            self.request_times.append(time.time())
    
    def get_remaining_requests(self) -> int:
        """Get number of remaining requests in current window (thread-safe)."""
        with self.lock:
            now = time.time()
            while self.request_times and self.request_times[0] < now - self.window_seconds:
                self.request_times.popleft()
            return max(0, self.max_requests - len(self.request_times))


# Global rate limiter instance
_rate_limiter = RateLimiter()

# In-memory cache for CoinGlass API responses
# Structure: {cache_key: (dataframe, timestamp)}
# TTL: 1 hour for recent data, 24 hours for historical data (extended for better performance)
_coinglass_cache: Dict[str, Tuple[pd.DataFrame, float]] = {}
CACHE_TTL_RECENT = 3600  # 1 hour for recent data (last 7 days) - was 10 minutes
CACHE_TTL_HISTORICAL = 86400  # 24 hours for historical data (older than 7 days) - was 1 hour


def _generate_cache_key(
    symbol: str,
    exchange: str,
    interval: str,
    start_date: Optional[datetime],
    end_date: Optional[datetime]
) -> str:
    """
    Generate a cache key for CoinGlass API requests.
    
    Args:
        symbol: Trading pair symbol
        exchange: Exchange name
        interval: Time interval
        start_date: Start date
        end_date: End date
        
    Returns:
        Cache key string
    """
    # Create a deterministic key from parameters
    key_parts = [
        symbol.upper(),
        exchange,
        interval,
        start_date.isoformat() if start_date else "none",
        end_date.isoformat() if end_date else "none"
    ]
    key_string = "|".join(key_parts)
    # Use hash to keep keys manageable
    return hashlib.md5(key_string.encode()).hexdigest()


def _is_recent_data(start_date: Optional[datetime], end_date: Optional[datetime]) -> bool:
    """
    Determine if the requested data is recent (within last 7 days).
    
    Args:
        start_date: Start date
        end_date: End date
        
    Returns:
        True if data is recent, False otherwise
    """
    if end_date is None:
        end_date = datetime.now()
    seven_days_ago = datetime.now() - timedelta(days=7)
    # Consider recent if end_date is within last 7 days
    return end_date >= seven_days_ago


def _get_cached_response(cache_key: str, is_recent: bool) -> Optional[pd.DataFrame]:
    """
    Get cached response if available and not expired.
    
    Args:
        cache_key: Cache key
        is_recent: Whether data is recent (affects TTL)
        
    Returns:
        Cached DataFrame if available and fresh, None otherwise
    """
    if cache_key not in _coinglass_cache:
        return None
    
    df, cached_time = _coinglass_cache[cache_key]
    current_time = time.time()
    
    # Use shorter TTL for recent data, longer for historical
    ttl = CACHE_TTL_RECENT if is_recent else CACHE_TTL_HISTORICAL
    age = current_time - cached_time
    
    if age > ttl:
        # Cache expired, remove it
        logger.debug(f"Cache expired for key {cache_key[:8]}... (age: {age:.1f}s, TTL: {ttl}s)")
        del _coinglass_cache[cache_key]
        return None
    
    logger.debug(f"Cache hit for key {cache_key[:8]}... (age: {age:.1f}s)")
    return df


def _store_cached_response(cache_key: str, df: pd.DataFrame):
    """
    Store response in cache.
    
    Args:
        cache_key: Cache key
        df: DataFrame to cache
    """
    _coinglass_cache[cache_key] = (df.copy(), time.time())
    logger.debug(f"Cached response for key {cache_key[:8]}... (cache size: {len(_coinglass_cache)} entries)")


def _clean_expired_cache():
    """
    Remove expired entries from cache to prevent memory bloat.
    Called periodically to clean up old cache entries.
    """
    current_time = time.time()
    expired_keys = []
    
    for cache_key, (df, cached_time) in _coinglass_cache.items():
        # Use maximum TTL to check expiration
        age = current_time - cached_time
        if age > CACHE_TTL_HISTORICAL:
            expired_keys.append(cache_key)
    
    for key in expired_keys:
        del _coinglass_cache[key]
    
    if expired_keys:
        logger.debug(f"Cleaned {len(expired_keys)} expired cache entries (remaining: {len(_coinglass_cache)})")


class CoinGlassClient:
    """Client for CoinGlass API V4."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or COINGLASS_API_KEY
        self.base_url = COINGLASS_BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            "accept": "application/json",
            "CG-API-KEY": self.api_key
        })
    
    def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ) -> Dict[str, Any]:
        """
        Make a request to CoinGlass API with rate limiting and retry logic.
        
        Args:
            endpoint: API endpoint (e.g., "/api/futures/trading-market/price-history-ohlc")
            params: Query parameters
            max_retries: Maximum number of retry attempts
            retry_delay: Initial delay between retries (exponential backoff)
            
        Returns:
            JSON response as dictionary
            
        Raises:
            Exception: If request fails after all retries
        """
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(max_retries + 1):
            try:
                # Rate limiting
                _rate_limiter.wait_if_needed()
                
                # Make request with separate connection and read timeouts
                # Connection timeout: how long to wait to establish connection (5 seconds)
                # Read timeout: how long to wait for response data (30 seconds - reduced for faster failures)
                try:
                    response = self.session.get(url, params=params, timeout=(5, 30))
                except requests.exceptions.Timeout as timeout_error:
                    if "ConnectTimeout" in str(type(timeout_error)):
                        raise Exception(f"CoinGlass API connection timeout - unable to connect to {url}. Check network connectivity.")
                    else:
                        raise Exception(f"CoinGlass API read timeout - server took too long to respond. URL: {url}")
                except requests.exceptions.ConnectionError as conn_error:
                    raise Exception(f"CoinGlass API connection error - unable to reach server. URL: {url}, Error: {str(conn_error)}")
                
                # Check for rate limit errors
                if response.status_code == 429:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"Rate limit error (429). Waiting {wait_time:.2f} seconds before retry...")
                    time.sleep(wait_time)
                    continue
                
                # Check for authentication errors
                if response.status_code == 401:
                    raise Exception(f"CoinGlass API authentication failed. Check your API key.")
                
                # Check for other errors
                if response.status_code != 200:
                    error_msg = f"CoinGlass API error {response.status_code}"
                    try:
                        error_data = response.json()
                        error_msg += f": {error_data.get('message', error_data.get('error', 'Unknown error'))}"
                        # Log full error response for debugging
                        logger.error(f"CoinGlass API error response: {error_data}")
                    except:
                        error_text = response.text[:500]
                        error_msg += f": {error_text}"
                        logger.error(f"CoinGlass API error response (non-JSON): {error_text}")
                    
                    # Log request details for debugging
                    logger.error(f"CoinGlass API request failed - URL: {url}, Params: {params}, Status: {response.status_code}")
                    logger.error(f"Response headers: {dict(response.headers)}")
                    
                    if attempt < max_retries:
                        wait_time = retry_delay * (2 ** attempt)
                        logger.warning(f"{error_msg}. Retrying in {wait_time:.2f} seconds...")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise Exception(error_msg)
                
                # Success
                try:
                    data = response.json()
                except Exception as e:
                    logger.error(f"Failed to parse CoinGlass API response as JSON: {e}")
                    logger.error(f"Response text: {response.text[:500]}")
                    raise Exception(f"Invalid JSON response from CoinGlass API: {str(e)}")
                
                # Log response for debugging
                logger.debug(f"CoinGlass API response status: {response.status_code}")
                logger.debug(f"CoinGlass API response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                
                remaining = _rate_limiter.get_remaining_requests()
                if remaining < 5:
                    logger.warning(f"CoinGlass API: Only {remaining} requests remaining in current window")
                
                return data
                
            except requests.exceptions.Timeout as timeout_error:
                error_msg = f"CoinGlass API timeout error: {str(timeout_error)}"
                logger.error(error_msg)
                if attempt < max_retries:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"{error_msg}. Retrying in {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    raise Exception(f"CoinGlass API request timed out after {max_retries} retries. URL: {url}")
            except requests.exceptions.ConnectionError as conn_error:
                error_msg = f"CoinGlass API connection error: {str(conn_error)}"
                logger.error(error_msg)
                if attempt < max_retries:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"{error_msg}. Retrying in {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    raise Exception(f"CoinGlass API connection failed after {max_retries} retries. URL: {url}")
            except requests.exceptions.RequestException as e:
                error_msg = f"CoinGlass API request error: {str(e)}"
                logger.error(error_msg)
                if attempt < max_retries:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"{error_msg}. Retrying in {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    raise Exception(f"CoinGlass API request failed after {max_retries} retries: {str(e)}")
        
        raise Exception(f"CoinGlass API request failed after {max_retries} retries")
    
    def get_price_history(
        self,
        symbol: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        interval: str = "4h",  # Default to 4h for Hobbyist tier compatibility (minimum allowed)
        exchange: str = "Binance",  # Exchange name (capitalized)
        use_cache: bool = True
    ) -> pd.DataFrame:
        """
        Fetch price history (OHLCV) from CoinGlass with in-memory caching.
        
        Args:
            symbol: Trading pair symbol (e.g., "BTCUSDT")
            start_date: Start date for historical data
            end_date: End date for historical data
            interval: Time interval (1d, 1h, etc.)
            exchange: Exchange name (e.g., "Binance", "Coinbase", "OKX")
            use_cache: Whether to use cache (default: True)
            
        Returns:
            DataFrame with OHLCV data
        """
        # Map symbol to CoinGlass format
        coinglass_symbol = self._map_symbol_to_coinglass(symbol)
        
        # Store exchange for use in requests
        successful_exchange = exchange
        
        # Check cache first if enabled
        if use_cache:
            is_recent = _is_recent_data(start_date, end_date)
            cache_key = _generate_cache_key(symbol, exchange, interval, start_date, end_date)
            cached_df = _get_cached_response(cache_key, is_recent)
            
            if cached_df is not None:
                logger.info(f"Returning cached CoinGlass data for {symbol} on {exchange} (cache key: {cache_key[:8]}...)")
                return cached_df
        
        # Clean expired cache entries periodically (every 10th request)
        if len(_coinglass_cache) > 0 and len(_coinglass_cache) % 10 == 0:
            _clean_expired_cache()
        
        # Use the correct CoinGlass API v4 endpoint from documentation
        # Documentation: https://docs.coinglass.com/reference/price-history
        # Endpoint: /api/spot/price/history (spot market, not futures)
        # Note: For Hobbyist tier, interval must be >= 4h
        endpoints_to_try = [
            "/api/spot/price/history",  # Correct endpoint from CoinGlass API v4 docs
        ]
        
        # CoinGlass API may have limits on how much data can be returned in a single request
        # We'll fetch in chunks if the date range is too large (e.g., > 1000 days)
        # This ensures we get full historical data even if there are API limits
        days_range = (end_date - start_date).days if start_date and end_date else None
        chunk_days = 1000  # Fetch in chunks of 1000 days to avoid API limits
        
        if days_range and days_range > chunk_days:
            logger.info(f"Large date range detected ({days_range} days). Fetching in chunks of {chunk_days} days...")
            all_dfs = []
            current_start = start_date
            base_urls_to_try = [self.base_url, COINGLASS_BASE_URL_ALT]
            
            while current_start < end_date:
                current_end = min(current_start + timedelta(days=chunk_days), end_date)
                logger.info(f"Fetching chunk: {current_start.strftime('%Y-%m-%d')} to {current_end.strftime('%Y-%m-%d')}")
                
                # For Hobbyist tier, interval must be >= 4h
                effective_interval = interval
                if interval in ["1m", "5m", "15m", "30m", "1h", "2h", "3h"]:
                    effective_interval = "4h"
                
                # Remove any separators from symbol to get "BTCUSDT" format
                symbol_clean = coinglass_symbol.replace("-", "").replace("/", "").replace("_", "")
                chunk_params = {
                    "symbol": symbol_clean,  # Format: BTCUSDT (no separator)
                    "interval": effective_interval,
                    "exchange": successful_exchange,  # Use provided exchange
                    "limit": "1000",  # Maximum allowed
                    "start_time": int(current_start.timestamp() * 1000),  # Use start_time
                    "end_time": int(current_end.timestamp() * 1000)  # Use end_time
                }
                
                # Try each endpoint with both base URLs for this chunk
                chunk_data = None
                original_base = self.base_url
                
                for base_url in base_urls_to_try:
                    self.base_url = base_url
                    for endpoint in endpoints_to_try:
                        try:
                            chunk_data = self._make_request(endpoint, chunk_params)
                            logger.info(f"✓ Successfully fetched chunk data from {base_url}{endpoint}")
                            break
                        except Exception as e:
                            logger.debug(f"Endpoint {base_url}{endpoint} failed for chunk: {e}")
                            continue
                    
                    if chunk_data is not None:
                        break
                
                self.base_url = original_base  # Restore original
                
                if chunk_data:
                    # Parse chunk data
                    chunk_df = self._parse_price_history_response(chunk_data, symbol, coinglass_symbol)
                    if not chunk_df.empty:
                        all_dfs.append(chunk_df)
                        logger.info(f"✓ Fetched {len(chunk_df)} records for chunk")
                
                current_start = current_end + timedelta(days=1)  # Start next chunk after current end
            
            # Combine all chunks
            if all_dfs:
                df = pd.concat(all_dfs)
                df = df.sort_index()
                df = df[~df.index.duplicated(keep='first')]  # Remove duplicates
                logger.info(f"✓ Combined {len(all_dfs)} chunks into {len(df)} total records")
                
                # Store in cache if enabled and data is valid
                if use_cache and not df.empty:
                    is_recent = _is_recent_data(start_date, end_date)
                    cache_key = _generate_cache_key(symbol, successful_exchange, effective_interval, start_date, end_date)
                    _store_cached_response(cache_key, df)
                    logger.info(f"Cached CoinGlass chunked response for {symbol} on {successful_exchange} (cache key: {cache_key[:8]}...)")
                
                return df
            else:
                raise Exception(
                    f"Failed to fetch any data chunks for {symbol}. "
                    f"This may indicate that historical price data is not available in your CoinGlass API tier."
                )
        
        # Single request for smaller date ranges
        # For Hobbyist tier, interval must be >= 4h according to docs
        # Documentation: https://docs.coinglass.com/reference/price-history
        effective_interval = interval
        if interval in ["1m", "5m", "15m", "30m", "1h", "2h", "3h"]:
            logger.warning(f"Interval {interval} not supported for Hobbyist tier (minimum 4h). Using 4h instead.")
            effective_interval = "4h"
        
        # CoinGlass API requires 'exchange' parameter (capitalized, e.g., "Binance")
        # Symbol format should be "BTCUSDT" (no separator - no slash, no dash)
        # Parameters use start_time and end_time (not startTime/endTime)
        # Remove any separators from symbol to get "BTCUSDT" format
        symbol_clean = coinglass_symbol.replace("-", "").replace("/", "").replace("_", "")
        
        # CoinGlass API limit: max 1000 records per request
        # For daily data: 1000 days per request
        # For 4h data: ~166 days per request
        # Calculate how many records we need based on date range and interval
        if start_date and end_date:
            days_range = (end_date - start_date).days
            # Estimate records needed based on interval
            interval_hours = {"1d": 24, "4h": 4, "6h": 6, "8h": 8, "12h": 12, "1w": 168}.get(effective_interval, 24)
            estimated_records = int((days_range * 24) / interval_hours)
            
            # If estimated records > 1000, we need pagination
            if estimated_records > 1000:
                logger.info(f"Large date range detected ({days_range} days, ~{estimated_records} records). Using pagination with limit=1000")
                # Use pagination logic
                return self._fetch_price_history_paginated(
                    symbol_clean, effective_interval, start_date, end_date, 
                    successful_exchange, use_cache
                )
        
        # Single request for smaller ranges
        params = {
            "symbol": symbol_clean,  # Format: BTCUSDT (no separator)
            "interval": effective_interval,
            "exchange": successful_exchange,  # Use provided exchange
            "limit": "1000"  # Maximum allowed by CoinGlass API
        }
        
        if start_date:
            params["start_time"] = int(start_date.timestamp() * 1000)  # Use start_time not startTime
        if end_date:
            params["end_time"] = int(end_date.timestamp() * 1000)  # Use end_time not endTime
        
        logger.info(f"Fetching CoinGlass price history: symbol={coinglass_symbol}, interval={effective_interval}, exchange={successful_exchange}, start={start_date}, end={end_date}")
        
        # Do NOT fall back across exchanges (keeps data cohesive).
        # Only try the requested exchange.
        exchanges_to_try = [exchange]

        # Try each endpoint with both base URLs (same exchange)
        data = None
        last_error = None
        successful_endpoint = None
        successful_exchange = exchange
        base_urls_to_try = [self.base_url, COINGLASS_BASE_URL_ALT]
        
        for base_url in base_urls_to_try:
            original_base = self.base_url
            self.base_url = base_url
            logger.info(f"Trying base URL: {base_url}")
            
            for exch in exchanges_to_try:
                params["exchange"] = exch
                
                for endpoint in endpoints_to_try:
                    try:
                        logger.info(f"Trying CoinGlass endpoint: {base_url}{endpoint} with symbol={coinglass_symbol}, exchange={exch}")
                        data = self._make_request(endpoint, params)
                        logger.info(f"✓ Successfully fetched data from CoinGlass endpoint: {base_url}{endpoint} with exchange={exch}")
                        successful_endpoint = f"{base_url}{endpoint}"
                        successful_exchange = exch
                        self.base_url = original_base  # Restore original
                        break
                    except Exception as e:
                        error_str = str(e)
                        logger.warning(f"✗ Endpoint {base_url}{endpoint} with exchange={exch} failed: {error_str}")
                        last_error = e
                        # If it's a 404, try next endpoint
                        # If it's a 400, might be parameter issue - try next exchange
                        if "404" in error_str or "not found" in error_str.lower():
                            logger.debug(f"Endpoint {endpoint} not found (404), trying next...")
                        elif "400" in error_str:
                            logger.warning(f"Endpoint {endpoint} returned 400 (bad request) with exchange={exch}")
                            break
                        continue
                
                if data is not None:
                    break
            
            if data is not None:
                break
            self.base_url = original_base  # Restore original
        
        if data is None:
            error_msg = (
                f"All CoinGlass endpoints failed for {symbol} (coinglass_symbol={coinglass_symbol}). "
                f"Tried exchanges: {exchanges_to_try}. "
                f"Last error: {last_error}. "
                f"This may indicate that historical price data is not available in your CoinGlass API tier, "
                f"or the endpoints have changed. Please check the CoinGlass API documentation for the correct endpoints."
            )
            logger.error(error_msg)
            logger.error(f"Tried base URLs: {base_urls_to_try}")
            logger.error(f"Tried endpoints: {endpoints_to_try}")
            logger.error(f"Tried exchanges: {exchanges_to_try}")
            logger.error(f"Request params were: {params}")
            raise Exception(error_msg)
        
        logger.info(f"Using successful CoinGlass endpoint: {successful_endpoint} with exchange: {successful_exchange}")
        
        # Parse the response
        df = self._parse_price_history_response(data, symbol, coinglass_symbol)
        
        # Store in cache if enabled and data is valid
        if use_cache and not df.empty:
            is_recent = _is_recent_data(start_date, end_date)
            cache_key = _generate_cache_key(symbol, successful_exchange, effective_interval, start_date, end_date)
            _store_cached_response(cache_key, df)
            logger.info(f"Cached CoinGlass response for {symbol} on {successful_exchange} (cache key: {cache_key[:8]}...)")
        
        return df
    
    def _calculate_smart_chunk_size(self, chunk_start: datetime, chunk_end: datetime, interval: str) -> int:
        """
        Calculate adaptive chunk size based on date range.
        Recent data (last 30 days): 1-day chunks (more granular)
        Medium-term (30-365 days): 30-day chunks
        Historical (365+ days): 365-day chunks
        
        Args:
            chunk_start: Start date of chunk
            chunk_end: End date of chunk
            interval: Time interval
            
        Returns:
            Number of days for this chunk
        """
        now = datetime.now()
        days_from_now = (now - chunk_start).days
        
        # Calculate interval hours to estimate records per day
        interval_hours = {"1d": 24, "4h": 4, "6h": 6, "8h": 8, "12h": 12, "1w": 168}.get(interval, 24)
        records_per_day = 24 / interval_hours
        max_days_per_1000_records = int(1000 / records_per_day)
        
        # Adaptive chunking based on how recent the data is
        if days_from_now <= 30:
            # Recent data: 1-day chunks for granularity
            chunk_days = 1
        elif days_from_now <= 365:
            # Medium-term: 30-day chunks
            chunk_days = min(30, max_days_per_1000_records)
        else:
            # Historical: 365-day chunks (or max allowed by API limit)
            chunk_days = min(365, max_days_per_1000_records)
        
        return chunk_days
    
    def _fetch_single_chunk(
        self,
        symbol: str,
        interval: str,
        chunk_start: datetime,
        chunk_end: datetime,
        exchange: str,
        use_cache: bool = True
    ) -> Tuple[datetime, datetime, Optional[pd.DataFrame]]:
        """
        Fetch a single chunk of price history data.
        Used by parallel pagination.
        
        Returns:
            Tuple of (chunk_start, chunk_end, DataFrame or None)
        """
        try:
            # Check cache for this chunk
            chunk_df = None
            if use_cache:
                is_recent = _is_recent_data(chunk_start, chunk_end)
                cache_key = _generate_cache_key(symbol, exchange, interval, chunk_start, chunk_end)
                chunk_df = _get_cached_response(cache_key, is_recent)
            
            if chunk_df is None:
                # Fetch this chunk from API
                params = {
                    "symbol": symbol,
                    "interval": interval,
                    "exchange": exchange,
                    "limit": "1000",
                    "start_time": int(chunk_start.timestamp() * 1000),
                    "end_time": int(chunk_end.timestamp() * 1000)
                }
                
                # Make API request (rate limiter is thread-safe)
                chunk_data = None
                original_base = self.base_url
                endpoints_to_try = ["/api/spot/price/history"]
                base_urls_to_try = [self.base_url, COINGLASS_BASE_URL_ALT]
                
                for base_url in base_urls_to_try:
                    self.base_url = base_url
                    for endpoint in endpoints_to_try:
                        try:
                            chunk_data = self._make_request(endpoint, params)
                            logger.debug(f"✓ Successfully fetched chunk from {base_url}{endpoint}: {chunk_start.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')}")
                            break
                        except Exception as e:
                            logger.debug(f"Endpoint {base_url}{endpoint} failed for chunk: {e}")
                            continue
                    
                    if chunk_data is not None:
                        break
                
                self.base_url = original_base  # Restore original
                
                if chunk_data:
                    # Parse response
                    chunk_df = self._parse_price_history_response(chunk_data, symbol, symbol)
                    
                    # Cache this chunk
                    if use_cache and not chunk_df.empty:
                        is_recent = _is_recent_data(chunk_start, chunk_end)
                        cache_key = _generate_cache_key(symbol, exchange, interval, chunk_start, chunk_end)
                        _store_cached_response(cache_key, chunk_df)
            
            return (chunk_start, chunk_end, chunk_df)
            
        except Exception as e:
            logger.error(f"Error fetching chunk {chunk_start.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')}: {e}")
            return (chunk_start, chunk_end, None)
    
    def _fetch_price_history_paginated(
        self,
        symbol: str,
        interval: str,
        start_date: datetime,
        end_date: datetime,
        exchange: str,
        use_cache: bool = True,
        max_workers: int = 5
    ) -> pd.DataFrame:
        """
        Fetch price history using parallel pagination with smart chunking.
        CoinGlass API limit is 1000 records per request.
        
        Uses adaptive chunk sizes:
        - Recent data (last 30 days): 1-day chunks
        - Medium-term (30-365 days): 30-day chunks
        - Historical (365+ days): 365-day chunks
        
        Fetches multiple chunks in parallel while respecting rate limits.
        
        Args:
            symbol: Trading pair symbol (e.g., "BTCUSDT")
            interval: Time interval
            start_date: Start date
            end_date: End date
            exchange: Exchange name
            use_cache: Whether to use cache
            max_workers: Maximum number of parallel workers (default: 5 to respect rate limits)
            
        Returns:
            DataFrame with all paginated data combined
        """
        logger.info(f"Fetching paginated price history for {symbol} on {exchange} ({start_date} to {end_date}) with parallel pagination")
        
        # Generate list of chunks using smart chunking
        chunks = []
        current_start = start_date
        
        while current_start < end_date:
            # Calculate adaptive chunk size
            chunk_days = self._calculate_smart_chunk_size(current_start, end_date, interval)
            current_end = min(current_start + timedelta(days=chunk_days), end_date)
            
            chunks.append((current_start, current_end))
            current_start = current_end + timedelta(days=1)
        
        logger.info(f"Generated {len(chunks)} chunks for parallel fetching")
        
        # Fetch chunks in parallel
        all_dfs = []
        chunk_results = {}  # Store results by chunk start date for ordering
        
        # Use ThreadPoolExecutor for parallel fetching
        # Limit workers to respect rate limits (30 req/min = 0.5 req/sec, so 5 workers max)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all chunk fetch tasks
            future_to_chunk = {
                executor.submit(
                    self._fetch_single_chunk,
                    symbol,
                    interval,
                    chunk_start,
                    chunk_end,
                    exchange,
                    use_cache
                ): (chunk_start, chunk_end)
                for chunk_start, chunk_end in chunks
            }
            
            # Process completed tasks as they finish
            completed = 0
            for future in as_completed(future_to_chunk):
                chunk_start, chunk_end, chunk_df = future.result()
                completed += 1
                
                if chunk_df is not None and not chunk_df.empty:
                    chunk_results[chunk_start] = chunk_df
                    logger.info(f"✓ Fetched chunk {completed}/{len(chunks)}: {len(chunk_df)} records ({chunk_start.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')})")
                else:
                    logger.warning(f"✗ Chunk {completed}/{len(chunks)} returned no data ({chunk_start.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')})")
        
        # Combine all chunks in chronological order
        if chunk_results:
            # Sort by chunk start date
            sorted_chunks = sorted(chunk_results.items())
            all_dfs = [df for _, df in sorted_chunks]
            
            df = pd.concat(all_dfs)
            df = df.sort_index()
            df = df[~df.index.duplicated(keep='first')]  # Remove duplicates
            logger.info(f"✓ Combined {len(all_dfs)} chunks into {len(df)} total records")
            
            # Filter to exact date range
            if start_date and end_date:
                df = df[(df.index >= start_date) & (df.index <= end_date)]
            
            return df
        else:
            logger.warning(f"No data fetched for {symbol} on {exchange}")
            return pd.DataFrame()
    
    def _parse_price_history_response(self, data: Any, symbol: str, coinglass_symbol: str) -> pd.DataFrame:
        """
        Parse CoinGlass API price history response into a DataFrame.
        
        Args:
            data: API response data
            symbol: Original symbol (e.g., "BTCUSDT")
            coinglass_symbol: CoinGlass-formatted symbol (e.g., "BTC-USDT")
            
        Returns:
            DataFrame with OHLCV data
        """
        try:
            # Log the response structure for debugging
            logger.info(f"CoinGlass API response received - Type: {type(data)}")
            if isinstance(data, dict):
                logger.info(f"CoinGlass API response keys: {list(data.keys())}")
                logger.info(f"CoinGlass API response sample: {str(data)[:500]}")
            else:
                logger.info(f"CoinGlass API response (non-dict): {str(data)[:500]}")
            
            # Parse response - CoinGlass API v4 uses {"code": "0", "msg": "success", "data": [...]} format
            # Check for error codes first
            if isinstance(data, dict):
                code = data.get("code")
                msg = data.get("msg", "")
                
                # CoinGlass uses "0" for success, other codes indicate errors
                if code != "0" and code != 0:
                    error_msg = f"CoinGlass API error (code={code}): {msg}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
                
                # Extract data from response
                if "data" in data:
                    records = data.get("data", [])
                    logger.info(f"Found 'data' key with {len(records) if isinstance(records, list) else 'non-list'} items")
                elif "result" in data:
                    result = data.get("result")
                    if isinstance(result, list):
                        records = result
                        logger.info(f"Found 'result' key as list with {len(records)} items")
                    elif isinstance(result, dict) and "data" in result:
                        records = result.get("data", [])
                        logger.info(f"Found 'result.data' with {len(records) if isinstance(records, list) else 'non-list'} items")
                else:
                    # No data found in response
                    logger.warning(f"CoinGlass response has no 'data' or 'result' key. Available keys: {list(data.keys())}")
                    records = None
            elif isinstance(data, list):
                records = data
                logger.info(f"Response is direct list with {len(records)} items")
            else:
                records = None
            
            if not records:
                logger.warning(f"No price data returned from CoinGlass for {symbol} (coinglass_symbol={coinglass_symbol})")
                logger.warning(f"Full response structure: {str(data)[:1000]}")
                return pd.DataFrame()
            
            # Convert to DataFrame
            df_data = []
            for record in records:
                try:
                    # CoinGlass OHLC format: [timestamp, open, high, low, close, volume]
                    if isinstance(record, list) and len(record) >= 5:
                        # Handle timestamp (might be in ms or seconds, or a date string)
                        timestamp = record[0]
                        date_obj = None
                        
                        if isinstance(timestamp, (int, float)):
                            # If timestamp is less than 1e10, it's likely in seconds, convert to ms
                            if timestamp < 1e10:
                                timestamp_ms = int(timestamp * 1000)
                            else:
                                timestamp_ms = int(timestamp)
                            
                            # Validate timestamp is reasonable (between 2009-01-01 and 2100-01-01)
                            min_timestamp = pd.Timestamp('2009-01-01').value // 1000000  # Convert to ms
                            max_timestamp = pd.Timestamp('2100-01-01').value // 1000000
                            
                            if min_timestamp <= timestamp_ms <= max_timestamp:
                                date_obj = pd.Timestamp(timestamp_ms, unit="ms")
                            else:
                                logger.warning(f"Invalid timestamp value: {timestamp_ms} (out of range)")
                                continue
                        elif isinstance(timestamp, str):
                            # Handle date string format
                            try:
                                # Try parsing as ISO format first
                                date_obj = pd.to_datetime(timestamp, errors='coerce')
                                if pd.isna(date_obj):
                                    # Try other common formats
                                    date_obj = pd.to_datetime(timestamp, format='%Y-%m-%d', errors='coerce')
                                if pd.isna(date_obj):
                                    # Try 2-digit year format (e.g., "20-01-03" -> "2020-01-03")
                                    if len(timestamp) == 8 and timestamp[2] == '-' and timestamp[5] == '-':
                                        # Format: YY-MM-DD
                                        year_part = timestamp[:2]
                                        if int(year_part) < 50:  # Assume 20XX for years < 50
                                            corrected_timestamp = f"20{timestamp}"
                                        else:  # Assume 19XX for years >= 50
                                            corrected_timestamp = f"19{timestamp}"
                                        date_obj = pd.to_datetime(corrected_timestamp, format='%Y-%m-%d', errors='coerce')
                                
                                if pd.isna(date_obj):
                                    logger.warning(f"Could not parse date string: {timestamp}")
                                    continue
                            except Exception as e:
                                logger.warning(f"Error parsing date string '{timestamp}': {e}")
                                continue
                        else:
                            logger.warning(f"Unexpected timestamp format in CoinGlass response: {timestamp} (type: {type(timestamp)})")
                            continue
                        
                        if date_obj is not None:
                            df_data.append({
                                "Date": date_obj,
                                "Open": float(record[1]),
                                "High": float(record[2]),
                                "Low": float(record[3]),
                                "Close": float(record[4]),
                                "Volume": float(record[5]) if len(record) > 5 else 0.0
                            })
                    elif isinstance(record, dict):
                        # Handle dict format - CoinGlass API returns: {"time": ms, "open": "str", "high": "str", "low": "str", "close": "str", "volume_usd": "str"}
                        # Documentation: https://docs.coinglass.com/reference/price-ohlc-history
                        if "time" in record:
                            timestamp = record["time"]
                            date_obj = None
                            
                            if isinstance(timestamp, (int, float)):
                                # Timestamp is in milliseconds
                                timestamp_ms = int(timestamp)
                                
                                # Validate timestamp is reasonable
                                min_timestamp = pd.Timestamp('2009-01-01').value // 1000000
                                max_timestamp = pd.Timestamp('2100-01-01').value // 1000000
                                
                                if min_timestamp <= timestamp_ms <= max_timestamp:
                                    date_obj = pd.Timestamp(timestamp_ms, unit="ms")
                                else:
                                    logger.warning(f"Invalid timestamp value: {timestamp_ms} (out of range)")
                                    continue
                            else:
                                logger.warning(f"Unexpected timestamp format in CoinGlass response: {timestamp} (type: {type(timestamp)})")
                                continue
                            
                            if date_obj is not None:
                                # Prices are strings in CoinGlass response, convert to float
                                # Volume is in volume_usd field
                                df_data.append({
                                    "Date": date_obj,
                                    "Open": float(record.get("open", 0)),
                                    "High": float(record.get("high", 0)),
                                    "Low": float(record.get("low", 0)),
                                    "Close": float(record.get("close", 0)),
                                    "Volume": float(record.get("volume_usd", record.get("volume", 0)))
                                })
                        else:
                            logger.warning(f"Record missing 'time' field: {record}")
                            continue
                except Exception as e:
                    logger.warning(f"Error parsing CoinGlass record: {record}, error: {e}")
                    continue
            
            if not df_data:
                return pd.DataFrame()
            
            if not df_data:
                return pd.DataFrame()
            
            df = pd.DataFrame(df_data)
            
            # Filter out any invalid dates before setting index
            valid_mask = df['Date'].notna() & (df['Date'] >= pd.Timestamp('2009-01-01')) & (df['Date'] <= pd.Timestamp('2100-01-01'))
            invalid_count = (~valid_mask).sum()
            if invalid_count > 0:
                logger.warning(f"Filtered out {invalid_count} records with invalid dates")
                df = df[valid_mask]
            
            if df.empty:
                logger.warning(f"No valid price data after filtering for {symbol}")
                return pd.DataFrame()
            
            df.set_index("Date", inplace=True)
            df.sort_index(inplace=True)
            
            # Remove any duplicate dates (keep first)
            if df.index.duplicated().any():
                duplicate_count = df.index.duplicated().sum()
                logger.warning(f"Removing {duplicate_count} duplicate date entries")
                df = df[~df.index.duplicated(keep='first')]
            
            logger.info(f"Parsed {len(df)} valid price records from CoinGlass for {symbol} (date range: {df.index.min()} to {df.index.max()})")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching price history from CoinGlass: {e}")
            raise
    
    def get_funding_rate_history(
        self,
        symbol: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.Series:
        """
        Fetch funding rate history from CoinGlass.
        
        Args:
            symbol: Trading pair symbol
            start_date: Start date
            end_date: End date
            
        Returns:
            Series with funding rates indexed by date
        """
        coinglass_symbol = self._map_symbol_to_coinglass(symbol)
        endpoint = "/api/futures/funding-rate/history-ohlc"
        params = {"symbol": coinglass_symbol, "interval": "1d"}
        
        if start_date:
            params["startTime"] = int(start_date.timestamp() * 1000)
        if end_date:
            params["endTime"] = int(end_date.timestamp() * 1000)
        
        try:
            data = self._make_request(endpoint, params)
            records = data.get("data", [])
            
            if not records:
                return pd.Series(dtype=float)
            
            funding_rates = {}
            for record in records:
                if isinstance(record, list) and len(record) >= 2:
                    date = pd.Timestamp(record[0], unit="ms")
                    rate = float(record[1])  # Funding rate value
                    funding_rates[date] = rate
            
            return pd.Series(funding_rates, name="FundingRate")
            
        except Exception as e:
            logger.warning(f"Error fetching funding rate from CoinGlass: {e}")
            return pd.Series(dtype=float)
    
    def get_open_interest_history(
        self,
        symbol: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.Series:
        """Fetch open interest history from CoinGlass."""
        coinglass_symbol = self._map_symbol_to_coinglass(symbol)
        endpoint = "/api/futures/open-interest/history-ohlc"
        params = {"symbol": coinglass_symbol, "interval": "1d"}
        
        if start_date:
            params["startTime"] = int(start_date.timestamp() * 1000)
        if end_date:
            params["endTime"] = int(end_date.timestamp() * 1000)
        
        try:
            data = self._make_request(endpoint, params)
            records = data.get("data", [])
            
            if not records:
                return pd.Series(dtype=float)
            
            oi_data = {}
            for record in records:
                if isinstance(record, list) and len(record) >= 2:
                    date = pd.Timestamp(record[0], unit="ms")
                    oi = float(record[1])
                    oi_data[date] = oi
            
            return pd.Series(oi_data, name="OpenInterest")
            
        except Exception as e:
            logger.warning(f"Error fetching open interest from CoinGlass: {e}")
            return pd.Series(dtype=float)
    
    def get_long_short_ratio(
        self,
        symbol: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.Series:
        """Fetch long/short ratio from CoinGlass."""
        coinglass_symbol = self._map_symbol_to_coinglass(symbol)
        endpoint = "/api/futures/long-short-ratio/global-account-ratio"
        params = {"symbol": coinglass_symbol}
        
        if start_date:
            params["startTime"] = int(start_date.timestamp() * 1000)
        if end_date:
            params["endTime"] = int(end_date.timestamp() * 1000)
        
        try:
            data = self._make_request(endpoint, params)
            records = data.get("data", [])
            
            if not records:
                return pd.Series(dtype=float)
            
            ratio_data = {}
            for record in records:
                if isinstance(record, (list, dict)):
                    if isinstance(record, list) and len(record) >= 2:
                        date = pd.Timestamp(record[0], unit="ms")
                        ratio = float(record[1])
                        ratio_data[date] = ratio
                    elif isinstance(record, dict):
                        date = pd.Timestamp(record.get("time", 0), unit="ms")
                        ratio = float(record.get("ratio", 0))
                        ratio_data[date] = ratio
            
            return pd.Series(ratio_data, name="LongShortRatio")
            
        except Exception as e:
            logger.warning(f"Error fetching long/short ratio from CoinGlass: {e}")
            return pd.Series(dtype=float)
    
    def get_liquidation_history(
        self,
        symbol: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.Series:
        """Fetch liquidation history from CoinGlass."""
        coinglass_symbol = self._map_symbol_to_coinglass(symbol)
        endpoint = "/api/futures/liquidation/pair-liquidation-history"
        params = {"symbol": coinglass_symbol}
        
        if start_date:
            params["startTime"] = int(start_date.timestamp() * 1000)
        if end_date:
            params["endTime"] = int(end_date.timestamp() * 1000)
        
        try:
            data = self._make_request(endpoint, params)
            records = data.get("data", [])
            
            if not records:
                return pd.Series(dtype=float)
            
            liq_data = {}
            for record in records:
                if isinstance(record, (list, dict)):
                    if isinstance(record, list) and len(record) >= 2:
                        date = pd.Timestamp(record[0], unit="ms")
                        volume = float(record[1])
                        liq_data[date] = volume
                    elif isinstance(record, dict):
                        date = pd.Timestamp(record.get("time", 0), unit="ms")
                        volume = float(record.get("volume", 0))
                        liq_data[date] = volume
            
            return pd.Series(liq_data, name="LiquidationVolume")
            
        except Exception as e:
            logger.warning(f"Error fetching liquidation data from CoinGlass: {e}")
            return pd.Series(dtype=float)
    
    def _map_symbol_to_coinglass(self, symbol: str) -> str:
        """
        Map trading pair symbol to CoinGlass format.
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            
        Returns:
            CoinGlass symbol format
        """
        # CoinGlass might use different formats - try multiple variations
        symbol_upper = symbol.upper()
        
        # Common mappings - try different formats
        symbol_map = {
            "BTCUSDT": ["BTC-USDT", "BTCUSDT", "BTC/USDT"],
            "ETHUSDT": ["ETH-USDT", "ETHUSDT", "ETH/USDT"],
            "BNBUSDT": ["BNB-USDT", "BNBUSDT", "BNB/USDT"],
            "ADAUSDT": ["ADA-USDT", "ADAUSDT", "ADA/USDT"],
            "SOLUSDT": ["SOL-USDT", "SOLUSDT", "SOL/USDT"],
            "XRPUSDT": ["XRP-USDT", "XRPUSDT", "XRP/USDT"],
            "DOGEUSDT": ["DOGE-USDT", "DOGEUSDT", "DOGE/USDT"],
            "DOTUSDT": ["DOT-USDT", "DOTUSDT", "DOT/USDT"],
            "MATICUSDT": ["MATIC-USDT", "MATICUSDT", "MATIC/USDT"],
            "LTCUSDT": ["LTC-USDT", "LTCUSDT", "LTC/USDT"],
        }
        
        if symbol_upper in symbol_map:
            # Return BTC/USDT format (with slash) for CoinGlass API
            # The mapping returns BTC-USDT, but we'll convert to BTC/USDT in the request
            return symbol_map[symbol_upper][0]
        
        # Try to auto-convert: BTCUSDT -> BTC-USDT (will be converted to BTC/USDT in request)
        if symbol_upper.endswith("USDT"):
            base = symbol_upper[:-4]
            return f"{base}-USDT"
        elif symbol_upper.endswith("USD"):
            base = symbol_upper[:-3]
            return f"{base}-USD"
        elif len(symbol_upper) >= 6:
            # Try to split in the middle
            mid = len(symbol_upper) // 2
            return f"{symbol_upper[:mid]}-{symbol_upper[mid:]}"
        
        # Return as-is if we can't map it
        logger.warning(f"Could not map symbol {symbol} to CoinGlass format, using as-is")
        return symbol_upper
    
    def get_supported_coins(self, use_cache: bool = True) -> List[Dict[str, Any]]:
        """
        Get list of supported coins/tokens from CoinGlass API.
        
        Args:
            use_cache: Whether to use cached data if available
            
        Returns:
            List of dictionaries with symbol information:
            [
                {
                    "symbol": "BTC/USDT",
                    "name": "Bitcoin",
                    "exchange": "Binance" (if available)
                },
                ...
            ]
        """
        # Check cache first
        if use_cache:
            cached_symbols = _get_cached_supported_coins()
            if cached_symbols is not None:
                return cached_symbols
        
        # Try multiple endpoints to get supported coins
        endpoints_to_try = [
            "/api/spot/supported-coins",
            "/api/futures/supported-coins",
            "/api/spot/trading-market/supported-coins",
            "/api/futures/trading-market/supported-coins"
        ]
        
        for endpoint in endpoints_to_try:
            try:
                logger.info(f"Fetching supported coins from CoinGlass: {endpoint}")
                data = self._make_request(endpoint, {})
                
                if not data:
                    logger.warning(f"Empty response from {endpoint}")
                    continue
                
                # Parse response - CoinGlass may return different formats
                symbols_list = []
                
                # Try to parse as list of objects
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            # Extract symbol (could be "symbol", "pair", "trading_pair", etc.)
                            symbol = (
                                item.get("symbol") or 
                                item.get("pair") or 
                                item.get("trading_pair") or
                                item.get("coin") or
                                ""
                            )
                            
                            if symbol:
                                # Normalize symbol format to "BTC/USDT" (with slash)
                                normalized_symbol = symbol.replace("-", "/").replace("_", "/")
                                symbols_list.append({
                                    "symbol": normalized_symbol,
                                    "name": item.get("name") or item.get("coin_name") or normalized_symbol.split("/")[0] if "/" in normalized_symbol else normalized_symbol,
                                    "exchange": item.get("exchange") or item.get("exchange_name")
                                })
                
                # Try to parse as dict with data array
                elif isinstance(data, dict):
                    data_array = data.get("data") or data.get("symbols") or data.get("coins") or []
                    if isinstance(data_array, list):
                        for item in data_array:
                            if isinstance(item, dict):
                                symbol = (
                                    item.get("symbol") or 
                                    item.get("pair") or 
                                    item.get("trading_pair") or
                                    item.get("coin") or
                                    ""
                                )
                                
                                if symbol:
                                    # Normalize symbol format to "BTC/USDT" (with slash)
                                    normalized_symbol = symbol.replace("-", "/").replace("_", "/")
                                    symbols_list.append({
                                        "symbol": normalized_symbol,
                                        "name": item.get("name") or item.get("coin_name") or normalized_symbol.split("/")[0] if "/" in normalized_symbol else normalized_symbol,
                                        "exchange": item.get("exchange") or item.get("exchange_name")
                                    })
                    # If data is a dict of symbols
                    elif isinstance(data_array, dict):
                        for symbol, info in data_array.items():
                            # Normalize symbol format to "BTC/USDT" (with slash)
                            normalized_symbol = symbol.replace("-", "/").replace("_", "/")
                            if isinstance(info, dict):
                                symbols_list.append({
                                    "symbol": normalized_symbol,
                                    "name": info.get("name") or normalized_symbol.split("/")[0] if "/" in normalized_symbol else normalized_symbol,
                                    "exchange": info.get("exchange")
                                })
                            else:
                                symbols_list.append({
                                    "symbol": normalized_symbol,
                                    "name": normalized_symbol.split("/")[0] if "/" in normalized_symbol else normalized_symbol,
                                    "exchange": None
                                })
                
                if symbols_list:
                    # Remove duplicates based on symbol
                    seen = set()
                    unique_symbols = []
                    for item in symbols_list:
                        symbol = item["symbol"]
                        if symbol not in seen:
                            seen.add(symbol)
                            unique_symbols.append(item)
                    
                    # Sort by symbol for consistency
                    unique_symbols.sort(key=lambda x: x["symbol"])
                    
                    logger.info(f"✓ Fetched {len(unique_symbols)} supported coins from CoinGlass ({endpoint})")
                    
                    # Cache the result
                    if use_cache:
                        _store_cached_supported_coins(unique_symbols)
                    
                    return unique_symbols
                else:
                    logger.warning(f"No symbols found in response from {endpoint}")
                    continue
                    
            except Exception as e:
                logger.warning(f"Error fetching supported coins from {endpoint}: {e}")
                continue
        
        # If all endpoints failed, return empty list
        logger.error("Failed to fetch supported coins from all CoinGlass endpoints")
        return []
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Test CoinGlass API connection by making a simple request.
        
        Returns:
            Dictionary with test results including success status, endpoint used, and response details
        """
        result = {
            "success": False,
            "endpoint": None,
            "error": None,
            "response": None,
            "api_key_configured": bool(self.api_key),
            "base_url": self.base_url
        }
        
        try:
            # Try to get supported coins list (should be a simple endpoint)
            # Based on docs: /api/spot/supported-coins and /api/futures/supported-coins
            endpoints_to_try = [
                "/api/futures/trading-market/supported-coins",
                "/api/futures/supported-coins",
                "/api/spot/supported-coins",  # Note: "spot" not "spots"
                "/api/spot/trading-market/supported-coins"
            ]
            
            for endpoint in endpoints_to_try:
                try:
                    logger.info(f"Testing CoinGlass connection with endpoint: {endpoint}")
                    logger.info(f"Base URL: {self.base_url}, API Key configured: {bool(self.api_key)}")
                    data = self._make_request(endpoint, {})
                    result["success"] = True
                    result["endpoint"] = endpoint
                    result["response"] = str(data)[:500]  # First 500 chars of response
                    logger.info(f"✓ CoinGlass API connection test successful using endpoint: {endpoint}")
                    return result
                except requests.exceptions.Timeout as timeout_error:
                    error_msg = f"Timeout error for {endpoint}: {str(timeout_error)}"
                    logger.warning(f"✗ {error_msg}")
                    result["error"] = error_msg
                    continue
                except requests.exceptions.ConnectionError as conn_error:
                    error_msg = f"Connection error for {endpoint}: {str(conn_error)}"
                    logger.warning(f"✗ {error_msg}")
                    result["error"] = error_msg
                    continue
                except Exception as e:
                    error_msg = f"Error for {endpoint}: {str(e)}"
                    logger.warning(f"✗ {error_msg}")
                    result["error"] = error_msg
                    continue
            
            logger.error("CoinGlass API connection test failed for all endpoints")
            result["error"] = "All endpoints failed"
            return result
        except Exception as e:
            error_msg = f"Connection test exception: {str(e)}"
            logger.error(error_msg)
            result["error"] = error_msg
            return result


# Cache for supported coins (separate from price data cache)
# Structure: {cache_key: (symbols_list, timestamp)}
_supported_coins_cache: Dict[str, Tuple[List[Dict[str, Any]], float]] = {}
SUPPORTED_COINS_CACHE_TTL = 86400  # 24 hours


def _get_cached_supported_coins() -> Optional[List[Dict[str, Any]]]:
    """Get cached supported coins if available and not expired."""
    cache_key = "supported_coins"
    if cache_key not in _supported_coins_cache:
        return None
    
    symbols_list, cached_time = _supported_coins_cache[cache_key]
    age = time.time() - cached_time
    
    if age > SUPPORTED_COINS_CACHE_TTL:
        del _supported_coins_cache[cache_key]
        return None
    
    logger.debug(f"Using cached supported coins (age: {age:.0f}s)")
    return symbols_list


def _store_cached_supported_coins(symbols_list: List[Dict[str, Any]]):
    """Store supported coins in cache."""
    cache_key = "supported_coins"
    _supported_coins_cache[cache_key] = (symbols_list, time.time())
    logger.debug(f"Cached supported coins list ({len(symbols_list)} symbols)")


# Global client instance
_coinglass_client = None


def get_coinglass_client() -> CoinGlassClient:
    """Get or create global CoinGlass client instance."""
    global _coinglass_client
    if _coinglass_client is None:
        _coinglass_client = CoinGlassClient()
    return _coinglass_client

