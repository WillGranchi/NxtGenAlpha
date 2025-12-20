/**
 * Indicators Page
 * Analyze individual indicators and combine them using majority voting
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IndicatorSelector } from '../components/indicators/IndicatorSelector';
import { SignalBuilder } from '../components/indicators/SignalBuilder';
import { OverallStrategySummation } from '../components/indicators/OverallStrategySummation';
import { IndividualPerformanceAccordion } from '../components/indicators/IndividualPerformanceAccordion';
import { DateRangePicker } from '../components/DateRangePicker';
import { TokenSelector } from '../components/TokenSelector';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import TradingAPI from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';
import { useMobile } from '../hooks/useMobile';
import { Play, Loader2, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import type { IndicatorMetadata, BacktestResult } from '../services/api';

const IndicatorsPage: React.FC = () => {
  const { isMobile } = useMobile();
  
  // Indicator selection
  const [availableIndicators, setAvailableIndicators] = useState<Record<string, IndicatorMetadata> | null>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<Array<{ id: string; parameters: Record<string, any> }>>([]);
  const [expressions, setExpressions] = useState<Record<string, string>>({});
  const [availableConditions, setAvailableConditions] = useState<Record<string, string>>({});
  
  // Settings
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>('');
  const [strategyType, setStrategyType] = useState<'long_cash' | 'long_short'>('long_cash');
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  
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
  
  // Auto-expand settings on desktop, collapse on mobile
  useEffect(() => {
    setSettingsExpanded(!isMobile);
  }, [isMobile]);
  
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
  
  // Generate default expressions when indicators are selected
  useEffect(() => {
    if (selectedIndicators.length > 0 && availableIndicators) {
      const newExpressions: Record<string, string> = { ...expressions };
      
      selectedIndicators.forEach((indicator) => {
        if (!newExpressions[indicator.id]) {
          // Get available conditions for this indicator
          const indicatorConditions = Object.keys(availableConditions).filter((cond) =>
            cond.toLowerCase().startsWith(indicator.id.toLowerCase())
          );
          
          if (indicatorConditions.length > 0) {
            // Use first available condition as default
            newExpressions[indicator.id] = indicatorConditions[0];
          }
        }
      });
      
      // Remove expressions for deselected indicators
      Object.keys(newExpressions).forEach((indicatorId) => {
        if (!selectedIndicators.some((ind) => ind.id === indicatorId)) {
          delete newExpressions[indicatorId];
        }
      });
      
      setExpressions(newExpressions);
    }
  }, [selectedIndicators, availableIndicators, availableConditions]);
  
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
    
    // Check that all selected indicators have expressions
    const missingExpressions = selectedIndicators.filter(
      (ind) => !expressions[ind.id] || !expressions[ind.id].trim()
    );
    
    if (missingExpressions.length > 0) {
      setError(`Please provide expressions for: ${missingExpressions.map((ind) => ind.id).join(', ')}`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Generate individual indicator signals
      const signalResponse = await TradingAPI.generateIndicatorSignals({
        indicators: selectedIndicators.map((ind) => ({
          id: ind.id,
          parameters: ind.parameters,
        })),
        expressions,
        symbol,
        strategy_type: strategyType,
        initial_capital: initialCapital,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      
      if (!signalResponse.success) {
        throw new Error('Failed to generate signals');
      }
      
      setPriceData(signalResponse.price_data);
      setIndividualResults(signalResponse.results);
      
      // Generate combined signals
      if (Object.keys(signalResponse.results).length > 0) {
        // Extract signal series from price data
        const indicatorSignals: Record<string, number[]> = {};
        const dates: string[] = [];
        const prices: number[] = [];
        
        signalResponse.price_data.forEach((point) => {
          dates.push(point.Date);
          prices.push(point.Price);
          
          selectedIndicators.forEach((indicator) => {
            if (!indicatorSignals[indicator.id]) {
              indicatorSignals[indicator.id] = [];
            }
            const signalValue = point[`${indicator.id}_Position`] ?? 0;
            indicatorSignals[indicator.id].push(signalValue);
          });
        });
        
        // Generate combined signals
        const combinedResponse = await TradingAPI.generateCombinedSignals({
          indicator_signals: indicatorSignals,
          dates,
          prices,
          threshold,
          strategy_type: strategyType,
          initial_capital: initialCapital,
        });
        
        if (combinedResponse.success) {
          setCombinedResult(combinedResponse.combined_result);
          setCombinedSignals(combinedResponse.combined_signals);
          setAgreementStats(combinedResponse.agreement_stats);
        }
      }
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
    }
  }, [
    selectedIndicators,
    expressions,
    symbol,
    strategyType,
    initialCapital,
    startDate,
    endDate,
    threshold,
  ]);
  
  // Auto-generate signals when indicators are selected or expressions change
  useEffect(() => {
    // Only auto-generate if we have at least one indicator with an expression
    const hasValidIndicators = selectedIndicators.length > 0 && 
      selectedIndicators.every((ind) => expressions[ind.id] && expressions[ind.id].trim());
    
    if (!hasValidIndicators) {
      // Clear results if no valid indicators
      if (selectedIndicators.length === 0) {
        setPriceData([]);
        setIndividualResults({});
        setCombinedResult(null);
        setCombinedSignals([]);
        setAgreementStats(null);
      }
      return;
    }

    // Debounce the auto-generation
    const timeoutId = setTimeout(() => {
      const autoGenerate = async () => {
        setIsLoading(true);
        setLoadingIndicators(new Set(selectedIndicators.map(ind => ind.id)));
        setError(null);
        
        try {
          // Generate individual indicator signals
          const signalResponse = await TradingAPI.generateIndicatorSignals({
            indicators: selectedIndicators.map((ind) => ({
              id: ind.id,
              parameters: ind.parameters,
            })),
            expressions,
            symbol,
            strategy_type: strategyType,
            initial_capital: initialCapital,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          });
          
          if (!signalResponse.success) {
            throw new Error('Failed to generate signals');
          }
          
          setPriceData(signalResponse.price_data);
          setIndividualResults(signalResponse.results);
          
          // Generate combined signals
          if (Object.keys(signalResponse.results).length > 0) {
            const indicatorSignals: Record<string, number[]> = {};
            const dates: string[] = [];
            const prices: number[] = [];
            
            signalResponse.price_data.forEach((point) => {
              dates.push(point.Date);
              prices.push(point.Price);
              
              selectedIndicators.forEach((indicator) => {
                if (!indicatorSignals[indicator.id]) {
                  indicatorSignals[indicator.id] = [];
                }
                const signalValue = point[`${indicator.id}_Position`] ?? 0;
                indicatorSignals[indicator.id].push(signalValue);
              });
            });
            
            const combinedResponse = await TradingAPI.generateCombinedSignals({
              indicator_signals: indicatorSignals,
              dates,
              prices,
              threshold,
              strategy_type: strategyType,
              initial_capital: initialCapital,
            });
            
            if (combinedResponse.success) {
              setCombinedResult(combinedResponse.combined_result);
              setCombinedSignals(combinedResponse.combined_signals);
              setAgreementStats(combinedResponse.agreement_stats);
            }
          }
        } catch (err: any) {
          // Silently handle errors for auto-generation (don't show error to user)
          console.error('Error auto-generating signals:', err);
        } finally {
          setIsLoading(false);
          setLoadingIndicators(new Set());
        }
      };
      
      autoGenerate();
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [
    selectedIndicators,
    expressions,
    symbol,
    strategyType,
    initialCapital,
    startDate,
    endDate,
    threshold,
  ]);

  // Update combined signals when threshold changes (if we already have results)
  useEffect(() => {
    if (priceData.length > 0 && Object.keys(individualResults).length > 0) {
      const regenerateCombined = async () => {
        try {
          const indicatorSignals: Record<string, number[]> = {};
          const dates: string[] = [];
          const prices: number[] = [];
          
          priceData.forEach((point) => {
            dates.push(point.Date);
            prices.push(point.Price);
            
            selectedIndicators.forEach((indicator) => {
              if (!indicatorSignals[indicator.id]) {
                indicatorSignals[indicator.id] = [];
              }
              const signalValue = point[`${indicator.id}_Position`] ?? 0;
              indicatorSignals[indicator.id].push(signalValue);
            });
          });
          
          const combinedResponse = await TradingAPI.generateCombinedSignals({
            indicator_signals: indicatorSignals,
            dates,
            prices,
            threshold,
            strategy_type: strategyType,
            initial_capital: initialCapital,
          });
          
          if (combinedResponse.success) {
            setCombinedResult(combinedResponse.combined_result);
            setCombinedSignals(combinedResponse.combined_signals);
            setAgreementStats(combinedResponse.agreement_stats);
          }
        } catch (err) {
          console.error('Error regenerating combined signals:', err);
        }
      };
      
      regenerateCombined();
    }
  }, [threshold]);
  
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

          {/* Overall Strategy Summation - At the Very Top */}
          {selectedIndicators.length > 0 && (
            <OverallStrategySummation
              indicatorIds={selectedIndicators.map(ind => ind.id)}
              indicatorNames={indicatorNames}
              priceData={priceData}
              combinedResult={combinedResult}
              combinedSignals={combinedSignals}
              agreementStats={agreementStats}
              threshold={threshold}
              onThresholdChange={setThreshold}
              isLoading={isLoading}
            />
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
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Date Range
                    </label>
                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onStartDateChange={setStartDate}
                      onEndDateChange={setEndDate}
                    />
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

          {/* Indicator Selector (Full Width) */}
          {availableIndicators && (
            <IndicatorSelector
              availableIndicators={availableIndicators}
              selectedIndicators={selectedIndicators}
              onIndicatorsChange={setSelectedIndicators}
              expressions={expressions}
              onExpressionChange={(indicatorId, expression) => {
                setExpressions((prev) => ({
                  ...prev,
                  [indicatorId]: expression,
                }));
              }}
              availableConditions={availableConditions}
              priceData={priceData}
              individualResults={individualResults}
              isLoading={isLoading || loadingIndicators.size > 0}
            />
          )}

          {/* Signal Expressions (Full Width) */}
          {selectedIndicators.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">Signal Expressions</h3>
                <p className="text-sm text-text-secondary">
                  Configure when each indicator should generate buy/sell signals using the visual builder below.
                </p>
              </div>
              <div className="space-y-4">
                {selectedIndicators.map((indicator) => {
                  const metadata = availableIndicators?.[indicator.id];
                  if (!metadata) return null;
                  
                  return (
                    <SignalBuilder
                      key={indicator.id}
                      indicatorId={indicator.id}
                      indicatorMetadata={metadata}
                      expression={expressions[indicator.id] || ''}
                      onExpressionChange={(expr) => {
                        setExpressions((prev) => ({
                          ...prev,
                          [indicator.id]: expr,
                        }));
                      }}
                      availableConditions={availableConditions}
                      selectedIndicators={selectedIndicators.map(ind => ({
                        id: ind.id,
                        params: ind.parameters,
                        show_on_chart: false,
                      }))}
                      availableIndicators={availableIndicators}
                      indicatorParameters={indicator.parameters}
                      onParametersChange={(indId, params) => {
                        setSelectedIndicators((prev) =>
                          prev.map((ind) =>
                            ind.id === indId ? { ...ind, parameters: params } : ind
                          )
                        );
                      }}
                      isLoading={isLoading}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual Performance Accordion */}
          {priceData.length > 0 && Object.keys(individualResults).length > 0 && (
            <IndividualPerformanceAccordion
              selectedIndicators={selectedIndicators}
              indicatorNames={indicatorNames}
              priceData={priceData}
              individualResults={individualResults}
              isLoading={isLoading}
            />
          )}

          {/* Empty State */}
          {priceData.length === 0 && Object.keys(individualResults).length === 0 && (
            <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
              <div className="text-center text-text-muted">
                <p className="mb-4">Select indicators and generate signals to view results</p>
                <p className="text-sm">
                  Choose indicators above, configure their signal expressions, and click "Generate Signals"
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
