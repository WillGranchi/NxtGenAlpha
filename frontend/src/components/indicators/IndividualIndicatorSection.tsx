/**
 * Individual Indicator Section Component
 * Shows tabs for Signal Logic and Parameters, plus accordion performance section
 */

import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { ParameterEditor } from './ParameterEditor';
import { PriceChart } from '../charts/PriceChart';
import { EquityChart } from '../charts/EquityChart';
import EnhancedMetrics from '../results/EnhancedMetrics';
import type { IndicatorMetadata, BacktestResult } from '../../services/api';

interface IndividualIndicatorSectionProps {
  indicatorId: string;
  indicatorMetadata: IndicatorMetadata;
  indicatorParameters: Record<string, any>;
  onParametersChange: (params: Record<string, any>) => void;
  priceData: Array<{
    Date: string;
    Price: number;
    Position: number;
    [key: string]: any;
  }>;
  result: BacktestResult | null;
  isLoading?: boolean;
}

export const IndividualIndicatorSection: React.FC<IndividualIndicatorSectionProps> = ({
  indicatorId,
  indicatorMetadata,
  indicatorParameters,
  onParametersChange,
  priceData,
  result,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'parameters' | 'performance'>('parameters');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true); // Collapsed by default

  // Prepare chart data with signals
  const chartData = useMemo(() => {
    if (!priceData || priceData.length === 0) return [];

    return priceData.map((point) => ({
      Date: point.Date,
      Price: point.Price,
      Position: point[`${indicatorId}_Position`] ?? point.Position ?? 0,
      Portfolio_Value: point.Price,
      Capital: 0,
      Shares: 0,
    }));
  }, [priceData, indicatorId]);

  // Generate overlay signals for this indicator
  const overlaySignals = useMemo(() => {
    if (!chartData || chartData.length === 0) return {};

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
      [indicatorId]: { buy: buySignals, sell: sellSignals },
    };
  }, [chartData, indicatorId]);

  // Get current signal state
  const currentSignalState = useMemo(() => {
    if (!priceData || priceData.length === 0) return null;
    const lastPoint = priceData[priceData.length - 1];
    const position = lastPoint[`${indicatorId}_Position`] ?? lastPoint.Position ?? 0;
    return {
      signal: position,
      label: position === 1 ? 'LONG' : position === -1 ? 'SHORT' : 'CASH',
    };
  }, [priceData, indicatorId]);

  // Get key metric for collapsed state
  const getKeyMetric = (): string => {
    if (!result || !result.metrics) return 'No data';
    const totalReturn = result.metrics.total_return;
    if (totalReturn !== undefined) {
      return `Total Return: ${(totalReturn * 100).toFixed(2)}%`;
    }
    return 'View details';
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-bg-tertiary rounded transition-colors"
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5 text-text-secondary" />
              ) : (
                <ChevronUp className="w-5 h-5 text-text-secondary" />
              )}
            </button>
            <h3 className="text-lg font-semibold text-text-primary">
              {indicatorMetadata.name}
            </h3>
            {currentSignalState && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                currentSignalState.signal === 1 ? 'bg-green-500/10 text-green-400' :
                currentSignalState.signal === -1 ? 'bg-red-500/10 text-red-400' :
                'bg-text-secondary/10 text-text-secondary'
              }`}>
                {currentSignalState.signal === 1 ? <TrendingUp className="w-3 h-3" /> :
                 currentSignalState.signal === -1 ? <TrendingDown className="w-3 h-3" /> :
                 <Minus className="w-3 h-3" />}
                <span>{currentSignalState.label}</span>
              </div>
            )}
          </div>
          {isCollapsed && result && result.metrics && (
            <div className="text-sm text-text-secondary">
              {getKeyMetric()}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <>
      {/* Tabs */}
      <div className="border-b border-border-default">
        <div className="flex">
          <button
            onClick={() => setActiveTab('parameters')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'parameters'
                ? 'text-primary-500 border-b-2 border-primary-500 bg-primary-500/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            Parameters
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'performance'
                ? 'text-primary-500 border-b-2 border-primary-500 bg-primary-500/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            Performance
          </button>
        </div>
      </div>

      {/* Tab Content */}
          <div className="p-4 md:p-6 transition-all duration-300">
        {activeTab === 'parameters' && (
          <ParameterEditor
            indicatorMetadata={indicatorMetadata}
            parameters={indicatorParameters}
            onParametersChange={onParametersChange}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center text-text-muted">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
                  <p>Generating signals and running backtest...</p>
                </div>
              </div>
            ) : result ? (
              <>
                {/* Price Chart with Signals */}
                {chartData.length > 0 ? (
                  <div>
                    <h4 className="text-base font-semibold text-text-primary mb-4">
                      Price Chart with Signals
                    </h4>
                    <PriceChart
                      data={chartData}
                      title={`${indicatorMetadata.name} Trading Signals`}
                      height={500}
                      overlaySignals={overlaySignals}
                      showOverlayLegend={true}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <p>No price data available yet.</p>
                  </div>
                )}

                {/* Equity Curve */}
                {result.equity_curve && result.equity_curve.length > 0 ? (
                  <div>
                    <h4 className="text-base font-semibold text-text-primary mb-4">Equity Curve</h4>
                    <EquityChart
                      data={result.equity_curve}
                      title={`${indicatorMetadata.name} Equity Curve`}
                      height={400}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <p>Equity curve data not available.</p>
                  </div>
                )}

                {/* Performance Metrics */}
                {result.metrics && (
                  <div>
                    <h4 className="text-base font-semibold text-text-primary mb-4">Performance Metrics</h4>
                    <EnhancedMetrics metrics={result.metrics} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <p>No results available. Configure signal expressions above and click "Generate Signals" to see performance metrics.</p>
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};
