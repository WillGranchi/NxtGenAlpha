"""
Glassnode API Client Module

This module provides a client for interacting with Glassnode API,
including rate limiting, authentication, caching, and error handling.
"""

import os
import time
import logging
import requests
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import deque
import pandas as pd
import numpy as np
import hashlib
import json

logger = logging.getLogger(__name__)

# Glassnode API Configuration
GLASSNODE_BASE_URL = "https://api.glassnode.com"
GLASSNODE_API_KEY = os.getenv("GLASSNODE_API_KEY", "")

# Rate limiting: Free tier typically has limits (check current limits)
# Conservative defaults: 100 requests/hour
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds


class RateLimiter:
    """Token bucket rate limiter for Glassnode API requests."""
    
    def __init__(self, max_requests: int = RATE_LIMIT_REQUESTS, window_seconds: int = RATE_LIMIT_WINDOW):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_times = deque()
        self.lock = False
    
    def wait_if_needed(self):
        """Wait if rate limit would be exceeded."""
        now = time.time()
        
        # Remove requests outside the time window
        while self.request_times and self.request_times[0] < now - self.window_seconds:
            self.request_times.popleft()
        
        # If we're at the limit, wait until the oldest request expires
        if len(self.request_times) >= self.max_requests:
            wait_time = self.window_seconds - (now - self.request_times[0]) + 0.1
            if wait_time > 0:
                logger.warning(f"Rate limit reached ({self.max_requests} requests/hour). Waiting {wait_time:.2f} seconds...")
                time.sleep(wait_time)
                # Clean up again after waiting
                now = time.time()
                while self.request_times and self.request_times[0] < now - self.window_seconds:
                    self.request_times.popleft()
        
        # Record this request
        self.request_times.append(time.time())
    
    def get_remaining_requests(self) -> int:
        """Get number of remaining requests in current window."""
        now = time.time()
        while self.request_times and self.request_times[0] < now - self.window_seconds:
            self.request_times.popleft()
        return max(0, self.max_requests - len(self.request_times))


# Global rate limiter instance
_rate_limiter = RateLimiter()

# In-memory cache for Glassnode API responses
# Structure: {cache_key: (dataframe, timestamp)}
# TTL: 24 hours for all data (on-chain data doesn't change frequently)
_glassnode_cache: Dict[str, Tuple[pd.DataFrame, float]] = {}
CACHE_TTL = 86400  # 24 hours


def _generate_cache_key(
    metric: str,
    asset: str,
    start_date: Optional[datetime],
    end_date: Optional[datetime],
    interval: str = "24h"
) -> str:
    """
    Generate a cache key for Glassnode API requests.
    
    Args:
        metric: Metric endpoint name
        asset: Asset symbol (e.g., "BTC")
        start_date: Start date
        end_date: End date
        interval: Time interval
        
    Returns:
        MD5 hash string for cache key
    """
    key_string = f"{metric}_{asset}_{interval}"
    if start_date:
        key_string += f"_{start_date.strftime('%Y-%m-%d')}"
    if end_date:
        key_string += f"_{end_date.strftime('%Y-%m-%d')}"
    
    return hashlib.md5(key_string.encode()).hexdigest()


def _get_cached_response(cache_key: str) -> Optional[pd.DataFrame]:
    """
    Get cached response if available and not expired.
    
    Args:
        cache_key: Cache key
        
    Returns:
        Cached DataFrame if available and fresh, None otherwise
    """
    if cache_key in _glassnode_cache:
        df, timestamp = _glassnode_cache[cache_key]
        age = time.time() - timestamp
        
        if age < CACHE_TTL:
            logger.debug(f"Using cached Glassnode data for key {cache_key[:8]}... (age: {age:.0f}s)")
            return df.copy()
        else:
            # Expired, remove from cache
            del _glassnode_cache[cache_key]
            logger.debug(f"Cache expired for key {cache_key[:8]}...")
    
    return None


def _store_cached_response(cache_key: str, df: pd.DataFrame):
    """
    Store response in cache.
    
    Args:
        cache_key: Cache key
        df: DataFrame to cache
    """
    _glassnode_cache[cache_key] = (df.copy(), time.time())
    logger.debug(f"Cached Glassnode data for key {cache_key[:8]}...")


def _clean_expired_cache():
    """Remove expired entries from cache."""
    now = time.time()
    expired_keys = [
        key for key, (_, timestamp) in _glassnode_cache.items()
        if now - timestamp >= CACHE_TTL
    ]
    for key in expired_keys:
        del _glassnode_cache[key]
    if expired_keys:
        logger.debug(f"Cleaned {len(expired_keys)} expired cache entries")


