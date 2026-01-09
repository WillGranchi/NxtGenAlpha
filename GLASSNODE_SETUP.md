# Glassnode API Setup Guide

## Overview

The Full Cycle Model requires on-chain Bitcoin data that cannot be calculated from price data alone. Glassnode API provides all the required fundamental indicators.

## What You Need

### Required: Glassnode API Key

**All 9 fundamental indicators require Glassnode API:**

1. **MVRV** (Market Value to Realized Value)
2. **Bitcoin Thermocap** (Cumulative Miner Revenue)
3. **NUPL** (Net Unrealized Profit/Loss)
4. **CVDD** (Cumulative Value Days Destroyed)
5. **SOPR** (Spent Output Profit Ratio)
6. **Puell Multiple**
7. **Reserve Risk**
8. **Bitcoin Days Destroyed**
9. **Exchange Net Position**

## Setup Steps

### 1. Sign Up for Glassnode

1. Go to https://glassnode.com
2. Create an account (free tier available)
3. Navigate to API settings
4. Generate an API key

### 2. Configure API Key

**Option A: Environment Variable (Recommended)**

Add to your `.env` file:
```
GLASSNODE_API_KEY=your_glassnode_api_key_here
```

**Option B: Docker Compose**

Add to `docker-compose.yml` backend environment section:
```yaml
- GLASSNODE_API_KEY=${GLASSNODE_API_KEY:-}
```

Then set in your shell:
```bash
export GLASSNODE_API_KEY=your_glassnode_api_key_here
docker compose up -d
```

**Option C: Railway/Production**

Add `GLASSNODE_API_KEY` to your Railway environment variables.

### 3. Verify Setup

After setting the API key, restart the backend:
```bash
docker compose restart backend
```

Check backend logs to see if Glassnode API is working:
- Look for "Using real [indicator] data from Glassnode" messages
- If you see "Using stub [indicator] data" warnings, the API key may be missing or invalid

## What CoinGlass Provides vs Glassnode

### CoinGlass (Already Configured) ✅
- **Price Data (OHLCV)**: Historical and real-time prices
- **Market Data**: Funding rates, open interest, long/short ratios, liquidations
- **Cannot Provide**: On-chain blockchain metrics

### Glassnode (Required for Full Cycle Model) ✅
- **On-Chain Metrics**: All fundamental indicators
- **UTXO Data**: For NUPL, SOPR calculations
- **Miner Data**: For Bitcoin Thermocap, Puell Multiple
- **Exchange Data**: For Exchange Net Position

## Pricing Tiers

### Free Tier
- Limited requests per month (check current limits at glassnode.com)
- Sufficient for basic usage and testing
- May have restrictions on historical data depth

### Paid Tiers
- More requests per month
- Access to more historical data
- Additional metrics and features

**Recommendation**: Start with free tier, upgrade if needed based on usage.

## Troubleshooting

### "Using stub data" warnings

**Cause**: Glassnode API key not set or invalid

**Solution**:
1. Verify `GLASSNODE_API_KEY` is set in environment
2. Check API key is valid at glassnode.com
3. Restart backend after setting key
4. Check backend logs for specific error messages

### Rate Limit Errors

**Cause**: Exceeded free tier request limits

**Solution**:
1. The client includes caching (24-hour TTL) to reduce API calls
2. Wait for rate limit window to reset
3. Consider upgrading to paid tier if needed frequently

### No Data Returned

**Cause**: API key doesn't have access to requested endpoint or date range

**Solution**:
1. Verify API key has access to the metric
2. Check if free tier has restrictions on historical data
3. Try a shorter date range
4. Check Glassnode API documentation for endpoint availability

## Implementation Details

- **Caching**: All Glassnode responses are cached for 24 hours
- **Rate Limiting**: Client respects Glassnode rate limits (100 requests/hour default)
- **Fallback**: If API fails, indicators fall back to stub data with warnings
- **Data Alignment**: Glassnode data is automatically aligned with price data dates

## Next Steps

1. Get your Glassnode API key
2. Set `GLASSNODE_API_KEY` environment variable
3. Restart the backend
4. Test Full Cycle Model - you should see "Using real [indicator] data from Glassnode" in logs
5. Verify indicators are no longer showing stub data warnings

