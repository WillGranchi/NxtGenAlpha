/**
 * Custom hook for Full Cycle BTC analysis
 * Similar to useValuation but optimized for full-cycle analysis with longer timeframes
 */

import { useState, useEffect, useCallback } from 'react';
import TradingAPI from '../services/api';

export interface FullCycleIndicator {
  id: string;
  name: string;
  category: 'fundamental' | 'technical';
  default_params: Record<string, any>;
}

export interface FullCycleDataPoint {
  date: string;
  price: number;
  indicators: Record<string, { zscore: number }>;
}

export interface UseFullCycleReturn {
  // Available indicators
  availableIndicators: FullCycleIndicator[];
  indicatorsLoading: boolean;
  indicatorsError: string | null;
  
  // Z-score data
  zscoreData: FullCycleDataPoint[];
  roc: Record<string, number>;
  zscoresLoading: boolean;
  zscoresError: string | null;
  
  // Selection state
  selectedIndicators: string[];
  setSelectedIndicators: (indicators: string[]) => void;
  
  // Date range
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  
  // ROC period
  rocDays: number;
  setRocDays: (days: number) => void;
  
  // Indicator visibility
  visibleIndicators: Set<string>;
  setVisibleIndicators: (indicators: Set<string>) => void;
  toggleIndicatorVisibility: (indicatorId: string) => void;
  
  // Averages visibility
  showFundamentalAverage: boolean;
  setShowFundamentalAverage: (show: boolean) => void;
  showTechnicalAverage: boolean;
  setShowTechnicalAverage: (show: boolean) => void;
  showOverallAverage: boolean;
  setShowOverallAverage: (show: boolean) => void;
  
  // Refresh
  refreshData: () => Promise<void>;
}

export const useFullCycle = (): UseFullCycleReturn => {
  // Available indicators state
  const [availableIndicators, setAvailableIndicators] = useState<FullCycleIndicator[]>([]);
  const [indicatorsLoading, setIndicatorsLoading] = useState(true);
  const [indicatorsError, setIndicatorsError] = useState<string | null>(null);
  
  // Z-score data state
  const [zscoreData, setZscoreData] = useState<FullCycleDataPoint[]>([]);
  const [roc, setRoc] = useState<Record<string, number>>({});
  const [zscoresLoading, setZscoresLoading] = useState(false);
  const [zscoresError, setZscoresError] = useState<string | null>(null);
  
  // Selection state
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  
  // Date range (default to full history)
  const [startDate, setStartDate] = useState<string>('2010-01-01');
  const [endDate, setEndDate] = useState<string>('');
  
  // ROC period
  const [rocDays, setRocDays] = useState<number>(7);
  
  // Indicator visibility
  const [visibleIndicators, setVisibleIndicators] = useState<Set<string>>(new Set());
  
  // Averages visibility
  const [showFundamentalAverage, setShowFundamentalAverage] = useState<boolean>(true);
  const [showTechnicalAverage, setShowTechnicalAverage] = useState<boolean>(true);
  const [showOverallAverage, setShowOverallAverage] = useState<boolean>(true);
  
  // Fetch available indicators
  const fetchAvailableIndicators = useCallback(async () => {
    try {
      setIndicatorsLoading(true);
      setIndicatorsError(null);
      const response = await TradingAPI.getFullCycleIndicators();
      if (response.success) {
        setAvailableIndicators(response.indicators);
        // Default select all indicators
        if (selectedIndicators.length === 0) {
          setSelectedIndicators(response.indicators.map(ind => ind.id));
          setVisibleIndicators(new Set(response.indicators.map(ind => ind.id)));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch full cycle indicators:', err);
      setIndicatorsError(err?.message || 'Failed to load indicators');
    } finally {
      setIndicatorsLoading(false);
    }
  }, [selectedIndicators.length]);
  
  // Calculate z-scores
  const calculateZScores = useCallback(async () => {
    if (selectedIndicators.length === 0) {
      setZscoreData([]);
      return;
    }
    
    try {
      setZscoresLoading(true);
      setZscoresError(null);
      
      const response = await TradingAPI.calculateFullCycleZScores({
        indicators: selectedIndicators,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        roc_days: rocDays,
      });
      
      if (response.success) {
        setZscoreData(response.data);
        setRoc(response.roc || {});
      }
    } catch (err: any) {
      console.error('Failed to calculate full cycle z-scores:', err);
      setZscoresError(err?.response?.data?.detail || err?.message || 'Failed to calculate z-scores');
      setZscoreData([]);
    } finally {
      setZscoresLoading(false);
    }
  }, [selectedIndicators, startDate, endDate, rocDays]);
  
  // Toggle indicator visibility
  const toggleIndicatorVisibility = useCallback((indicatorId: string) => {
    setVisibleIndicators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(indicatorId)) {
        newSet.delete(indicatorId);
      } else {
        newSet.add(indicatorId);
      }
      return newSet;
    });
  }, []);
  
  // Refresh data
  const refreshData = useCallback(async () => {
    await calculateZScores();
  }, [calculateZScores]);
  
  // Set default end date to today
  useEffect(() => {
    if (!endDate) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      setEndDate(todayStr);
    }
  }, [endDate]);
  
  // Fetch indicators on mount
  useEffect(() => {
    fetchAvailableIndicators();
  }, [fetchAvailableIndicators]);
  
  // Recalculate z-scores when settings change
  useEffect(() => {
    if (selectedIndicators.length > 0) {
      calculateZScores();
    }
  }, [selectedIndicators, startDate, endDate, rocDays, calculateZScores]);
  
  return {
    // Available indicators
    availableIndicators,
    indicatorsLoading,
    indicatorsError,
    
    // Z-score data
    zscoreData,
    roc,
    zscoresLoading,
    zscoresError,
    
    // Selection state
    selectedIndicators,
    setSelectedIndicators,
    
    // Date range
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    
    // ROC period
    rocDays,
    setRocDays,
    
    // Indicator visibility
    visibleIndicators,
    setVisibleIndicators,
    toggleIndicatorVisibility,
    
    // Averages visibility
    showFundamentalAverage,
    setShowFundamentalAverage,
    showTechnicalAverage,
    setShowTechnicalAverage,
    showOverallAverage,
    setShowOverallAverage,
    
    // Refresh
    refreshData,
  };
};

