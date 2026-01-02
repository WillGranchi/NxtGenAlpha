"""
CoinGlass API V4 Client Module

This module provides a client for interacting with CoinGlass API V4,
including rate limiting, authentication, and error handling.
"""

import os
import time
import logging
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from collections import deque
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# CoinGlass API Configuration
COINGLASS_BASE_URL = "https://open-api-v4.coinglass.com"
COINGLASS_API_KEY = os.getenv("COINGLASS_API_KEY", "0e38a988ab2641aab8b4dd265eef9f62")

# Rate limiting: Hobbyist tier = 30 requests/minute
RATE_LIMIT_REQUESTS = 30
RATE_LIMIT_WINDOW = 60  # seconds


class RateLimiter:
    """Token bucket rate limiter for CoinGlass API requests."""
    
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
                logger.warning(f"Rate limit reached ({self.max_requests} requests/minute). Waiting {wait_time:.2f} seconds...")
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
                
                # Make request
                response = self.session.get(url, params=params, timeout=30)
                
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
                        error_msg += f": {error_data.get('message', 'Unknown error')}"
                    except:
                        error_msg += f": {response.text[:200]}"
                    
                    if attempt < max_retries:
                        wait_time = retry_delay * (2 ** attempt)
                        logger.warning(f"{error_msg}. Retrying in {wait_time:.2f} seconds...")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise Exception(error_msg)
                
                # Success
                data = response.json()
                remaining = _rate_limiter.get_remaining_requests()
                if remaining < 5:
                    logger.warning(f"CoinGlass API: Only {remaining} requests remaining in current window")
                
                return data
                
            except requests.exceptions.RequestException as e:
                if attempt < max_retries:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"Request failed: {e}. Retrying in {wait_time:.2f} seconds...")
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
        interval: str = "1d"
    ) -> pd.DataFrame:
        """
        Fetch price history (OHLCV) from CoinGlass.
        
        Args:
            symbol: Trading pair symbol (e.g., "BTCUSDT")
            start_date: Start date for historical data
            end_date: End date for historical data
            interval: Time interval (1d, 1h, etc.)
            
        Returns:
            DataFrame with OHLCV data
        """
        # Map symbol to CoinGlass format
        coinglass_symbol = self._map_symbol_to_coinglass(symbol)
        
        endpoint = "/api/futures/trading-market/price-history-ohlc"
        params = {
            "symbol": coinglass_symbol,
            "interval": interval
        }
        
        if start_date:
            params["startTime"] = int(start_date.timestamp() * 1000)
        if end_date:
            params["endTime"] = int(end_date.timestamp() * 1000)
        
        try:
            data = self._make_request(endpoint, params)
            
            # Parse response
            if not data or "data" not in data:
                logger.warning(f"No price data returned from CoinGlass for {symbol}")
                return pd.DataFrame()
            
            records = data.get("data", [])
            if not records:
                logger.warning(f"Empty price data from CoinGlass for {symbol}")
                return pd.DataFrame()
            
            # Convert to DataFrame
            df_data = []
            for record in records:
                # CoinGlass OHLC format: [timestamp, open, high, low, close, volume]
                if isinstance(record, list) and len(record) >= 6:
                    df_data.append({
                        "Date": pd.Timestamp(record[0], unit="ms"),
                        "Open": float(record[1]),
                        "High": float(record[2]),
                        "Low": float(record[3]),
                        "Close": float(record[4]),
                        "Volume": float(record[5]) if len(record) > 5 else 0.0
                    })
            
            if not df_data:
                return pd.DataFrame()
            
            df = pd.DataFrame(df_data)
            df.set_index("Date", inplace=True)
            df.sort_index(inplace=True)
            
            logger.info(f"Fetched {len(df)} price records from CoinGlass for {symbol}")
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
        # CoinGlass typically uses formats like "BTC-USDT" or "BTC/USDT"
        # For now, try to convert BTCUSDT -> BTC-USDT
        symbol_upper = symbol.upper()
        
        # Common mappings
        symbol_map = {
            "BTCUSDT": "BTC-USDT",
            "ETHUSDT": "ETH-USDT",
            "BNBUSDT": "BNB-USDT",
            "ADAUSDT": "ADA-USDT",
            "SOLUSDT": "SOL-USDT",
            "XRPUSDT": "XRP-USDT",
            "DOGEUSDT": "DOGE-USDT",
            "DOTUSDT": "DOT-USDT",
            "MATICUSDT": "MATIC-USDT",
            "LTCUSDT": "LTC-USDT",
        }
        
        if symbol_upper in symbol_map:
            return symbol_map[symbol_upper]
        
        # Try to auto-convert: BTCUSDT -> BTC-USDT
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


# Global client instance
_coinglass_client = None


def get_coinglass_client() -> CoinGlassClient:
    """Get or create global CoinGlass client instance."""
    global _coinglass_client
    if _coinglass_client is None:
        _coinglass_client = CoinGlassClient()
    return _coinglass_client

