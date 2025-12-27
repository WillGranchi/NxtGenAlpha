/**
 * Custom hook for Full Cycle BTC analysis
 * Similar to useValuation but optimized for full-cycle analysis with longer timeframes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // SDCA thresholds
  sdcaIn: number;
  setSdcaIn: (value: number) => void;
  sdcaOut: number;
  setSdcaOut: (value: number) => void;
  
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
  
  // Indicator parameters
  indicatorParameters: Record<string, Record<string, number>>;
  updateIndicatorParameter: (indicatorId: string, paramName: string, value: number) => void;
  
  // Preset loading
  loadPreset: (preset: {
    indicator_params: Record<string, Record<string, number>>;
    selected_indicators: string[];
    start_date?: string;
    end_date?: string;
    roc_days: number;
    show_fundamental_average: boolean;
    show_technical_average: boolean;
    show_overall_average: boolean;
    sdca_in?: number;
    sdca_out?: number;
  }) => void;
  
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
  
  // SDCA thresholds
  const [sdcaIn, setSdcaIn] = useState<number>(-2.0);
  const [sdcaOut, setSdcaOut] = useState<number>(2.0);
  
  // Indicator visibility
  const [visibleIndicators, setVisibleIndicators] = useState<Set<string>>(new Set(['average']));
  
  // Averages visibility
  const [showFundamentalAverage, setShowFundamentalAverage] = useState<boolean>(false);
  const [showTechnicalAverage, setShowTechnicalAverage] = useState<boolean>(false);
  const [showOverallAverage, setShowOverallAverage] = useState<boolean>(true);
  
  // Indicator parameters (custom params per indicator)
  const [indicatorParameters, setIndicatorParameters] = useState<Record<string, Record<string, number>>>({});
  
  // Debounce timer for parameter updates
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Fetch available indicators
  const fetchAvailableIndicators = useCallback(async () => {
    try {
      setIndicatorsLoading(true);
      setIndicatorsError(null);
      const response = await TradingAPI.getFullCycleIndicators();
      if (response.success) {
        setAvailableIndicators(response.indicators);
        // Default select all indicators, but only show average
        if (selectedIndicators.length === 0) {
          setSelectedIndicators(response.indicators.map(ind => ind.id));
          setVisibleIndicators(new Set(['average']));
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
      
      // Build indicator_params object from indicatorParameters state
      const indicatorParams: Record<string, Record<string, number>> = {};
      selectedIndicators.forEach((indicatorId: string) => {
        if (indicatorParameters[indicatorId] && Object.keys(indicatorParameters[indicatorId]).length > 0) {
          indicatorParams[indicatorId] = indicatorParameters[indicatorId];
        }
      });
      
      const response = await TradingAPI.calculateFullCycleZScores({
        indicators: selectedIndicators,
        indicator_params: Object.keys(indicatorParams).length > 0 ? indicatorParams : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        roc_days: rocDays,
        sdca_in: sdcaIn,
        sdca_out: sdcaOut,
        force_refresh: false, // Default to false, can be set to true by refresh button
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
    }, [selectedIndicators, indicatorParameters, startDate, endDate, rocDays, sdcaIn, sdcaOut]);
  
  // Toggle indicator visibility
  const toggleIndicatorVisibility = useCallback((indicatorId: string) => {
    setVisibleIndicators((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (newSet.has(indicatorId)) {
        newSet.delete(indicatorId);
      } else {
        newSet.add(indicatorId);
      }
      return newSet;
    });
  }, []);
  
  // Update indicator parameter (debounced)
  const updateIndicatorParameter = useCallback((indicatorId: string, paramName: string, value: number) => {
    setIndicatorParameters((prev: Record<string, Record<string, number>>) => {
      const newParams = { ...prev };
      if (!newParams[indicatorId]) {
        newParams[indicatorId] = {};
      }
      newParams[indicatorId] = {
        ...newParams[indicatorId],
        [paramName]: value,
      };
      return newParams;
    });
    
    // Debounce recalculation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      calculateZScores();
    }, 500); // 500ms debounce
  }, [calculateZScores]);
  
  // Load preset configuration
  const loadPreset = useCallback((preset: {
    indicator_params: Record<string, Record<string, number>>;
    selected_indicators: string[];
    start_date?: string;
    end_date?: string;
    roc_days: number;
    show_fundamental_average: boolean;
    show_technical_average: boolean;
    show_overall_average: boolean;
    sdca_in?: number;
    sdca_out?: number;
  }) => {
    setIndicatorParameters(preset.indicator_params || {});
    setSelectedIndicators(preset.selected_indicators || []);
    // Only show average by default, or use preset visibility if available
    setVisibleIndicators(new Set(['average']));
    if (preset.start_date) setStartDate(preset.start_date);
    if (preset.end_date) setEndDate(preset.end_date);
    setRocDays(preset.roc_days);
    setShowFundamentalAverage(preset.show_fundamental_average);
    setShowTechnicalAverage(preset.show_technical_average);
    setShowOverallAverage(preset.show_overall_average);
    if (preset.sdca_in !== undefined) setSdcaIn(preset.sdca_in);
    if (preset.sdca_out !== undefined) setSdcaOut(preset.sdca_out);
  }, []);
  
  // Refresh data (force refresh from API)
  const refreshData = useCallback(async () => {
    if (selectedIndicators.length === 0) {
      return;
    }
    
    try {
      setZscoresLoading(true);
      setZscoresError(null);
      
      // Build indicator_params object from indicatorParameters state
      const indicatorParams: Record<string, Record<string, number>> = {};
      selectedIndicators.forEach((indicatorId: string) => {
        if (indicatorParameters[indicatorId] && Object.keys(indicatorParameters[indicatorId]).length > 0) {
          indicatorParams[indicatorId] = indicatorParameters[indicatorId];
        }
      });
      
      // Force refresh from API
      const response = await TradingAPI.calculateFullCycleZScores({
        indicators: selectedIndicators,
        indicator_params: Object.keys(indicatorParams).length > 0 ? indicatorParams : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        roc_days: rocDays,
        sdca_in: sdcaIn,
        sdca_out: sdcaOut,
        force_refresh: true, // Force refresh price data
      });
      
      if (response.success) {
        setZscoreData(response.data);
        setRoc(response.roc || {});
      }
    } catch (err: any) {
      console.error('Failed to refresh full cycle z-scores:', err);
      setZscoresError(err?.response?.data?.detail || err?.message || 'Failed to refresh data');
    } finally {
      setZscoresLoading(false);
    }
  }, [selectedIndicators, indicatorParameters, startDate, endDate, rocDays, sdcaIn, sdcaOut]);
  
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
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
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
    
    // SDCA thresholds
    sdcaIn,
    setSdcaIn,
    sdcaOut,
    setSdcaOut,
    
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
    
    // Indicator parameters
    indicatorParameters,
    updateIndicatorParameter,
    
    // Preset loading
    loadPreset,
    
    // Refresh
    refreshData,
  };
};

