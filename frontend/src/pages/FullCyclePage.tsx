/**
 * Full Cycle Page
 * Main page for viewing BTC full cycle indicators with z-scores
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useFullCycle } from '../hooks/useFullCycle';
import { FullCycleChart } from '../components/fullcycle/FullCycleChart';
import { FullCycleControls } from '../components/fullcycle/FullCycleControls';
import { CyclePhaseIndicator } from '../components/fullcycle/CyclePhaseIndicator';
import { FullCycleHeatmap } from '../components/fullcycle/FullCycleHeatmap';
import { ExportButton } from '../components/fullcycle/ExportButton';
import { AlertSettings } from '../components/fullcycle/AlertSettings';
import ErrorBoundary from '../components/ErrorBoundary';
import { useMobile } from '../hooks/useMobile';
import TradingAPI from '../services/api';

const FullCyclePage: React.FC = () => {
  const { isMobile } = useMobile();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'chart' | 'heatmap'>('chart');
  const chartRef = useRef<HTMLDivElement>(null);
  
  const {
    availableIndicators,
    indicatorsLoading,
    indicatorsError,
    zscoreData,
    roc,
    zscoresLoading,
    zscoresError,
    dataWarnings,
    indicatorsCalculated,
    indicatorsRequested,
    selectedIndicators,
    setSelectedIndicators,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    rocDays,
    setRocDays,
    sdcaIn,
    setSdcaIn,
    sdcaOut,
    setSdcaOut,
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
    refreshData,
  } = useFullCycle();

  // Load preset if navigating from My Creations
  useEffect(() => {
    const presetId = (location.state as any)?.presetId;
    if (presetId) {
      TradingAPI.getFullCyclePreset(presetId)
        .then((response) => {
          if (response.success) {
            loadPreset({
              indicator_params: response.preset.indicator_params,
              selected_indicators: response.preset.selected_indicators,
              start_date: response.preset.start_date,
              end_date: response.preset.end_date,
              roc_days: response.preset.roc_days,
              show_fundamental_average: response.preset.show_fundamental_average,
              show_technical_average: response.preset.show_technical_average,
              show_overall_average: response.preset.show_overall_average,
              sdca_in: response.preset.sdca_in,
              sdca_out: response.preset.sdca_out,
            });
          }
        })
        .catch((err) => {
          console.error('Failed to load preset:', err);
        });
      // Clear the state to prevent reloading on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loadPreset]);

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
          
          {/* Data Warnings */}
          {dataWarnings && dataWarnings.length > 0 && (
            <div className="bg-warning-500/10 border border-warning-500/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-warning-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-warning-400 font-medium mb-1">Data Quality Warnings</h4>
                  <ul className="text-warning-300 text-sm space-y-1">
                    {dataWarnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Cycle Phase Indicator */}
          {zscoreData.length > 0 && (() => {
            const latest = zscoreData[zscoreData.length - 1];
            const averageZScore = latest?.indicators['average']?.zscore ?? null;
            return <CyclePhaseIndicator averageZScore={averageZScore} />;
          })()}

          {/* Data Info */}
          {zscoreData.length > 0 && (() => {
            // Calculate percentile rank of current average z-score
            const latest = zscoreData[zscoreData.length - 1];
            const currentAvgZScore = latest?.indicators['average']?.zscore ?? null;
            
            // Get all historical average z-scores
            const allAvgZScores = zscoreData
              .map(d => d.indicators['average']?.zscore)
              .filter((z): z is number => z !== null && z !== undefined && !isNaN(z));
            
            // Calculate percentile rank
            let percentileRank: number | null = null;
            let percentileLabel = '';
            let percentileColor = 'text-text-secondary';
            
            if (currentAvgZScore !== null && allAvgZScores.length > 0) {
              const sorted = [...allAvgZScores].sort((a, b) => a - b);
              const rank = sorted.filter(z => z <= currentAvgZScore).length;
              percentileRank = (rank / sorted.length) * 100;
              
              if (percentileRank < 20) {
                percentileLabel = 'historically oversold';
                percentileColor = 'text-green-400';
              } else if (percentileRank > 80) {
                percentileLabel = 'historically overbought';
                percentileColor = 'text-red-400';
              } else {
                percentileLabel = 'historically neutral';
                percentileColor = 'text-yellow-400';
              }
            }
            
            return (
              <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">Data Range:</span>
                    <span>{zscoreData[0]?.date} to {zscoreData[zscoreData.length - 1]?.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">Indicators:</span>
                    <span>{indicatorsCalculated} of {indicatorsRequested} calculated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">Data Points:</span>
                    <span>{zscoreData.length.toLocaleString()}</span>
                  </div>
                  {currentAvgZScore !== null && percentileRank !== null && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">Average Z-Score:</span>
                      <span className={percentileColor}>
                        {currentAvgZScore.toFixed(2)} ({percentileRank.toFixed(1)}th percentile - {percentileLabel})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Chart/Heatmap Area - Full Width */}
          <div className="w-full">
            {/* View Toggle */}
            <div className="flex justify-end mb-4">
              <div className="bg-bg-secondary border border-border-default rounded-lg p-1 inline-flex">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    viewMode === 'chart'
                      ? 'bg-primary-500 text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Chart
                </button>
                <button
                  onClick={() => setViewMode('heatmap')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    viewMode === 'heatmap'
                      ? 'bg-primary-500 text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Heatmap
                </button>
              </div>
            </div>

            {zscoresLoading ? (
              <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
                <div className="text-center text-text-muted">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
                  <p>Calculating z-scores...</p>
                </div>
              </div>
            ) : viewMode === 'chart' ? (
              <div ref={chartRef}>
                <FullCycleChart
                  data={zscoreData}
                  availableIndicators={availableIndicators}
                  selectedIndicators={selectedIndicators}
                  visibleIndicators={visibleIndicators}
                  showFundamentalAverage={showFundamentalAverage}
                  showTechnicalAverage={showTechnicalAverage}
                  showOverallAverage={showOverallAverage}
                  sdcaIn={sdcaIn}
                  sdcaOut={sdcaOut}
                  height={isMobile ? 400 : 600}
                />
              </div>
            ) : (
              <FullCycleHeatmap
                data={zscoreData}
                availableIndicators={availableIndicators}
                selectedIndicators={selectedIndicators}
                showFundamentalAverage={showFundamentalAverage}
                showTechnicalAverage={showTechnicalAverage}
                showOverallAverage={showOverallAverage}
              />
            )}
          </div>

          {/* Export and Alert Section */}
          {zscoreData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex items-center justify-end">
                <ExportButton
                  data={zscoreData}
                  availableIndicators={availableIndicators}
                  selectedIndicators={selectedIndicators}
                  chartRef={chartRef}
                  viewMode={viewMode}
                />
              </div>
              <div>
                {(() => {
                  const latest = zscoreData[zscoreData.length - 1];
                  const averageZScore = latest?.indicators['average']?.zscore ?? null;
                  return (
                    <AlertSettings
                      averageZScore={averageZScore}
                      sdcaIn={sdcaIn}
                      sdcaOut={sdcaOut}
                      onSdcaInChange={setSdcaIn}
                      onSdcaOutChange={setSdcaOut}
                    />
                  );
                })()}
              </div>
            </div>
          )}

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
              sdcaIn={sdcaIn}
              setSdcaIn={setSdcaIn}
              sdcaOut={sdcaOut}
              setSdcaOut={setSdcaOut}
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
              refreshData={refreshData}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FullCyclePage;

