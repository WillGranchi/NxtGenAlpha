/**
 * Main dashboard component that orchestrates all other components.
 */

import React, { useEffect, useCallback, useState } from 'react';
import StrategySelector from './strategy/StrategySelector';
import { PriceChart } from './charts/PriceChart';
import { EquityChart } from './charts/EquityChart';
import { TradeLogTable } from './TradeLogTable';
import MetricsCard from './MetricsCard';
import ErrorBoundary from './ErrorBoundary';
import { useBacktest } from '../hooks/useBacktest';
import { useModularBacktest } from '../hooks/useModularBacktest';
import { useIndicatorCatalog } from '../hooks/useIndicatorCatalog';
import IndicatorCatalog from './strategy/IndicatorCatalog';
import StrategyMakeup from './strategy/StrategyMakeup';
import PerformanceMetrics from './results/PerformanceMetrics';
import IndicatorTileGrid from './results/IndicatorTileGrid';
import ResultsSection from './ResultsSection';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';
import { BacktestRequest, ModularBacktestRequest, SavedStrategy } from '../services/api';
import LoginButton from './auth/LoginButton';
import { useAuth } from '../hooks/useAuth';
import { DateRangePicker } from './DateRangePicker';

export const Dashboard: React.FC = () => {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [initialCapital, setInitialCapital] = useState(10000);
  const [startDate, setStartDate] = useState<string>('2018-01-01');
  const [endDate, setEndDate] = useState<string>('');
  const [strategyType, setStrategyType] = useState<'long_cash' | 'long_short'>('long_cash');
  const [expression, setExpression] = useState(''); // Legacy single expression
  const [longExpression, setLongExpression] = useState(''); // Separate LONG expression
  const [cashExpression, setCashExpression] = useState(''); // Separate CASH expression (for long_cash mode)
  const [shortExpression, setShortExpression] = useState(''); // Separate SHORT expression (for long_short mode)
  const [useSeparateExpressions, setUseSeparateExpressions] = useState(false); // Toggle for separate mode
  const [overlayStates, setOverlayStates] = useState<Record<string, boolean>>({});
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  // Legacy backtest hook
  const {
    results: legacyResults,
    dataInfo,
    strategies,
    loading: legacyLoading,
    error: legacyError,
    runBacktest,
    loadDataInfo,
    loadStrategies,
    clearError: clearLegacyError,
  } = useBacktest();

  // Modular backtest hooks
  const {
    availableIndicators,
    selectedIndicators,
    isLoading: catalogLoading,
    error: catalogError,
    addIndicator,
    removeIndicator,
    updateIndicatorParams,
    updateIndicatorShowOnChart,
    clearSelectedIndicators,
    setIndicators,
    getAvailableConditions,
  } = useIndicatorCatalog();

  const {
    isLoading: modularLoading,
    error: modularError,
    response: modularResponse,
    runModularBacktest,
    clearResults: clearModularResults,
    clearError: clearModularError,
  } = useModularBacktest();

  // Defensive wrapper for runBacktest to handle errors gracefully
  const handleRunBacktest = useCallback(async (request: BacktestRequest) => {
    try {
      // Add date range to request if available
      const requestWithDates: BacktestRequest = {
        ...request,
        start_date: startDate || request.start_date,
        end_date: endDate || request.end_date,
      };
      await runBacktest(requestWithDates);
    } catch (error) {
      console.error('Backtest error in Dashboard:', error);
      // Error is already handled by useBacktest hook, but we can add additional logging
    }
  }, [runBacktest, startDate, endDate]);

  // Handle modular backtest
  const handleModularBacktest = useCallback(async () => {
    if (selectedIndicators.length === 0) {
      toast.error('Please add at least one indicator to your strategy.');
      return;
    }

    // Generate simple expression helper (defined before use)
    const getSimpleExpression = () => {
      if (selectedIndicators.length === 0) return '';
      const conditionList = selectedIndicators
        .map(ind => getAvailableConditions()[ind.id])
        .filter(Boolean);
      if (conditionList.length === 0) return '';
      if (conditionList.length === 1) return conditionList[0];
      return conditionList.join(' AND ');
    };

    // Determine which expression(s) to use
    let request: ModularBacktestRequest;
    
    // Check for empty expressions in advanced mode
    const effectiveExpression = useSeparateExpressions 
      ? (strategyType === 'long_short' ? shortExpression : longExpression) 
      : expression;
    
    if (mode === 'advanced' && (!effectiveExpression || !effectiveExpression.trim())) {
      toast.error('Please enter a strategy expression before running the backtest.');
      return;
    }
    
    if (useSeparateExpressions && strategyType === 'long_short' && (!shortExpression || !shortExpression.trim())) {
      toast.error('Please enter a SHORT expression when using Long/Short strategy type.');
      return;
    }
    
    if (mode === 'advanced' && useSeparateExpressions) {
      // Use separate expressions based on strategy type
      if (!longExpression || !longExpression.trim()) {
        toast.error('Please enter a LONG expression. Define when to go LONG using the builder above.');
        return;
      }
      
      if (strategyType === 'long_short' && (!shortExpression || !shortExpression.trim())) {
        toast.error('Please enter a SHORT expression when using Long/Short strategy type.');
        return;
      }
      
      request = {
        indicators: selectedIndicators,
        strategy_type: strategyType,
        long_expression: longExpression,
        cash_expression: strategyType === 'long_cash' && cashExpression && cashExpression.trim() ? cashExpression : undefined,
        short_expression: strategyType === 'long_short' && shortExpression && shortExpression.trim() ? shortExpression : undefined,
        initial_capital: initialCapital,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        options: { allow_short: strategyType === 'long_short' },
      };
    } else {
      // Use single expression (legacy or simple mode)
      const effectiveExpression = mode === 'advanced' ? expression : getSimpleExpression();
      if (!effectiveExpression || !effectiveExpression.trim()) {
        toast.error('Please enter a strategy expression. Add indicators and build your expression using the builder above.');
        return;
      }
      
      request = {
        indicators: selectedIndicators,
        strategy_type: strategyType,
        expression: effectiveExpression,
        initial_capital: initialCapital,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        options: { allow_short: strategyType === 'long_short' },
      };
    }

    try {
      await runModularBacktest(request);
      toast.success('Backtest completed successfully!');
    } catch (error) {
      console.error('Modular backtest error in Dashboard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Backtest failed';
      toast.error(errorMessage);
    }
  }, [selectedIndicators, expression, longExpression, cashExpression, shortExpression, strategyType, useSeparateExpressions, mode, initialCapital, runModularBacktest, toast, getAvailableConditions]);

  // Generate simple expression (AND logic for all indicators)
  const generateSimpleExpression = useCallback(() => {
    if (selectedIndicators.length === 0) return '';
    
    const conditions = getAvailableConditions();
    const indicatorConditions = selectedIndicators.map(indicator => {
      const indicatorConditions = Object.keys(conditions).filter(cond => 
        cond.startsWith(indicator.id.toLowerCase())
      );
      return indicatorConditions[0] || `${indicator.id.toLowerCase()}_condition`;
    });
    
    return indicatorConditions.join(' AND ');
  }, [selectedIndicators, getAvailableConditions]);

  // Auto-generate default expression when indicators are added (in advanced mode)
  const generateDefaultExpression = useCallback(() => {
    if (selectedIndicators.length === 0) return '';
    
    const conditions = getAvailableConditions();
    const conditionList: string[] = [];
    
    selectedIndicators.forEach(indicator => {
      // Get the first available condition for this indicator
      const indicatorConditions = Object.keys(conditions).filter(cond => 
        cond.startsWith(indicator.id.toLowerCase())
      );
      
      if (indicatorConditions.length > 0) {
        // Prefer certain conditions based on indicator type
        const preferredConditions = [
          `${indicator.id.toLowerCase()}_cross_up`,
          `${indicator.id.toLowerCase()}_oversold`,
          `${indicator.id.toLowerCase()}_cross_above`,
          `${indicator.id.toLowerCase()}_above`,
        ];
        
        let selectedCondition = indicatorConditions.find(c => preferredConditions.includes(c));
        if (!selectedCondition) {
          selectedCondition = indicatorConditions[0];
        }
        
        conditionList.push(selectedCondition);
      }
    });
    
    // Join with AND if 2 or fewer, otherwise use parentheses for clarity
    if (conditionList.length <= 2) {
      return conditionList.join(' AND ');
    } else {
      return conditionList.join(' AND ');
    }
  }, [selectedIndicators, getAvailableConditions]);

  // Auto-generate expression when indicators change (only if expressions are empty and in advanced mode)
  useEffect(() => {
    // Only auto-generate if expressions are currently empty
    if (mode === 'advanced' && selectedIndicators.length > 0) {
      if (useSeparateExpressions) {
        // Auto-generate long expression if empty
        if (!longExpression.trim()) {
          const defaultExpr = generateDefaultExpression();
          if (defaultExpr && defaultExpr.trim()) {
            setLongExpression(defaultExpr);
          }
        }
      } else {
        // Auto-generate single expression if empty
        if (!expression.trim()) {
          const defaultExpr = generateDefaultExpression();
          if (defaultExpr && defaultExpr.trim()) {
            setExpression(defaultExpr);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndicators, mode, useSeparateExpressions]); // Intentionally exclude expressions to avoid re-triggering

  // Handle loading a saved strategy
  const handleLoadStrategy = useCallback((strategy: SavedStrategy) => {
    // Validate that catalog is loaded
    if (!availableIndicators) {
      toast.error('Indicator catalog not loaded yet. Please wait and try again.');
      return;
    }

    // Filter out invalid indicators (those not in current catalog)
    const validIndicators = strategy.indicators.filter(ind => {
      return availableIndicators[ind.id] !== undefined;
    });

    const invalidCount = strategy.indicators.length - validIndicators.length;
    
    if (validIndicators.length === 0) {
      toast.error('No valid indicators found in the saved strategy for the current catalog.');
      return;
    }

    if (invalidCount > 0) {
      toast.warning(`Loaded strategy with ${invalidCount} invalid indicator(s) removed.`);
    }

    // Clear existing indicators first
    clearSelectedIndicators();

    // Set all indicators at once (atomic operation)
    // Use a small timeout to ensure clearSelectedIndicators completes first
    setTimeout(() => {
      setIndicators(validIndicators);
    }, 0);

    // Set mode
    setMode(strategy.is_advanced_mode ? 'advanced' : 'simple');

    // Update initial capital
    setInitialCapital(strategy.initial_capital);

    // Update expression
    setExpression(strategy.expression || '');

    toast.success(`Strategy "${strategy.name}" loaded successfully!`);
  }, [clearSelectedIndicators, setIndicators, availableIndicators, toast]);

  // Handle overlay toggle
  const handleToggleOverlay = useCallback((indicatorId: string, show: boolean) => {
    setOverlayStates(prev => ({
      ...prev,
      [indicatorId]: show
    }));
  }, []);

  // Generate overlay signals for price chart
  const generateOverlaySignals = useCallback(() => {
    if (!modularResponse?.individual_results) return {};

    const overlaySignals: Record<string, { buy: { x: string[], y: number[] }, sell: { x: string[], y: number[] } }> = {};

    Object.entries(modularResponse.individual_results).forEach(([indicatorId, result]) => {
      if (overlayStates[indicatorId] && result.equity_curve && result.equity_curve.length > 0) {
        const buySignals: { x: string[], y: number[] } = { x: [], y: [] };
        const sellSignals: { x: string[], y: number[] } = { x: [], y: [] };

        for (let i = 1; i < result.equity_curve.length; i++) {
          const prevPosition = result.equity_curve[i - 1].Position;
          const currentPosition = result.equity_curve[i].Position;

          if (prevPosition === 0 && currentPosition === 1) {
            buySignals.x.push(result.equity_curve[i].Date);
            buySignals.y.push(result.equity_curve[i].Price);
          } else if (prevPosition === 1 && currentPosition === 0) {
            sellSignals.x.push(result.equity_curve[i].Date);
            sellSignals.y.push(result.equity_curve[i].Price);
          }
        }

        overlaySignals[indicatorId] = { buy: buySignals, sell: sellSignals };
      }
    });

    return overlaySignals;
  }, [modularResponse, overlayStates]);

  // Generate individual equity data for equity chart
  const generateIndividualEquityData = useCallback(() => {
    if (!modularResponse?.individual_results) return {};

    const individualEquityData: Record<string, any[]> = {};

    Object.entries(modularResponse.individual_results).forEach(([indicatorId, result]) => {
      if (result.equity_curve && result.equity_curve.length > 0) {
        individualEquityData[indicatorId] = result.equity_curve;
      }
    });

    return individualEquityData;
  }, [modularResponse]);

  // Load initial data
  useEffect(() => {
    loadDataInfo();
    loadStrategies();
  }, [loadDataInfo, loadStrategies]);

  // Initialize endDate when dataInfo loads
  useEffect(() => {
    if (dataInfo?.data_info?.date_range?.end && !endDate) {
      setEndDate(dataInfo.data_info.date_range.end);
    }
  }, [dataInfo, endDate]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Bitcoin Trading Strategy Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Backtest and analyze Bitcoin trading strategies
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {dataInfo && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{dataInfo.data_info.total_records.toLocaleString()}</span> records
                  <span className="mx-2">•</span>
                  <span>{dataInfo.data_info.date_range.start}</span> to{' '}
                  <span>{dataInfo.data_info.date_range.end}</span>
                </div>
              )}
              <LoginButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Error Display */}
          {(legacyError || modularError || catalogError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">
                    {legacyError || modularError || catalogError}
                  </p>
                </div>
                <button
                  onClick={() => {
                    clearLegacyError();
                    clearModularError();
                  }}
                  className="text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Strategy Mode</h2>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${mode === 'simple' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  Simple
                </span>
                <button
                  onClick={() => setMode(mode === 'simple' ? 'advanced' : 'simple')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    mode === 'advanced' ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      mode === 'advanced' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm ${mode === 'advanced' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  Advanced
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {mode === 'simple' 
                ? 'Use pre-built strategies with simple parameter configuration.'
                : 'Build custom strategies by combining technical indicators with boolean expressions.'
              }
            </p>
          </div>

          {/* Date Range Picker */}
          {dataInfo && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Backtest Date Range</h2>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                minDate={dataInfo.data_info.date_range.start}
                maxDate={dataInfo.data_info.date_range.end}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
            </div>
          )}

          {/* Strategy Configuration */}
          {mode === 'simple' ? (
            <StrategySelector
              strategies={strategies?.strategies || null}
              onRunBacktest={handleRunBacktest}
              loading={legacyLoading}
            />
          ) : (
            <div className="space-y-6">
              {/* Indicator Catalog */}
              <IndicatorCatalog
                availableIndicators={availableIndicators}
                onAddIndicator={addIndicator}
                selectedIndicatorIds={selectedIndicators.map(ind => ind.id)}
                isLoading={catalogLoading}
              />

              {/* Strategy Makeup */}
              <StrategyMakeup
                selectedIndicators={selectedIndicators}
                availableIndicators={availableIndicators}
                onUpdateIndicatorParams={updateIndicatorParams}
                onUpdateIndicatorShowOnChart={updateIndicatorShowOnChart}
                onRemoveIndicator={removeIndicator}
                onUpdateExpression={setExpression}
                onUpdateLongExpression={setLongExpression}
                onUpdateCashExpression={setCashExpression}
                onUpdateShortExpression={setShortExpression}
                onRunBacktest={handleModularBacktest}
                isLoading={modularLoading}
                initialCapital={initialCapital}
                onUpdateInitialCapital={setInitialCapital}
                expression={expression}
                longExpression={longExpression}
                cashExpression={cashExpression}
                shortExpression={shortExpression}
                useSeparateExpressions={useSeparateExpressions}
                onToggleSeparateExpressions={setUseSeparateExpressions}
                strategyType={strategyType}
                onStrategyTypeChange={setStrategyType}
                availableConditions={getAvailableConditions()}
                onLoadStrategy={handleLoadStrategy}
                onToast={(message, type) => {
                  if (type === 'success') toast.success(message);
                  else if (type === 'error') toast.error(message);
                  else if (type === 'warning') toast.warning(message);
                  else toast.info(message);
                }}
              />
            </div>
          )}

          {/* Loading State */}
          {(legacyLoading || modularLoading) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Running backtest...</span>
              </div>
            </div>
          )}

          {/* Results Section */}
          {(legacyResults || modularResponse) && (
            <div id="results-section" className="space-y-6 animate-fade-in">
              {/* Legacy Results */}
              {legacyResults && legacyResults.results && (
                <>
                  {/* Metrics Panel */}
                  {legacyResults.results.metrics && (
                    <MetricsCard metrics={legacyResults.results.metrics} />
                  )}

                  {/* Charts */}
                  {legacyResults.results.equity_curve && Array.isArray(legacyResults.results.equity_curve) && (
                    <>
                      <ErrorBoundary>
                        <PriceChart
                          data={legacyResults.results.equity_curve}
                          title="Bitcoin Price with Trading Signals"
                        />
                      </ErrorBoundary>
                      <ErrorBoundary>
                        <EquityChart
                          data={legacyResults.results.equity_curve}
                          title="Portfolio Equity Curve"
                        />
                      </ErrorBoundary>
                    </>
                  )}

                  {/* Trade Log */}
                  {legacyResults.results.trade_log && (
                    <ErrorBoundary>
                      <TradeLogTable trades={legacyResults.results.trade_log} />
                    </ErrorBoundary>
                  )}
                </>
              )}

              {/* Modular Results */}
              {modularResponse && modularResponse.combined_result && (
                <ResultsSection
                  combinedResult={modularResponse.combined_result}
                  individualResults={modularResponse.individual_results || {}}
                  isLoading={modularLoading}
                  overlaySignals={generateOverlaySignals()}
                />
              )}
            </div>
          )}

          {/* No Results State */}
          {!legacyResults && !modularResponse && !legacyLoading && !modularLoading && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Ready to Run a Backtest
              </h3>
              <p className="text-gray-500">
                {mode === 'simple' 
                  ? 'Select a strategy and configure parameters to get started.'
                  : 'Add indicators to your strategy and configure parameters to get started.'
                }
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>
              Bitcoin Trading Strategy Dashboard - Built with React, FastAPI, and Plotly
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
