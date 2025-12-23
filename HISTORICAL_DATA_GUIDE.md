# How to Fetch Historical BTC Data from 2016

This guide explains how to fetch Bitcoin historical price data from 2016 and beyond using the free CoinGecko API.

## Quick Start

### Via API Endpoint

```bash
# Fetch BTC data from 2016-01-01 onwards
POST /api/data/refresh?symbol=BTCUSDT&force=true&start_date=2016-01-01
```

### Via Python Code

```python
from backend.core.data_loader import update_crypto_data
from datetime import datetime

# Fetch BTC data from 2016-01-01
start_date = datetime(2016, 1, 1)
df = update_crypto_data(symbol="BTCUSDT", force=True, start_date=start_date)
```

## How It Works

1. **Binance First**: The system tries Binance first (best quality, full OHLCV data)
   - Binance launched in 2017, so data from 2016 won't be available
   - Falls back to CoinGecko automatically

2. **CoinGecko Historical**: When `start_date` is provided and it's more than 365 days ago:
   - Uses CoinGecko's `/coins/bitcoin/history` endpoint
   - Fetches weekly data points (every 7 days) to optimize API usage
   - Interpolates missing days using forward fill
   - For 8 years (2016-2024), this requires ~416 API calls instead of ~2,920

## Performance

- **Fetch Time**: ~5-10 minutes for 8 years of data (2016-2024)
- **API Calls**: ~416 calls (weekly sampling)
- **Rate Limits**: CoinGecko free tier allows 10-50 calls/minute
- **Optimization**: Uses 200ms delay between requests to stay within limits

## Data Quality

- **OHLC Data**: Full Open, High, Low, Close prices
- **Volume**: Available when provided by CoinGecko
- **Granularity**: Weekly samples interpolated to daily data
- **Coverage**: Data from 2016-01-01 onwards

## Example Usage

### Fetch from 2016

```python
from backend.core.data_loader import update_crypto_data
from datetime import datetime

# Fetch from 2016-01-01
df = update_crypto_data(
    symbol="BTCUSDT",
    force=True,
    start_date=datetime(2016, 1, 1)
)

print(f"Data range: {df.index.min()} to {df.index.max()}")
print(f"Total days: {len(df)}")
print(f"Latest price: ${df['Close'].iloc[-1]:.2f}")
```

### Fetch from Custom Date

```python
# Fetch from 2017-06-01
df = update_crypto_data(
    symbol="BTCUSDT",
    force=True,
    start_date=datetime(2017, 6, 1)
)
```

## Notes

- **Free**: Uses CoinGecko's free tier (no API key required)
- **Rate Limits**: Respects CoinGecko's rate limits automatically
- **Caching**: Data is saved to CSV and cached for future use
- **Updates**: Use `force=True` to refresh existing data

## Troubleshooting

### Slow Fetching
- This is normal for historical data (5-10 minutes for 8 years)
- Progress is logged every 50 API calls

### Missing Data
- Some dates may not have data available
- Missing days are interpolated using forward fill
- Check logs for any API errors

### Rate Limit Errors
- The system automatically handles rate limits
- If you see rate limit errors, wait a few minutes and retry

