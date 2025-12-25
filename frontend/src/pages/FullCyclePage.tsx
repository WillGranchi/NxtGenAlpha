/**
 * Full Cycle Page
 * Main page for viewing BTC full cycle indicators with z-scores
 */

import React from 'react';
import { useFullCycle } from '../hooks/useFullCycle';
import { FullCycleChart } from '../components/fullcycle/FullCycleChart';
import { FullCycleControls } from '../components/fullcycle/FullCycleControls';
import ErrorBoundary from '../components/ErrorBoundary';
import { useMobile } from '../hooks/useMobile';

const FullCyclePage: React.FC = () => {
  const { isMobile } = useMobile();
  
  const {
    availableIndicators,
    indicatorsLoading,
    indicatorsError,
    zscoreData,
    roc,
    zscoresLoading,
    zscoresError,
    selectedIndicators,
    setSelectedIndicators,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    rocDays,
    setRocDays,
    visibleIndicators,
    setVisibleIndicators,
    toggleIndicatorVisibility,
    showFundamentalAverage,
    setShowFundamentalAverage,
    showTechnicalAverage,
    setShowTechnicalAverage,
    showOverallAverage,
    setShowOverallAverage,
  } = useFullCycle();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-primary p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">
              Full Cycle Model
            </h1>
            <p className="text-text-secondary">
              BTC full cycle analysis with fundamental and technical indicators
            </p>
          </div>

          {/* Error Messages */}
          {indicatorsError && (
            <div className="bg-danger-500/10 border border-danger-500/50 rounded-lg p-4 text-danger-400">
              {indicatorsError}
            </div>
          )}
          {zscoresError && (
            <div className="bg-danger-500/10 border border-danger-500/50 rounded-lg p-4 text-danger-400">
              {zscoresError}
            </div>
          )}

          {/* Main Content */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-4'}`}>
            {/* Controls Sidebar */}
            <div className={isMobile ? '' : 'col-span-1'}>
              {indicatorsLoading ? (
                <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
                  <div className="text-center text-text-muted">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
                    <p>Loading indicators...</p>
                  </div>
                </div>
              ) : (
                <FullCycleControls
                  availableIndicators={availableIndicators}
                  selectedIndicators={selectedIndicators}
                  setSelectedIndicators={setSelectedIndicators}
                  visibleIndicators={visibleIndicators}
                  setVisibleIndicators={setVisibleIndicators}
                  toggleIndicatorVisibility={toggleIndicatorVisibility}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  rocDays={rocDays}
                  setRocDays={setRocDays}
                  showFundamentalAverage={showFundamentalAverage}
                  setShowFundamentalAverage={setShowFundamentalAverage}
                  showTechnicalAverage={showTechnicalAverage}
                  setShowTechnicalAverage={setShowTechnicalAverage}
                  showOverallAverage={showOverallAverage}
                  setShowOverallAverage={setShowOverallAverage}
                  isLoading={zscoresLoading}
                />
              )}
            </div>

            {/* Chart Area */}
            <div className={isMobile ? '' : 'col-span-3'}>
              <div className="space-y-6">
                {/* Price Chart with Indicator Overlays */}
                {zscoresLoading ? (
                  <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
                    <div className="text-center text-text-muted">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
                      <p>Calculating z-scores...</p>
                    </div>
                  </div>
                ) : (
                  <FullCycleChart
                    data={zscoreData}
                    availableIndicators={availableIndicators}
                    selectedIndicators={selectedIndicators}
                    visibleIndicators={visibleIndicators}
                    showFundamentalAverage={showFundamentalAverage}
                    showTechnicalAverage={showTechnicalAverage}
                    showOverallAverage={showOverallAverage}
                    height={isMobile ? 400 : 600}
                  />
                )}

                {/* ROC Display */}
                {Object.keys(roc).length > 0 && (
                  <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-text-primary mb-3">
                      {rocDays} Day Rate of Change
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(roc).map(([indicatorId, rocValue]) => {
                        const indicator = availableIndicators.find((ind) => ind.id === indicatorId);
                        const name = indicator?.name || indicatorId;
                        const isPositive = rocValue > 0;
                        return (
                          <div
                            key={indicatorId}
                            className={`p-3 rounded-lg border ${
                              isPositive
                                ? 'bg-magenta-500/10 border-magenta-500/50'
                                : 'bg-cyan-500/10 border-cyan-500/50'
                            }`}
                          >
                            <div className="text-sm text-text-secondary">{name}</div>
                            <div
                              className={`text-lg font-semibold ${
                                isPositive ? 'text-magenta-400' : 'text-cyan-400'
                              }`}
                            >
                              {rocValue > 0 ? '+' : ''}
                              {rocValue.toFixed(2)} Z
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FullCyclePage;

