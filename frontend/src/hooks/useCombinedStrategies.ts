/**
 * Custom hook for managing combined strategies state and calculations.
 */

import { useState, useCallback, useEffect } from 'react';
import TradingAPI from '../services/api';
import { useMarketControls } from './useMarketControls';
import { usePersistedState } from './usePersistedState';

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
  // Persist dashboard selections/rules so users don't lose their setup on navigation/refresh
  const [strategySelection, setStrategySelection] = usePersistedState<StrategySelection>(
    'dashboard:strategySelection:v1',
    {
      indicator_strategy_ids: [],
      valuation_strategy_ids: [],
      fullcycle_preset_ids: [],
    },
    { version: 1 }
  );
  
  const [combinationRule, setCombinationRule] = usePersistedState<CombinationRule>(
    'dashboard:combinationRule:v1',
    { method: 'weighted' },
    { version: 1 }
  );
  
  const [combinedSignals, setCombinedSignals] = useState<CombinedSignalsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const market = useMarketControls('dashboard');
  const startDate = market.startDate;
  const setStartDate = market.setStartDate;
  const endDate = market.endDate;
  const setEndDate = market.setEndDate;
  const symbol = market.symbol;
  const setSymbol = market.setSymbol;
  const exchange = market.exchange;
  const setExchange = market.setExchange;
  const [strategyType, setStrategyType] = usePersistedState<'long_cash' | 'long_short'>(
    'dashboard:strategyType:v1',
    'long_cash',
    { version: 1 }
  );

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
        symbol,
        exchange,
        strategy_type: strategyType,
      });
      
      setCombinedSignals(response);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate combined signals');
      console.error('Error calculating combined signals:', err);
      setCombinedSignals(null);
    } finally {
      setLoading(false);
    }
  }, [strategySelection, combinationRule, startDate, endDate, symbol, exchange, strategyType]);

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
    exchange,
    setExchange,
    strategyType,
    setStrategyType,
    calculateSignals
  };
};

