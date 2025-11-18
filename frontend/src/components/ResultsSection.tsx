import React, { useState, useMemo, memo } from 'react';
import { BacktestResult } from '../services/api';
import EnhancedMetrics from './results/EnhancedMetrics';
import { EquityChart } from './charts/EquityChart';
import { PriceChart } from './charts/PriceChart';
import { TradeLogTable } from './TradeLogTable';
import ErrorBoundary from './ErrorBoundary';

interface ResultsSectionProps {
  combinedResult: BacktestResult;
  individualResults: Record<string, BacktestResult>;
  isLoading?: boolean;
  overlaySignals?: Record<string, { buy: { x: string[], y: number[] }, sell: { x: string[], y: number[] } }>;
  strategyType?: 'long_cash' | 'long_short';
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  combinedResult,
  individualResults,
  isLoading = false,
  overlaySignals = {},
  strategyType = 'long_cash',
}) => {
  const [activeTab, setActiveTab] = useState<string>('combined');

  // Memoize tab names to prevent recalculation
  const tabNames = useMemo(() => ['combined', ...Object.keys(individualResults)], [individualResults]);

  const getTabLabel = useMemo(() => (tabName: string) => {
    if (tabName === 'combined') return 'Combined Strategy';
    return tabName;
  }, []);

  // Memoize active result to prevent unnecessary re-renders
  const activeResult = useMemo((): BacktestResult | null => {
    if (activeTab === 'combined') {
      return combinedResult;
    }
    return individualResults[activeTab] || null;
  }, [activeTab, combinedResult, individualResults]);

  if (isLoading) {
    return (
      <div className="bg-bg-tertiary rounded-xl border border-border-default p-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-3"></div>
          <span className="text-text-primary">Loading results...</span>
        </div>
      </div>
    );
  }

  if (!activeResult) {
    return (
      <div className="bg-bg-tertiary rounded-xl border border-border-default p-12">
        <div className="text-center text-text-muted">
          <p>No results available</p>
        </div>
      </div>
    );
  }

  return (
    <div id="results-section" className="bg-bg-tertiary rounded-xl border border-border-default overflow-hidden shadow-lg">
      {/* Tab Navigation */}
      <div className="border-b border-border-default bg-bg-secondary">
        <nav className="flex space-x-1 px-4 overflow-x-auto" aria-label="Tabs">
          {tabNames.map((tabName) => (
            <button
              key={tabName}
              onClick={() => setActiveTab(tabName)}
              className={`
                px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200
                ${
                  activeTab === tabName
                    ? 'border-b-2 border-primary-500 text-primary-500 bg-bg-tertiary'
                    : 'text-text-secondary hover:text-text-primary hover:border-b-2 hover:border-border-light'
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
          <EnhancedMetrics
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
                strategyType={strategyType}
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
          <div className="bg-bg-secondary rounded-lg p-6 text-center text-text-muted border border-border-default">
            <p>No equity curve data available for this strategy</p>
          </div>
        )}

        {(!activeResult.trade_log || activeResult.trade_log.length === 0) && (
          <div className="bg-bg-secondary rounded-lg p-6 text-center text-text-muted border border-border-default">
            <p>No trades were executed for this strategy</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(ResultsSection);

