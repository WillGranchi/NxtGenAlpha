import { useState, useEffect, useCallback } from 'react';
import { TradingAPI } from '../services/api';
import type { IndicatorMetadata, IndicatorConfig } from '../services/api';

interface UseIndicatorCatalogReturn {
  // State
  availableIndicators: Record<string, IndicatorMetadata> | null;
  selectedIndicators: IndicatorConfig[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addIndicator: (indicatorId: string) => void;
  removeIndicator: (indicatorId: string) => void;
  updateIndicatorParams: (indicatorId: string, params: Record<string, any>) => void;
  updateIndicatorShowOnChart: (indicatorId: string, showOnChart: boolean) => void;
  clearSelectedIndicators: () => void;
  setIndicators: (indicators: IndicatorConfig[]) => void;
  getAvailableConditions: () => Record<string, string>;
}

export const useIndicatorCatalog = (): UseIndicatorCatalogReturn => {
  const [availableIndicators, setAvailableIndicators] = useState<Record<string, IndicatorMetadata> | null>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available indicators on mount
  useEffect(() => {
    const fetchIndicators = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await TradingAPI.getAvailableIndicators();
        
        if (!response.success || !response.indicators) {
          throw new Error('Failed to fetch indicators');
        }
        
        setAvailableIndicators(response.indicators);
        console.log('Available indicators loaded:', response.indicators);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load indicators';
        console.error('Error fetching indicators:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIndicators();
  }, []);

  const addIndicator = useCallback((indicatorId: string) => {
    if (!availableIndicators || !availableIndicators[indicatorId]) {
      console.error('Indicator not found:', indicatorId);
      return;
    }

    // Check if indicator is already selected
    if (selectedIndicators.some(ind => ind.id === indicatorId)) {
      console.warn('Indicator already selected:', indicatorId);
      return;
    }

    const indicator = availableIndicators[indicatorId];
    
    // Create default parameters from indicator metadata
    const defaultParams: Record<string, any> = {};
    Object.entries(indicator.parameters).forEach(([key, param]) => {
      defaultParams[key] = param.default;
    });

    const newIndicator: IndicatorConfig = {
      id: indicatorId,
      params: defaultParams,
      show_on_chart: true,
    };

    setSelectedIndicators(prev => [...prev, newIndicator]);
    console.log('Added indicator:', indicatorId, newIndicator);
  }, [availableIndicators, selectedIndicators]);

  const removeIndicator = useCallback((indicatorId: string) => {
    setSelectedIndicators(prev => prev.filter(ind => ind.id !== indicatorId));
    console.log('Removed indicator:', indicatorId);
  }, []);

  const updateIndicatorParams = useCallback((indicatorId: string, params: Record<string, any>) => {
    setSelectedIndicators(prev => 
      prev.map(ind => 
        ind.id === indicatorId 
          ? { ...ind, params: { ...ind.params, ...params } }
          : ind
      )
    );
    console.log('Updated indicator params:', indicatorId, params);
  }, []);

  const updateIndicatorShowOnChart = useCallback((indicatorId: string, showOnChart: boolean) => {
    setSelectedIndicators(prev => 
      prev.map(ind => 
        ind.id === indicatorId 
          ? { ...ind, show_on_chart: showOnChart }
          : ind
      )
    );
    console.log('Updated indicator show on chart:', indicatorId, showOnChart);
  }, []);

  const clearSelectedIndicators = useCallback(() => {
    setSelectedIndicators([]);
    console.log('Cleared all selected indicators');
  }, []);

  const setIndicators = useCallback((indicators: IndicatorConfig[]) => {
    // Validate that all indicator IDs exist in availableIndicators
    if (!availableIndicators) {
      console.warn('Cannot set indicators: catalog not loaded yet');
      return;
    }

    const validIndicators = indicators.filter(ind => {
      if (!availableIndicators[ind.id]) {
        console.warn(`Skipping invalid indicator: ${ind.id}`);
        return false;
      }
      return true;
    });

    setSelectedIndicators(validIndicators);
    console.log('Set indicators:', validIndicators);
  }, [availableIndicators]);

  const getAvailableConditions = useCallback((): Record<string, string> => {
    if (!availableIndicators || selectedIndicators.length === 0) {
      return {};
    }

    const conditions: Record<string, string> = {};
    
    selectedIndicators.forEach(selectedIndicator => {
      const indicator = availableIndicators[selectedIndicator.id];
      if (indicator && indicator.conditions) {
        Object.entries(indicator.conditions).forEach(([conditionName, description]) => {
          conditions[conditionName] = description;
        });
      }
    });

    return conditions;
  }, [availableIndicators, selectedIndicators]);

  return {
    availableIndicators,
    selectedIndicators,
    isLoading,
    error,
    addIndicator,
    removeIndicator,
    updateIndicatorParams,
    updateIndicatorShowOnChart,
    clearSelectedIndicators,
    setIndicators,
    getAvailableConditions,
  };
};
