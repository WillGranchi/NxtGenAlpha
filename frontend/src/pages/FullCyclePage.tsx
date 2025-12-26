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
    indicatorParameters,
    updateIndicatorParameter,
    loadPreset,
  } = useFullCycle();

  return (
    <ErrorBoundary>
      <div className="space-y-6">
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

          {/* Chart Area - Full Width */}
          <div className="w-full">
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
          </div>

          {/* Controls Section - Below Chart */}
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
              zscoreData={zscoreData}
              roc={roc}
              indicatorParameters={indicatorParameters}
              updateIndicatorParameter={updateIndicatorParameter}
              loadPreset={loadPreset}
            />
          )}
      </div>
    </ErrorBoundary>
  );
};

export default FullCyclePage;

