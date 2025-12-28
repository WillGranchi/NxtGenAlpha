# On-Chain Data Sources for Full Cycle Model

## Overview

Several indicators in the Full Cycle Model require on-chain Bitcoin data that cannot be calculated from price data alone. This document outlines the data requirements and recommended API sources.

## Indicators Requiring On-Chain Data

### Fundamental Indicators

1. **MVRV (Market Value to Realized Value)**
   - **Data Required:** Market capitalization and realized capitalization
   - **Current Status:** Using stub data
   - **API Endpoint:** Glassnode `/v1/metrics/indicators/mvrv`

2. **Bitcoin Thermocap**
   - **Data Required:** Cumulative miner revenue
   - **Current Status:** Using stub data
   - **API Endpoint:** Glassnode `/v1/metrics/mining/thermocap`

3. **NUPL (Net Unrealized Profit/Loss)**
   - **Data Required:** Unrealized profit/loss data from UTXO set
   - **Current Status:** Using stub data
   - **API Endpoint:** Glassnode `/v1/metrics/indicators/nupl`

4. **CVDD (Cumulative Value Days Destroyed)**
   - **Data Required:** Coin Days Destroyed and market value data
   - **Current Status:** Using stub data
   - **API Endpoint:** Glassnode `/v1/metrics/indicators/cvdd`

5. **SOPR (Spent Output Profit Ratio)**
   - **Data Required:** Profitability of spent outputs from UTXO data
   - **Current Status:** Using stub data
   - **API Endpoint:** Glassnode `/v1/metrics/indicators/sopr`

## Recommended API: Glassnode

### Why Glassnode?

- **Comprehensive Coverage:** Provides all required on-chain metrics in one API
- **Reliable Data:** Professional-grade data quality
- **Good Documentation:** Well-documented API with clear endpoints
- **Free Tier Available:** Limited but sufficient for basic usage
- **Historical Data:** Extensive historical coverage

### Glassnode Coverage Status

**✅ Confirmed Available:**
- **MVRV** - `/v1/metrics/indicators/mvrv` ✅
- **NUPL** - `/v1/metrics/indicators/nupl` ✅
- **CVDD** - `/v1/metrics/indicators/cvdd` ✅
- **SOPR** - `/v1/metrics/indicators/sopr` ✅

**⚠️ Needs Verification:**
- **Bitcoin Thermocap** - Glassnode has mining metrics (`/v1/metrics/mining/*`), but the exact thermocap endpoint needs verification. Alternative: Calculate from miner revenue data if available.

**Summary:** Glassnode can provide **4 out of 5** indicators directly. Bitcoin Thermocap may require using miner revenue data to calculate, or may be available under a different endpoint name.

### API Documentation

- **Base URL:** `https://api.glassnode.com`
- **Documentation:** https://docs.glassnode.com/basic-api/endpoints/indicators
- **Authentication:** API key required (sign up at https://glassnode.com)

### Getting Started

1. **Sign Up:** Create an account at https://glassnode.com
2. **Get API Key:** Navigate to API settings and generate an API key
3. **Set Environment Variable:** Add `GLASSNODE_API_KEY` to your `.env` file
4. **Rate Limits:** Free tier has rate limits (check current limits in documentation)

### Example Integration

```python
import requests
import pandas as pd
from datetime import datetime

def fetch_glassnode_metric(metric: str, api_key: str, start_date: datetime, end_date: datetime):
    """
    Fetch a metric from Glassnode API.
    
    Args:
        metric: Metric endpoint (e.g., 'mvrv', 'thermocap')
        api_key: Glassnode API key
        start_date: Start date for data
        end_date: End date for data
        
    Returns:
        DataFrame with metric data
    """
    url = f"https://api.glassnode.com/v1/metrics/indicators/{metric}"
    
    params = {
        'a': 'BTC',  # Asset: Bitcoin
        'i': '24h',  # Interval: daily
        's': int(start_date.timestamp()),
        'u': int(end_date.timestamp()),
        'api_key': api_key
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    
    data = response.json()
    df = pd.DataFrame(data)
    df['t'] = pd.to_datetime(df['t'], unit='s')
    df.set_index('t', inplace=True)
    
    return df
```

## Alternative Data Sources

### Blockchain.com API
- **URL:** https://www.blockchain.com/api
- **Coverage:** Some on-chain metrics available
- **Limitations:** More limited than Glassnode

### Messari API
- **URL:** https://messari.io/api
- **Coverage:** Comprehensive crypto data including on-chain metrics
- **Pricing:** Free tier available with limitations

### CoinMetrics API
- **URL:** https://docs.coinmetrics.io/
- **Coverage:** Professional-grade on-chain data
- **Pricing:** Paid service, higher cost

## Implementation Notes

### Current Implementation

The following files contain stub implementations that should be replaced with real API calls:

- `backend/core/fundamental_indicators.py`
  - `calculate_mvrv()` - Line 25
  - `calculate_bitcoin_thermocap()` - Line 25 (new)
  - `calculate_nupl()` - Line 58
  - `calculate_cvdd()` - Line 89
  - `calculate_sopr()` - Line 151

- `backend/core/fullcycle_indicators.py`
  - `calculate_mvrv_zscore()` - Uses `calculate_mvrv()`
  - `calculate_bitcoin_thermocap_zscore()` - Uses `calculate_bitcoin_thermocap()`
  - `calculate_nupl_zscore()` - Uses `calculate_nupl()`
  - `calculate_cvdd_zscore()` - Uses `calculate_cvdd()`
  - `calculate_sopr_zscore()` - Uses `calculate_sopr()`

### Integration Steps

1. **Create Glassnode Client Module**
   - Create `backend/core/glassnode_client.py`
   - Implement functions to fetch each metric
   - Add caching to reduce API calls
   - Handle rate limiting and errors gracefully

2. **Update Fundamental Indicators**
   - Replace stub functions with Glassnode API calls
   - Maintain same function signatures
   - Add error handling for API failures
   - Fall back to stub data if API unavailable (with warning)

3. **Environment Configuration**
   - Add `GLASSNODE_API_KEY` to `.env.example`
   - Update `docker-compose.yml` if needed
   - Document in README

4. **Testing**
   - Test with free tier API key
   - Verify data quality and date ranges
   - Test error handling and fallbacks

## Data Quality Considerations

- **Historical Coverage:** Ensure API provides sufficient historical data (ideally back to 2010-2015)
- **Data Frequency:** Daily data is sufficient for Full Cycle Model
- **Data Validation:** Validate fetched data for NaN, Inf, and reasonable ranges
- **Caching:** Cache API responses to reduce calls and improve performance
- **Error Handling:** Gracefully handle API failures, rate limits, and network errors

## Cost Considerations

- **Glassnode Free Tier:** Limited requests per month
- **Paid Tiers:** More requests and historical data
- **Caching Strategy:** Implement aggressive caching to minimize API calls
- **Batch Requests:** Fetch multiple metrics in single requests when possible

## Status

- ✅ Indicator structure in place
- ✅ Stub implementations with warnings
- ⏳ Glassnode API integration (pending)
- ⏳ Data validation and error handling (pending)
- ⏳ Caching implementation (pending)

