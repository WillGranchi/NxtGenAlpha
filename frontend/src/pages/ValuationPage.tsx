/**
 * Valuation Page
 * Main page for viewing mean-reverting indicators with z-scores
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useValuation } from '../hooks/useValuation';
import { ValuationControls } from '../components/valuation/ValuationControls';
import { ValuationChart } from '../components/valuation/ValuationChart';
import { ValuationTable } from '../components/valuation/ValuationTable';
import { SaveValuationModal } from '../components/valuation/SaveValuationModal';
import { PriceChart } from '../components/charts/PriceChart';
import { SymbolExchangeControls } from '../components/SymbolExchangeControls';
import ErrorBoundary from '../components/ErrorBoundary';
import { useMobile } from '../hooks/useMobile';
import { useAuth } from '../hooks/useAuth';
import TradingAPI from '../services/api';
import { Button } from '../components/ui/Button';
import { Save, Loader2, ChevronDown, ChevronUp, Settings, RefreshCw } from 'lucide-react';
import { getPagePriceCache, makePagePriceCacheKey, setPagePriceCache } from '../utils/pagePriceCache';
import { useMarketControls } from '../hooks/useMarketControls';

const ValuationPage: React.FC = () => {
  const { isMobile } = useMobile();
  const { isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<'chart' | 'table' | 'both'>('both');
  const [overboughtThreshold, setOverboughtThreshold] = useState<number>(1.0);
  const [oversoldThreshold, setOversoldThreshold] = useState<number>(-1.0);
  const [bandIndicatorId, setBandIndicatorId] = useState<string | 'average' | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadDropdown, setShowLoadDropdown] = useState(false);
  const [savedValuations, setSavedValuations] = useState<Array<{
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  }>>([]);
  const [loadingValuations, setLoadingValuations] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);
  const [useLogScale, setUseLogScale] = useState<boolean>(() => {
    const saved = localStorage.getItem('valuationChart_useLogScale');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Price data for the top chart
  const [priceData, setPriceData] = useState<Array<{
    Date: string;
    Price: number;
    Position: number;
    Portfolio_Value: number;
    Capital: number;
    Shares: number;
  }>>([]);
  const [priceDataLoading, setPriceDataLoading] = useState(false);
  // Persist market controls per-page (across full refresh)
  const market = useMarketControls('valuation');
  
  // Data info state
  const [dataSource, setDataSource] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const {
    availableIndicators,
    indicatorsLoading,
    indicatorsError,
    zscoreData,
    averages,
    zscoresLoading,
    zscoresError,
    selectedIndicators,
    setSelectedIndicators,
    zscoreMethod,
    setZscoreMethod,
    rollingWindow,
    setRollingWindow,
    showAverage,
    setShowAverage,
    averageWindow,
    setAverageWindow,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    timeframe,
    setTimeframe,
    symbol,
    setSymbol,
    exchange,
    setExchange,
  } = useValuation();

  // Keep valuation hook's symbol/date in sync with persisted market controls
  useEffect(() => {
    if (market.symbol !== symbol) setSymbol(market.symbol);
    if (market.exchange !== exchange) setExchange(market.exchange);
    if (market.startDate !== startDate) setStartDate(market.startDate);
    if (market.endDate !== endDate) setEndDate(market.endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market.symbol, market.exchange, market.startDate, market.endDate]);

  // When valuation page changes symbol/date, persist them back
  useEffect(() => {
    if (symbol && symbol !== market.symbol) market.setSymbol(symbol);
    if (exchange && exchange !== market.exchange) market.setExchange(exchange);
    if (startDate && startDate !== market.startDate) market.setStartDate(startDate);
    if (endDate && endDate !== market.endDate) market.setEndDate(endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, exchange, startDate, endDate]);

  // Set default band indicator when selected indicators change
  useEffect(() => {
    if (selectedIndicators.length > 0 && !bandIndicatorId) {
      // Default to first selected indicator
      setBandIndicatorId(selectedIndicators[0]);
    } else if (selectedIndicators.length === 0) {
      setBandIndicatorId(null);
    } else if (bandIndicatorId && bandIndicatorId !== 'average' && !selectedIndicators.includes(bandIndicatorId)) {
      // If current band indicator is no longer selected, switch to first available
      setBandIndicatorId(selectedIndicators[0]);
    }
  }, [selectedIndicators, bandIndicatorId]);

  // Update band indicator when average is enabled/disabled
  useEffect(() => {
    if (showAverage && bandIndicatorId === null && selectedIndicators.length > 0) {
      // If average is enabled and no band indicator set, default to first indicator
      setBandIndicatorId(selectedIndicators[0]);
    }
  }, [showAverage, selectedIndicators, bandIndicatorId]);

  // Auto-expand settings on desktop, collapse on mobile
  useEffect(() => {
    setSettingsExpanded(!isMobile);
  }, [isMobile]);

  const [initialLoadAttempted, setInitialLoadAttempted] = useState<boolean>(false);

  // Load price data for the top chart with optimistic UI
  const loadPriceData = useCallback(async (forceRefresh: boolean = false) => {
    const cacheKey = makePagePriceCacheKey({
      page: 'valuation',
      symbol,
      exchange,
      startDate: startDate || '',
      endDate: endDate || '',
      interval: '1d',
    });

    // Hydrate from in-memory cache (prevents blank flashes on navigation)
    const cached = getPagePriceCache<{
      priceData: any[];
      dataSource?: string;
      dateRange?: { start: string; end: string } | null;
      totalRecords?: number;
    }>(cacheKey);
    if (cached?.value?.priceData?.length && priceData.length === 0) {
      setPriceData(cached.value.priceData as any);
      if (cached.value.dataSource) setDataSource(cached.value.dataSource);
      if (cached.value.dateRange) setDateRange(cached.value.dateRange);
      if (typeof cached.value.totalRecords === 'number') setTotalRecords(cached.value.totalRecords);
    }

    // Optimistic UI: Don't set loading immediately if we have cached data
    // Only show loading on initial load or if no data exists
    const shouldShowLoading = priceData.length === 0;
    if (shouldShowLoading) {
      setPriceDataLoading(true);
    }
    
    try {
      // If force refresh is requested, refresh data in background (optimistic UI)
      if (forceRefresh) {
        // Don't await - let it run in background while showing cached data
        TradingAPI.refreshData(symbol, true, undefined, exchange)
          .catch((refreshErr) => {
            console.warn('Failed to refresh data:', refreshErr);
          });
      }

      // Load OHLC price data using getPriceHistory for candlestick chart
      const response = await TradingAPI.getPriceHistory({
        symbol,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        exchange: exchange,
        interval: '1d',
      });
      
      if (response.success && response.data) {
        const formattedData = response.data.map((d) => ({
          Date: d.date,
          Price: d.close, // Use close price as main price
          Position: 0, // No signals
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
        setPriceData(formattedData);
        setPagePriceCache(cacheKey, {
          priceData: formattedData,
          dataSource: 'coinglass',
          dateRange: response.data.length > 0 ? { start: response.data[0].date, end: response.data[response.data.length - 1].date } : null,
          totalRecords: response.data.length,
        });
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
      console.error('Failed to load price data:', err);
    } finally {
      if (shouldShowLoading) {
        setPriceDataLoading(false);
      }
    }
  }, [symbol, startDate, endDate, exchange, priceData.length]);

  // Auto-load CoinGlass data on initial page load
  useEffect(() => {
    if (!initialLoadAttempted) {
      setInitialLoadAttempted(true);
      // Automatically refresh and load data on first page load
      loadPriceData(true);
    }
  }, []); // Only run once on mount

  // Reload data when symbol, startDate, endDate, or exchange changes (but don't force refresh)
  useEffect(() => {
    if (initialLoadAttempted) {
      loadPriceData(false);
    }
  }, [symbol, startDate, endDate, exchange, initialLoadAttempted, loadPriceData]);

  // Load saved valuations
  useEffect(() => {
    if (isAuthenticated && showLoadDropdown) {
      loadSavedValuations();
    }
  }, [isAuthenticated, showLoadDropdown]);

  const loadSavedValuations = async () => {
    try {
      setLoadingValuations(true);
      const response = await TradingAPI.listValuations();
      setSavedValuations(response.valuations);
    } catch (err: any) {
      console.error('Failed to load valuations:', err);
    } finally {
      setLoadingValuations(false);
    }
  };

  const handleSaveClick = () => {
    if (!isAuthenticated) {
      alert('Please log in to save valuations to your account.');
      return;
    }

    if (selectedIndicators.length === 0) {
      alert('Please select at least one indicator before saving.');
      return;
    }

    setShowSaveModal(true);
  };

  const handleSaveValuation = async (name: string, description?: string) => {
    try {
      await TradingAPI.saveValuation({
        name,
        description,
        indicators: selectedIndicators,
        zscore_method: zscoreMethod,
        rolling_window: rollingWindow,
        average_window: averageWindow || undefined,
        show_average: showAverage,
        overbought_threshold: overboughtThreshold,
        oversold_threshold: oversoldThreshold,
        symbol,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setShowSaveModal(false);
      alert(`Valuation "${name}" saved successfully!`);
    } catch (error: any) {
      throw error; // Let modal handle the error display
    }
  };

  const handleLoadValuation = async (valuationId: number) => {
    try {
      const valuation = await TradingAPI.getValuation(valuationId);
      
      // Load valuation settings
      setSelectedIndicators(valuation.indicators);
      setZscoreMethod(valuation.zscore_method);
      setRollingWindow(valuation.rolling_window);
      setAverageWindow(valuation.average_window);
      setShowAverage(valuation.show_average);
      setOverboughtThreshold(valuation.overbought_threshold);
      setOversoldThreshold(valuation.oversold_threshold);
      setSymbol(valuation.symbol);
      setStartDate(valuation.start_date || '');
      setEndDate(valuation.end_date || '');
      
      setShowLoadDropdown(false);
      alert(`Valuation "${valuation.name}" loaded successfully!`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load valuation');
    }
  };

  // Handle manual data refresh
  const handleRefreshData = async () => {
    setPriceDataLoading(true);
    try {
      // Force refresh from CoinGlass
      await TradingAPI.refreshData(symbol, true, undefined, exchange);
      // Reload price data after refresh
      await loadPriceData(false);
    } catch (err: any) {
      console.error('Failed to refresh data:', err);
    } finally {
      setPriceDataLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-primary p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">Valuation</h1>
              <p className="text-sm sm:text-base text-text-secondary">
                Analyze mean-reverting indicators with z-scores to identify overbought and oversold states
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative">
                <Button
                  onClick={() => {
                    setShowLoadDropdown(!showLoadDropdown);
                    if (!showLoadDropdown && isAuthenticated) {
                      loadSavedValuations();
                    }
                  }}
                  variant="secondary"
                  size="sm"
                >
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Load
                </Button>
                {showLoadDropdown && isAuthenticated && (
                  <div className="absolute right-0 mt-2 w-full sm:w-64 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {loadingValuations ? (
                      <div className="p-4 text-center text-text-muted">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Loading...</p>
                      </div>
                    ) : savedValuations.length === 0 ? (
                      <div className="p-4 text-center text-text-muted text-sm">
                        No saved valuations
                      </div>
                    ) : (
                      savedValuations.map((valuation) => (
                        <button
                          key={valuation.id}
                          onClick={() => handleLoadValuation(valuation.id)}
                          className="w-full text-left p-3 hover:bg-bg-tertiary transition-colors border-b border-border-default last:border-b-0"
                        >
                          <div className="font-medium text-text-primary">{valuation.name}</div>
                          {valuation.description && (
                            <div className="text-sm text-text-secondary mt-1 line-clamp-1">
                              {valuation.description}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <Button
                onClick={handleSaveClick}
                variant="primary"
                size="sm"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          {/* Error Messages */}
          {indicatorsError && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">Error loading indicators: {indicatorsError}</p>
            </div>
          )}

          {zscoresError && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">Error calculating z-scores: {zscoresError}</p>
            </div>
          )}

          {/* Price Chart - Full Width at Top */}
          {priceData.length > 0 && (
            <div className="w-full">
              {priceDataLoading ? (
                <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
                  <div className="text-center text-text-muted">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
                    <p>Loading price data...</p>
                  </div>
                </div>
              ) : (
                <PriceChart
                  data={priceData}
                  title={`${symbol} Price Chart`}
                  height={isMobile ? 400 : 600}
                  useLogScale={useLogScale}
                  onLogScaleToggle={(useLog) => {
                    setUseLogScale(useLog);
                    localStorage.setItem('valuationChart_useLogScale', String(useLog));
                  }}
                />
              )}
            </div>
          )}

          {/* Symbol, Exchange & Date Range Controls */}
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
            isRefreshingData={priceDataLoading}
            maxDaysRange={999}
            showDataInfo={true}
            dataSource={dataSource}
            dateRange={dateRange}
            totalRecords={totalRecords}
          />

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
                <ValuationControls
                  availableIndicators={availableIndicators}
                  selectedIndicators={selectedIndicators}
                  onIndicatorsChange={setSelectedIndicators}
                  zscoreMethod={zscoreMethod}
                  onZscoreMethodChange={setZscoreMethod}
                  rollingWindow={rollingWindow}
                  onRollingWindowChange={setRollingWindow}
                  showAverage={showAverage}
                  onShowAverageChange={setShowAverage}
                  averageWindow={averageWindow}
                  onAverageWindowChange={setAverageWindow}
                  overboughtThreshold={overboughtThreshold}
                  onOverboughtThresholdChange={setOverboughtThreshold}
                  oversoldThreshold={oversoldThreshold}
                  onOversoldThresholdChange={setOversoldThreshold}
                  startDate={startDate}
                  onStartDateChange={setStartDate}
                  endDate={endDate}
                  onEndDateChange={setEndDate}
                  timeframe={timeframe}
                  onTimeframeChange={setTimeframe}
                  bandIndicatorId={bandIndicatorId}
                  onBandIndicatorChange={setBandIndicatorId}
                />
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="bg-bg-secondary border border-border-default rounded-lg p-1 inline-flex">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                  viewMode === 'chart'
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                  viewMode === 'table'
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('both')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                  viewMode === 'both'
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Both
              </button>
            </div>
          </div>

          {/* Z-Score Chart/Table Content */}
          <div className="space-y-6">
            {/* Chart View */}
            {(viewMode === 'chart' || viewMode === 'both') && (
              <div>
                {zscoresLoading ? (
                  <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
                    <div className="text-center text-text-muted">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
                      <p>Calculating z-scores...</p>
                    </div>
                  </div>
                ) : (
                  <ValuationChart
                    data={zscoreData}
                    availableIndicators={availableIndicators}
                    selectedIndicators={selectedIndicators}
                    showAverage={showAverage}
                    bandIndicatorId={bandIndicatorId}
                    overboughtThreshold={overboughtThreshold}
                    oversoldThreshold={oversoldThreshold}
                    height={isMobile ? 400 : 600}
                  />
                )}
              </div>
            )}

            {/* Table View */}
            {(viewMode === 'table' || viewMode === 'both') && (
              <div>
                {zscoresLoading ? (
                  <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
                    <div className="text-center text-text-muted">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
                      <p>Calculating z-scores...</p>
                    </div>
                  </div>
                ) : (
                  <ValuationTable
                    data={zscoreData}
                    averages={averages}
                    availableIndicators={availableIndicators}
                    selectedIndicators={selectedIndicators}
                    showAverage={showAverage}
                    overboughtThreshold={overboughtThreshold}
                    oversoldThreshold={oversoldThreshold}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Valuation Modal */}
      <SaveValuationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveValuation}
      />
    </ErrorBoundary>
  );
};

export default ValuationPage;
