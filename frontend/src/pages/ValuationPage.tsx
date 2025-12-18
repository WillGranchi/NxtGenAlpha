/**
 * Valuation Page
 * Main page for viewing mean-reverting indicators with z-scores
 */

import React, { useState, useEffect } from 'react';
import { useValuation } from '../hooks/useValuation';
import { ValuationControls } from '../components/valuation/ValuationControls';
import { ValuationChart } from '../components/valuation/ValuationChart';
import { ValuationTable } from '../components/valuation/ValuationTable';
import { SaveValuationModal } from '../components/valuation/SaveValuationModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { useMobile } from '../hooks/useMobile';
import { useAuth } from '../hooks/useAuth';
import TradingAPI from '../services/api';
import { Button } from '../components/ui/Button';
import { Save, Loader2, ChevronDown } from 'lucide-react';

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
  } = useValuation();

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

          {/* View Mode Toggle (Mobile) */}
          {isMobile && (
            <div className="flex gap-2 bg-bg-secondary border border-border-default rounded-lg p-2">
              <button
                onClick={() => setViewMode('chart')}
                className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-primary-500 text-white'
                    : 'bg-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary-500 text-white'
                    : 'bg-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('both')}
                className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                  viewMode === 'both'
                    ? 'bg-primary-500 text-white'
                    : 'bg-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Both
              </button>
            </div>
          )}

          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'}`}>
            {/* Controls Sidebar */}
            <div className={isMobile ? '' : 'lg:col-span-1'}>
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
                symbol={symbol}
                onSymbolChange={setSymbol}
                isLoading={indicatorsLoading || zscoresLoading}
              />
            </div>

            {/* Main Content Area */}
            <div className={isMobile ? '' : 'lg:col-span-3'}>
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
