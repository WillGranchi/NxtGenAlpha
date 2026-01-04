/**
 * Price Test Page
 * Test page to visualize BTC price history from CoinGlass API as OHLC candlestick chart
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CandlestickChart } from '../components/charts/CandlestickChart';
import { DateRangePicker } from '../components/DateRangePicker';
import ErrorBoundary from '../components/ErrorBoundary';
import { useMobile } from '../hooks/useMobile';
import TradingAPI from '../services/api';
import { RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface PriceDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const PriceTestPage: React.FC = () => {
  const { isMobile } = useMobile();
  
  // Symbol and Exchange state
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [exchange, setExchange] = useState<string>('Binance');
  
  // Date range state
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to 1 year ago - users can extend via date picker
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return oneYearAgo.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Data state
  const [priceData, setPriceData] = useState<PriceDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [useLogScale, setUseLogScale] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  
  // Supported symbols and exchanges
  const supportedSymbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 
    'XRPUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LTCUSDT'
  ];
  const supportedExchanges = ['Binance', 'Coinbase', 'OKX', 'Bybit', 'Kraken'];

  // Load price data
  const loadPriceData = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await TradingAPI.getPriceHistory({
        symbol: symbol,
        exchange: exchange,
        start_date: startDate,
        end_date: endDate,
      });

      if (response.success && response.data) {
        setPriceData(response.data);
        setDataSource(response.data_source || 'coinglass');
        setDateRange(response.date_range);
        setTotalRecords(response.total_records || response.data.length);
      } else {
        setError('Failed to load price data');
      }
    } catch (err: any) {
      console.error('Failed to load price data:', err);
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to load price data';
      setError(errorMsg);
      setPriceData([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, exchange, startDate, endDate]);

  // Load data on mount and when date range changes
  useEffect(() => {
    loadPriceData();
  }, [loadPriceData]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-primary p-4 md:p-6" style={{ scrollBehavior: 'smooth' }}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">
              Price Test
            </h1>
            <p className="text-text-secondary">
              Visualize cryptocurrency price history from CoinGlass API
            </p>
          </div>

          {/* Controls Section */}
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-text-primary">Symbol, Exchange & Date Range</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadPriceData(true)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                  title="Refresh data from CoinGlass API"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Refresh Data
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Symbol and Exchange Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Trading Pair (Symbol)
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {supportedSymbols.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Exchange
                </label>
                <select
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {supportedExchanges.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />

            {/* Chart Options */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVolume}
                  onChange={(e) => setShowVolume(e.target.checked)}
                  className="w-4 h-4 rounded border-border-default bg-bg-primary text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-text-secondary">Show Volume</span>
              </label>
            </div>

            {/* Data Info */}
            {dateRange && (
              <div className="mt-4 p-3 bg-bg-tertiary rounded-lg border border-border-default">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Data Source: </span>
                    <span className="text-text-primary font-medium">{dataSource.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Date Range: </span>
                    <span className="text-text-primary font-medium">
                      {dateRange.start} to {dateRange.end}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Total Records: </span>
                    <span className="text-text-primary font-medium">{totalRecords.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Error loading price data</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div className="min-h-[600px]">
            {loading && priceData.length === 0 ? (
              <div className="bg-bg-tertiary rounded-lg border border-border-default p-6 flex items-center justify-center" style={{ minHeight: '600px' }}>
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-4" />
                  <p className="text-text-secondary">Loading price data from CoinGlass...</p>
                </div>
              </div>
            ) : priceData.length > 0 ? (
              <CandlestickChart
                data={priceData}
                title={`${symbol} Price (OHLC) - ${exchange} via CoinGlass`}
                height={600}
                showVolume={showVolume}
                useLogScale={useLogScale}
                onLogScaleToggle={setUseLogScale}
              />
            ) : (
              <div className="bg-bg-tertiary rounded-lg border border-border-default p-6 flex items-center justify-center" style={{ minHeight: '600px' }}>
                <div className="text-center">
                  <p className="text-text-secondary mb-4">No price data available</p>
                  <button
                    onClick={() => loadPriceData(true)}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Load Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default PriceTestPage;

