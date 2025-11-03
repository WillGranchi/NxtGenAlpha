import React, { useState } from 'react';
import { BacktestResult } from '../services/api';
import PerformanceMetrics from './results/PerformanceMetrics';
import { EquityChart } from './charts/EquityChart';
import { PriceChart } from './charts/PriceChart';
import { TradeLogTable } from './TradeLogTable';
import ErrorBoundary from './ErrorBoundary';

interface ResultsSectionProps {
  combinedResult: BacktestResult;
  individualResults: Record<string, BacktestResult>;
  isLoading?: boolean;
  overlaySignals?: Record<string, { buy: { x: string[], y: number[] }, sell: { x: string[], y: number[] } }>;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  combinedResult,
  individualResults,
  isLoading = false,
  overlaySignals = {},
}) => {
  const [activeTab, setActiveTab] = useState<string>('combined');

  // Get all tab names: combined + individual indicators
  const tabNames = ['combined', ...Object.keys(individualResults)];

  const getTabLabel = (tabName: string) => {
    if (tabName === 'combined') return 'Combined Strategy';
    return tabName;
  };

  const getActiveResult = (): BacktestResult | null => {
    if (activeTab === 'combined') {
      return combinedResult;
    }
    return individualResults[activeTab] || null;
  };

  const activeResult = getActiveResult();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-700">Loading results...</span>
        </div>
      </div>
    );
  }

  if (!activeResult) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12">
        <div className="text-center text-gray-500">
          <p>No results available</p>
        </div>
      </div>
    );
  }

  return (
    <div id="results-section" className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <nav className="flex space-x-1 px-4 overflow-x-auto" aria-label="Tabs">
          {tabNames.map((tabName) => (
            <button
              key={tabName}
              onClick={() => setActiveTab(tabName)}
              className={`
                px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                ${
                  activeTab === tabName
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {getTabLabel(tabName)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6 space-y-6">
        {/* Performance Metrics */}
        <ErrorBoundary>
          <PerformanceMetrics
            metrics={activeResult.metrics}
            title={`${getTabLabel(activeTab)} Performance Metrics`}
          />
        </ErrorBoundary>

        {/* Charts */}
        {activeResult.equity_curve && Array.isArray(activeResult.equity_curve) && activeResult.equity_curve.length > 0 && (
          <>
            <ErrorBoundary>
              <PriceChart
                data={activeResult.equity_curve}
                title={`Bitcoin Price with ${getTabLabel(activeTab)} Strategy Signals`}
                overlaySignals={activeTab === 'combined' ? overlaySignals : {}}
                showOverlayLegend={activeTab === 'combined'}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <EquityChart
                data={activeResult.equity_curve}
                title={`${getTabLabel(activeTab)} Equity Curve`}
              />
            </ErrorBoundary>
          </>
        )}

        {/* Trade Log */}
        {activeResult.trade_log && (
          <ErrorBoundary>
            <TradeLogTable trades={activeResult.trade_log} />
          </ErrorBoundary>
        )}

        {/* Empty State Messages */}
        {(!activeResult.equity_curve || activeResult.equity_curve.length === 0) && (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
            <p>No equity curve data available for this strategy</p>
          </div>
        )}

        {(!activeResult.trade_log || activeResult.trade_log.length === 0) && (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
            <p>No trades were executed for this strategy</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsSection;

