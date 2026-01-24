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
import { SymbolExchangeControls } from '../SymbolExchangeControls';

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
    ,
    strategyType,
    setStrategyType,
    symbol,
    setSymbol,
    exchange,
    setExchange,
    calculateSignals
  } = useCombinedStrategies();

  const [indicatorSectionOpen, setIndicatorSectionOpen] = useState(true);
  const [valuationSectionOpen, setValuationSectionOpen] = useState(true);
  const [fullcycleSectionOpen, setFullcycleSectionOpen] = useState(true);
  const [rulesSectionOpen, setRulesSectionOpen] = useState(true);
  const [visualizationsOpen, setVisualizationsOpen] = useState(true);
  const [backtestOpen, setBacktestOpen] = useState(false);

  const [priceData, setPriceData] = useState<EquityDataPoint[]>([]);
  const [priceDataLoading, setPriceDataLoading] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // Strategy metadata cache (ID -> backend key string + market)
  const [strategyKeyById, setStrategyKeyById] = useState<Record<string, string>>({});
  const [strategyMarketById, setStrategyMarketById] = useState<Record<string, { symbol: string; exchange: string }>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await TradingAPI.getAllSavedStrategies();
        if (!resp?.success || cancelled) return;

        const map: Record<string, string> = {};
        const marketMap: Record<string, { symbol: string; exchange: string }> = {};
        resp.indicator_strategies?.forEach((s: any) => {
          map[`indicator:${s.id}`] = `Indicator_${s.name}`;
          marketMap[`indicator:${s.id}`] = { symbol: s.symbol || 'BTCUSDT', exchange: s.exchange || 'Binance' };
        });
        resp.valuation_strategies?.forEach((s: any) => {
          map[`valuation:${s.id}`] = `Valuation_${s.name}`;
          marketMap[`valuation:${s.id}`] = { symbol: s.symbol || 'BTCUSDT', exchange: s.exchange || 'Binance' };
        });
        resp.fullcycle_presets?.forEach((s: any) => {
          map[`fullcycle:${s.id}`] = `FullCycle_${s.name}`;
          marketMap[`fullcycle:${s.id}`] = { symbol: s.symbol || 'BTCUSDT', exchange: s.exchange || 'Binance' };
        });

        setStrategyKeyById(map);
        setStrategyMarketById(marketMap);
      } catch (e) {
        // Non-fatal: rules builder will show fallback names if this fails
        console.warn('[UnifiedDashboard] Failed to load strategy names for rule builder', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Get backend-consistent strategy keys for rules builder (must match backend)
  const strategyNames = useMemo(() => {
    const names: string[] = [];
    strategySelection.indicator_strategy_ids.forEach((id) => {
      names.push(strategyKeyById[`indicator:${id}`] || `Indicator_${id}`);
    });
    strategySelection.valuation_strategy_ids.forEach((id) => {
      names.push(strategyKeyById[`valuation:${id}`] || `Valuation_${id}`);
    });
    strategySelection.fullcycle_preset_ids.forEach((id) => {
      names.push(strategyKeyById[`fullcycle:${id}`] || `FullCycle_${id}`);
    });
    return names;
  }, [strategySelection, strategyKeyById]);

  const selectedMarkets = useMemo(() => {
    const markets: Array<{ key: string; symbol: string; exchange: string }> = [];
    strategySelection.indicator_strategy_ids.forEach((id) => {
      const meta = strategyMarketById[`indicator:${id}`];
      markets.push({ key: `indicator:${id}`, symbol: meta?.symbol || 'BTCUSDT', exchange: meta?.exchange || 'Binance' });
    });
    strategySelection.valuation_strategy_ids.forEach((id) => {
      const meta = strategyMarketById[`valuation:${id}`];
      markets.push({ key: `valuation:${id}`, symbol: meta?.symbol || 'BTCUSDT', exchange: meta?.exchange || 'Binance' });
    });
    strategySelection.fullcycle_preset_ids.forEach((id) => {
      const meta = strategyMarketById[`fullcycle:${id}`];
      markets.push({ key: `fullcycle:${id}`, symbol: meta?.symbol || 'BTCUSDT', exchange: meta?.exchange || 'Binance' });
    });
    return markets;
  }, [strategySelection, strategyMarketById]);

  const marketWarnings = useMemo(() => {
    const uniques = new Set(selectedMarkets.map((m) => `${m.symbol}@${m.exchange}`));
    const warnings: string[] = [];
    if (uniques.size > 1) {
      warnings.push(`You selected strategies from multiple markets: ${Array.from(uniques).join(', ')}`);
    }
    const ctx = `${symbol}@${exchange}`;
    if (selectedMarkets.some((m) => `${m.symbol}@${m.exchange}` !== ctx)) {
      warnings.push(`Dashboard context market is ${ctx}; some selected strategies were computed on other markets.`);
    }
    return warnings;
  }, [selectedMarkets, symbol, exchange]);

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
    
    // Ensure dates are defined
    if (!firstDate || !lastDate) {
      console.warn('Invalid date range in combined signals');
      return;
    }
    
    // Check cache first
    const cacheKey = `${symbol}_${exchange}_${firstDate}_${lastDate}`;
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
        symbol,
        exchange,
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
          if (firstKey !== undefined) {
            priceDataCacheRef.current.delete(firstKey);
          }
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
          {(combinedSignals?.metadata?.warnings || marketWarnings.length > 0) && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="text-sm text-yellow-300 space-y-1">
                {(combinedSignals?.metadata?.warnings || marketWarnings).filter(Boolean).map((w: string, idx: number) => (
                  <div key={idx}>- {w}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Market Context (symbol/exchange + date range) */}
        <SymbolExchangeControls
          symbol={symbol}
          onSymbolChange={setSymbol}
          exchange={exchange}
          onExchangeChange={setExchange}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate || new Date().toISOString().split('T')[0]}
          onEndDateChange={setEndDate}
          onRefreshData={async () => {
            setIsRefreshingData(true);
            try {
              await TradingAPI.refreshData(symbol, true, undefined, exchange);
              await calculateSignals();
            } finally {
              setIsRefreshingData(false);
            }
          }}
          isRefreshingData={isRefreshingData}
          maxDaysRange={999}
          showDataInfo={false}
        />

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
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <div className="text-sm text-text-secondary">Strategy Mode:</div>
                  <div className="bg-bg-tertiary border border-border-default rounded-lg p-1 inline-flex">
                    <button
                      onClick={() => setStrategyType('long_cash')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                        strategyType === 'long_cash'
                          ? 'bg-primary-500 text-white'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Long / Cash
                    </button>
                    <button
                      onClick={() => setStrategyType('long_short')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                        strategyType === 'long_short'
                          ? 'bg-primary-500 text-white'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Long / Short
                    </button>
                  </div>
                  <div className="text-xs text-text-muted">
                    In Long/Cash mode, -1 is treated as Cash (neutral).
                  </div>
                </div>
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
                  symbol={symbol}
                  exchange={exchange}
                  strategyType={strategyType}
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

