/**
 * Custom hook for valuation data fetching and state management.
 */

import { useState, useEffect, useCallback } from 'react';
import TradingAPI from '../services/api';

export interface ValuationIndicator {
  id: string;
  name: string;
  category: 'technical' | 'fundamental';
  description: string;
}

export interface ValuationDataPoint {
  date: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  indicators: Record<string, { value: number; zscore: number }>;
}

export interface ValuationZScoresResponse {
  success: boolean;
  data: ValuationDataPoint[];
  averages: Record<string, number>;
}

export interface UseValuationReturn {
  // Available indicators
  availableIndicators: ValuationIndicator[];
  indicatorsLoading: boolean;
  indicatorsError: string | null;
  
  // Z-score data
  zscoreData: ValuationDataPoint[];
  averages: Record<string, number>;
  zscoresLoading: boolean;
  zscoresError: string | null;
  
  // Selected indicators
  selectedIndicators: string[];
  setSelectedIndicators: (indicators: string[]) => void;
  
  // Z-score calculation settings
  zscoreMethod: 'rolling' | 'all_time';
  setZscoreMethod: (method: 'rolling' | 'all_time') => void;
  rollingWindow: number;
  setRollingWindow: (window: number) => void;
  showAverage: boolean;
  setShowAverage: (show: boolean) => void;
  averageWindow: number | null;
  setAverageWindow: (window: number | null) => void;
  
  // Date range
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  timeframe: '1h' | '4h' | '6h' | '12h' | '1d' | '1w' | 'custom' | null;
  setTimeframe: (timeframe: '1h' | '4h' | '6h' | '12h' | '1d' | '1w' | 'custom' | null) => void;
  
  // Symbol
  symbol: string;
  setSymbol: (symbol: string) => void;

  // Exchange
  exchange: string;
  setExchange: (exchange: string) => void;
  
  // Actions
  fetchAvailableIndicators: () => Promise<void>;
  calculateZScores: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useValuation = (): UseValuationReturn => {
  // Available indicators state
  const [availableIndicators, setAvailableIndicators] = useState<ValuationIndicator[]>([]);
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [indicatorsError, setIndicatorsError] = useState<string | null>(null);
  
  // Z-score data state
  const [zscoreData, setZscoreData] = useState<ValuationDataPoint[]>([]);
  const [averages, setAverages] = useState<Record<string, number>>({});
  const [zscoresLoading, setZscoresLoading] = useState(false);
  const [zscoresError, setZscoresError] = useState<string | null>(null);
  
  // Selected indicators
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  
  // Z-score calculation settings
  const [zscoreMethod, setZscoreMethod] = useState<'rolling' | 'all_time'>('rolling');
  const [rollingWindow, setRollingWindow] = useState<number>(200);
  const [showAverage, setShowAverage] = useState<boolean>(false);
  const [averageWindow, setAverageWindow] = useState<number | null>(null);
  
  // Date range
  const [startDate, setStartDate] = useState<string>('2010-01-01');
  const [endDate, setEndDate] = useState<string>('');
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '6h' | '12h' | '1d' | '1w' | 'custom' | null>(null);
  
  // Symbol
  const [symbol, setSymbol] = useState<string>('BTCUSDT');

  // Exchange (CoinGlass market)
  const [exchange, setExchange] = useState<string>('Binance');
  
  // Fetch available indicators
  const fetchAvailableIndicators = useCallback(async () => {
    setIndicatorsLoading(true);
    setIndicatorsError(null);
    
    try {
      const response = await TradingAPI.getValuationIndicators();
      if (response.success) {
        setAvailableIndicators(response.indicators);
      } else {
        throw new Error('Failed to fetch indicators');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch indicators';
      setIndicatorsError(errorMessage);
      console.error('Error fetching valuation indicators:', error);
    } finally {
      setIndicatorsLoading(false);
    }
  }, []);
  
  // Calculate z-scores
  const calculateZScores = useCallback(async () => {
    if (selectedIndicators.length === 0) {
      setZscoreData([]);
      setAverages({});
      return;
    }
    
    setZscoresLoading(true);
    setZscoresError(null);
    
    try {
      const response = await TradingAPI.calculateValuationZScores({
        indicators: selectedIndicators,
        symbol,
        exchange,
        zscore_method: zscoreMethod,
        rolling_window: rollingWindow,
        show_average: showAverage,
        average_window: averageWindow || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      
      if (response.success) {
        setZscoreData(response.data);
        setAverages(response.averages);
      } else {
        throw new Error('Failed to calculate z-scores');
      }
    } catch (error) {
      // Prefer backend validation details (FastAPI -> {"detail": "..."}), otherwise use generic message
      const maybeAxios = error as any;
      const detail =
        maybeAxios?.response?.data?.detail ||
        maybeAxios?.response?.data?.message ||
        maybeAxios?.response?.data?.error;
      const errorMessage =
        typeof detail === 'string'
          ? detail
          : error instanceof Error
            ? error.message
            : 'Failed to calculate z-scores';
      setZscoresError(errorMessage);
      console.error('Error calculating z-scores:', error);
      setZscoreData([]);
      setAverages({});
    } finally {
      setZscoresLoading(false);
    }
  }, [selectedIndicators, symbol, exchange, zscoreMethod, rollingWindow, showAverage, averageWindow, startDate, endDate]);
  
  // Refresh data (recalculate z-scores)
  const refreshData = useCallback(async () => {
    await calculateZScores();
  }, [calculateZScores]);
  
  // Calculate date range from timeframe
  // Note: Hourly timeframes (1h, 4h, 6h, 12h) are not yet supported as data is daily
  // They will be disabled in the UI with "coming soon" message
  useEffect(() => {
    if (timeframe && timeframe !== 'custom') {
      const now = new Date();
      let start: Date;
      
      switch (timeframe) {
        case '1d':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
          break;
        case '1w':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
          break;
        // Hourly timeframes not yet supported - data is daily
        case '1h':
        case '4h':
        case '6h':
        case '12h':
          // Don't update dates for unsupported timeframes
          return;
        default:
          return;
      }
      
      // Format dates as YYYY-MM-DD
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      setStartDate(formatDate(start));
      setEndDate(formatDate(now));
    }
  }, [timeframe]);
  
  // Fetch indicators on mount
  useEffect(() => {
    fetchAvailableIndicators();
  }, [fetchAvailableIndicators]);
  
  // Recalculate z-scores when settings change
  useEffect(() => {
    if (selectedIndicators.length > 0) {
      calculateZScores();
    }
  }, [selectedIndicators, symbol, zscoreMethod, rollingWindow, showAverage, averageWindow, startDate, endDate, calculateZScores]);
  
  return {
    // Available indicators
    availableIndicators,
    indicatorsLoading,
    indicatorsError,
    
    // Z-score data
    zscoreData,
    averages,
    zscoresLoading,
    zscoresError,
    
    // Selected indicators
    selectedIndicators,
    setSelectedIndicators,
    
    // Z-score settings
    zscoreMethod,
    setZscoreMethod,
    rollingWindow,
    setRollingWindow,
    showAverage,
    setShowAverage,
    averageWindow,
    setAverageWindow,
    
    // Date range
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    timeframe,
    setTimeframe,
    
    // Symbol
    symbol,
    setSymbol,

    // Exchange
    exchange,
    setExchange,
    
    // Actions
    fetchAvailableIndicators,
    calculateZScores,
    refreshData,
  };
};
