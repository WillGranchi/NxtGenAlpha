/**
 * Indicator Preview Card Component
 * Shows signal expression, mini charts, and performance metrics for a selected indicator
 */

import React, { useMemo } from 'react';
import { VisualConditionBuilder } from '../strategy/VisualConditionBuilder';
import { PriceChart } from '../charts/PriceChart';
import { EquityChart } from '../charts/EquityChart';
import type { IndicatorMetadata, IndicatorConfig, BacktestResult } from '../../services/api';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface IndicatorPreviewCardProps {
  indicatorId: string;
  indicatorMetadata: IndicatorMetadata;
  expression: string;
  onExpressionChange: (expression: string) => void;
  availableConditions: Record<string, string>;
  selectedIndicators: IndicatorConfig[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
  indicatorParameters: Record<string, any>;
  onParametersChange: (indicatorId: string, parameters: Record<string, any>) => void;
  priceData?: Array<{
    Date: string;
    Price: number;
    Position: number;
    [key: string]: any;
  }>;
  result?: BacktestResult | null;
  isLoading?: boolean;
}

export const IndicatorPreviewCard: React.FC<IndicatorPreviewCardProps> = ({
  indicatorId,
  indicatorMetadata,
  expression,
  onExpressionChange,
  availableConditions,
  selectedIndicators,
  availableIndicators,
  indicatorParameters,
  onParametersChange,
  priceData = [],
  result = null,
  isLoading = false,
}) => {
  // Prepare chart data for signals chart
  const signalsChartData = useMemo(() => {
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

  // Generate overlay signals
  const overlaySignals = useMemo(() => {
    if (!signalsChartData || signalsChartData.length === 0) return {};

    const buySignals: { x: string[]; y: number[] } = { x: [], y: [] };
    const sellSignals: { x: string[]; y: number[] } = { x: [], y: [] };

    for (let i = 1; i < signalsChartData.length; i++) {
      const prevPosition = signalsChartData[i - 1].Position;
      const currentPosition = signalsChartData[i].Position;

      if (prevPosition === 0 && currentPosition === 1) {
        buySignals.x.push(signalsChartData[i].Date);
        buySignals.y.push(signalsChartData[i].Price);
      } else if (prevPosition === 1 && currentPosition === 0) {
        sellSignals.x.push(signalsChartData[i].Date);
        sellSignals.y.push(signalsChartData[i].Price);
      }
    }

    return {
      [indicatorId]: { buy: buySignals, sell: sellSignals },
    };
  }, [signalsChartData, indicatorId]);

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

  // Get key metrics
  const keyMetrics = useMemo(() => {
    if (!result || !result.metrics) return null;
    return {
      totalReturn: result.metrics.total_return,
      sharpeRatio: result.metrics.sharpe_ratio,
      maxDrawdown: result.metrics.max_drawdown,
      winRate: result.metrics.win_rate,
    };
  }, [result]);

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="text-base font-semibold text-text-primary">
            {indicatorMetadata.name}
          </h4>
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
      </div>

      {/* Signal Expression Editor */}
      <div className="bg-bg-tertiary border border-border-default rounded-lg p-3">
        <label className="block text-xs font-medium text-text-secondary mb-2">
          Signal Expression
        </label>
        <VisualConditionBuilder
          expression={expression}
          onExpressionChange={onExpressionChange}
          availableConditions={availableConditions}
          selectedIndicators={selectedIndicators}
          availableIndicators={availableIndicators}
          isLoading={isLoading}
        />
      </div>

      {/* Mini Charts Row */}
      {priceData.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {/* Signals Chart (Left) */}
          <div className="bg-bg-tertiary border border-border-default rounded-lg p-2">
            <div className="text-xs font-medium text-text-secondary mb-1">Signals</div>
            <div style={{ height: '150px' }}>
              <PriceChart
                data={signalsChartData}
                title=""
                height={150}
                overlaySignals={overlaySignals}
                showOverlayLegend={false}
              />
            </div>
          </div>

          {/* Equity Curve (Right) */}
          {result && result.equity_curve && result.equity_curve.length > 0 && (
            <div className="bg-bg-tertiary border border-border-default rounded-lg p-2">
              <div className="text-xs font-medium text-text-secondary mb-1">Equity Curve</div>
              <div style={{ height: '150px' }}>
                <EquityChart
                  data={result.equity_curve}
                  title=""
                  height={150}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Metrics (Below) */}
      {keyMetrics && (
        <div className="bg-bg-tertiary border border-border-default rounded-lg p-3">
          <div className="text-xs font-medium text-text-secondary mb-2">Performance</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-text-muted">Total Return</div>
              <div className={`text-sm font-semibold ${
                (keyMetrics.totalReturn ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {((keyMetrics.totalReturn ?? 0) * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Sharpe Ratio</div>
              <div className="text-sm font-semibold text-text-primary">
                {(keyMetrics.sharpeRatio ?? 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Max Drawdown</div>
              <div className="text-sm font-semibold text-red-400">
                {((keyMetrics.maxDrawdown ?? 0) * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Win Rate</div>
              <div className="text-sm font-semibold text-text-primary">
                {((keyMetrics.winRate ?? 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !result && (
        <div className="flex items-center justify-center py-4">
          <div className="text-xs text-text-muted">Generating signals...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && priceData.length === 0 && (
        <div className="text-center py-4 text-xs text-text-muted">
          Click "Generate Signals" to see preview
        </div>
      )}
    </div>
  );
};
