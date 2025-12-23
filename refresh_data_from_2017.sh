#!/bin/bash
# Script to refresh BTC data from 2017-01-01

echo "Refreshing BTC data from 2017-01-01..."
echo "This will fetch Binance data from when they started (2017-01-01)"

# Replace with your Railway/backend URL
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

curl -X POST "${BACKEND_URL}/api/data/refresh?symbol=BTCUSDT&force=true&start_date=2017-01-01" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "Refresh complete! Check the response above for data range."

