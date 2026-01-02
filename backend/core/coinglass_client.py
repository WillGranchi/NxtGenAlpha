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
# Base URL: According to docs, V4 uses open-api-v4.coinglass.com
# But some endpoints might use open-api.coinglass.com - try both
COINGLASS_BASE_URL = "https://open-api-v4.coinglass.com"
COINGLASS_BASE_URL_ALT = "https://open-api.coinglass.com"  # Alternative base URL
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
        
        # Try different possible endpoint paths based on CoinGlass API v4 documentation
        # According to docs:
        # - Futures > Trading Market > Price History (OHLC) -> /api/futures/trading-market/price-history-ohlc
        # - Spots > Trading market > Price OHLC History -> /api/spot/trading-market/price-ohlc-history
        # Note: "spot" (singular) not "spots" (plural) for spot endpoints
        endpoints_to_try = [
            "/api/futures/trading-market/price-history-ohlc",  # Futures price history (from docs)
            "/api/spot/trading-market/price-ohlc-history",  # Spot price history (from docs)
            "/api/futures/trading-market/price-ohlc-history",  # Alternative futures format
            "/api/futures/trading-market/pairs-markets",  # Pairs markets might have price data
        ]
        
        params = {
            "symbol": coinglass_symbol,
            "interval": interval
        }
        
        if start_date:
            params["startTime"] = int(start_date.timestamp() * 1000)
        if end_date:
            params["endTime"] = int(end_date.timestamp() * 1000)
        
        logger.info(f"Fetching CoinGlass price history: symbol={coinglass_symbol}, interval={interval}, start={start_date}, end={end_date}")
        
        # Try each endpoint until one works
        data = None
        last_error = None
        successful_endpoint = None
        
        for endpoint in endpoints_to_try:
            try:
                logger.info(f"Trying CoinGlass endpoint: {endpoint} with symbol={coinglass_symbol}")
                data = self._make_request(endpoint, params)
                logger.info(f"✓ Successfully fetched data from CoinGlass endpoint: {endpoint}")
                successful_endpoint = endpoint
                break
            except Exception as e:
                error_str = str(e)
                logger.warning(f"✗ Endpoint {endpoint} failed: {error_str}")
                last_error = e
                # If it's a 404, try next endpoint
                # If it's a 400, might be parameter issue - log it but continue
                if "404" in error_str or "not found" in error_str.lower():
                    logger.debug(f"Endpoint {endpoint} not found (404), trying next...")
                elif "400" in error_str:
                    logger.warning(f"Endpoint {endpoint} returned 400 (bad request) - might be parameter issue")
                continue
        
        if data is None:
            error_msg = f"All CoinGlass endpoints failed for {symbol} (coinglass_symbol={coinglass_symbol}). Last error: {last_error}"
            logger.error(error_msg)
            logger.error(f"Tried endpoints: {endpoints_to_try}")
            logger.error(f"Request params were: {params}")
            raise Exception(error_msg)
        
        logger.info(f"Using successful CoinGlass endpoint: {successful_endpoint}")
        
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
                        # Handle timestamp (might be in ms or seconds)
                        timestamp = record[0]
                        if isinstance(timestamp, (int, float)):
                            # If timestamp is less than 1e10, it's likely in seconds, convert to ms
                            if timestamp < 1e10:
                                timestamp = int(timestamp * 1000)
                            else:
                                timestamp = int(timestamp)
                            
                            df_data.append({
                                "Date": pd.Timestamp(timestamp, unit="ms"),
                                "Open": float(record[1]),
                                "High": float(record[2]),
                                "Low": float(record[3]),
                                "Close": float(record[4]),
                                "Volume": float(record[5]) if len(record) > 5 else 0.0
                            })
                        else:
                            logger.warning(f"Unexpected timestamp format in CoinGlass response: {timestamp}")
                    elif isinstance(record, dict):
                        # Handle dict format if CoinGlass returns objects
                        if "time" in record or "timestamp" in record or "date" in record:
                            ts_key = "time" if "time" in record else ("timestamp" if "timestamp" in record else "date")
                            timestamp = record[ts_key]
                            if isinstance(timestamp, (int, float)):
                                if timestamp < 1e10:
                                    timestamp = int(timestamp * 1000)
                                else:
                                    timestamp = int(timestamp)
                                
                                df_data.append({
                                    "Date": pd.Timestamp(timestamp, unit="ms"),
                                    "Open": float(record.get("open", record.get("o", 0))),
                                    "High": float(record.get("high", record.get("h", 0))),
                                    "Low": float(record.get("low", record.get("l", 0))),
                                    "Close": float(record.get("close", record.get("c", 0))),
                                    "Volume": float(record.get("volume", record.get("v", 0)))
                                })
                except Exception as e:
                    logger.warning(f"Error parsing CoinGlass record: {record}, error: {e}")
                    continue
            
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
            # Return first format (most common)
            return symbol_map[symbol_upper][0]
        
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
    
    def test_connection(self) -> bool:
        """
        Test CoinGlass API connection by making a simple request.
        
        Returns:
            True if connection successful, False otherwise
        """
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
                    logger.debug(f"Testing CoinGlass connection with endpoint: {endpoint}")
                    data = self._make_request(endpoint, {})
                    logger.info(f"CoinGlass API connection test successful using endpoint: {endpoint}")
                    logger.debug(f"Test response: {str(data)[:200]}")
                    return True
                except Exception as e:
                    logger.debug(f"Endpoint {endpoint} failed: {e}")
                    continue
            
            logger.error("CoinGlass API connection test failed for all endpoints")
            return False
        except Exception as e:
            logger.error(f"CoinGlass API connection test failed: {e}")
            return False


# Global client instance
_coinglass_client = None


def get_coinglass_client() -> CoinGlassClient:
    """Get or create global CoinGlass client instance."""
    global _coinglass_client
    if _coinglass_client is None:
        _coinglass_client = CoinGlassClient()
    return _coinglass_client