class GlassnodeClient:
    """Client for Glassnode API."""
    
    def __init__(self, api_key: Optional[str] = None, base_url: str = GLASSNODE_BASE_URL):
        """
        Initialize Glassnode API client.
        
        Args:
            api_key: Glassnode API key (defaults to GLASSNODE_API_KEY env var)
            base_url: Base URL for Glassnode API
        """
        self.api_key = api_key or GLASSNODE_API_KEY
        self.base_url = base_url
        self.session = requests.Session()
        
        if not self.api_key:
            logger.warning("No Glassnode API key provided. Set GLASSNODE_API_KEY environment variable.")
    
    def _make_request(
        self,
        endpoint: str,
        params: Dict[str, Any]
    ) -> Any:
        """
        Make a request to Glassnode API with rate limiting and error handling.
        
        Args:
            endpoint: API endpoint (e.g., "/v1/metrics/indicators/mvrv")
            params: Request parameters
            
        Returns:
            Response data (list of dicts)
            
        Raises:
            Exception: If request fails
        """
        if not self.api_key:
            raise ValueError("Glassnode API key is required. Set GLASSNODE_API_KEY environment variable.")
        
        # Rate limiting
        _rate_limiter.wait_if_needed()
        
        # Clean expired cache periodically
        if len(_glassnode_cache) > 100:
            _clean_expired_cache()
        
        # Add API key to params
        params = params.copy()
        params['api_key'] = self.api_key
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            logger.debug(f"Glassnode API request: {endpoint} with params: {dict((k, v) for k, v in params.items() if k != 'api_key')}")
            
            response = self.session.get(
                url,
                params=params,
                timeout=(5, 30)  # 5s connect, 30s read
            )
            
            response.raise_for_status()
            
            data = response.json()
            
            # Glassnode returns empty list if no data
            if not data:
                logger.warning(f"Glassnode API returned empty data for {endpoint}")
                return []
            
            return data
            
        except requests.exceptions.Timeout as timeout_error:
            error_msg = f"Timeout error for {endpoint}: {str(timeout_error)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except requests.exceptions.ConnectionError as conn_error:
            error_msg = f"Connection error for {endpoint}: {str(conn_error)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except requests.exceptions.HTTPError as http_error:
            status_code = http_error.response.status_code if http_error.response else None
            error_msg = f"HTTP {status_code} error for {endpoint}: {str(http_error)}"
            
            if status_code == 401:
                error_msg += " (Invalid API key)"
            elif status_code == 403:
                error_msg += " (API key doesn't have access to this endpoint)"
            elif status_code == 429:
                error_msg += " (Rate limit exceeded)"
            
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Error for {endpoint}: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def get_metric(
        self,
        metric: str,
        asset: str = "BTC",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        interval: str = "24h",
        use_cache: bool = True
    ) -> pd.Series:
        """
        Fetch a metric from Glassnode API.
        
        Args:
            metric: Metric endpoint (e.g., "mvrv", "nupl", "cvdd")
            asset: Asset symbol (default: "BTC")
            start_date: Start date for data
            end_date: End date for data (defaults to today)
            interval: Time interval ("24h", "1h", "1w", etc.)
            use_cache: Whether to use cached data if available
            
        Returns:
            Pandas Series with metric values indexed by date
        """
        if not self.api_key:
            logger.warning("No Glassnode API key - cannot fetch metric")
            return pd.Series(dtype=float)
        
        # Default end date to today
        if end_date is None:
            end_date = datetime.now()
        
        # Generate cache key
        cache_key = _generate_cache_key(metric, asset, start_date, end_date, interval)
        
        # Check cache
        if use_cache:
            cached_df = _get_cached_response(cache_key)
            if cached_df is not None:
                return cached_df.iloc[:, 0] if len(cached_df.columns) > 0 else pd.Series(dtype=float)
        
        # Build endpoint
        endpoint = f"/v1/metrics/{metric}"
        
        # Build parameters
        params = {
            'a': asset,  # Asset
            'i': interval,  # Interval
        }
        
        if start_date:
            params['s'] = int(start_date.timestamp())
        if end_date:
            params['u'] = int(end_date.timestamp())
        
        try:
            # Make request
            data = self._make_request(endpoint, params)
            
            if not data:
                logger.warning(f"No data returned from Glassnode for {metric}")
                return pd.Series(dtype=float)
            
            # Parse response
            # Glassnode returns list of dicts: [{"t": timestamp, "v": value}, ...]
            df_data = []
            for record in data:
                if 't' in record and 'v' in record:
                    timestamp = datetime.fromtimestamp(record['t'])
                    value = record['v']
                    df_data.append({
                        'Date': timestamp,
                        'Value': value
                    })
            
            if not df_data:
                logger.warning(f"No valid data in Glassnode response for {metric}")
                return pd.Series(dtype=float)
            
            df = pd.DataFrame(df_data)
            df.set_index('Date', inplace=True)
            df.sort_index(inplace=True)
            
            # Store in cache
            if use_cache:
                _store_cached_response(cache_key, df)
            
            logger.info(f"✓ Fetched {metric} from Glassnode: {len(df)} data points from {df.index.min()} to {df.index.max()}")
            
            return df['Value']
            
        except Exception as e:
            logger.error(f"Error fetching {metric} from Glassnode: {e}")
            return pd.Series(dtype=float)
    
    def get_mvrv(
        self,
        asset: str = "BTC",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        use_cache: bool = True
    ) -> pd.Series:
        """Fetch MVRV (Market Value to Realized Value) ratio."""
        return self.get_metric("indicators/mvrv", asset, start_date, end_date, use_cache=use_cache)
    
    def get_nupl(
        self,
        asset: str = "BTC",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        use_cache: bool = True
    ) -> pd.Series:
        """Fetch NUPL (Net Unrealized Profit/Loss)."""
        return self.get_metric("indicators/nupl", asset, start_date, end_date, use_cache=use_cache)
    
    def get_cvdd(
        self,
        asset: str = "BTC",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        use_cache: bool = True
    ) -> pd.Series:
        """Fetch CVDD (Cumulative Value Days Destroyed)."""
        return self.get_metric("indicators/cvdd", asset, start_date, end_date, use_cache=use_cache)
    
    def get_sopr(
        self,
        asset: str = "BTC",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        use_cache: bool = True
    ) -> pd.Series:
        """Fetch SOPR (Spent Output Profit Ratio)."""
        return self.get_metric("indicators/sopr", asset, start_date, end_date, use_cache=use_cache)
    
    def get_thermocap(
        self,
        asset: str = "BTC",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        use_cache: bool = True
    ) -> pd.Series:
        """Fetch Bitcoin Thermocap (Cumulative Miner Revenue)."""
        return self.get_metric("mining/thermocap", asset, start_date, end_date, use_cache=use_cache)
    
    def get_puell_multiple(
        self,
        asset: str = "BTC",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        use_cache: bool = True
    ) -> pd.Series:
        """Fetch Puell Multiple."""
        return self.get_metric("indicators/puell_multiple", asset, start_date, end_date, use_cache=use_cache)
    
    def get_reserve_risk(
        self,
        asset: str = "BTC",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        use_cache: bool = True
    ) -> pd.Series:
        """Fetch Reserve Risk."""
        return self.get_metric("indicators/reserve_risk", asset, start_date, end_date, use_cache=use_cache)
    
    def get_days_destroyed(
        self,
        asset: str = "BTC",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        use_cache: bool = True
    ) -> pd.Series:
        """Fetch Bitcoin Days Destroyed (cumulative)."""
        return self.get_metric("transactions/days_destroyed_cumulative", asset, start_date, end_date, use_cache=use_cache)
    
    def get_exchange_netflows(
        self,
        asset: str = "BTC",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        use_cache: bool = True
    ) -> pd.Series:
        """Fetch Exchange Net Position Change (netflows)."""
        return self.get_metric("exchanges/netflows", asset, start_date, end_date, use_cache=use_cache)
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Test Glassnode API connection.
        
        Returns:
            Dictionary with test results
        """
        result = {
            "success": False,
            "endpoint": None,
            "error": None
        }
        
        if not self.api_key:
            result["error"] = "No API key provided"
            return result
        
        try:
            # Try to fetch a simple metric (MVRV) with a recent date range
            test_end = datetime.now()
            test_start = test_end - timedelta(days=30)
            
            logger.info("Testing Glassnode connection...")
            data = self.get_mvrv("BTC", test_start, test_end, use_cache=False)
            
            if len(data) > 0:
                result["success"] = True
                result["endpoint"] = "/v1/metrics/indicators/mvrv"
                result["data_points"] = len(data)
                logger.info(f"✓ Glassnode API connection test successful")
            else:
                result["error"] = "API responded but returned no data"
                
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Glassnode API connection test failed: {e}")
        
        return result


# Global client instance
_glassnode_client: Optional[GlassnodeClient] = None


def get_glassnode_client() -> GlassnodeClient:
    """
    Get or create global Glassnode client instance.
    
    Returns:
        GlassnodeClient instance
    """
    global _glassnode_client
    if _glassnode_client is None:
        _glassnode_client = GlassnodeClient()
    return _glassnode_client

