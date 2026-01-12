/**
 * Unified Dashboard component that combines Indicator, Valuation, and Full Cycle strategies.
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { IndicatorStrategyList } from './IndicatorStrategyList';
import { ValuationStrategyList } from './ValuationStrategyList';
import { FullCyclePresetList } from './FullCyclePresetList';
import { CustomRulesBuilder, CombinationRule } from './CustomRulesBuilder';
import { UnifiedPriceChart } from './UnifiedPriceChart';
import { SignalComparisonChart } from './SignalComparisonChart';
import { ConsensusIndicator } from './ConsensusIndicator';
import { PerformanceMetrics } from './PerformanceMetrics';
import { CombinedBacktest } from './CombinedBacktest';
import { useCombinedStrategies } from '../../hooks/useCombinedStrategies';
import { TradingAPI } from '../../services/api';
import { EquityDataPoint } from '../../services/api';

export const UnifiedDashboard: React.FC = () => {
  const {
    strategySelection,
    setStrategySelection,
    combinationRule,
    setCombinationRule,
    combinedSignals,
    loading: signalsLoading,
    error: signalsError,
    startDate,
    setStartDate,
    endDate,
    setEndDate
  } = useCombinedStrategies();

  const [indicatorSectionOpen, setIndicatorSectionOpen] = useState(true);
  const [valuationSectionOpen, setValuationSectionOpen] = useState(true);
  const [fullcycleSectionOpen, setFullcycleSectionOpen] = useState(true);
  const [rulesSectionOpen, setRulesSectionOpen] = useState(true);
  const [visualizationsOpen, setVisualizationsOpen] = useState(true);
  const [backtestOpen, setBacktestOpen] = useState(false);

  const [priceData, setPriceData] = useState<EquityDataPoint[]>([]);
  const [priceDataLoading, setPriceDataLoading] = useState(false);

  // Get strategy names for rules builder
  const strategyNames = useMemo(() => {
    const names: string[] = [];
    // We'll need to fetch strategy names from the API
    // For now, use generic names based on selection
    strategySelection.indicator_strategy_ids.forEach((id, idx) => {
      names.push(`Indicator_${id}`);
    });
    strategySelection.valuation_strategy_ids.forEach((id, idx) => {
      names.push(`Valuation_${id}`);
    });
    strategySelection.fullcycle_preset_ids.forEach((id, idx) => {
      names.push(`FullCycle_${id}`);
    });
    return names;
  }, [strategySelection]);

  // Cache for price data to avoid redundant fetches
  const priceDataCacheRef = React.useRef<Map<string, EquityDataPoint[]>>(new Map());

  // Load price data when signals are calculated
  React.useEffect(() => {
    if (combinedSignals && combinedSignals.combined_signals.dates.length > 0) {
      loadPriceData();
    }
  }, [combinedSignals]);

  const loadPriceData = async () => {
    if (!combinedSignals || combinedSignals.combined_signals.dates.length === 0) {
      return;
    }

    // Get date range from signals
    const dates = combinedSignals.combined_signals.dates;
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    
    // Check cache first
    const cacheKey = `${firstDate}_${lastDate}`;
    const cachedData = priceDataCacheRef.current.get(cacheKey);
    if (cachedData && cachedData.length > 0) {
      console.debug('[UnifiedDashboard] Using cached price data');
      setPriceData(cachedData);
      return;
    }

    try {
      setPriceDataLoading(true);
      
      // Fetch actual price data from CoinGlass API (uses caching internally)
      const priceHistory = await TradingAPI.getPriceHistory({
        symbol: 'BTCUSDT',
        exchange: 'Binance',
        start_date: firstDate,
        end_date: lastDate,
        interval: '1d'
      });

      if (priceHistory.success && priceHistory.data.length > 0) {
        // Create a map of date to price for quick lookup
        const priceMap = new Map<string, number>();
        priceHistory.data.forEach((point) => {
          priceMap.set(point.date, point.close);
        });

        // Build equity data points with actual prices
        const data: EquityDataPoint[] = dates.map((date, idx) => {
          const price = priceMap.get(date) || (idx > 0 ? data[idx - 1].Price : 50000); // Fallback to previous price or default
          return {
            Date: date,
            Price: price,
            Position: combinedSignals!.combined_signals.values[idx],
            Portfolio_Value: price,
            Capital: 0,
            Shares: 0
          };
        });
        
        // Cache the result
        priceDataCacheRef.current.set(cacheKey, data);
        // Limit cache size to prevent memory issues
        if (priceDataCacheRef.current.size > 10) {
          const firstKey = priceDataCacheRef.current.keys().next().value;
          priceDataCacheRef.current.delete(firstKey);
        }
        
        setPriceData(data);
      } else {
        // Fallback if API call fails
        console.warn('Failed to fetch price data, using signal dates only');
        const data: EquityDataPoint[] = dates.map((date, idx) => ({
          Date: date,
          Price: 50000, // Default fallback
          Position: combinedSignals!.combined_signals.values[idx],
          Portfolio_Value: 50000,
          Capital: 0,
          Shares: 0
        }));
        setPriceData(data);
      }
    } catch (err) {
      console.error('Error loading price data:', err);
      // Fallback on error
      const data: EquityDataPoint[] = combinedSignals!.combined_signals.dates.map((date, idx) => ({
        Date: date,
        Price: 50000,
        Position: combinedSignals!.combined_signals.values[idx],
        Portfolio_Value: 50000,
        Capital: 0,
        Shares: 0
      }));
      setPriceData(data);
    } finally {
      setPriceDataLoading(false);
    }
  };

  const selectedCount = 
    strategySelection.indicator_strategy_ids.length +
    strategySelection.valuation_strategy_ids.length +
    strategySelection.fullcycle_preset_ids.length;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Unified Strategy Dashboard</h1>
          <p className="text-text-muted">
            Combine your saved Indicator, Valuation, and Full Cycle strategies with custom logic.
          </p>
          {selectedCount > 0 && (
            <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <p className="text-sm text-primary-400">
                {selectedCount} strateg{selectedCount === 1 ? 'y' : 'ies'} selected
              </p>
            </div>
          )}
        </div>

        {/* Strategy Selection Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Indicator Strategies */}
          <div className="bg-bg-secondary border border-border-default rounded-lg">
            <button
              onClick={() => setIndicatorSectionOpen(!indicatorSectionOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
            >
              <h2 className="text-lg font-semibold text-text-primary">
                Indicator Strategies
              </h2>
              {indicatorSectionOpen ? (
                <ChevronUp className="w-5 h-5 text-text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </button>
            {indicatorSectionOpen && (
              <div className="p-4 border-t border-border-default">
                <IndicatorStrategyList
                  selectedIds={strategySelection.indicator_strategy_ids}
                  onSelectionChange={(ids) =>
                    setStrategySelection({ ...strategySelection, indicator_strategy_ids: ids })
                  }
                />
              </div>
            )}
          </div>

          {/* Valuation Strategies */}
          <div className="bg-bg-secondary border border-border-default rounded-lg">
            <button
              onClick={() => setValuationSectionOpen(!valuationSectionOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
            >
              <h2 className="text-lg font-semibold text-text-primary">
                Valuation Strategies
              </h2>
              {valuationSectionOpen ? (
                <ChevronUp className="w-5 h-5 text-text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </button>
            {valuationSectionOpen && (
              <div className="p-4 border-t border-border-default">
                <ValuationStrategyList
                  selectedIds={strategySelection.valuation_strategy_ids}
                  onSelectionChange={(ids) =>
                    setStrategySelection({ ...strategySelection, valuation_strategy_ids: ids })
                  }
                />
              </div>
            )}
          </div>

          {/* Full Cycle Presets */}
          <div className="bg-bg-secondary border border-border-default rounded-lg">
            <button
              onClick={() => setFullcycleSectionOpen(!fullcycleSectionOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
            >
              <h2 className="text-lg font-semibold text-text-primary">
                Full Cycle Presets
              </h2>
              {fullcycleSectionOpen ? (
                <ChevronUp className="w-5 h-5 text-text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </button>
            {fullcycleSectionOpen && (
              <div className="p-4 border-t border-border-default">
                <FullCyclePresetList
                  selectedIds={strategySelection.fullcycle_preset_ids}
                  onSelectionChange={(ids) =>
                    setStrategySelection({ ...strategySelection, fullcycle_preset_ids: ids })
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Custom Rules Builder */}
        {selectedCount > 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-lg">
            <button
              onClick={() => setRulesSectionOpen(!rulesSectionOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
            >
              <h2 className="text-lg font-semibold text-text-primary">
                Combination Rules
              </h2>
              {rulesSectionOpen ? (
                <ChevronUp className="w-5 h-5 text-text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </button>
            {rulesSectionOpen && (
              <div className="p-6 border-t border-border-default">
                <CustomRulesBuilder
                  strategyNames={strategyNames}
                  rule={combinationRule}
                  onRuleChange={setCombinationRule}
                />
              </div>
            )}
          </div>
        )}

        {/* Visualizations */}
        {combinedSignals && selectedCount > 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-lg">
            <button
              onClick={() => setVisualizationsOpen(!visualizationsOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
            >
              <h2 className="text-lg font-semibold text-text-primary">
                Visualizations
              </h2>
              {visualizationsOpen ? (
                <ChevronUp className="w-5 h-5 text-text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </button>
            {visualizationsOpen && (
              <div className="p-6 border-t border-border-default space-y-6">
                {signalsLoading ? (
                  <div className="text-center py-8 text-text-muted">
                    Calculating signals...
                  </div>
                ) : signalsError ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    {signalsError}
                  </div>
                ) : (
                  <>
                    {priceData.length > 0 && (
                      <UnifiedPriceChart
                        priceData={priceData}
                        combinedSignals={combinedSignals.combined_signals}
                        individualSignals={combinedSignals.individual_signals}
                      />
                    )}
                    <SignalComparisonChart
                      combinedSignals={combinedSignals.combined_signals}
                      individualSignals={combinedSignals.individual_signals}
                    />
                    <ConsensusIndicator
                      individualSignals={combinedSignals.individual_signals}
                      currentDate={combinedSignals.combined_signals.dates[combinedSignals.combined_signals.dates.length - 1]}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Combined Backtest */}
        {selectedCount > 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-lg">
            <button
              onClick={() => setBacktestOpen(!backtestOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
            >
              <h2 className="text-lg font-semibold text-text-primary">
                Combined Backtest
              </h2>
              {backtestOpen ? (
                <ChevronUp className="w-5 h-5 text-text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </button>
            {backtestOpen && (
              <div className="p-6 border-t border-border-default">
                <CombinedBacktest
                  strategySelection={strategySelection}
                  combinationRule={combinationRule}
                />
              </div>
            )}
          </div>
        )}

        {selectedCount === 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-lg p-8 text-center">
            <p className="text-text-muted">
              Select strategies from the sections above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

