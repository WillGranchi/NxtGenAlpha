/**
 * Custom hook for managing backtest state and operations.
 */

import { useState, useCallback } from 'react';
import { TradingAPI, BacktestRequest, BacktestResponse, DataInfoResponse, StrategiesResponse } from '../services/api';

export interface UseBacktestReturn {
  // State
  results: BacktestResponse | null;
  dataInfo: DataInfoResponse | null;
  strategies: StrategiesResponse | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  runBacktest: (request: BacktestRequest) => Promise<void>;
  loadDataInfo: (symbol?: string) => Promise<void>;
  loadStrategies: () => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

export const useBacktest = (): UseBacktestReturn => {
  const [results, setResults] = useState<BacktestResponse | null>(null);
  const [dataInfo, setDataInfo] = useState<DataInfoResponse | null>(null);
  const [strategies, setStrategies] = useState<StrategiesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = useCallback(async (request: BacktestRequest) => {
    setLoading(true);
    setError(null);
    setResults(null); // Clear previous results
    
    try {
      const response = await TradingAPI.runBacktest(request);
      
      // Validate response structure
      if (!response) {
        throw new Error('No response received from API');
      }
      
      if (!response.success) {
        throw new Error(response.message || 'Backtest failed');
      }
      
      if (!response.results) {
        throw new Error('Invalid API response format - missing results');
      }
      
      setResults(response);
      
      // Smooth scroll to results after a short delay
      setTimeout(() => {
        const resultsElement = document.getElementById('results-section');
        if (resultsElement) {
          resultsElement.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 300);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          'An unknown error occurred during backtest';
      
      setError(errorMessage);
      console.error('Backtest failed:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDataInfo = useCallback(async (symbol?: string) => {
    setLoading(true);
    // Don't clear error here - only clear on user actions, not on initial load
    // This prevents showing "Network Error" on page load
    
    try {
      const response = await TradingAPI.getDataInfo(symbol);
      setDataInfo(response);
      // Clear any previous errors on successful load
      setError(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load data info';
      // Only set error for critical failures, not for initial page load
      if (err.response?.status && err.response.status >= 500) {
        setError(errorMessage);
        console.error('Failed to load data info:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await TradingAPI.getAvailableStrategies();
      setStrategies(response);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load strategies';
      setError(errorMessage);
      console.error('Failed to load strategies:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    results,
    dataInfo,
    strategies,
    loading,
    error,
    runBacktest,
    loadDataInfo,
    loadStrategies,
    clearResults,
    clearError,
  };
};
