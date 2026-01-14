/**
 * Indicators Page
 * Analyze individual indicators and combine them using majority voting
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IndicatorSelector } from '../components/indicators/IndicatorSelector';
import { OverallStrategySummation } from '../components/indicators/OverallStrategySummation';
import { IndividualIndicatorSection } from '../components/indicators/IndividualIndicatorSection';
import { IndicatorSignalPanel } from '../components/indicators/IndicatorSignalPanel';
import { VisualConditionBuilder } from '../components/strategy/VisualConditionBuilder';
import { DateRangePicker } from '../components/DateRangePicker';
import { SymbolExchangeControls } from '../components/SymbolExchangeControls';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PriceChart } from '../components/charts/PriceChart';
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
  // Store symbol in internal format (BTCUSDT) for API calls
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [exchange, setExchange] = useState<string>('Binance');
  
  // Data info state
  const [dataSource, setDataSource] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  // Calculate max start date (999 days back from end date)
  const calculateMaxStartDate = (endDateStr: string): string => {
    const end = new Date(endDateStr);
    const maxStart = new Date(end);
    maxStart.setDate(maxStart.getDate() - 999);
    return maxStart.toISOString().split('T')[0];
  };

  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return calculateMaxStartDate(today);
  });
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
  const [initialLoadAttempted, setInitialLoadAttempted] = useState<boolean>(false);
  const [useLogScale, setUseLogScale] = useState<boolean>(() => {
    const saved = localStorage.getItem('indicatorsChart_useLogScale');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Auto-expand settings on desktop, collapse on mobile
  useEffect(() => {
    setSettingsExpanded(!isMobile);
  }, [isMobile]);
  
  // Load base price data for default chart display with optimistic UI and progressive loading
  const loadBasePriceData = useCallback(async (forceRefresh: boolean = false, progressive: boolean = false) => {
    try {
      // Symbol is already in internal format (BTCUSDT)
      const internalSymbol = symbol;
      
      // Progressive loading: Load last 30 days first (fast), then full history in background
      if (progressive && startDate) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentStartDate = thirtyDaysAgo.toISOString().split('T')[0];
        
        // Load recent data first (optimistic UI) - use getPriceHistory for OHLC data
        try {
          const recentResponse = await TradingAPI.getPriceHistory({
            symbol: internalSymbol,
            start_date: recentStartDate,
            end_date: endDate || undefined,
            exchange: exchange,
            interval: '1d',
          });
          
          if (recentResponse.success && recentResponse.data) {
            const recentData = recentResponse.data.map((d) => ({
              Date: d.date,
              Price: d.close, // Use close price as main price
              Position: 0,
              Portfolio_Value: d.close,
              Capital: 0,
              Shares: 0,
              // Include OHLC data for candlestick chart
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume,
            }));
            setBasePriceData(recentData);
            setError(null);
            // Update data info
            if (recentResponse.data.length > 0) {
              setDataSource('coinglass');
              setDateRange({
                start: recentResponse.data[0].date,
                end: recentResponse.data[recentResponse.data.length - 1].date,
              });
              setTotalRecords(recentResponse.data.length);
            }
          }
        } catch (recentErr) {
          console.warn('Failed to load recent data:', recentErr);
        }
        
        // Then load full history in background (non-blocking)
        // Use requestAnimationFrame to ensure UI is responsive first
        requestAnimationFrame(() => {
          setTimeout(async () => {
            try {
              const fullResponse = await TradingAPI.getPriceHistory({
                symbol: internalSymbol,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                exchange: exchange,
                interval: '1d',
              });
              
              if (fullResponse.success && fullResponse.data) {
                const fullData = fullResponse.data.map((d) => ({
                  Date: d.date,
                  Price: d.close, // Use close price as main price
                  Position: 0,
                  Portfolio_Value: d.close,
                  Capital: 0,
                  Shares: 0,
                  // Include OHLC data for candlestick chart
                  open: d.open,
                  high: d.high,
                  low: d.low,
                  close: d.close,
                  volume: d.volume,
                }));
                setBasePriceData(fullData);
                // Update data info
                if (fullResponse.data.length > 0) {
                  setDataSource('coinglass');
                  setDateRange({
                    start: fullResponse.data[0].date,
                    end: fullResponse.data[fullResponse.data.length - 1].date,
                  });
                  setTotalRecords(fullResponse.data.length);
                }
              }
            } catch (fullErr) {
              console.warn('Failed to load full history:', fullErr);
            }
          }, 500); // Increased delay to ensure recent data is displayed first
        });
        
        return;
      }
      
      // If force refresh is requested, refresh data from CoinGlass in background
      // Show cached data immediately (optimistic UI)
      if (forceRefresh) {
        setIsRefreshingData(true);
        // Don't await - let it run in background while showing cached data
        TradingAPI.refreshData(internalSymbol, true, undefined, exchange)
          .catch((refreshErr) => {
            console.warn('Failed to refresh data from CoinGlass:', refreshErr);
          })
          .finally(() => {
            setIsRefreshingData(false);
          });
      }

      // Load data (will use cached if available, or fetch fresh)
      const response = await TradingAPI.getValuationData({
        symbol: internalSymbol,
        indicators: [], // No indicators, just price
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        exchange: exchange,
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
        // Update data info
        if (response.data.length > 0) {
          setDataSource('coinglass');
          setDateRange({
            start: response.data[0].date,
            end: response.data[response.data.length - 1].date,
          });
          setTotalRecords(response.data.length);
        }
      }
      } catch (err) {
        console.error('Failed to load base price data:', err);
        setError('Failed to load price data. Click "Refresh Data" to fetch from CoinGlass.');
      }
  }, [symbol, startDate, endDate]);

  // Auto-load CoinGlass data on initial page load with progressive loading
  useEffect(() => {
    if (!initialLoadAttempted) {
      setInitialLoadAttempted(true);
      // Use progressive loading: show last 30 days immediately, then load full history
      loadBasePriceData(false, true);
    }
  }, []); // Only run once on mount

  // Reload data when symbol, startDate, or endDate changes (but don't force refresh)
  useEffect(() => {
    if (initialLoadAttempted) {
      loadBasePriceData(false);
    }
  }, [symbol, startDate, endDate, exchange, initialLoadAttempted, loadBasePriceData]);


  // Handle manual data refresh
  const handleRefreshData = async () => {
    setIsRefreshingData(true);
    setError(null);
    try {
      // Symbol is already in internal format
      // Force refresh from CoinGlass (will use token launch date automatically)
      await TradingAPI.refreshData(symbol, true, undefined, exchange);
      // Reload price data after refresh
      await loadBasePriceData();
      setError(null);
    } catch (err: any) {
      console.error('Failed to refresh data:', err);
      const errorDetail = err?.response?.data?.detail || 'Failed to refresh data from CoinGlass';
      setError(errorDetail);
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
        long_expression: expression.trim(),
        strategy_type: strategyType,
        initial_capital: initialCapital,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        symbol: symbol, // Already in internal format
        exchange: exchange,
      });
      
      if (!backtestResponse.success) {
        throw new Error('Failed to generate signals');
      }
      
      // Extract price data from equity curve
      const equityCurve = backtestResponse.combined_result.equity_curve || [];
      const individualResults = backtestResponse.individual_results || {};
      
      // Create a map of dates to data points
      const dateToDataPoint: Record<string, any> = {};
      
      equityCurve.forEach((point: EquityDataPoint) => {
        const dateStr = point.Date;
        dateToDataPoint[dateStr] = {
          Date: dateStr,
          Price: point.Price || point.Portfolio_Value || 0,
          Position: point.Position || 0,
          Portfolio_Value: point.Portfolio_Value || 0,
          Capital: point.Capital || 0,
          Shares: point.Shares || 0,
        };
        
        // Preserve any additional fields from the combined result
        Object.keys(point).forEach((key) => {
          if (!dateToDataPoint[dateStr].hasOwnProperty(key)) {
            dateToDataPoint[dateStr][key] = (point as any)[key];
          }
        });
      });
      
      // Add per-indicator positions from individual results
      selectedIndicators.forEach((indicator) => {
        const indicatorId = indicator.id;
        const individualResult = individualResults[indicatorId];
        
        if (individualResult && individualResult.equity_curve) {
          individualResult.equity_curve.forEach((point: EquityDataPoint) => {
            const dateStr = point.Date;
            if (dateToDataPoint[dateStr]) {
              // Add per-indicator position
              dateToDataPoint[dateStr][`${indicatorId}_Position`] = point.Position || 0;
            }
          });
        }
      });
      
      // Convert map back to array
      const formattedPriceData = Object.values(dateToDataPoint).sort((a: any, b: any) => 
        a.Date.localeCompare(b.Date)
      );
      
      setPriceData(formattedPriceData);
        
      // Set combined result
      setCombinedResult(backtestResponse.combined_result);
      
      // Extract combined signals from equity curve
      const signals = equityCurve.map((point: EquityDataPoint) => point.Position || 0);
      setCombinedSignals(signals);
      
      // Set individual results (if available)
      setIndividualResults(individualResults);
      
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

  // Prepare chart data - use combined signals if available, otherwise use base price data
  const chartData = useMemo(() => {
    const hasCombinedSignals = priceData.length > 0 && combinedSignals.length > 0;
    
    if (hasCombinedSignals) {
      return priceData.map((point, index) => ({
        Date: point.Date,
        Price: point.Price,
        Position: index < combinedSignals.length ? combinedSignals[index] : 0,
        Portfolio_Value: point.Price,
        Capital: 0,
        Shares: 0,
      }));
    }
    
    // Use base price data when no indicators selected
    return basePriceData || [];
  }, [priceData, combinedSignals, basePriceData]);

  // Generate overlay signals for all indicators
  const overlaySignals = useMemo(() => {
    if (!priceData || priceData.length === 0) return {};

    const signals: Record<string, { buy: { x: string[]; y: number[] }; sell: { x: string[]; y: number[] } }> = {};

    selectedIndicators.forEach((indicator) => {
      const indicatorId = indicator.id;
      const buySignals: { x: string[]; y: number[] } = { x: [], y: [] };
      const sellSignals: { x: string[]; y: number[] } = { x: [], y: [] };

      for (let i = 1; i < priceData.length; i++) {
        const prevPosition = priceData[i - 1][`${indicatorId}_Position`] ?? 0;
        const currentPosition = priceData[i][`${indicatorId}_Position`] ?? 0;

        if (prevPosition === 0 && currentPosition === 1) {
          buySignals.x.push(priceData[i].Date);
          buySignals.y.push(priceData[i].Price);
        } else if (prevPosition === 1 && currentPosition === 0) {
          sellSignals.x.push(priceData[i].Date);
          sellSignals.y.push(priceData[i].Price);
        }
      }

      signals[indicatorId] = { buy: buySignals, sell: sellSignals };
    });

    return signals;
  }, [priceData, selectedIndicators]);

  // Generate combined buy/sell signals
  const combinedOverlaySignals = useMemo((): Record<string, { buy: { x: string[]; y: number[] }; sell: { x: string[]; y: number[] } }> => {
    if (!chartData || chartData.length === 0) {
      return {};
    }

    const buySignals: { x: string[]; y: number[] } = { x: [], y: [] };
    const sellSignals: { x: string[]; y: number[] } = { x: [], y: [] };

    for (let i = 1; i < chartData.length; i++) {
      const prevPosition = chartData[i - 1].Position;
      const currentPosition = chartData[i].Position;

      if (prevPosition === 0 && currentPosition === 1) {
        buySignals.x.push(chartData[i].Date);
        buySignals.y.push(chartData[i].Price);
      } else if (prevPosition === 1 && currentPosition === 0) {
        sellSignals.x.push(chartData[i].Date);
        sellSignals.y.push(chartData[i].Price);
      }
    }

    return {
      Combined: { buy: buySignals, sell: sellSignals },
    };
  }, [chartData]);

  const hasResults = !!(combinedResult && combinedSignals.length > 0);
  const hasPriceData = chartData.length > 0;
  
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

          {/* Chart Area - Full Width at Top */}
          {hasPriceData && (
            <div className="w-full space-y-4">
              {isLoading ? (
                <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
                  <div className="text-center text-text-muted">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
                    <p>Generating signals...</p>
                  </div>
                </div>
              ) : (
                <>
                  <PriceChart
                    data={chartData}
                    title={hasResults ? "Overall Strategy - Combined Trading Signals" : "BTC Price Chart"}
                    height={isMobile ? 400 : 600}
                    overlaySignals={hasResults ? { ...overlaySignals, ...combinedOverlaySignals } : {}}
                    showOverlayLegend={hasResults}
                    useLogScale={useLogScale}
                    onLogScaleToggle={(useLog) => {
                      setUseLogScale(useLog);
                      localStorage.setItem('indicatorsChart_useLogScale', String(useLog));
                    }}
                  />
                  
                  {/* Indicator Signal Panel - Show when indicators are selected and signals are generated */}
                  {selectedIndicators.length > 0 && hasResults && priceData.length > 0 && (
                    <IndicatorSignalPanel
                      indicators={selectedIndicators.map((ind) => ({
                        id: ind.id,
                        name: availableIndicators?.[ind.id]?.name || ind.id,
                      }))}
                      priceData={priceData}
                      height={isMobile ? 150 : 200}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Settings Bar (Collapsible) */}
          <div className="bg-bg-secondary border border-border-default rounded-lg relative z-10">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors rounded-t-lg"
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
              <div className="border-t border-border-default p-6 rounded-b-lg">
                <SymbolExchangeControls
                  symbol={symbol}
                  onSymbolChange={setSymbol}
                  exchange={exchange}
                  onExchangeChange={setExchange}
                  startDate={startDate}
                  onStartDateChange={setStartDate}
                  endDate={endDate}
                  onEndDateChange={setEndDate}
                  onRefreshData={handleRefreshData}
                  isRefreshingData={isRefreshingData}
                  maxDaysRange={999}
                  showDataInfo={true}
                  dataSource={dataSource}
                  dateRange={dateRange}
                  totalRecords={totalRecords}
                />
                {error && (
                  <div className="mt-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
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
