/**
 * Valuation Page
 * Main page for viewing mean-reverting indicators with z-scores
 */

import React, { useState } from 'react';
import { useValuation } from '../hooks/useValuation';
import { ValuationControls } from '../components/valuation/ValuationControls';
import { ValuationChart } from '../components/valuation/ValuationChart';
import { ValuationTable } from '../components/valuation/ValuationTable';
import ErrorBoundary from '../components/ErrorBoundary';
import { useMobile } from '../hooks/useMobile';

const ValuationPage: React.FC = () => {
  const { isMobile } = useMobile();
  const [viewMode, setViewMode] = useState<'chart' | 'table' | 'both'>('both');
  const [overboughtThreshold, setOverboughtThreshold] = useState<number>(1.0);
  const [oversoldThreshold, setOversoldThreshold] = useState<number>(-1.0);

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
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    symbol,
    setSymbol,
  } = useValuation();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-primary p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Valuation</h1>
            <p className="text-text-secondary">
              Analyze mean-reverting indicators with z-scores to identify overbought and oversold states
            </p>
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
                overboughtThreshold={overboughtThreshold}
                onOverboughtThresholdChange={setOverboughtThreshold}
                oversoldThreshold={oversoldThreshold}
                onOversoldThresholdChange={setOversoldThreshold}
                startDate={startDate}
                onStartDateChange={setStartDate}
                endDate={endDate}
                onEndDateChange={setEndDate}
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
    </ErrorBoundary>
  );
};

export default ValuationPage;
