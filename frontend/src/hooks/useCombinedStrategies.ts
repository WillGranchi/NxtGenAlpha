/**
 * Custom hook for managing combined strategies state and calculations.
 */

import { useState, useCallback, useEffect } from 'react';
import { TradingAPI } from '../services/api';

export interface StrategySelection {
  indicator_strategy_ids: number[];
  valuation_strategy_ids: number[];
  fullcycle_preset_ids: number[];
}

export interface CombinationRule {
  method: 'weighted' | 'majority' | 'custom';
  weights?: Record<string, number>;
  threshold?: number;
  expression?: string;
}

export interface CombinedSignalsData {
  combined_signals: { dates: string[]; values: number[] };
  individual_signals: Record<string, { dates: string[]; values: number[] }>;
  metadata: any;
}

export const useCombinedStrategies = () => {
  const [strategySelection, setStrategySelection] = useState<StrategySelection>({
    indicator_strategy_ids: [],
    valuation_strategy_ids: [],
    fullcycle_preset_ids: []
  });
  
  const [combinationRule, setCombinationRule] = useState<CombinationRule>({
    method: 'weighted'
  });
  
  const [combinedSignals, setCombinedSignals] = useState<CombinedSignalsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('BTCUSDT');

  const calculateSignals = useCallback(async () => {
    const hasSelection = 
      strategySelection.indicator_strategy_ids.length > 0 ||
      strategySelection.valuation_strategy_ids.length > 0 ||
      strategySelection.fullcycle_preset_ids.length > 0;
    
    if (!hasSelection) {
      setCombinedSignals(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await TradingAPI.calculateCombinedSignals({
        strategy_selection: strategySelection,
        combination_rule: combinationRule,
        start_date: startDate,
        end_date: endDate || undefined,
        symbol
      });
      
      setCombinedSignals(response);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate combined signals');
      console.error('Error calculating combined signals:', err);
      setCombinedSignals(null);
    } finally {
      setLoading(false);
    }
  }, [strategySelection, combinationRule, startDate, endDate, symbol]);

  // Auto-calculate when selection or rule changes
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateSignals();
    }, 500); // Debounce
    
    return () => clearTimeout(timer);
  }, [calculateSignals]);

  return {
    strategySelection,
    setStrategySelection,
    combinationRule,
    setCombinationRule,
    combinedSignals,
    loading,
    error,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    symbol,
    setSymbol,
    calculateSignals
  };
};

