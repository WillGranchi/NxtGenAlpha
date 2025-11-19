"""
Data loader module for Bitcoin trading strategy backtesting.

This module handles loading and preprocessing of historical Bitcoin price data
from CSV files and fetching live data from CoinGecko API, ensuring proper 
datetime indexing and data cleaning.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, Tuple
from functools import lru_cache
import logging
import requests
import os
import json
from pathlib import Path


# Global variable to track last update time
_last_update_time: Optional[datetime] = None

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


def save_data_to_csv(df: pd.DataFrame, file_path: Optional[str] = None) -> str:
    """
    Save DataFrame to CSV file.
    
    Args:
        df (pd.DataFrame): DataFrame to save
        file_path (str, optional): Path to save file. Defaults to data directory.
        
    Returns:
        str: Path to saved file
    """
    if file_path is None:
        import os
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        os.makedirs(data_dir, exist_ok=True)
        file_path = os.path.join(data_dir, 'Bitcoin Historical Data4.csv')
    
    # Reset index to save Date as column
    df_save = df.reset_index()
    df_save.to_csv(file_path, index=False)
    
    logger = logging.getLogger(__name__)
    logger.info(f"Data saved to {file_path}")
    
    return file_path


def update_btc_data(force: bool = False) -> pd.DataFrame:
    """
    Update Bitcoin data from CoinGecko API and save to CSV.
    Checks if data is fresh (updated within last 24 hours) before fetching.
    
    Args:
        force (bool): Force update even if data is fresh
        
    Returns:
        pd.DataFrame: Updated DataFrame
    """
    global _last_update_time
    
    logger = logging.getLogger(__name__)
    
    # Check if we need to update (once per day)
    if not force and _last_update_time:
        time_since_update = datetime.now() - _last_update_time
        if time_since_update < timedelta(hours=23):  # Update if older than 23 hours
            logger.info("Data is fresh, skipping update")
            return load_btc_data()
    
    try:
        # Fetch fresh data
        df = fetch_btc_data_from_coingecko(days=365)
        
        # Save to CSV
        save_data_to_csv(df)
        
        # Update cache
        load_btc_data.cache_clear()
        _last_update_time = datetime.now()
        
        logger.info("Bitcoin data updated successfully")
        return df
        
    except Exception as e:
        logger.error(f"Error updating data: {e}")
        # Fall back to existing CSV if available
        try:
            return load_btc_data()
        except:
            raise Exception(f"Failed to update data and no local data available: {str(e)}")


def get_last_update_time() -> Optional[datetime]:
    """Get the last time data was updated."""
    return _last_update_time


@lru_cache(maxsize=1)
def load_btc_data(file_path: Optional[str] = None) -> pd.DataFrame:
    """
    Load Bitcoin historical data from CSV file with caching.
    
    Args:
        file_path (str, optional): Path to the CSV file containing Bitcoin data.
                                 Defaults to backend/data/Bitcoin Historical Data4.csv
        
    Returns:
        pd.DataFrame: Cleaned DataFrame with datetime index and numeric columns
        
    Raises:
        FileNotFoundError: If the specified file doesn't exist
        ValueError: If the data format is invalid
    """
    if file_path is None:
        import os
        file_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'Bitcoin Historical Data4.csv')
    try:
        # Load the CSV file
        df = pd.read_csv(file_path)
        
        # Log basic info about the loaded data
        logger = logging.getLogger(__name__)
        logger.info(f"Loaded {len(df)} rows of data")
        logger.debug(f"Columns: {list(df.columns)}")
        
        # Clean and preprocess the data
        df = _clean_data(df)
        
        return df
        
    except FileNotFoundError:
        raise FileNotFoundError(f"Data file not found: {file_path}")
    except Exception as e:
        raise ValueError(f"Error loading data: {str(e)}")


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
    numeric_columns = ['Price', 'Open', 'High', 'Low']
    
    for col in numeric_columns:
        if col in df_clean.columns:
            # Remove commas and convert to float
            df_clean[col] = df_clean[col].astype(str).str.replace(',', '').astype(float)
    
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
    
    # Ensure we have the required columns
    required_columns = ['Open', 'High', 'Low', 'Price']
    missing_columns = [col for col in required_columns if col not in df_clean.columns]
    
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    # Rename Price to Close for consistency
    if 'Price' in df_clean.columns:
        df_clean.rename(columns={'Price': 'Close'}, inplace=True)
    
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
