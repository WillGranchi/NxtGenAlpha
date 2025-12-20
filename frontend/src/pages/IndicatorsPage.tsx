/**
 * Indicators Page
 * Analyze individual indicators and combine them using majority voting
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IndicatorSelector } from '../components/indicators/IndicatorSelector';
import { SignalBuilder } from '../components/indicators/SignalBuilder';
import { IndicatorTabs } from '../components/indicators/IndicatorTabs';
import { DateRangePicker } from '../components/DateRangePicker';
import { TokenSelector } from '../components/TokenSelector';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import TradingAPI from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';
import { useMobile } from '../hooks/useMobile';
import { Play, Loader2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<string>('combined');
  const [threshold, setThreshold] = useState<number>(0.5); // 50% default
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
      
      // Set active tab to first indicator if results exist
      if (selectedIndicators.length > 0) {
        setActiveTab(selectedIndicators[0].id);
      }
      
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
          setActiveTab('combined');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to generate signals');
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
  
  // Update combined signals when threshold changes
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
  }, [threshold, strategyType, initialCapital]);
  
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
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'}`}>
            {/* Controls Sidebar */}
            <div className={isMobile ? '' : 'lg:col-span-1'}>
              <div className="space-y-6">
                {/* Settings */}
                <div className="bg-bg-secondary border border-border-default rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary">Settings</h3>
                  
                  {/* Symbol */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Cryptocurrency
                    </label>
                    <TokenSelector selectedSymbol={symbol} onSymbolChange={setSymbol} />
                  </div>
                  
                  {/* Date Range */}
                  <div>
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
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="strategy-type"
                          value="long_cash"
                          checked={strategyType === 'long_cash'}
                          onChange={() => setStrategyType('long_cash')}
                          className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-text-primary">Long/Cash</span>
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
                        <span className="text-text-primary">Long/Short</span>
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
                  </div>
                  
                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateSignals}
                    disabled={isLoading || selectedIndicators.length === 0}
                    className="w-full"
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
                
                {/* Indicator Selector */}
                {availableIndicators && (
                  <IndicatorSelector
                    availableIndicators={availableIndicators}
                    selectedIndicators={selectedIndicators}
                    onIndicatorsChange={setSelectedIndicators}
                    isLoading={isLoading}
                  />
                )}
                
                {/* Signal Builders */}
                {selectedIndicators.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-text-primary">Signal Expressions</h3>
                    <p className="text-sm text-text-secondary mb-4">
                      Configure when each indicator should generate buy/sell signals using the visual builder below.
                    </p>
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
                )}
              </div>
            </div>
            
            {/* Main Content Area */}
            <div className={isMobile ? '' : 'lg:col-span-3'}>
              {priceData.length > 0 && Object.keys(individualResults).length > 0 ? (
                <IndicatorTabs
                  selectedIndicators={selectedIndicators}
                  indicatorNames={indicatorNames}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  priceData={priceData}
                  individualResults={individualResults}
                  combinedResult={combinedResult}
                  combinedSignals={combinedSignals}
                  agreementStats={agreementStats}
                  threshold={threshold}
                  onThresholdChange={setThreshold}
                  isLoading={isLoading}
                />
              ) : (
                <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
                  <div className="text-center text-text-muted">
                    <p className="mb-4">Select indicators and generate signals to view results</p>
                    <p className="text-sm">
                      Choose indicators from the sidebar, configure their signal expressions, and click "Generate Signals"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default IndicatorsPage;
