/**
 * Symbol Exchange Controls Component
 * Reusable component for symbol, exchange, and date range selection matching Price Test page style
 */

import React, { useState, useEffect, useMemo } from 'react';
import { DateRangePicker } from './DateRangePicker';
import { RefreshCw, Loader2 } from 'lucide-react';
import TradingAPI from '../services/api';

interface SymbolExchangeControlsProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  exchange: string;
  onExchangeChange: (exchange: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  onRefreshData: () => Promise<void>;
  isRefreshingData?: boolean;
  loading?: boolean;
  maxDaysRange?: number;
  showDataInfo?: boolean;
  dataSource?: string;
  dateRange?: { start: string; end: string } | null;
  totalRecords?: number;
  className?: string;
}

export const SymbolExchangeControls: React.FC<SymbolExchangeControlsProps> = ({
  symbol,
  onSymbolChange,
  exchange,
  onExchangeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  timeframe = '1d',
  onTimeframeChange,
  onRefreshData,
  isRefreshingData = false,
  loading = false,
  maxDaysRange = 999,
  showDataInfo = false,
  dataSource,
  dateRange,
  totalRecords,
  className = '',
}) => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(true);

  // Calculate max start date based on end date and maxDaysRange
  const calculateMaxStartDate = (endDateStr: string): string => {
    const end = new Date(endDateStr);
    const maxStart = new Date(end);
    maxStart.setDate(maxStart.getDate() - maxDaysRange);
    return maxStart.toISOString().split('T')[0];
  };

  // Load symbols and exchanges from CoinGlass API
  useEffect(() => {
    const fetchSymbolsAndExchanges = async () => {
      try {
        setIsLoadingSymbols(true);
        console.log('[SymbolExchangeControls] Fetching symbols and exchanges from CoinGlass API...');
        const response = await TradingAPI.getCoinGlassSymbols();
        console.log('[SymbolExchangeControls] API response:', response);
        
        // Check if response is successful and has symbols
        if (response && response.success && response.symbols && Array.isArray(response.symbols) && response.symbols.length > 0) {
          // Extract unique symbols (convert from "BTC/USDT" to "BTCUSDT" for internal use)
          const uniqueSymbols = new Set<string>();
          const uniqueExchanges = new Set<string>();
          
          response.symbols.forEach((item: any) => {
            // Convert CoinGlass format "BTC/USDT" to internal format "BTCUSDT"
            if (item.symbol) {
              const internalSymbol = item.symbol.replace('/', '');
              uniqueSymbols.add(internalSymbol);
            }
            
            if (item.exchange && item.exchange.trim()) {
              uniqueExchanges.add(item.exchange);
            }
          });
          
          // Sort and set symbols
          const sortedSymbols = Array.from(uniqueSymbols).sort();
          setSymbols(sortedSymbols);
          console.log('[SymbolExchangeControls] Loaded symbols:', sortedSymbols.length);
          
          // Sort and set exchanges
          const sortedExchanges = Array.from(uniqueExchanges).sort();
          setExchanges(sortedExchanges);
          console.log('[SymbolExchangeControls] Loaded exchanges:', sortedExchanges.length);
        } else {
          console.warn('[SymbolExchangeControls] Invalid response or no symbols, using fallback');
          // Fallback to default symbols and exchanges
          setSymbols(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LTCUSDT']);
          setExchanges(['Binance', 'Coinbase', 'OKX', 'Bybit', 'Kraken']);
        }
      } catch (error) {
        console.error('[SymbolExchangeControls] Failed to fetch symbols and exchanges:', error);
        // Fallback to default symbols and exchanges
        setSymbols(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LTCUSDT']);
        setExchanges(['Binance', 'Coinbase', 'OKX', 'Bybit', 'Kraken']);
      } finally {
        setIsLoadingSymbols(false);
      }
    };

    fetchSymbolsAndExchanges();
  }, []);

  // Handler to set start date to maximum allowed
  const handleSetMaxRange = () => {
    const maxStart = calculateMaxStartDate(endDate);
    onStartDateChange(maxStart);
  };

  return (
    <div className={`bg-bg-secondary border border-border-default rounded-lg p-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold text-text-primary">Symbol, Exchange & Date Range</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefreshData}
            disabled={isRefreshingData || loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            title="Refresh data from CoinGlass API"
          >
            {isRefreshingData || loading ? (
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

      {/* Symbol, Exchange, and Timeframe Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Trading Pair (Symbol)
          </label>
          {isLoadingSymbols ? (
            <div className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-muted text-sm">
              Loading symbols...
            </div>
          ) : (
            <select
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {symbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Exchange
          </label>
          {isLoadingSymbols ? (
            <div className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-muted text-sm">
              Loading exchanges...
            </div>
          ) : (
            <select
              value={exchange}
              onChange={(e) => onExchangeChange(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {exchanges.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          )}
        </div>
        {onTimeframeChange && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
              <option value="1w">1 Week</option>
              <option value="1M">1 Month</option>
            </select>
          </div>
        )}
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          maxDaysRange={maxDaysRange}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            Maximum date range: {maxDaysRange} days {maxDaysRange === 999 ? '(CoinGlass API limit)' : ''}
          </p>
          <button
            onClick={handleSetMaxRange}
            className="px-3 py-1.5 text-xs font-medium bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg transition-colors"
            title={`Set start date to maximum allowed (${maxDaysRange} days back)`}
          >
            Use Max Range
          </button>
        </div>
      </div>

      {/* Data Info Display */}
      {showDataInfo && dateRange && (
        <div className="mt-4 p-3 bg-bg-tertiary rounded-lg border border-border-default">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Data Source: </span>
              <span className="text-text-primary font-medium">{(dataSource || 'coinglass').toUpperCase()}</span>
            </div>
            <div>
              <span className="text-text-muted">Date Range: </span>
              <span className="text-text-primary font-medium">
                {dateRange.start} to {dateRange.end}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Total Records: </span>
              <span className="text-text-primary font-medium">{totalRecords?.toLocaleString() || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

