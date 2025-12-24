/**
 * Indicators Page
 * Analyze individual indicators and combine them using majority voting
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IndicatorSelector } from '../components/indicators/IndicatorSelector';
import { OverallStrategySummation } from '../components/indicators/OverallStrategySummation';
import { IndividualIndicatorSection } from '../components/indicators/IndividualIndicatorSection';
import { VisualConditionBuilder } from '../components/strategy/VisualConditionBuilder';
import { DateRangePicker } from '../components/DateRangePicker';
import { TokenSelector } from '../components/TokenSelector';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import TradingAPI from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';
import { useMobile } from '../hooks/useMobile';
import { Loader2, ChevronDown, ChevronUp, Settings, Play, RefreshCw } from 'lucide-react';
import type { IndicatorMetadata, BacktestResult, IndicatorConfig, EquityDataPoint } from '../services/api';

const IndicatorsPage: React.FC = () => {
  const { isMobile } = useMobile();
  
  // Indicator selection
  const [availableIndicators, setAvailableIndicators] = useState<Record<string, IndicatorMetadata> | null>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<Array<{ id: string; parameters: Record<string, any> }>>([]);
  const [expression, setExpression] = useState<string>('');
  const [availableConditions, setAvailableConditions] = useState<Record<string, string>>({});
  
  // Settings
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [startDate, setStartDate] = useState<string>('2017-01-01');
  const [endDate, setEndDate] = useState<string>('');
  const [strategyType, setStrategyType] = useState<'long_cash' | 'long_short'>('long_cash');
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  
  // Base price data (for default chart display)
  const [basePriceData, setBasePriceData] = useState<Array<{
    Date: string;
    Price: number;
    Position: number;
    Portfolio_Value: number;
    Capital: number;
    Shares: number;
  }>>([]);
  
  // Results
  const [priceData, setPriceData] = useState<Array<{
    Date: string;
    Price: number;
    Position: number;
    [key: string]: any;
  }>>([]);
  const [individualResults, setIndividualResults] = useState<Record<string, BacktestResult>>({});
  const [combinedResult, setCombinedResult] = useState<BacktestResult | null>(null);
  const [combinedSignals, setCombinedSignals] = useState<number[]>([]);
  const [agreementStats, setAgreementStats] = useState<{
    total_points: number;
    agreement_by_point: Array<{
      date: string;
      long_count: number;
      short_count: number;
      total_count: number;
      combined_signal: number;
    }>;
  } | null>(null);
  
  // UI state
  const [threshold, setThreshold] = useState<number>(0.5); // 50% default
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIndicators, setLoadingIndicators] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  
  // Auto-expand settings on desktop, collapse on mobile
  useEffect(() => {
    setSettingsExpanded(!isMobile);
  }, [isMobile]);
  
  // Load base price data for default chart display
  const loadBasePriceData = useCallback(async () => {
    try {
      const response = await TradingAPI.getValuationData({
        symbol,
        indicators: [], // No indicators, just price
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      
      if (response.success && response.data) {
        const formattedData = response.data.map((d) => ({
          Date: d.date,
          Price: d.price,
          Position: 0, // No signals
          Portfolio_Value: d.price,
          Capital: 0,
          Shares: 0,
        }));
        setBasePriceData(formattedData);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load base price data:', err);
      setError('Failed to load price data. Click "Refresh Data" to fetch from Binance.');
    }
  }, [symbol, startDate, endDate]);

  useEffect(() => {
    loadBasePriceData();
  }, [loadBasePriceData]);

  // Handle manual data refresh
  const handleRefreshData = async () => {
    setIsRefreshingData(true);
    setError(null);
    try {
      // Force refresh from Binance starting from 2017-01-01
      await TradingAPI.refreshData(symbol, true, '2017-01-01');
      // Reload price data after refresh
      await loadBasePriceData();
      setError(null);
    } catch (err: any) {
      console.error('Failed to refresh data:', err);
      setError(err?.response?.data?.detail || 'Failed to refresh data from Binance');
    } finally {
      setIsRefreshingData(false);
    }
  };
  
  // Load available indicators
  useEffect(() => {
    const loadIndicators = async () => {
      try {
        const response = await TradingAPI.getAvailableIndicators();
        setAvailableIndicators(response.indicators || {});
      } catch (err) {
        console.error('Failed to load indicators:', err);
        setError('Failed to load available indicators');
      }
    };
    
    loadIndicators();
  }, []);
  
  // Generate default expression when indicators are selected
  useEffect(() => {
    if (selectedIndicators.length > 0 && availableIndicators && !expression.trim()) {
      // Get first condition from each selected indicator and combine with AND
      const conditions: string[] = [];
      
      selectedIndicators.forEach((indicator) => {
        const metadata = availableIndicators[indicator.id];
        if (metadata && metadata.conditions) {
          const firstCondition = Object.keys(metadata.conditions)[0];
          if (firstCondition) {
            conditions.push(firstCondition);
          }
        }
      });
      
      if (conditions.length > 0) {
        // Combine conditions with AND for default expression
        setExpression(conditions.join(' AND '));
      }
    } else if (selectedIndicators.length === 0) {
      // Clear expression when no indicators selected
      setExpression('');
    }
  }, [selectedIndicators, availableIndicators]);
  
  // Update available conditions when indicators change
  // Conditions are derived from indicator metadata
  useEffect(() => {
    if (selectedIndicators.length > 0 && availableIndicators) {
      const conditions: Record<string, string> = {};
      
      selectedIndicators.forEach((indicator) => {
        const metadata = availableIndicators[indicator.id];
        if (metadata && metadata.conditions) {
          Object.entries(metadata.conditions).forEach(([condName, condDesc]) => {
            conditions[condName] = condDesc;
          });
        }
      });
      
      setAvailableConditions(conditions);
    } else {
      setAvailableConditions({});
    }
  }, [selectedIndicators, availableIndicators]);
  
  // Generate signals and run backtests
  const handleGenerateSignals = useCallback(async () => {
    if (selectedIndicators.length === 0) {
      setError('Please select at least one indicator');
      return;
    }
    
    // Check that expression is provided
    if (!expression || !expression.trim()) {
      setError('Please provide a strategy expression');
      return;
    }
    
    setIsLoading(true);
    setLoadingIndicators(new Set(selectedIndicators.map(ind => ind.id)));
    setError(null);
    
    try {
      // Run modular backtest with unified expression
      const backtestResponse = await TradingAPI.runModularBacktest({
        indicators: selectedIndicators.map((ind) => ({
          id: ind.id,
          params: ind.parameters,
          show_on_chart: false,
        })),
        expression: expression.trim(),
        strategy_type: strategyType,
        initial_capital: initialCapital,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        symbol,
      });
      
      if (!backtestResponse.success) {
        throw new Error('Failed to generate signals');
      }
      
      // Extract price data from equity curve
      const equityCurve = backtestResponse.combined_result.equity_curve || [];
      const formattedPriceData = equityCurve.map((point: EquityDataPoint) => ({
        Date: point.Date,
        Price: point.Price || point.Portfolio_Value || 0,
        Position: point.Position || 0,
        Portfolio_Value: point.Portfolio_Value || 0,
        Capital: point.Capital || 0,
        Shares: point.Shares || 0,
      }));
      
      setPriceData(formattedPriceData);
        
      // Set combined result
      setCombinedResult(backtestResponse.combined_result);
      
      // Extract combined signals from equity curve
      const signals = equityCurve.map((point: EquityDataPoint) => point.Position || 0);
      setCombinedSignals(signals);
      
      // Set individual results (if available)
      setIndividualResults(backtestResponse.individual_results || {});
      
      // Generate agreement stats from combined result
      // Note: This is simplified - the original logic used majority voting
      // For unified expression, we don't have per-indicator signals to compare
      setAgreementStats(null);
      
    } catch (err: any) {
      // Ensure error message is always a string
      let errorMessage = 'Failed to generate signals';
      if (err?.response?.data?.detail) {
        errorMessage = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      } else if (err?.message) {
        errorMessage = typeof err.message === 'string' ? err.message : String(err.message);
      }
      setError(errorMessage);
      console.error('Error generating signals:', err);
    } finally {
      setIsLoading(false);
      setLoadingIndicators(new Set());
    }
  }, [
    selectedIndicators,
    expression,
    symbol,
    strategyType,
    initialCapital,
    startDate,
    endDate,
    availableIndicators,
  ]);
  

  // Note: Threshold-based regeneration removed since we're using unified expression
  // The expression directly determines the strategy signals
  
  // Get indicator names
  const indicatorNames = useMemo(() => {
    const names: Record<string, string> = {};
    selectedIndicators.forEach((ind) => {
      names[ind.id] = availableIndicators?.[ind.id]?.name || ind.id;
    });
    return names;
  }, [selectedIndicators, availableIndicators]);
  
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-primary p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">Indicators</h1>
            <p className="text-sm sm:text-base text-text-secondary">
              Analyze individual indicators and combine them using majority voting
            </p>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">
                {typeof error === 'string' ? error : JSON.stringify(error)}
              </p>
            </div>
          )}

          {/* Settings Bar (Collapsible) */}
          <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-text-muted" />
                <h3 className="text-lg font-semibold text-text-primary">Settings</h3>
              </div>
              {settingsExpanded ? (
                <ChevronUp className="w-5 h-5 text-text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </button>
            
            {settingsExpanded && (
              <div className="border-t border-border-default p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Symbol */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Cryptocurrency
                    </label>
                    <TokenSelector selectedSymbol={symbol} onSymbolChange={setSymbol} />
                  </div>
                  
                  {/* Date Range */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-text-secondary">
                        Date Range
                      </label>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleRefreshData}
                        disabled={isRefreshingData}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                        {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                      </Button>
                    </div>
                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onStartDateChange={setStartDate}
                      onEndDateChange={setEndDate}
                    />
                    {error && (
                      <div className="mt-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        {error}
                      </div>
                    )}
                  </div>
                  
                  {/* Strategy Type */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Strategy Type
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="strategy-type"
                          value="long_cash"
                          checked={strategyType === 'long_cash'}
                          onChange={() => setStrategyType('long_cash')}
                          className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-text-primary">Long/Cash</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="strategy-type"
                          value="long_short"
                          checked={strategyType === 'long_short'}
                          onChange={() => setStrategyType('long_short')}
                          className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-text-primary">Long/Short</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Initial Capital */}
                  <div>
                    <Input
                      type="number"
                      label="Initial Capital"
                      value={initialCapital}
                      onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 10000)}
                      min={1000}
                      step={1000}
                    />
                    {isLoading && (
                      <div className="mt-2 text-xs text-text-muted flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating signals...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Overall Strategy Summation - Always Visible */}
          <OverallStrategySummation
            indicatorIds={selectedIndicators.map(ind => ind.id)}
            indicatorNames={indicatorNames}
            priceData={priceData}
            basePriceData={basePriceData}
            combinedResult={combinedResult}
            combinedSignals={combinedSignals}
            individualResults={individualResults}
            agreementStats={agreementStats}
            threshold={threshold}
            onThresholdChange={setThreshold}
            isLoading={isLoading}
          />

          {/* Indicator Selector (Full Width) */}
          {availableIndicators && (
            <IndicatorSelector
              availableIndicators={availableIndicators}
              selectedIndicators={selectedIndicators}
              onIndicatorsChange={setSelectedIndicators}
              isLoading={isLoading || loadingIndicators.size > 0}
            />
          )}

          {/* Signal Expression Section */}
          {selectedIndicators.length > 0 && (
            <div className="bg-bg-secondary border border-border-default rounded-lg p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Strategy Expression</h3>
                  <p className="text-sm text-text-secondary">
                    Build a unified expression that combines all selected indicators. This expression will be applied to the total strategy.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateSignals}
                  disabled={isLoading || selectedIndicators.length === 0 || !expression.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Signals
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-bg-tertiary border border-border-default rounded-lg p-4">
                      <VisualConditionBuilder
                  expression={expression}
                  onExpressionChange={setExpression}
                        availableConditions={availableConditions}
                        selectedIndicators={selectedIndicators.map(ind => ({
                          id: ind.id,
                          params: ind.parameters,
                          show_on_chart: false,
                        }))}
                        availableIndicators={availableIndicators}
                      />
              </div>
            </div>
          )}

          {/* Individual Indicator Sections (Parameters and Performance) */}
          {selectedIndicators.length > 0 && (
            <div className="space-y-4">
              {selectedIndicators.map((indicator) => {
                const metadata = availableIndicators?.[indicator.id];
                if (!metadata) return null;
                
                return (
                  <IndividualIndicatorSection
                    key={indicator.id}
                    indicatorId={indicator.id}
                    indicatorMetadata={metadata}
                    indicatorParameters={indicator.parameters}
                    onParametersChange={(params) => {
                      setSelectedIndicators((prev) =>
                        prev.map((ind) =>
                          ind.id === indicator.id ? { ...ind, parameters: params } : ind
                        )
                      );
                    }}
                    priceData={priceData}
                    result={individualResults[indicator.id]}
                    isLoading={isLoading || loadingIndicators.has(indicator.id)}
                  />
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {priceData.length === 0 && !combinedResult && (
            <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
              <div className="text-center text-text-muted">
                <p className="mb-4">Select indicators and generate signals to view results</p>
                <p className="text-sm">
                  Choose indicators above, build your strategy expression, and click "Generate Signals"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default IndicatorsPage;
