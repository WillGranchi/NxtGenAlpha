# Fundamental Indicators Data Source Summary

## ✅ All 9 Full Cycle Model Indicators - Glassnode API Only

**All indicators now require Glassnode API key. No mock data fallbacks.**

1. **MVRV** (Market Value to Realized Value)
   - Source: Glassnode API `/v1/metrics/indicators/mvrv`
   - Error if API unavailable: `ValueError: MVRV requires Glassnode API key`

2. **Bitcoin Thermocap** (Cumulative Miner Revenue)
   - Source: Glassnode API `/v1/metrics/mining/thermocap`
   - Error if API unavailable: `ValueError: Bitcoin Thermocap requires Glassnode API key`

3. **NUPL** (Net Unrealized Profit/Loss)
   - Source: Glassnode API `/v1/metrics/indicators/nupl`
   - Error if API unavailable: `ValueError: NUPL requires Glassnode API key`

4. **CVDD** (Cumulative Value Days Destroyed)
   - Source: Glassnode API `/v1/metrics/indicators/cvdd`
   - Error if API unavailable: `ValueError: CVDD requires Glassnode API key`

5. **SOPR** (Spent Output Profit Ratio) ✅ **FIXED - Now uses Glassnode**
   - Source: Glassnode API `/v1/metrics/indicators/sopr`
   - Error if API unavailable: `ValueError: SOPR requires Glassnode API key`

6. **Puell Multiple**
   - Source: Glassnode API `/v1/metrics/indicators/puell_multiple`
   - Error if API unavailable: `ValueError: Puell Multiple requires Glassnode API key`

7. **Reserve Risk**
   - Source: Glassnode API `/v1/metrics/indicators/reserve_risk`
   - Error if API unavailable: `ValueError: Reserve Risk requires Glassnode API key`

8. **Bitcoin Days Destroyed**
   - Source: Glassnode API `/v1/metrics/transactions/days_destroyed_cumulative`
   - Error if API unavailable: `ValueError: Bitcoin Days Destroyed requires Glassnode API key`

9. **Exchange Net Position**
   - Source: Glassnode API `/v1/metrics/exchanges/netflows`
   - Error if API unavailable: `ValueError: Exchange Net Position requires Glassnode API key`

## ❌ Deleted Mock-Only Functions (Not Used in Full Cycle Model)

These functions were **pure mock data** and have been **completely removed**:

1. ~~**NVTS** (Network Value to Transactions)~~ - DELETED
2. ~~**Realized PnL Momentum**~~ - DELETED
3. ~~**Pi Cycle Top Risk**~~ - DELETED

## Changes Made

1. ✅ **Removed all mock data fallbacks** from 9 Full Cycle indicators
2. ✅ **Fixed SOPR** - Added Glassnode integration (was missing)
3. ✅ **Deleted 3 unused mock-only functions** (NVTS, Realized PnL Momentum, Pi Cycle Top Risk)
4. ✅ **Updated error handling** - All indicators now raise `ValueError` if Glassnode API unavailable
5. ✅ **Removed from FUNDAMENTAL_INDICATORS dict** - Deleted functions removed from registry

## Required Setup

**All indicators now require Glassnode API key:**

```bash
export GLASSNODE_API_KEY=your_key_here
```

Or add to `docker-compose.yml`:
```yaml
- GLASSNODE_API_KEY=${GLASSNODE_API_KEY:-}
```

## Error Behavior

If Glassnode API is unavailable or API key is missing:
- Indicators will raise `ValueError` with clear message
- No mock data will be returned
- User must provide valid Glassnode API key to use Full Cycle Model
