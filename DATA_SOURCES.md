# Free Cryptocurrency Data Sources

This application uses **100% free** cryptocurrency price data APIs. No API keys or paid subscriptions required.

## Current Data Sources

### 1. **Binance Public API** (Primary)
- **Cost**: Free
- **API Key Required**: No
- **Rate Limits**: 1200 requests/minute
- **Data Quality**: Full OHLCV (Open, High, Low, Close, Volume)
- **Historical Depth**: Up to 5 years (1825 days)
- **Endpoint**: `https://api.binance.com/api/v3/klines`
- **Advantages**:
  - Complete OHLCV data
  - High rate limits
  - Reliable and fast
  - Multiple trading pairs supported

### 2. **CoinGecko Free Tier** (Fallback)
- **Cost**: Free
- **API Key Required**: No (free tier)
- **Rate Limits**: 10-50 calls/minute (varies)
- **Data Quality**: OHLC (when using OHLC endpoint) or Close-only (market_chart endpoint)
- **Historical Depth**: Up to 365 days (1 year)
- **Endpoints**:
  - OHLC: `https://api.coingecko.com/api/v3/coins/bitcoin/ohlc`
  - Market Chart: `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart`
- **Advantages**:
  - Works when Binance is unavailable (geographic restrictions)
  - Good fallback option
  - Supports many cryptocurrencies

## Data Update Schedule

- **Automatic Updates**: Every 6 hours
- **Startup Refresh**: Data is refreshed when the application starts
- **Manual Refresh**: Available via `/api/data/refresh` endpoint
- **Freshness Check**: Data is considered fresh if updated within the last 6 hours

## How It Works

1. **Primary**: Attempts to fetch from Binance (best quality, full OHLCV)
2. **Fallback**: If Binance fails (e.g., geographic restrictions), falls back to CoinGecko
3. **Validation**: Ensures at least 1 year of data is available
4. **Caching**: Data is cached and stored locally in CSV files
5. **Auto-refresh**: Scheduled updates keep data current

## Manual Data Refresh

You can manually refresh data using:

```bash
# Via API endpoint
POST /api/data/refresh?symbol=BTCUSDT&force=true

# Or via frontend
Click the "Refresh Data" button in the Dashboard
```

## Data Storage

- **Location**: `backend/data/`
- **Format**: CSV files
- **Naming**: `{SYMBOL}_historical_data.csv` (e.g., `BTCUSDT_historical_data.csv`)
- **Backward Compatibility**: Old `Bitcoin Historical Data4.csv` file is still supported

## Notes

- Both APIs are completely free and don't require registration
- Binance is preferred due to better data quality (full OHLCV)
- CoinGecko is used as a fallback when Binance is unavailable
- Data updates are automatic and don't require manual intervention
- The system ensures at least 1 year of historical data is always available

