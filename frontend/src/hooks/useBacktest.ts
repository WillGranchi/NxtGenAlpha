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
  loadDataInfo: () => Promise<void>;
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
    console.log('Starting backtest with request:', request);
    setLoading(true);
    setError(null);
    setResults(null); // Clear previous results
    
    try {
      const response = await TradingAPI.runBacktest(request);
      console.log('API Response received:', response);
      
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
      
      if (!response.results.metrics) {
        console.warn('Warning: No metrics in response');
      }
      
      if (!response.results.equity_curve || !Array.isArray(response.results.equity_curve)) {
        console.warn('Warning: No equity curve data in response');
      }
      
      setResults(response);
      console.log('Backtest completed successfully:', response);
      
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
      console.error('Detailed backtest error:', err);
      console.error('Error stack:', err.stack);
      
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          'An unknown error occurred during backtest';
      
      setError(errorMessage);
      console.error('Backtest failed with message:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDataInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading data info...');
      const response = await TradingAPI.getDataInfo();
      setDataInfo(response);
      console.log('Data info loaded successfully:', response);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load data info';
      setError(errorMessage);
      console.error('Failed to load data info:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading strategies...');
      const response = await TradingAPI.getAvailableStrategies();
      setStrategies(response);
      console.log('Strategies loaded successfully:', response);
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
